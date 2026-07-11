import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { QueueService } from "../../../offline/services/queue.service";
import { useConexionStore } from "../../../presentation/stores/conexion.store";

export class RegistrarVisitaUseCase {
  public async ejecutar(
    visita: Record<string, unknown>
  ): Promise<Resultado<void>> {
    const online = useConexionStore.getState().online;
    const id = (visita.id as string) || `vis_${Date.now()}`;
    const payload = {
      ...visita,
      id,
      creadoEn: Date.now(),
    };

    await db.visitas.put(payload);

    const cId = visita.clienteId as string;
    const cli = await db.clientes.get(cId);
    if (cli) {
      const historial = Array.isArray(cli.historialVisitas)
        ? [...cli.historialVisitas]
        : [];

      historial.push({
        fecha: Date.now(),
        resultado: visita.resultado || "Visita realizada",
        notas: visita.notas || "",
      });

      await db.clientes.put({
        ...cli,
        historialVisitas: historial,
        ultimaVisita: Date.now(),
      });
    }

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Territorio: Visita registrada para cliente ${cId}`,
      fecha: Date.now(),
    });

    if (!online) {
      await QueueService.encolar("visitas", "crear", id, payload);
    }

    return Resultado.exito(undefined);
  }
}
