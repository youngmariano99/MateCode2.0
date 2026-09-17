import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { ErrorDominio } from "../../../domain/errores/error-base";
import {
  importarBloqueCompletoSchema,
  importarPausasActivasSchema,
  type ItemRutinaJson,
  type ItemEjercicioNuevoJson,
} from "../../../domain/entidades/planificacion-entrenamiento.entity";
import { tipoEstructuraDeFormato } from "../../../domain/entidades/rutina.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";
import { GestionarEjerciciosUseCase } from "./gestionar-ejercicios.use-case";
import { GestionarPlantillasRutinaUseCase } from "./gestionar-plantillas-rutina.use-case";
import { GestionarBloquesUseCase } from "./gestionar-bloques.use-case";

function mensajeDeIssues(
  issues: { path: PropertyKey[]; message: string }[]
): string {
  return issues
    .map((i) => `${i.path.map(String).join(".") || "(raíz)"}: ${i.message}`)
    .join(" — ");
}

function normalizar(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Arma Bloque + Rutinas + Ejercicios a partir de un solo JSON generado con
 * IA (Sprint 22) — todo resuelto por título EXACTO, nunca duplicando:
 * - Ejercicio: si existe en el catálogo, se reusa su id; si no, se crea
 *   (validando equipamiento contra lo que el usuario tiene de verdad, ver
 *   GestionarEjerciciosUseCase).
 * - Rutina: si existe una con ese nombre, se ACTUALIZA in-place (mismo
 *   nombre + números nuevos = "ajustar", no "otra rutina"); si no, se crea.
 * Se resuelve todo SECUENCIAL (no Promise.all) a propósito: si dos Rutinas
 * del mismo JSON comparten un Ejercicio nuevo, tiene que terminar de
 * crearse antes de que la siguiente rutina intente resolverlo, para no
 * crear el mismo ejercicio dos veces en una carrera.
 */
export class ImportarBloqueEntrenamientoUseCase {
  private readonly ejercicios = new GestionarEjerciciosUseCase();
  private readonly plantillas = new GestionarPlantillasRutinaUseCase();
  private readonly bloques = new GestionarBloquesUseCase();

  private async resolverOCrearEjercicio(
    nombre: string,
    ejerciciosNuevos: ItemEjercicioNuevoJson[]
  ): Promise<{ id?: string; permiteCarga?: boolean; error?: string }> {
    const nombreNorm = normalizar(nombre);
    const existente = await db.catalogo_ejercicio
      .filter((e) => normalizar(e.nombre) === nombreNorm)
      .first();
    if (existente) {
      return { id: existente.id, permiteCarga: existente.permiteCarga };
    }

    const nuevo = ejerciciosNuevos.find(
      (e) => normalizar(e.nombre) === nombreNorm
    );
    if (!nuevo) {
      return {
        error: `No se encontró el ejercicio "${nombre}" (ni en el catálogo ni en "ejerciciosNuevos").`,
      };
    }
    const res = await this.ejercicios.crearEjercicio(nuevo);
    if (!res.ok) {
      return { error: `Ejercicio "${nombre}": ${res.error!.mensaje}` };
    }
    return { id: res.valor, permiteCarga: nuevo.permiteCarga ?? false };
  }

  private async armarEstructura(
    item: ItemRutinaJson,
    ejerciciosNuevos: ItemEjercicioNuevoJson[]
  ): Promise<{
    estructura: Record<string, unknown>;
    tipoEstructura: "series" | "tiempo";
    errores: string[];
    huboEjercicios: boolean;
  }> {
    const tipo = tipoEstructuraDeFormato(item.formato);
    const errores: string[] = [];

    if (tipo === "series") {
      const bloques: unknown[] = [];
      for (const ej of item.ejercicios) {
        const obj = typeof ej === "string" ? { nombre: ej } : ej;
        const resuelto = await this.resolverOCrearEjercicio(
          obj.nombre,
          ejerciciosNuevos
        );
        if (!resuelto.id) {
          errores.push(resuelto.error!);
          continue;
        }
        const numeroSets = typeof ej === "string" ? 3 : ej.series || 3;
        // Nunca guardar pesoKg en un ejercicio que no permite carga externa
        // (peso corporal) — sin importar lo que haya puesto la IA en el
        // JSON, para no ensuciar las estadísticas con un "1kg" inventado.
        const pesoValido =
          resuelto.permiteCarga && typeof ej !== "string"
            ? ej.pesoKg
            : undefined;
        bloques.push({
          ejercicioId: resuelto.id,
          sets: Array.from({ length: numeroSets }, () => ({
            reps: typeof ej === "string" ? undefined : ej.reps,
            pesoKg: pesoValido,
          })),
        });
      }
      return {
        estructura: { bloques },
        tipoEstructura: "series",
        errores,
        huboEjercicios: bloques.length > 0,
      };
    }

    const ejercicioIds: string[] = [];
    for (const ej of item.ejercicios) {
      const nombre = typeof ej === "string" ? ej : ej.nombre;
      const resuelto = await this.resolverOCrearEjercicio(
        nombre,
        ejerciciosNuevos
      );
      if (!resuelto.id) {
        errores.push(resuelto.error!);
        continue;
      }
      ejercicioIds.push(resuelto.id);
    }
    return {
      estructura: {
        ejercicioIds,
        numeroRondas: item.numeroRondas,
        tiempoTrabajoSeg: item.tiempoTrabajoSeg,
        tiempoDescansoSeg: item.tiempoDescansoSeg,
        tiempoLimiteMin: item.tiempoLimiteMin,
      },
      tipoEstructura: "tiempo",
      errores,
      huboEjercicios: ejercicioIds.length > 0,
    };
  }

  private async resolverOCrearRutina(
    item: ItemRutinaJson,
    ejerciciosNuevos: ItemEjercicioNuevoJson[]
  ): Promise<{ id?: string; error?: string }> {
    const { estructura, tipoEstructura, errores, huboEjercicios } =
      await this.armarEstructura(item, ejerciciosNuevos);
    if (!huboEjercicios) {
      return {
        error: `Rutina "${item.nombre}": ningún ejercicio pudo resolverse (${errores.join(" — ") || "sin ejercicios"}).`,
      };
    }

    const nombreNorm = normalizar(item.nombre);
    const existente = await db.plantilla_rutina
      .filter((p) => !p.eliminado && normalizar(p.nombre) === nombreNorm)
      .first();

    if (existente) {
      const res = await this.plantillas.ajustarPlantilla({
        id: existente.id,
        formato: item.formato,
        tipoEstructura,
        estructura,
        calentamiento: item.calentamiento,
      });
      if (!res.ok) {
        return { error: `Rutina "${item.nombre}": ${res.error!.mensaje}` };
      }
      return { id: existente.id };
    }

    const res = await this.plantillas.crearPlantilla({
      nombre: item.nombre,
      formato: item.formato,
      tipoEstructura,
      estructura,
      calentamiento: item.calentamiento,
    });
    if (!res.ok) {
      return { error: `Rutina "${item.nombre}": ${res.error!.mensaje}` };
    }
    return { id: res.valor };
  }

  public async importarBloqueCompleto(
    items: unknown[]
  ): Promise<Resultado<string>> {
    const parsed = importarBloqueCompletoSchema.safeParse(items[0] ?? {});
    if (!parsed.success) {
      return Resultado.falla(
        new ErrorDominio(
          `El JSON no tiene la estructura esperada: ${mensajeDeIssues(parsed.error.issues)}`
        )
      );
    }

    const rutinasProgramadas: { plantillaId: string; diasSemana: number[] }[] =
      [];
    const errores: string[] = [];
    for (const r of parsed.data.rutinas) {
      const res = await this.resolverOCrearRutina(
        r,
        parsed.data.ejerciciosNuevos
      );
      if (res.id) {
        // Sin "diasSemana" explícito en el JSON, asume días hábiles — el
        // prompt siempre le pide a la IA que lo declare, esto es solo red
        // de contención si lo omite.
        rutinasProgramadas.push({
          plantillaId: res.id,
          diasSemana:
            r.diasSemana && r.diasSemana.length > 0
              ? r.diasSemana
              : [1, 2, 3, 4, 5],
        });
      } else {
        errores.push(res.error!);
      }
    }

    const resBloque = await this.bloques.crearBloque({
      nombre: parsed.data.bloque.nombre,
      diaInicio: parsed.data.bloque.diaInicio ?? obtenerDiaTareaHoy(),
      diaFin: parsed.data.bloque.diaFin,
      ejeProgresionDefault: parsed.data.bloque.ejeProgresionDefault,
      rutinasProgramadas,
    });
    if (!resBloque.ok) return resBloque;

    return Resultado.exito(
      `Bloque "${parsed.data.bloque.nombre}" creado con ${rutinasProgramadas.length} rutina(s).` +
        (errores.length > 0 ? ` Con errores: ${errores.join(" — ")}` : "")
    );
  }

  public async importarPausasActivas(
    items: unknown[]
  ): Promise<Resultado<string>> {
    const parsed = importarPausasActivasSchema.safeParse(items[0] ?? {});
    if (!parsed.success) {
      return Resultado.falla(
        new ErrorDominio(
          `El JSON no tiene la estructura esperada: ${mensajeDeIssues(parsed.error.issues)}`
        )
      );
    }

    let creadas = 0;
    const errores: string[] = [];
    for (const r of parsed.data.rutinasNuevas) {
      const res = await this.resolverOCrearRutina(
        r,
        parsed.data.ejerciciosNuevos
      );
      if (res.id) creadas++;
      else errores.push(res.error!);
    }

    if (creadas === 0) {
      return Resultado.falla(
        new ErrorDominio(
          errores.length > 0
            ? errores.join(" — ")
            : "No se creó ninguna rutina."
        )
      );
    }
    return Resultado.exito(
      `${creadas} rutina(s) de pausa activa creada(s)/actualizada(s).` +
        (errores.length > 0 ? ` Con errores: ${errores.join(" — ")}` : "")
    );
  }
}
