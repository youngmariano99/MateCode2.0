import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearBloqueSchema,
  importarSecuenciaBloquesSchema,
  programarRutinaSchema,
  type CrearBloqueInput,
  type BloqueEntrenamiento,
  type ImportarSecuenciaBloquesInput,
  type ProgramarRutinaInput,
} from "../../../domain/entidades/rutina.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

function idBloque(): string {
  return `blo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Bloques de entrenamiento (mesociclos): cada uno declara UN eje de
 * progresión por defecto para todo el período — ver ejeEfectivo en
 * ejercicio.entity.ts para el fallback automático por ejercicio.
 */
export class GestionarBloquesUseCase {
  public async crearBloque(
    input: CrearBloqueInput
  ): Promise<Resultado<string>> {
    const parsed = crearBloqueSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const ahora = Date.now();
    const id = idBloque();
    const registro: BloqueEntrenamiento = {
      id,
      nombre: parsed.data.nombre.trim(),
      diaInicio: parsed.data.diaInicio,
      diaFin: parsed.data.diaFin,
      ejeProgresionDefault: parsed.data.ejeProgresionDefault,
      estado: "activo",
      rutinasProgramadas: parsed.data.rutinasProgramadas,
      eliminado: false,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.bloque_entrenamiento.add(registro);
      await QueueService.encolar("bloque_entrenamiento", "crear", id, {
        ...registro,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear el bloque."
        )
      );
    }
  }

  /**
   * Al cerrar el bloque activo, promueve solo el siguiente "planificado"
   * (por diaInicio) a "activo" — así una secuencia importada avanza sin
   * que el usuario tenga que ir a crear el próximo bloque a mano.
   */
  public async cerrarBloque(id: string): Promise<Resultado<void>> {
    const bloque = await db.bloque_entrenamiento.get(id);
    if (!bloque) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el bloque.")
      );
    }
    const actualizadoEn = Date.now();
    try {
      await db.bloque_entrenamiento.update(id, {
        estado: "cerrado",
        actualizadoEn,
      });
      await QueueService.encolar("bloque_entrenamiento", "editar", id, {
        id,
        estado: "cerrado",
        actualizadoEn,
      });

      const planificados = await db.bloque_entrenamiento
        .where("estado")
        .equals("planificado")
        .and((b) => !b.eliminado)
        .toArray();
      const siguiente = planificados.sort((a, b) =>
        a.diaInicio < b.diaInicio ? -1 : 1
      )[0];
      if (siguiente) {
        await db.bloque_entrenamiento.update(siguiente.id, {
          estado: "activo",
          actualizadoEn,
        });
        await QueueService.encolar(
          "bloque_entrenamiento",
          "editar",
          siguiente.id,
          { id: siguiente.id, estado: "activo", actualizadoEn }
        );
      }

      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al cerrar el bloque."
        )
      );
    }
  }

  /**
   * Crea una secuencia completa de bloques encadenados por fecha: el
   * primero queda "activo" (si no hay ninguno activo ya — si lo hay, todos
   * quedan "planificado" detrás de él), el resto "planificado".
   */
  public async importarSecuencia(
    input: ImportarSecuenciaBloquesInput
  ): Promise<Resultado<number>> {
    const parsed = importarSecuenciaBloquesSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    if (parsed.data.length === 0) {
      return Resultado.falla(
        new ErrorDominio("La secuencia no tiene ningún bloque.")
      );
    }

    const bloqueActivo = (await db.bloque_entrenamiento.toArray()).find(
      (b) => b.estado === "activo" && !b.eliminado
    );
    let cursorInicio = bloqueActivo
      ? sumarDias(bloqueActivo.diaFin, 1)
      : obtenerDiaTareaHoy();

    const ahora = Date.now();
    let creados = 0;
    try {
      for (const [idx, item] of parsed.data.entries()) {
        const id = idBloque();
        const diaFin = sumarDias(cursorInicio, item.duracionSemanas * 7 - 1);
        const esPrimeroYNoHayActivo = idx === 0 && !bloqueActivo;
        const registro: BloqueEntrenamiento = {
          id,
          nombre: item.nombre,
          diaInicio: cursorInicio,
          diaFin,
          ejeProgresionDefault: item.ejeProgresionDefault,
          estado: esPrimeroYNoHayActivo ? "activo" : "planificado",
          rutinasProgramadas: [],
          eliminado: false,
          creadoEn: ahora,
          actualizadoEn: ahora,
        };
        await db.bloque_entrenamiento.add(registro);
        await QueueService.encolar("bloque_entrenamiento", "crear", id, {
          ...registro,
        });
        creados++;
        cursorInicio = sumarDias(diaFin, 1);
      }
      return Resultado.exito(creados);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al importar la secuencia de bloques."
        )
      );
    }
  }

  /**
   * Programa una Rutina en un Bloque con sus días de la semana — si esa
   * Rutina ya estaba programada en este Bloque, actualiza sus días (upsert,
   * nunca duplica la entrada); si no, la agrega. Para vincular a mano desde
   * la UI, sin pasar por el import combinado con IA.
   */
  public async programarRutina(
    input: ProgramarRutinaInput
  ): Promise<Resultado<void>> {
    const parsed = programarRutinaSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const bloque = await db.bloque_entrenamiento.get(parsed.data.bloqueId);
    if (!bloque) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el bloque.")
      );
    }
    const yaProgramada = bloque.rutinasProgramadas.some(
      (r) => r.plantillaId === parsed.data.plantillaId
    );
    const rutinasProgramadas = yaProgramada
      ? bloque.rutinasProgramadas.map((r) =>
          r.plantillaId === parsed.data.plantillaId
            ? { ...r, diasSemana: parsed.data.diasSemana }
            : r
        )
      : [
          ...bloque.rutinasProgramadas,
          {
            plantillaId: parsed.data.plantillaId,
            diasSemana: parsed.data.diasSemana,
          },
        ];
    const actualizadoEn = Date.now();
    try {
      await db.bloque_entrenamiento.update(parsed.data.bloqueId, {
        rutinasProgramadas,
        actualizadoEn,
      });
      await QueueService.encolar(
        "bloque_entrenamiento",
        "editar",
        parsed.data.bloqueId,
        { id: parsed.data.bloqueId, rutinasProgramadas, actualizadoEn }
      );
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al programar la rutina."
        )
      );
    }
  }

  /** Saca una Rutina programada de un Bloque (deja de tocar ese día — no borra ninguna sesión ya registrada). */
  public async quitarRutinaDelBloque(
    bloqueId: string,
    plantillaId: string
  ): Promise<Resultado<void>> {
    const bloque = await db.bloque_entrenamiento.get(bloqueId);
    if (!bloque) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el bloque.")
      );
    }
    const rutinasProgramadas = bloque.rutinasProgramadas.filter(
      (r) => r.plantillaId !== plantillaId
    );
    const actualizadoEn = Date.now();
    try {
      await db.bloque_entrenamiento.update(bloqueId, {
        rutinasProgramadas,
        actualizadoEn,
      });
      await QueueService.encolar("bloque_entrenamiento", "editar", bloqueId, {
        id: bloqueId,
        rutinasProgramadas,
        actualizadoEn,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al quitar la rutina."
        )
      );
    }
  }

  /**
   * Soft delete — NUNCA hard-delete: un Bloque puede tener RegistroActividad
   * reales encima (sesiones ya hechas), y esos no se tocan ni se pierden.
   * Si era el bloque activo, no se promueve ningún "planificado" en su
   * lugar automáticamente — el usuario decide si arranca uno nuevo.
   */
  public async eliminarBloque(id: string): Promise<Resultado<void>> {
    const bloque = await db.bloque_entrenamiento.get(id);
    if (!bloque) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el bloque.")
      );
    }
    const actualizadoEn = Date.now();
    try {
      await db.bloque_entrenamiento.update(id, {
        eliminado: true,
        actualizadoEn,
      });
      await QueueService.encolar("bloque_entrenamiento", "editar", id, {
        id,
        eliminado: true,
        actualizadoEn,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al eliminar el bloque."
        )
      );
    }
  }
}
