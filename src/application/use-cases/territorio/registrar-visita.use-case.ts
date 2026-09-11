import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { QueueService } from "../../../offline/services/queue.service";

export class RegistrarVisitaUseCase {
  public async ejecutar(
    visita: Record<string, unknown>
  ): Promise<Resultado<void>> {
    const id = (visita.id as string) || `vis_${Date.now()}`;
    const payload = {
      ...visita,
      id,
      creadoEn: Date.now(),
    };

    const cId = visita.clienteId as string;

    await db.transaction(
      "rw",
      [db.visitas, db.clientes, db.cola_eventos],
      async () => {
        await db.visitas.put(payload);
        await QueueService.encolar("visitas", "crear", id, payload);

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

          const clientePayload = {
            ...cli,
            historialVisitas: historial,
            ultimaVisita: Date.now(),
          };
          await db.clientes.put(clientePayload);
          await QueueService.encolar("clientes", "editar", cId, clientePayload);
        }
      }
    );

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Territorio: Visita registrada para cliente ${cId}`,
      fecha: Date.now(),
    });

    return Resultado.exito(undefined);
  }
}
