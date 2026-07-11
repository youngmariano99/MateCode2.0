import { useOfflineContext } from "../providers/OfflineProvider";

export function useOffline() {
  const { online } = useOfflineContext();
  return {
    offline: !online,
    online,
  };
}
