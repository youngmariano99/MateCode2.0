"use client";

import React from "react";

interface EntidadesTabProps {
  entidades: string;
  setEntidades: (val: string) => void;
  copiarPromptEntidades: () => void;
}

export const EntidadesTab: React.FC<EntidadesTabProps> = ({
  entidades,
  setEntidades,
  copiarPromptEntidades,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
        <div>
          <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
            Modelado de Datos 3FN con IA
          </span>
          <p className="font-mono text-[9px] text-zinc-500">
            A partir de los requisitos funcionales, genera las tablas en 3FN con
            nomenclatura en español latino.
          </p>
        </div>
        <button
          onClick={copiarPromptEntidades}
          className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
        >
          📋 Copiar Prompt Entidades
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
          Especificación de Entidades y Campos (3FN)
        </label>
        <textarea
          value={entidades}
          onChange={(e) => setEntidades(e.target.value)}
          placeholder="Pegar aquí la especificación de entidades devuelta por la IA..."
          rows={12}
          className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-300 outline-none"
        />
      </div>
    </div>
  );
};
