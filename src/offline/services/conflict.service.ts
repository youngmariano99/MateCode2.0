import { db } from "../dexie/db";

export const ConflictService = {
  resolver: async (
    tabla: string,
    registroId: string,
    localPayload: Record<string, unknown>,
    serverPayload: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    await db.logs_sincronizacion.add({
      tipo: "conflicto",
      mensaje: `Conflicto detectado en tabla ${tabla} con ID ${registroId}. Lógica: Última modificación gana (Last Write Wins).`,
      fecha: Date.now(),
    });

    const localTime = (localPayload.actualizadoEn as number) || 0;
    const serverTime = (serverPayload.actualizadoEn as number) || 0;

    if (localTime >= serverTime) {
      return localPayload;
    }
    return serverPayload;
  },
};
