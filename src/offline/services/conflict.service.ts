import { db } from "../dexie/db";
import { servidorTieneVersionMasNueva } from "../../shared/utilidades/resolucion-conflictos";

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

    if (
      servidorTieneVersionMasNueva(
        serverPayload.actualizadoEn,
        localPayload.actualizadoEn
      )
    ) {
      return serverPayload;
    }
    return localPayload;
  },
};
