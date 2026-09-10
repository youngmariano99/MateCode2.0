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
  PlantillaRutina,
  EstructuraSeries,
  EstructuraTiempo,
} from "../../../domain/entidades/rutina.entity";

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
    return this.guardar({
      plantillaId,
      bloqueId,
      diaTarea,
      comoPlanificado: true,
      resultados: resultadosDesdePlantilla(plantilla),
    });
  }

  public async registrarConExcepcion(
    input: RegistrarActividadInput
  ): Promise<Resultado<string>> {
    return this.guardar({ ...input, comoPlanificado: false });
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
