import { db, EventoPendiente } from "../dexie/db";

export const QueueService = {
  encolar: async (
    tabla: string,
    accion: "crear" | "editar" | "eliminar",
    registroId: string,
    payload: Record<string, unknown>
  ): Promise<number> => {
    const evento: EventoPendiente = {
      tabla,
      accion,
      registroId,
      payload,
      fecha: Date.now(),
    };
    return await db.cola_eventos.add(evento);
  },

  obtenerPendientes: async (): Promise<EventoPendiente[]> => {
    return await db.cola_eventos.orderBy("id").toArray();
  },

  eliminar: async (id: number): Promise<void> => {
    await db.cola_eventos.delete(id);
  },

  vaciar: async (): Promise<void> => {
    await db.cola_eventos.clear();
  },
};
