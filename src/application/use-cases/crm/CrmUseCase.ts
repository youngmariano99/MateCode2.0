import { db } from "../../../offline/dexie/db";
import { Resultado } from "../../../shared/utilidades/resultado";
import { QueueService } from "../../../offline/services/queue.service";
import { useConexionStore } from "../../../presentation/stores/conexion.store";

export class CrmUseCase {
  public async crearCliente(
    cliente: Record<string, unknown>
  ): Promise<Resultado<void>> {
    const online = useConexionStore.getState().online;
    const id = (cliente.id as string) || `cli_${Date.now()}`;
    const payload = {
      ...cliente,
      id,
      creadoEn: Date.now(),
      actualizadoEn: Date.now(),
    };

    await db.clientes.put(payload);

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `CRM: Cliente creado: ${cliente.nombre || cliente.empresa}`,
      fecha: Date.now(),
    });

    if (!online) {
      await QueueService.encolar("clientes", "crear", id, payload);
    }

    return Resultado.exito(undefined);
  }

  public async actualizarCliente(
    id: string,
    cliente: Record<string, unknown>
  ): Promise<Resultado<void>> {
    const online = useConexionStore.getState().online;
    const payload = { ...cliente, id, actualizadoEn: Date.now() };

    await db.clientes.put(payload);

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `CRM: Cliente actualizado: ${cliente.nombre || cliente.empresa}`,
      fecha: Date.now(),
    });

    if (!online) {
      await QueueService.encolar("clientes", "editar", id, payload);
    }

    return Resultado.exito(undefined);
  }

  public async eliminarCliente(id: string): Promise<Resultado<void>> {
    const online = useConexionStore.getState().online;
    const cli = await db.clientes.get(id);

    await db.clientes.delete(id);

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `CRM: Cliente eliminado: ${cli?.nombre || cli?.empresa || id}`,
      fecha: Date.now(),
    });

    if (!online) {
      await QueueService.encolar("clientes", "eliminar", id, {});
    }

    return Resultado.exito(undefined);
  }

  public async cambiarEstadoMasivo(
    ids: string[],
    nuevoEstado: string
  ): Promise<Resultado<void>> {
    const online = useConexionStore.getState().online;

    for (const id of ids) {
      const cli = await db.clientes.get(id);
      if (cli) {
        cli.estado = nuevoEstado;
        cli.actualizadoEn = Date.now();
        await db.clientes.put(cli);
        if (!online) {
          await QueueService.encolar("clientes", "editar", id, cli);
        }
      }
    }

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `CRM: Cambio de estado masivo a '${nuevoEstado}' para ${ids.length} clientes`,
      fecha: Date.now(),
    });

    return Resultado.exito(undefined);
  }

  public async asignarResponsableMasivo(
    ids: string[],
    responsable: string
  ): Promise<Resultado<void>> {
    const online = useConexionStore.getState().online;

    for (const id of ids) {
      const cli = await db.clientes.get(id);
      if (cli) {
        cli.responsable = responsable;
        cli.actualizadoEn = Date.now();
        await db.clientes.put(cli);
        if (!online) {
          await QueueService.encolar("clientes", "editar", id, cli);
        }
      }
    }

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `CRM: Responsable asignado masivamente a '${responsable}' para ${ids.length} clientes`,
      fecha: Date.now(),
    });

    return Resultado.exito(undefined);
  }

  public async agregarEtiquetasMasivas(
    ids: string[],
    etiquetas: string[]
  ): Promise<Resultado<void>> {
    const online = useConexionStore.getState().online;

    for (const id of ids) {
      const cli = await db.clientes.get(id);
      if (cli) {
        const actual = (cli.etiquetas as string[]) || [];
        const unicas = Array.from(new Set([...actual, ...etiquetas]));
        cli.etiquetas = unicas;
        cli.actualizadoEn = Date.now();
        await db.clientes.put(cli);
        if (!online) {
          await QueueService.encolar("clientes", "editar", id, cli);
        }
      }
    }

    await db.logs_sincronizacion.add({
      tipo: "exito",
      mensaje: `CRM: Etiquetas agregadas masivamente para ${ids.length} clientes`,
      fecha: Date.now(),
    });

    return Resultado.exito(undefined);
  }
}
