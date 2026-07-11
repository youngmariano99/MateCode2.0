import { useEffect } from "react";
import { useConexionStore } from "../stores/conexion.store";

export function useOnline() {
  const online = useConexionStore((state) => state.online);
  const setOnline = useConexionStore((state) => state.setOnline);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline]);

  return online;
}
