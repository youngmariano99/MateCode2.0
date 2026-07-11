"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Icono } from "../icons";

export type ToastTipo = "exito" | "advertencia" | "error" | "info";

export interface ToastItem {
  id: string;
  mensaje: string;
  tipo: ToastTipo;
}

interface ToastContextType {
  mostrarToast: (mensaje: string, tipo?: ToastTipo) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const mostrarToast = useCallback(
    (mensaje: string, tipo: ToastTipo = "info") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, mensaje, tipo }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removerToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const IconosMap = {
    exito: Icono.Check,
    advertencia: Icono.Alert,
    error: Icono.Close,
    info: Icono.Info,
  };

  const ColoresMap = {
    exito: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    advertencia: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    error: "bg-red-500/10 border-red-500/20 text-red-400",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  };

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}

      <div className="pointer-events-none fixed right-6 bottom-6 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const ActiveIcon = IconosMap[toast.tipo];
          return (
            <div
              key={toast.id}
              className={`animate-in slide-in-from-bottom pointer-events-auto flex items-center justify-between rounded-xl border p-4 shadow-2xl backdrop-blur-md duration-300 ${
                ColoresMap[toast.tipo]
              }`}
            >
              <div className="flex items-center gap-3">
                <ActiveIcon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-semibold">{toast.mensaje}</span>
              </div>
              <button
                onClick={() => removerToast(toast.id)}
                className="ml-4 text-zinc-500 transition-all hover:text-zinc-300 focus:outline-none"
              >
                <Icono.Close className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de un ToastProvider");
  }
  return context;
};
