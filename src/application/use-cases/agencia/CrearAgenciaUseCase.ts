import { Agencia } from "../../../domain/entidades/agencia.entity";
import { RepositorioAgencia } from "../../../domain/repositorios/repositorio-agencia";
import { Resultado } from "../../../shared/utilidades/resultado";
import { useConexionStore } from "../../../presentation/stores/conexion.store";
import { QueueService } from "../../../offline/services/queue.service";
import { db } from "../../../offline/dexie/db";

export class CrearAgenciaUseCase {
  constructor(private readonly repo: RepositorioAgencia) {}

  public async ejecutar(agencia: Agencia): Promise<Resultado<void>> {
    const online = useConexionStore.getState().online;
    const payload = agencia as unknown as Record<string, unknown>;

    if (!online) {
      await db.transaction("rw", [db.clientes, db.cola_eventos], async () => {
        await db.clientes.put({ ...agencia });
        await QueueService.encolar("agencias", "crear", agencia.id, payload);
      });
      await db.logs_sincronizacion.add({
        tipo: "exito",
        mensaje: `Agencia creada localmente: ${agencia.nombreComercial}`,
        fecha: Date.now(),
      });
      return Resultado.exito(undefined);
    }

    await db.clientes.put({ ...agencia });
    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Agencia creada localmente: ${agencia.nombreComercial}`,
      fecha: Date.now(),
    });

    const resultado = await this.repo.guardar(agencia);
    if (!resultado.ok) {
      // El escritor directo falló pese a estar "online" (hiccup de red) —
      // no perder el alta, queda pendiente de reintento por la cola.
      await QueueService.encolar("agencias", "crear", agencia.id, payload);
      return Resultado.exito(undefined);
    }
    return resultado;
  }
}
