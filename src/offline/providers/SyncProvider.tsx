"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useOfflineContext } from "./OfflineProvider";
import { SyncService } from "../services/sync.service";
import { useToast } from "../../presentation/hooks/useToast";

interface SyncContextType {
  sincronizando: boolean;
  forzarSincronizacion: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { online } = useOfflineContext();
  const { mostrarToast } = useToast();
  const [sincronizando, setSincronizando] = useState(false);

  const forzarSincronizacion = async () => {
    if (sincronizando) return;
    Promise.resolve().then(() => setSincronizando(true));
    try {
      await SyncService.sincronizar();
      mostrarToast("Sincronización completada con éxito.", "exito");
    } catch {
      mostrarToast(
        "Error en la sincronización automática. Se reintentará luego.",
        "error"
      );
    } finally {
      Promise.resolve().then(() => setSincronizando(false));
    }
  };

  useEffect(() => {
    if (online) {
      void forzarSincronizacion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return (
    <SyncContext.Provider value={{ sincronizando, forzarSincronizacion }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncContext debe usarse dentro de un SyncProvider");
  }
  return context;
};
