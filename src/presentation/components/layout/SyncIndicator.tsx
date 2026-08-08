"use client";

import React, { useState } from "react";
import { useOffline } from "../../../offline/hooks/useOffline";
import { useSync } from "../../../offline/hooks/useSync";
import { useQueue } from "../../../offline/hooks/useQueue";
import { CloudUpload } from "lucide-react";
import { useToast } from "../../../presentation/hooks/useToast";
import { SyncService } from "../../../offline/services/sync.service";

export const SyncIndicator: React.FC = () => {
  const { online } = useOffline();
  const { sincronizando } = useSync();
  const { cantidadPendientes } = useQueue();
  const { mostrarToast } = useToast();
  const [respaldando, setRespaldando] = useState(false);

  const handleRespaldarCompleto = async () => {
    if (respaldando) return;
    if (!online) {
      mostrarToast("No hay conexión a internet para respaldar.", "error");
      return;
    }

    setRespaldando(true);
    try {
      await SyncService.respaldarTodoEnSupabase((msg) => {
        mostrarToast(msg, "info");
      });
      mostrarToast(
        "¡Respaldo completo guardado en Supabase con éxito!",
        "exito"
      );
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      mostrarToast(`Error al respaldar en Supabase: ${message}`, "error");
    } finally {
      setRespaldando(false);
    }
  };

  return (
    <div className="flex items-center gap-4 select-none">
      <div className="flex items-center gap-2">
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

      {online && (
        <button
          onClick={handleRespaldarCompleto}
          disabled={respaldando}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-zinc-300 transition-all duration-200 hover:bg-zinc-800 hover:text-white ${
            respaldando
              ? "animate-pulse cursor-not-allowed opacity-50"
              : "cursor-pointer"
          }`}
          title="Respaldar todos los datos locales en Supabase"
        >
          <CloudUpload className="h-3.5 w-3.5" />
          <span>{respaldando ? "Respaldando..." : "Respaldar Nube"}</span>
        </button>
      )}
    </div>
  );
};
