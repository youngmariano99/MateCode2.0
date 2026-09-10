import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearTareaDiariaSchema,
  migrarTareaDiariaSchema,
  MAX_TAREAS_ENFOQUE_POR_DIA,
  MAX_TAREAS_MANTENIMIENTO_POR_DIA,
  type CrearTareaDiariaInput,
  type MigrarTareaDiariaInput,
  type TareaDiaria,
} from "../../../domain/entidades/personal.entity";

function idTareaDiaria(): string {
  return `tdi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Búnker del Enfoque: como máximo 1 tarea de enfoque profundo + 3 de
 * mantenimiento por día. El límite protege de la sobrecarga — está pensado
 * para que el sistema empuje a priorizar, no para trabar al usuario.
 */
export class GestionarBunkerUseCase {
  public async crearTareaDiaria(
    input: CrearTareaDiariaInput
  ): Promise<Resultado<string>> {
    const parsed = crearTareaDiariaSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }

    const activasDelDia = await db.tarea_diaria
      .where({ diaTarea: parsed.data.diaTarea, tipo: parsed.data.tipo })
      .and((t) => t.estado === "pendiente")
      .toArray();

    const limite =
      parsed.data.tipo === "enfoque"
        ? MAX_TAREAS_ENFOQUE_POR_DIA
        : MAX_TAREAS_MANTENIMIENTO_POR_DIA;

    if (activasDelDia.length >= limite) {
      return Resultado.falla(
        new ErrorDominio(
          "Para ingresar esta tarea, debés cancelar o migrar una de las existentes. Menos pero mejor."
        )
      );
    }

    const ahora = Date.now();
    const id = idTareaDiaria();
    const registro: TareaDiaria = {
      id,
      diaTarea: parsed.data.diaTarea,
      tipo: parsed.data.tipo,
      descripcion: parsed.data.descripcion.trim(),
      estado: "pendiente",
      origenInboxId: parsed.data.origenInboxId,
      origenPendienteId: parsed.data.origenPendienteId,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    try {
      await db.tarea_diaria.add(registro);
      await QueueService.encolar("tarea_diaria", "crear", id, { ...registro });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear la tarea."
        )
      );
    }
  }

  public async completarTarea(id: string): Promise<Resultado<void>> {
    return this.cambiarEstado(id, "completada");
  }

  public async cancelarTarea(id: string): Promise<Resultado<void>> {
    return this.cambiarEstado(id, "cancelada");
  }

  private async cambiarEstado(
    id: string,
    estado: "completada" | "cancelada"
  ): Promise<Resultado<void>> {
    const tarea = await db.tarea_diaria.get(id);
    if (!tarea) {
      return Resultado.falla(new ErrorNoEncontrado("No se encontró la tarea."));
    }
    const actualizadoEn = Date.now();
    try {
      await db.tarea_diaria.update(id, { estado, actualizadoEn });
      await QueueService.encolar("tarea_diaria", "editar", id, {
        id,
        estado,
        actualizadoEn,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al actualizar la tarea."
        )
      );
    }
  }

  /**
   * Migración intencional (Bullet Journal): la tarea original queda
   * marcada "migrada" (conserva su historia) y se crea una copia idéntica
   * en el nuevo día, en estado "pendiente" — transacción atómica para que
   * nunca quede la original migrada sin su copia nueva.
   */
  public async migrarTarea(
    input: MigrarTareaDiariaInput
  ): Promise<Resultado<string>> {
    const parsed = migrarTareaDiariaSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }

    const original = await db.tarea_diaria.get(parsed.data.id);
    if (!original) {
      return Resultado.falla(new ErrorNoEncontrado("No se encontró la tarea."));
    }

    const ahora = Date.now();
    const nuevoId = idTareaDiaria();
    const copia: TareaDiaria = {
      id: nuevoId,
      diaTarea: parsed.data.nuevoDiaTarea,
      tipo: original.tipo,
      descripcion: original.descripcion,
      estado: "pendiente",
      fechaMigradaDesde: original.diaTarea,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    try {
      await db.transaction(
        "rw",
        [db.tarea_diaria, db.cola_eventos],
        async () => {
          await db.tarea_diaria.update(original.id, {
            estado: "migrada",
            actualizadoEn: ahora,
          });
          await db.tarea_diaria.add(copia);
          await QueueService.encolar("tarea_diaria", "editar", original.id, {
            id: original.id,
            estado: "migrada",
            actualizadoEn: ahora,
          });
          await QueueService.encolar("tarea_diaria", "crear", nuevoId, {
            ...copia,
          });
        }
      );
      return Resultado.exito(nuevoId);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al migrar la tarea."
        )
      );
    }
  }
}
