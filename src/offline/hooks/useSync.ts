import { useSyncContext } from "../providers/SyncProvider";

export function useSync() {
  const { sincronizando, forzarSincronizacion } = useSyncContext();
  return {
    sincronizando,
    forzarSincronizacion,
  };
}
