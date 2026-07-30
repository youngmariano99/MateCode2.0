"use client";

import React from "react";

interface RequisitosTabProps {
  requisitosFuncionales: string;
  setRequisitosFuncionales: (val: string) => void;
  requisitosNoFuncionales: string;
  setRequisitosNoFuncionales: (val: string) => void;
  sitemap: string;
  setSitemap: (val: string) => void;
  copiarPromptRequisitos: () => void;
}

export const RequisitosTab: React.FC<RequisitosTabProps> = ({
  requisitosFuncionales,
  setRequisitosFuncionales,
  requisitosNoFuncionales,
  setRequisitosNoFuncionales,
  sitemap,
  setSitemap,
  copiarPromptRequisitos,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
        <div>
          <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
            Generador de Requerimientos y Sitemap con IA
          </span>
          <p className="font-mono text-[9px] text-zinc-500">
            Inyecta el relevamiento, copy de marca, inspiración visual, stack y
            design system en un prompt estructurado para desarrolladores junior.
          </p>
        </div>
        <button
          onClick={copiarPromptRequisitos}
          className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
        >
          📋 Copiar Prompt IA
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
            Requisitos Funcionales (Language Claro/Junior)
          </label>
          <textarea
            value={requisitosFuncionales}
            onChange={(e) => setRequisitosFuncionales(e.target.value)}
            placeholder="Pegar aquí la lista de requisitos funcionales devueltos por la IA..."
            rows={10}
            className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-300 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
            Requisitos No Funcionales
          </label>
          <textarea
            value={requisitosNoFuncionales}
            onChange={(e) => setRequisitosNoFuncionales(e.target.value)}
            placeholder="Rendimiento, seguridad, SEO, accesibilidad..."
            rows={10}
            className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-300 outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
          Sitemap y Mapa de Secciones Generales
        </label>
        <textarea
          value={sitemap}
          onChange={(e) => setSitemap(e.target.value)}
          placeholder="Descripción general de páginas y rutas del sistema..."
          rows={4}
          className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-300 outline-none"
        />
      </div>
    </div>
  );
};
