import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { QueueService } from "../../../offline/services/queue.service";
import { useConexionStore } from "../../../presentation/stores/conexion.store";

export class CrearDocumentoUseCase {
  public async ejecutar(
    documento: Record<string, unknown>
  ): Promise<Resultado<void>> {
    const online = useConexionStore.getState().online;
    const id = (documento.id as string) || `doc_${Date.now()}`;
    const payload = {
      ...documento,
      id,
      creadoEn: Date.now(),
      actualizadoEn: Date.now(),
      versiones: [
        {
          version: 1,
          fecha: Date.now(),
          autor: "Mariano",
          contenido: documento.contenido || "",
          comentario: "Versión Inicial",
        },
      ],
    };

    await db.documentos.put(payload);

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Documentos: Documento inteligente creado: ${documento.titulo}`,
      fecha: Date.now(),
    });

    if (!online) {
      await QueueService.encolar("documentos", "crear", id, payload);
    }

    return Resultado.exito(undefined);
  }
}
