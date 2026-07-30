"use client";

import React from "react";
interface SeedsTabProps {
  seedMarkdown: string;
  setSeedMarkdown: (val: string) => void;
  copiarPromptSeedData: () => void;
}

export const SeedsTab: React.FC<SeedsTabProps> = ({
  seedMarkdown,
  setSeedMarkdown,
  copiarPromptSeedData,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
        <div>
          <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
            Planificación de Datos Semilla (SEED.md)
          </span>
          <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
            Diseña la estrategia de volumen de pruebas desafiantes para filtros,
            paginación y test de estrés.
          </p>
        </div>
        <button
          onClick={copiarPromptSeedData}
          className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
        >
          📋 Copiar Prompt Seeds
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
          Estrategia y Scripts Fixtures (SEED.md)
        </label>
        <textarea
          value={seedMarkdown}
          onChange={(e) => setSeedMarkdown(e.target.value)}
          placeholder="Pega aquí el plan y código de siembra devuelto por la IA..."
          rows={15}
          className="border-zinc-850 w-full rounded border bg-zinc-950 p-3 font-mono text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
    </div>
  );
};
