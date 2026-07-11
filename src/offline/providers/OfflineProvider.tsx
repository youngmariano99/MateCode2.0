"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useOnline } from "../../presentation/hooks/useOnline";

interface OfflineContextType {
  online: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const online = useOnline();

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          let cleaned = false;
          const promises = registrations.map((reg) =>
            reg.unregister().then((ok) => {
              if (ok) cleaned = true;
            })
          );
          Promise.all(promises).then(() => {
            if (cleaned) {
              if (window.caches) {
                caches.keys().then((keys) => {
                  Promise.all(keys.map((k) => caches.delete(k))).then(() => {
                    console.log(
                      "Service Worker y Caché limpiados en desarrollo."
                    );
                    window.location.reload();
                  });
                });
              } else {
                window.location.reload();
              }
            }
          });
        });
      } else {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("Service Worker registrado con éxito en:", reg.scope);
          })
          .catch((err) => {
            console.error("Error al registrar Service Worker:", err);
          });
      }
    }
  }, []);

  const contextValue = useMemo(() => ({ online }), [online]);

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOfflineContext = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error(
      "useOfflineContext debe usarse dentro de un OfflineProvider"
    );
  }
  return context;
};
