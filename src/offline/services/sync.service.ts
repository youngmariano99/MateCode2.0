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
};
