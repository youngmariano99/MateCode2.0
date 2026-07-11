import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { QueueService } from "../../../offline/services/queue.service";
import { useConexionStore } from "../../../presentation/stores/conexion.store";

export class ActualizarDocumentoUseCase {
  public async ejecutar(
    id: string,
    documento: Record<string, unknown>,
    comentarioCambio?: string
  ): Promise<Resultado<void>> {
    const online = useConexionStore.getState().online;

    const prev = await db.documentos.get(id);
    const versiones = prev?.versiones
      ? [...(prev.versiones as Record<string, unknown>[])]
      : [];

    const lastVer = versiones[versiones.length - 1];
    const contentChanged = lastVer?.contenido !== documento.contenido;

    if (contentChanged) {
      versiones.push({
        version: versiones.length + 1,
        fecha: Date.now(),
        autor: "Mariano",
        contenido: documento.contenido || "",
        comentario: comentarioCambio || `Edición v${versiones.length + 1}`,
      });
    }

    const payload = {
      ...documento,
      id,
      versiones,
      actualizadoEn: Date.now(),
    };

    await db.documentos.put(payload);

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Documentos: Documento inteligente actualizado: ${documento.titulo}`,
      fecha: Date.now(),
    });

    if (!online) {
      await QueueService.encolar("documentos", "editar", id, payload);
    }

    return Resultado.exito(undefined);
  }
}
