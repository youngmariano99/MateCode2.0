import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { QueueService } from "../../../offline/services/queue.service";
import { useConexionStore } from "../../../presentation/stores/conexion.store";

export class CrearProyectoUseCase {
  public async ejecutar(
    proyecto: Record<string, unknown>
  ): Promise<Resultado<void>> {
    const online = useConexionStore.getState().online;
    const id = (proyecto.id as string) || `pro_${Date.now()}`;
    const payload = {
      ...proyecto,
      id,
      creadoEn: Date.now(),
      actualizadoEn: Date.now(),
    };

    await db.proyectos.put(payload);

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Proyectos: Proyecto creado: ${proyecto.nombre}`,
      fecha: Date.now(),
    });

    if (!online) {
      await QueueService.encolar("proyectos", "crear", id, payload);
    }

    return Resultado.exito(undefined);
  }
}
