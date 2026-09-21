import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  registrarActividadSchema,
  type RegistrarActividadInput,
  type RegistroActividad,
  type ResultadoEjercicio,
} from "../../../domain/entidades/registro-actividad.entity";
import type {
  BloqueEntrenamiento,
  PlantillaRutina,
  EstructuraSeries,
  EstructuraTiempo,
} from "../../../domain/entidades/rutina.entity";
import {
  resultadosDePlan,
  type PlanSesion,
} from "../../../domain/entidades/progresion-entrenamiento.entity";
import { planDeSesion } from "./gestionar-progresion-bloque.use-case";

function idRegistro(): string {
  return `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/** Arma los resultados "tal cual el plan" a partir de la estructura de la plantilla. */
function resultadosDesdePlantilla(
  plantilla: PlantillaRutina
): ResultadoEjercicio[] {
  if (plantilla.tipoEstructura === "series") {
    const estructura = plantilla.estructura as EstructuraSeries;
    return estructura.bloques.map((b) => ({
      ejercicioId: b.ejercicioId,
      sets: b.sets.map((s) => ({
        reps: s.reps,
        tiempoSeg: s.tiempoSeg,
        distanciaM: s.distanciaM,
        pesoKg: s.pesoKg,
      })),
    }));
  }
  const estructura = plantilla.estructura as EstructuraTiempo;
  return estructura.ejercicioIds.map((ejercicioId) => ({
    ejercicioId,
    sets: [],
    rondasCompletadas: estructura.numeroRondas,
  }));
}

/**
 * Registro de sesión con fricción cero: "Hice lo planificado" es un solo
 * tap que copia la plantilla a resultados sin pedir nada; "Con excepción"
 * es la única vía que pide datos, y solo los que cambiaron.
 */
export class GestionarRegistroActividadUseCase {
  /** El bloque al que corresponde una sesión: el indicado, o el activo si el día cae dentro de él. */
  private async bloqueDe(
    diaTarea: string,
    bloqueId?: string
  ): Promise<BloqueEntrenamiento | undefined> {
    if (bloqueId) {
      const b = await db.bloque_entrenamiento.get(bloqueId);
      return b && !b.eliminado ? b : undefined;
    }
    const activo = await db.bloque_entrenamiento
      .where("estado")
      .equals("activo")
      .and((b) => !b.eliminado)
      .first();
    return activo && diaTarea >= activo.diaInicio && diaTarea <= activo.diaFin
      ? activo
      : undefined;
  }

  /**
   * El plan de una rutina para un día, con la progresión del bloque ya
   * aplicada (paso de la semana, reglas por ejercicio, descarga y mínimos).
   * Sin bloque, es la estructura de la plantilla tal cual.
   */
  public async planParaSesion(
    plantillaId: string,
    diaTarea: string,
    bloqueId?: string
  ): Promise<{ plan?: PlanSesion; bloque?: BloqueEntrenamiento }> {
    const plantilla = await db.plantilla_rutina.get(plantillaId);
    if (!plantilla) return {};
    const bloque = await this.bloqueDe(diaTarea, bloqueId);
    if (!bloque) return {};
    return { plan: await planDeSesion(bloque, plantilla, diaTarea), bloque };
  }

  public async registrarComoPlanificado(
    plantillaId: string,
    diaTarea: string,
    bloqueId?: string
  ): Promise<Resultado<string>> {
    const plantilla = await db.plantilla_rutina.get(plantillaId);
    if (!plantilla) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró la rutina.")
      );
    }
    const { plan, bloque } = await this.planParaSesion(
      plantillaId,
      diaTarea,
      bloqueId
    );
    const resultados = plan
      ? resultadosDePlan(plan)
      : resultadosDesdePlantilla(plantilla);
    return this.guardar({
      plantillaId,
      bloqueId: bloque?.id ?? bloqueId,
      diaTarea,
      comoPlanificado: true,
      resultados,
      planificado: plan ? resultados : undefined,
      pasoBloque: plan?.paso,
    });
  }

  public async registrarConExcepcion(
    input: RegistrarActividadInput
  ): Promise<Resultado<string>> {
    // Se guarda igual lo que estaba planificado ese día, para poder comparar
    // plan vs. realidad aunque después cambie el bloque.
    let planificado = input.planificado;
    let pasoBloque = input.pasoBloque;
    if (!planificado && input.plantillaId) {
      const { plan } = await this.planParaSesion(
        input.plantillaId,
        input.diaTarea,
        input.bloqueId
      );
      if (plan) {
        planificado = resultadosDePlan(plan);
        pasoBloque = plan.paso;
      }
    }
    return this.guardar({
      ...input,
      comoPlanificado: false,
      planificado,
      pasoBloque,
    });
  }

  private async guardar(
    input: RegistrarActividadInput
  ): Promise<Resultado<string>> {
    const parsed = registrarActividadSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const id = idRegistro();
    const registro: RegistroActividad = {
      id,
      ...parsed.data,
      creadoEn: Date.now(),
    };
    try {
      await db.registro_actividad.add(registro);
      await QueueService.encolar("registro_actividad", "crear", id, {
        ...registro,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al registrar la sesión."
        )
      );
    }
  }
}
