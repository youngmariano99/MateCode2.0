import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { QueueService } from "../../../offline/services/queue.service";
import { useConexionStore } from "../../../presentation/stores/conexion.store";

export class ActualizarProyectoUseCase {
  public async ejecutar(
    id: string,
    proyecto: Record<string, unknown>
  ): Promise<Resultado<void>> {
    const online = useConexionStore.getState().online;
    const payload = {
      ...proyecto,
      id,
      actualizadoEn: Date.now(),
    };

    await db.proyectos.put(payload);

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Proyectos: Proyecto actualizado: ${proyecto.nombre}`,
      fecha: Date.now(),
    });

    if (!online) {
      await QueueService.encolar("proyectos", "editar", id, payload);
    }

    return Resultado.exito(undefined);
  }
}
