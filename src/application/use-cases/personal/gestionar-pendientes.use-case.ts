import { db } from "../../../offline/dexie/db";
import { QueueService } from "../../../offline/services/queue.service";
import { Resultado } from "../../../shared/utilidades/resultado";
import {
  ErrorDominio,
  ErrorNoEncontrado,
} from "../../../domain/errores/error-base";
import {
  crearTareaPendienteSchema,
  type CrearTareaPendienteInput,
  type TareaPendiente,
  type TipoTareaDiaria,
} from "../../../domain/entidades/personal.entity";
import { GestionarBunkerUseCase } from "./gestionar-bunker.use-case";

function idTareaPendiente(): string {
  return `tpe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Backlog de todo lo que sí o sí hay que hacer pero no entra en el
 * compromiso diario del Búnker — triage de 3 niveles (Urgente / Importante
 * / Puede esperar), para no perder de vista algo real solo por estar fuera
 * del top del día.
 */
export class GestionarPendientesUseCase {
  private readonly bunker = new GestionarBunkerUseCase();

  public async crearPendiente(
    input: CrearTareaPendienteInput
  ): Promise<Resultado<string>> {
    const parsed = crearTareaPendienteSchema.safeParse(input);
    if (!parsed.success) {
      return Resultado.falla(new ErrorDominio(parsed.error.issues[0].message));
    }
    const ahora = Date.now();
    const id = idTareaPendiente();
    const registro: TareaPendiente = {
      id,
      descripcion: parsed.data.descripcion.trim(),
      prioridad: parsed.data.prioridad,
      area: parsed.data.area,
      estado: "pendiente",
      origenInboxId: parsed.data.origenInboxId,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    try {
      await db.tarea_pendiente.add(registro);
      await QueueService.encolar("tarea_pendiente", "crear", id, {
        ...registro,
      });
      return Resultado.exito(id);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error ? err.message : "Error al crear el pendiente."
        )
      );
    }
  }

  public async completarPendiente(id: string): Promise<Resultado<void>> {
    return this.cambiarEstado(id, "completada");
  }

  public async descartarPendiente(id: string): Promise<Resultado<void>> {
    return this.cambiarEstado(id, "descartada");
  }

  private async cambiarEstado(
    id: string,
    estado: "completada" | "descartada"
  ): Promise<Resultado<void>> {
    const pendiente = await db.tarea_pendiente.get(id);
    if (!pendiente) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el pendiente.")
      );
    }
    const actualizadoEn = Date.now();
    try {
      await db.tarea_pendiente.update(id, { estado, actualizadoEn });
      await QueueService.encolar("tarea_pendiente", "editar", id, {
        id,
        estado,
        actualizadoEn,
      });
      return Resultado.exito(undefined);
    } catch (err) {
      return Resultado.falla(
        new ErrorDominio(
          err instanceof Error
            ? err.message
            : "Error al actualizar el pendiente."
        )
      );
    }
  }

  /**
   * Promueve un pendiente al Búnker del día — respeta el mismo límite de
   * 1 enfoque + 3 mantenimiento (si no hay lugar, el pendiente queda
   * intacto y se informa el motivo, no se pierde nada).
   */
  public async promoverABunker(
    id: string,
    diaTarea: string,
    tipo: TipoTareaDiaria
  ): Promise<Resultado<string>> {
    const pendiente = await db.tarea_pendiente.get(id);
    if (!pendiente) {
      return Resultado.falla(
        new ErrorNoEncontrado("No se encontró el pendiente.")
      );
    }

    const resultado = await this.bunker.crearTareaDiaria({
      diaTarea,
      tipo,
      descripcion: pendiente.descripcion,
      origenPendienteId: id,
    });
    if (!resultado.ok) return resultado;

    const actualizadoEn = Date.now();
    await db.tarea_pendiente.update(id, {
      estado: "promovida",
      actualizadoEn,
    });
    await QueueService.encolar("tarea_pendiente", "editar", id, {
      id,
      estado: "promovida",
      actualizadoEn,
    });
    return resultado;
  }
}
