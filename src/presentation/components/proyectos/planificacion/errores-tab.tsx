"use client";

import React from "react";
import { PROMPT_DICCIONARIO_ERRORES } from "../constants/prompts";

interface ErroresTabProps {
  erroresMarkdown: string;
  setErroresMarkdown: (val: string) => void;
  mostrarToast: (msg: string, tipo: "exito" | "error" | "info") => void;
}

export const ErroresTab: React.FC<ErroresTabProps> = ({
  erroresMarkdown,
  setErroresMarkdown,
  mostrarToast,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
        <div>
          <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
            Diccionario de Errores de Negocio (ERRORS.md)
          </span>
          <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
            Copia el prompt para diseñar los códigos de error estandarizados,
            mensajes amigables y códigos HTTP.
          </p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(PROMPT_DICCIONARIO_ERRORES);
            mostrarToast("Prompt de Diccionario de Errores copiado.", "exito");
          }}
          className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
        >
          📋 Copiar Prompt Errores
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
          Códigos de Error & Diccionario (ERRORS.md)
        </label>
        <textarea
          value={erroresMarkdown}
          onChange={(e) => setErroresMarkdown(e.target.value)}
          placeholder="Pega aquí el diccionario de errores devuelto por la IA..."
          rows={15}
          className="border-zinc-850 w-full rounded border bg-zinc-950 p-3 font-mono text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
    </div>
  );
};
