import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { QueueService } from "../../../offline/services/queue.service";

export class GestionarTareaUseCase {
  public async crearTarea(
    tarea: Record<string, unknown>
  ): Promise<Resultado<void>> {
    const id = (tarea.id as string) || `tar_${Date.now()}`;
    const payload = {
      ...tarea,
      id,
      creadoEn: Date.now(),
      actualizadoEn: Date.now(),
    };

    await db.transaction("rw", [db.tareas, db.cola_eventos], async () => {
      await db.tareas.put(payload);
      await QueueService.encolar("tareas", "crear", id, payload);
    });

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Tareas: Tarea creada: ${tarea.titulo}`,
      fecha: Date.now(),
    });

    return Resultado.exito(undefined);
  }

  public async actualizarTarea(
    id: string,
    tarea: Record<string, unknown>
  ): Promise<Resultado<void>> {
    const payload = {
      ...tarea,
      id,
      actualizadoEn: Date.now(),
    };

    await db.transaction("rw", [db.tareas, db.cola_eventos], async () => {
      await db.tareas.put(payload);
      await QueueService.encolar("tareas", "editar", id, payload);
    });

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Tareas: Tarea actualizada: ${tarea.titulo}`,
      fecha: Date.now(),
    });

    return Resultado.exito(undefined);
  }

  public async eliminarTarea(id: string): Promise<Resultado<void>> {
    const tar = await db.tareas.get(id);

    await db.transaction("rw", [db.tareas, db.cola_eventos], async () => {
      await db.tareas.delete(id);
      await QueueService.encolar("tareas", "eliminar", id, {});
    });

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Tareas: Tarea eliminada: ${tar?.titulo || id}`,
      fecha: Date.now(),
    });

    return Resultado.exito(undefined);
  }
}
