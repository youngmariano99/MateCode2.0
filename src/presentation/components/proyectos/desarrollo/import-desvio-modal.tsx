"use client";

import React from "react";
interface ImportDesvioModalProps {
  isOpen: boolean;
  onClose: () => void;
  desvioJsonText: string;
  setDesvioJsonText: (text: string) => void;
  handleImportarDesvio: () => void;
  copiarPromptDesvio: () => void;
}

export const ImportDesvioModal: React.FC<ImportDesvioModalProps> = ({
  isOpen,
  onClose,
  desvioJsonText,
  setDesvioJsonText,
  handleImportarDesvio,
  copiarPromptDesvio,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm">
      <div className="border-zinc-850 flex w-full max-w-lg flex-col gap-4 rounded-xl border bg-zinc-950 p-5 font-mono shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
          <span className="text-[10px] font-bold text-zinc-100 uppercase">
            ➕ Importar Historia de Desvío (JSON)
          </span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[9px] leading-relaxed text-zinc-500">
            Copia el prompt de inducción a continuación, pásalo a la IA en tu
            chat para diseñar la historia de desvío y pega el JSON resultante.
          </p>
          <button
            onClick={copiarPromptDesvio}
            className="w-full rounded border border-emerald-500/20 bg-emerald-500/10 py-1.5 text-center text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
          >
            📋 Copiar Prompt de Inducción Desvío
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[8px] font-bold text-zinc-400 uppercase">
            Resultado JSON devuelto por la IA
          </label>
          <textarea
            value={desvioJsonText}
            onChange={(e) => setDesvioJsonText(e.target.value)}
            placeholder="Pega aquí el JSON devuelto..."
            rows={8}
            className="border-zinc-850 w-full rounded border bg-zinc-900 p-2 font-mono text-[10px] text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-900 pt-3">
          <button
            onClick={onClose}
            className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-[9px] font-bold text-zinc-300 uppercase hover:bg-zinc-900"
          >
            Cancelar
          </button>
          <button
            onClick={handleImportarDesvio}
            className="rounded bg-emerald-500 px-4 py-1.5 text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
          >
            Procesar e Importar
          </button>
        </div>
      </div>
    </div>
  );
};
