"use client";

import React from "react";
import { Card } from "../card";
import { useOffline } from "../../../offline/hooks/useOffline";
import { useQueue } from "../../../offline/hooks/useQueue";

export const WidgetMonitoreo: React.FC = () => {
  const { online } = useOffline();
  const { cantidadPendientes } = useQueue();

  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-4">
        <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
          Estado del Workspace
        </h3>
        <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
          Sincronización, IA y estado de sistemas
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3">
          <div>
            <span className="block text-xs font-bold text-zinc-300">
              Sincronización local
            </span>
            <span className="mt-0.5 block font-mono text-[10px] text-zinc-500">
              {online ? "Conectado al servidor" : "Operando offline"}
            </span>
          </div>
          <span
            className={`rounded border px-2 py-0.5 font-mono text-xs font-bold ${
              cantidadPendientes > 0
                ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {cantidadPendientes > 0
              ? `${cantidadPendientes} pendientes`
              : "Al día"}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3">
          <div>
            <span className="block text-xs font-bold text-zinc-300">
              Proveedor de IA
            </span>
            <span className="mt-0.5 block font-mono text-[10px] text-zinc-500">
              Google Gemini - Pro
            </span>
          </div>
          <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">
            Activo
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3">
          <div>
            <span className="block text-xs font-bold text-zinc-300">
              Versión de MateCode
            </span>
            <span className="mt-0.5 block font-mono text-[10px] text-zinc-500">
              Versión estable 2.0.0
            </span>
          </div>
          <span className="font-mono text-[10px] text-zinc-500">v2.0</span>
        </div>
      </div>
    </Card>
  );
};
