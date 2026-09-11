import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { QueueService } from "../../../offline/services/queue.service";

export class ActualizarProyectoUseCase {
  public async ejecutar(
    id: string,
    proyecto: Record<string, unknown>
  ): Promise<Resultado<void>> {
    const payload = {
      ...proyecto,
      id,
      actualizadoEn: Date.now(),
    };

    await db.transaction("rw", [db.proyectos, db.cola_eventos], async () => {
      await db.proyectos.put(payload);
      await QueueService.encolar("proyectos", "editar", id, payload);
    });

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Proyectos: Proyecto actualizado: ${proyecto.nombre}`,
      fecha: Date.now(),
    });

    return Resultado.exito(undefined);
  }
}
