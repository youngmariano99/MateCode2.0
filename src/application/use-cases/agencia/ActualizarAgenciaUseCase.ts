import { Agencia } from "../../../domain/entidades/agencia.entity";
import { RepositorioAgencia } from "../../../domain/repositorios/repositorio-agencia";
import { Resultado } from "../../../shared/utilidades/resultado";
import { useConexionStore } from "../../../presentation/stores/conexion.store";
import { QueueService } from "../../../offline/services/queue.service";
import { db } from "../../../offline/dexie/db";

export class ActualizarAgenciaUseCase {
  constructor(private readonly repo: RepositorioAgencia) {}

  public async ejecutar(agencia: Agencia): Promise<Resultado<void>> {
    const online = useConexionStore.getState().online;

    await db.clientes.put({
      ...agencia,
    });

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `Agencia actualizada localmente: ${agencia.nombreComercial}`,
      fecha: Date.now(),
    });

    if (!online) {
      await QueueService.encolar(
        "agencias",
        "editar",
        agencia.id,
        agencia as unknown as Record<string, unknown>
      );
      return Resultado.exito(undefined);
    }

    return await this.repo.guardar(agencia);
  }
}
