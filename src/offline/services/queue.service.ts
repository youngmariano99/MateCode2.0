import { db, EventoPendiente } from "../dexie/db";

export const MAX_INTENTOS_SYNC = 5;

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

  registrarFallo: async (
    id: number,
    error: string
  ): Promise<EventoPendiente | undefined> => {
    const evento = await db.cola_eventos.get(id);
    if (!evento) return undefined;
    const intentos = (evento.intentos ?? 0) + 1;
    await db.cola_eventos.update(id, {
      intentos,
      ultimoError: error,
      ultimoIntentoEn: Date.now(),
    });
    return { ...evento, intentos, ultimoError: error };
  },
};
