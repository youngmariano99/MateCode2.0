import { useLiveQuery } from "dexie-react-hooks";
import { QueueService } from "../services/queue.service";

export function useQueue() {
  const eventos = useLiveQuery(() => QueueService.obtenerPendientes()) || [];

  const vaciarCola = async () => {
    await QueueService.vaciar();
  };

  return {
    eventos,
    tienePendientes: eventos.length > 0,
    cantidadPendientes: eventos.length,
    vaciarCola,
  };
}
