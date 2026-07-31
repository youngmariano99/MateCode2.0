/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";

interface DescargasPlanningTabProps {
  selectedDocName: string;
  docEditContent: string;
  setDocEditContent: (val: string) => void;
  selectDocumentForEdit: (name: string) => void;
  handleSaveSelectedDoc: () => void;
  copiarPromptInicializador: () => void;
  descargarClaudeMdCompleto: () => void;
  descargarSchemaMd: () => void;
  descargarRequerimientosMd: () => void;
  descargarDesignMd: () => void;
  descargarSitemapMd: () => void;
  descargarRolesMd: () => void;
  descargarSeedMd: () => void;
  descargarErrorsMd: () => void;
  descargarSetupMd: () => void;
  descargarBacklogMd: () => void;
  descargarSprintsMd: () => void;
  entidades: string;
  requisitosFuncionales: string;
  requisitosNoFuncionales: string;
  ds: any;
  sitemapSystemMarkdown: string;
  sitemapMarkup: string;
  sitemap: string;
  rolesMarkdown: string;
  seedMarkdown: string;
  erroresMarkdown: string;
  setupMarkdown: string;
  mostrarToast: (msg: string, tipo: "exito" | "error" | "info") => void;
}

export const DescargasPlanningTab: React.FC<DescargasPlanningTabProps> = ({
  selectedDocName,
  docEditContent,
  setDocEditContent,
  selectDocumentForEdit,
  handleSaveSelectedDoc,
  copiarPromptInicializador,
  descargarClaudeMdCompleto,
  descargarSchemaMd,
  descargarRequerimientosMd,
  descargarDesignMd,
  descargarSitemapMd,
  descargarRolesMd,
  descargarSeedMd,
  descargarErrorsMd,
  descargarSetupMd,
  descargarBacklogMd,
  descargarSprintsMd,
  entidades,
  requisitosFuncionales,
  requisitosNoFuncionales,
  ds,
  sitemapSystemMarkdown,
  sitemapMarkup,
  sitemap,
  rolesMarkdown,
  seedMarkdown,
  erroresMarkdown,
  setupMarkdown,
  mostrarToast,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Docs Dashboard - Centro de Descargas Grid */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            name: "CLAUDE.md",
            desc: "Reglas de inducción, arquitectura y estándares para inicializar la IA.",
            status: true,
            onDownload: descargarClaudeMdCompleto,
          },
          {
            name: "SCHEMA.md",
            desc: "Esquema completo y tablas de base de datos en 3FN.",
            status: !!entidades?.trim(),
            onDownload: descargarSchemaMd,
          },
          {
            name: "REQUERIMIENTOS.md",
            desc: "Especificación completa de requisitos funcionales y no funcionales.",
            status: !!(
              requisitosFuncionales?.trim() || requisitosNoFuncionales?.trim()
            ),
            onDownload: descargarRequerimientosMd,
          },
          {
            name: "DESIGN.md",
            desc: "Reglas de estilo, tokens, paletas de colores y tipografía.",
            status: !!ds?.designSystemMarkdown?.trim(),
            onDownload: descargarDesignMd,
          },
          {
            name: "SITEMAP.md",
            desc: "Rutas de la aplicación (Next.js App Router) y accesos.",
            status: !!(
              sitemapSystemMarkdown?.trim() ||
              sitemapMarkup?.trim() ||
              sitemap?.trim()
            ),
            onDownload: descargarSitemapMd,
          },
          {
            name: "ROLES.md",
            desc: "Políticas Supabase RLS y matriz de accesos de usuarios.",
            status: !!rolesMarkdown?.trim(),
            onDownload: descargarRolesMd,
          },
          {
            name: "SEED.md",
            desc: "Estrategia de datos de prueba desafiantes y volumen de siembra.",
            status: !!seedMarkdown?.trim(),
            onDownload: descargarSeedMd,
          },
          {
            name: "ERRORS.md",
            desc: "Diccionario unificado de excepciones de negocio y códigos HTTP.",
            status: !!erroresMarkdown?.trim(),
            onDownload: descargarErrorsMd,
          },
          {
            name: "SETUP.md",
            desc: "Pasos de inicialización y comandos manuales o ejecutados.",
            status: !!setupMarkdown?.trim(),
            onDownload: descargarSetupMd,
          },
          {
            name: "BACKLOG.md",
            desc: "Estructura de Épicas, Historias y Actividades Técnicas detalladas.",
            status: true,
            onDownload: descargarBacklogMd,
          },
          {
            name: "SPRINTS.md",
            desc: "Cronograma e hitos de entregas organizados por sprints semanales.",
            status: true,
            onDownload: descargarSprintsMd,
          },
        ].map((doc) => {
          const isSelected = selectedDocName === doc.name;
          return (
            <div
              key={doc.name}
              onClick={() => selectDocumentForEdit(doc.name)}
              className={`flex cursor-pointer flex-col justify-between gap-3 rounded-xl border p-3.5 font-mono transition-all hover:bg-zinc-900/40 ${
                isSelected
                  ? "border-emerald-500 bg-zinc-900/60 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                  : "border-zinc-900 bg-zinc-950/60 hover:border-zinc-800"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      isSelected ? "text-emerald-400" : "text-zinc-100"
                    }`}
                  >
                    {doc.name}
                  </span>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[8px] font-bold ${
                      doc.status
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {doc.status ? "🟢 Armado" : "🟡 Pendiente"}
                  </span>
                </div>
                <p className="text-zinc-550 mt-2 text-[8px] leading-relaxed">
                  {doc.desc}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  doc.onDownload();
                }}
                className="w-full rounded border border-zinc-800 bg-zinc-900/60 py-1.5 text-center text-[8px] font-bold text-zinc-300 uppercase transition-all hover:bg-zinc-900 hover:text-zinc-100"
              >
                📥 Descargar
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-4">
        <div>
          <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
            Setup Inicializador del Proyecto (Terminal & Scripts)
          </span>
          <p className="font-mono text-[9px] text-zinc-500">
            Genera los comandos de inicialización paso a paso para arrancar la
            base del proyecto en tu máquina.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => selectDocumentForEdit("SETUP.md")}
            className="rounded border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
          >
            ✍️ Redactar SETUP.md
          </button>
          <button
            onClick={copiarPromptInicializador}
            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
          >
            📋 Copiar Prompt Setup
          </button>
        </div>
      </div>

      {/* Interactive Document Editor Workspace */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-900 bg-zinc-950 p-4 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2A2E] pb-3">
          <div>
            <span className="text-[10px] font-bold text-zinc-100 uppercase">
              📝 Editor Interactivo: {selectedDocName}
            </span>
            <p className="text-zinc-550 mt-0.5 text-[9px]">
              Modifica y guarda los cambios de {selectedDocName} directamente en
              el proyecto.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(docEditContent);
                mostrarToast(
                  `Contenido de ${selectedDocName} copiado al portapapeles.`,
                  "exito"
                );
              }}
              className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-[9px] font-bold text-zinc-300 uppercase transition-all hover:bg-zinc-900"
            >
              📋 Copiar
            </button>
            <button
              onClick={handleSaveSelectedDoc}
              className="rounded bg-emerald-500 px-4 py-1.5 text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
            >
              💾 Guardar Cambios
            </button>
          </div>
        </div>

        <textarea
          value={docEditContent}
          onChange={(e) => setDocEditContent(e.target.value)}
          rows={16}
          placeholder={`Contenido del archivo ${selectedDocName}...`}
          className="border-zinc-850 w-full rounded border bg-zinc-900/50 p-3 font-mono text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
    </div>
  );
};
