import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearBloqueSchema,
  type CrearBloqueInput,
  type BloqueEntrenamiento,
} from "../../../domain/entidades/rutina.entity";

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
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al cerrar el bloque."
        )
      );
    }
  }
}
