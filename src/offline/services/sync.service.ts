import { db } from "../dexie/db";
import { QueueService } from "./queue.service";
import { HttpClient } from "../../presentation/services/http-client";

export const SyncService = {
  sincronizar: async (onProgress?: (msg: string) => void): Promise<void> => {
    const pendientes = await QueueService.obtenerPendientes();
    if (pendientes.length === 0) return;

    if (onProgress) onProgress("Iniciando sincronización...");
    await db.logs_sincronizacion.add({
      tipo: "inicio",
      mensaje: `Sincronizando ${pendientes.length} eventos pendientes...`,
      fecha: Date.now(),
    });

    for (const evento of pendientes) {
      try {
        if (onProgress)
          onProgress(`Sincronizando ${evento.accion} en ${evento.tabla}...`);

        const url = `/sync/${evento.tabla}`;
        await HttpClient.post(url, {
          accion: evento.accion,
          registroId: evento.registroId,
          payload: evento.payload,
        });

        if (evento.id !== undefined) {
          await QueueService.eliminar(evento.id);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await db.logs_sincronizacion.add({
          tipo: "error",
          mensaje: `Error al sincronizar evento ${evento.id}: ${errorMsg}`,
          fecha: Date.now(),
        });
        throw err;
      }
    }

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: "Sincronización finalizada con éxito.",
      fecha: Date.now(),
    });
    if (onProgress) onProgress("Sincronización finalizada.");
  },

  respaldarTodoEnSupabase: async (
    onProgress?: (msg: string) => void
  ): Promise<void> => {
    if (onProgress) onProgress("Leyendo datos locales...");

    // Leer tablas principales deIndexedDB
    const proyectos = await db.proyectos.toArray();
    const epicas = await db.epicas.toArray();
    const sprints = await db.sprints.toArray();
    const historias = await db.historias.toArray();
    const tareas = await db.tareas.toArray();
    const taskExecutions = await db.task_executions.toArray();
    const proyectoContexto = await db.proyecto_contexto.toArray();
    const proyectoDesignSystem = await db.proyecto_design_system.toArray();
    const proyectoEstadoTecnico = await db.proyecto_estado_tecnico.toArray();

    // Tablas CRM
    const clientes = await db.clientes.toArray();
    const contactos = await db.contactos.toArray();
    const contratos = await db.contratos.toArray();
    const pagos = await db.pagos.toArray();

    if (onProgress) onProgress("Subiendo respaldo a la nube...");

    await HttpClient.post("/sync/bulk", {
      proyectos,
      epicas,
      sprints,
      historias,
      tareas,
      task_executions: taskExecutions,
      proyecto_contexto: proyectoContexto,
      proyecto_design_system: proyectoDesignSystem,
      proyecto_estado_tecnico: proyectoEstadoTecnico,
      clientes,
      contactos,
      contratos,
      pagos,
    });

    if (onProgress) onProgress("Respaldo completado.");
  },
};
