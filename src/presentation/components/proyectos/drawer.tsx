"use client";

import React, { useEffect } from "react";
import { Icono } from "../icons";

interface DrawerProps {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar?: () => void | Promise<void>;
  titulo: string;
  confirmLabel?: string;
  cancelLabel?: string;
  cargando?: boolean;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  abierto,
  onCerrar,
  onConfirmar,
  titulo,
  confirmLabel = "Guardar Cambios",
  cancelLabel = "Cancelar",
  cargando = false,
  children,
}) => {
  // Listen for ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && abierto) {
        onCerrar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [abierto, onCerrar]);

  // Disable body scroll when drawer is open
  useEffect(() => {
    if (abierto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      {/* Dark backdrop overlay */}
      <div
        onClick={onCerrar}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
      />

      {/* Spacious Modal panel */}
      <div className="animate-in zoom-in-95 relative z-10 flex h-[88vh] w-full max-w-6xl flex-col rounded-3xl border border-[#2A2A2E] bg-[#121214] shadow-2xl duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2A2E] px-6 py-4.5">
          <div>
            <h3 className="font-mono text-sm font-extrabold tracking-tight text-white uppercase">
              {titulo}
            </h3>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800/80 hover:text-zinc-200"
          >
            <Icono.Close className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 scrollbar-thin scrollbar-thumb-zinc-800 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer actions */}
        {onConfirmar && (
          <div className="flex items-center justify-end gap-3 border-t border-[#2A2A2E] bg-zinc-950/40 px-6 py-4">
            <button
              onClick={onCerrar}
              disabled={cargando}
              className="rounded-xl border border-zinc-800 bg-transparent px-4 py-2 font-mono text-xs font-bold text-zinc-300 transition-all select-none hover:bg-zinc-900 hover:text-zinc-100 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirmar}
              disabled={cargando}
              className="flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 font-mono text-xs font-bold text-black transition-all select-none hover:bg-emerald-400 disabled:opacity-50"
            >
              {cargando ? "Guardando..." : confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
