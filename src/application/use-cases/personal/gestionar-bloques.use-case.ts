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
  type CrearBloqueInput,
  type BloqueEntrenamiento,
  type ImportarSecuenciaBloquesInput,
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
      plantillaIds: parsed.data.plantillaIds,
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
      (b) => b.estado === "activo"
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
          plantillaIds: [],
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
   * Agrega Rutinas (por id) a un Bloque ya existente, sin duplicar las que
   * ya estaban vinculadas — para vincular a mano desde la UI, sin pasar por
   * el import combinado con IA.
   */
  public async vincularRutinas(
    bloqueId: string,
    plantillaIds: string[]
  ): Promise<Resultado<void>> {
    const bloque = await db.bloque_entrenamiento.get(bloqueId);
    if (!bloque) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el bloque.")
      );
    }
    const combinados = Array.from(
      new Set([...bloque.plantillaIds, ...plantillaIds])
    );
    const actualizadoEn = Date.now();
    try {
      await db.bloque_entrenamiento.update(bloqueId, {
        plantillaIds: combinados,
        actualizadoEn,
      });
      await QueueService.encolar("bloque_entrenamiento", "editar", bloqueId, {
        id: bloqueId,
        plantillaIds: combinados,
        actualizadoEn,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al vincular la rutina."
        )
      );
    }
  }
}
