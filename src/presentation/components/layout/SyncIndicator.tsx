"use client";

import React from "react";
import { useOffline } from "../../../offline/hooks/useOffline";
import { useSync } from "../../../offline/hooks/useSync";
import { useQueue } from "../../../offline/hooks/useQueue";

export const SyncIndicator: React.FC = () => {
  const { online } = useOffline();
  const { sincronizando } = useSync();
  const { cantidadPendientes } = useQueue();

  return (
    <div className="flex items-center gap-2 select-none">
      <div
        className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
          sincronizando
            ? "animate-pulse bg-amber-400 shadow-md shadow-amber-500/50"
            : !online
              ? "bg-red-500"
              : "bg-emerald-500 shadow-md shadow-emerald-500/50"
        }`}
      />
      <span className="font-mono text-xs font-bold text-zinc-400">
        {sincronizando
          ? "Sincronizando..."
          : !online
            ? "Sin conexión"
            : cantidadPendientes > 0
              ? `${cantidadPendientes} pendiente${
                  cantidadPendientes > 1 ? "s" : ""
                }`
              : "Conectado"}
      </span>
    </div>
  );
};
