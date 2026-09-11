"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useOfflineContext } from "./OfflineProvider";
import { SyncService } from "../services/sync.service";
import { QueueService } from "../services/queue.service";
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
  const cantidadPendientes =
    useLiveQuery(async () => {
      const pendientes = await QueueService.obtenerPendientes();
      return pendientes.length;
    }) ?? 0;

  const sincronizarSilencioso = async () => {
    if (sincronizando) return;
    Promise.resolve().then(() => setSincronizando(true));
    try {
      const { fallidos } = await SyncService.sincronizar();
      if (fallidos > 0) {
        mostrarToast(
          `Sincronización parcial: ${fallidos} evento(s) con error, se reintentarán luego.`,
          "error"
        );
      }
    } catch {
      // Silencioso: es sincronización de fondo, no una acción que el usuario disparó.
      // Si sigue fallando, el indicador de "N pendientes" lo deja ver igual.
    } finally {
      Promise.resolve().then(() => setSincronizando(false));
    }
  };

  const forzarSincronizacion = async () => {
    if (sincronizando) return;
    Promise.resolve().then(() => setSincronizando(true));
    try {
      const { fallidos } = await SyncService.sincronizar();
      if (fallidos > 0) {
        mostrarToast(
          `Sincronización parcial: ${fallidos} evento(s) con error, se reintentarán luego.`,
          "error"
        );
      } else {
        mostrarToast("Sincronización completada con éxito.", "exito");
      }
    } catch {
      mostrarToast(
        "Error en la sincronización automática. Se reintentará luego.",
        "error"
      );
    } finally {
      Promise.resolve().then(() => setSincronizando(false));
    }
  };

  // Al reconectar: sincroniza y avisa (toast) — el usuario quiere saber que
  // lo que se acumuló offline ya subió.
  useEffect(() => {
    if (online) {
      void forzarSincronizacion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // Toda escritura se encola siempre (online u offline, ver QueueService.encolar
  // en los use-cases) — este efecto es lo que efectivamente la sube sin esperar
  // a que el usuario dispare nada: apenas aparece un evento pendiente estando
  // online, se procesa la cola en silencio.
  useEffect(() => {
    if (online && cantidadPendientes > 0 && !sincronizando) {
      void sincronizarSilencioso();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, cantidadPendientes]);

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
