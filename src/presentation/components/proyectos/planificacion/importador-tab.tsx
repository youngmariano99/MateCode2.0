/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";

interface ImportadorTabProps {
  tipoImportacion: "modular" | "unificada";
  setTipoImportacion: (tipo: "modular" | "unificada") => void;
  epicasCount: number;
  historiasCount: number;
  tareasCount: number;
  sprintsCount: number;
  criteriosCount: number;
  configCount: number;
  backlogJson: string;
  setBacklogJson: (val: string) => void;
  epicasJson: string;
  setEpicasJson: (val: string) => void;
  historiasJson: string;
  setHistoriasJson: (val: string) => void;
  actividadesJson: string;
  setActividadesJson: (val: string) => void;
  sprintsJson: string;
  setSprintsJson: (val: string) => void;
  criteriosJson: string;
  setCriteriosJson: (val: string) => void;
  configJson: string;
  setConfigJson: (val: string) => void;
  selectedAuditTareaId: string | null;
  setSelectedAuditTareaId: (id: string | null) => void;
  tareasConCriterios: any[];
  handleLimpiarPlanificacion: () => void;
  handleLimpiarEpicas: () => void;
  handleLimpiarHistorias: () => void;
  handleLimpiarActividades: () => void;
  handleLimpiarConfigActividades: () => void;
  handleLimpiarCriterios: () => void;
  handleLimpiarSprints: () => void;
  copiarPromptBacklog: () => void;
  handleImportarBacklog: () => void;
  copiarPromptEpicasModulares: () => void;
  handleImportarEpicasModulares: () => void;
  copiarPromptHistoriasModulares: () => void;
  handleImportarHistoriasModulares: () => void;
  copiarPromptActividadesModulares: () => void;
  handleImportarActividadesModulares: () => void;
  copiarPromptSprints: () => void;
  handleImportarSprints: () => void;
  copiarPromptCriterios: () => void;
  handleImportarCriterios: () => void;
  copiarPromptConfigActividades: () => void;
  handleImportarConfigActividades: () => void;
}

export const ImportadorTab: React.FC<ImportadorTabProps> = ({
  tipoImportacion,
  setTipoImportacion,
  epicasCount,
  historiasCount,
  tareasCount,
  sprintsCount,
  criteriosCount,
  configCount,
  backlogJson,
  setBacklogJson,
  epicasJson,
  setEpicasJson,
  historiasJson,
  setHistoriasJson,
  actividadesJson,
  setActividadesJson,
  sprintsJson,
  setSprintsJson,
  criteriosJson,
  setCriteriosJson,
  configJson,
  setConfigJson,
  selectedAuditTareaId,
  setSelectedAuditTareaId,
  tareasConCriterios,
  handleLimpiarPlanificacion,
  handleLimpiarEpicas,
  handleLimpiarHistorias,
  handleLimpiarActividades,
  handleLimpiarConfigActividades,
  handleLimpiarCriterios,
  handleLimpiarSprints,
  copiarPromptBacklog,
  handleImportarBacklog,
  copiarPromptEpicasModulares,
  handleImportarEpicasModulares,
  copiarPromptHistoriasModulares,
  handleImportarHistoriasModulares,
  copiarPromptActividadesModulares,
  handleImportarActividadesModulares,
  copiarPromptSprints,
  handleImportarSprints,
  copiarPromptCriterios,
  handleImportarCriterios,
  copiarPromptConfigActividades,
  handleImportarConfigActividades,
}) => {
  return (
    <div className="flex flex-col gap-5">
      {/* Wipe section / Warning banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <div className="min-w-0 flex-1">
          <span className="font-mono text-[10px] font-bold text-red-400 uppercase">
            ⚠️ Zona de Peligro: Reiniciar Planificación
          </span>
          <p className="text-zinc-550 mt-1 font-mono text-[9px]">
            ¿Quieres volver a empezar? Esta opción eliminará permanentemente
            todo el backlog (Épicas, Historias y Tareas/Actividades) y Sprints
            asociados a este proyecto.
          </p>
        </div>
        <button
          onClick={handleLimpiarPlanificacion}
          className="shrink-0 rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-red-400 uppercase hover:bg-red-500/25"
        >
          🗑️ Limpiar Backlog y Sprints
        </button>
      </div>

      {/* Import option selector */}
      <div className="flex border-b border-zinc-900 pb-2">
        <button
          onClick={() => setTipoImportacion("modular")}
          className={`px-4 py-2 font-mono text-[10px] font-bold uppercase transition-all ${
            tipoImportacion === "modular"
              ? "border-b-2 border-emerald-500 text-emerald-400"
              : "text-zinc-550 hover:text-zinc-300"
          }`}
        >
          🔄 Paso a Paso Modular (Recomendado)
        </button>
        <button
          onClick={() => setTipoImportacion("unificada")}
          className={`px-4 py-2 font-mono text-[10px] font-bold uppercase transition-all ${
            tipoImportacion === "unificada"
              ? "border-b-2 border-emerald-500 text-emerald-400"
              : "text-zinc-550 hover:text-zinc-300"
          }`}
        >
          📦 Ingesta Unificada (JSON Único)
        </button>
      </div>

      {/* Unified Bulk Importer */}
      {tipoImportacion === "unificada" && (
        <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                Importación Masiva de Backlog (Épicas / Historias / Actividades)
              </span>
              <p className="font-mono text-[9px] text-zinc-500">
                Copia el prompt del backlog, pásalo a la IA y pega el JSON
                devuelto aquí para cargar todo el backlog automáticamente.
              </p>
            </div>
            <button
              onClick={copiarPromptBacklog}
              className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
            >
              📋 Copiar Prompt Backlog
            </button>
          </div>
          <textarea
            value={backlogJson}
            onChange={(e) => setBacklogJson(e.target.value)}
            placeholder="Pega aquí el JSON devuelto por la IA..."
            rows={5}
            className="border-zinc-855 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none"
          />
          <button
            onClick={handleImportarBacklog}
            className="self-end rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400"
          >
            Procesar e Importar Backlog
          </button>
        </div>
      )}

      {/* Modular Step-by-Step Importers */}
      {tipoImportacion === "modular" && (
        <div className="flex flex-col gap-5">
          {/* Step 1: Epicas */}
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Fase 1: Épicas (Alcance Macro)
                  </span>
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
                    {epicasCount} creadas
                  </span>
                </div>
                <p className="font-mono text-[9px] text-zinc-500">
                  Analiza tus requerimientos y genera el listado base de Épicas
                  de tu Backlog.
                </p>
              </div>
              <button
                onClick={copiarPromptEpicasModulares}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
              >
                📋 Copiar Prompt Épicas
              </button>
            </div>
            <textarea
              value={epicasJson}
              onChange={(e) => setEpicasJson(e.target.value)}
              placeholder="Pega aquí el JSON de Épicas devuelto por la IA..."
              rows={4}
              className="border-zinc-855 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none"
            />
            <div className="flex justify-end gap-2">
              {epicasCount > 0 && (
                <button
                  onClick={handleLimpiarEpicas}
                  className="rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-red-400 uppercase hover:bg-red-500/25"
                >
                  🗑️ Limpiar Épicas
                </button>
              )}
              <button
                onClick={handleImportarEpicasModulares}
                className="rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400"
              >
                Procesar e Importar Épicas
              </button>
            </div>
          </div>

          {/* Step 2: Historias */}
          <div
            className={`flex flex-col gap-2 rounded-xl border p-4 ${epicasCount === 0 ? "border-zinc-900 bg-zinc-950/20 opacity-50" : "border-zinc-900 bg-zinc-950"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Fase 2: Historias de Usuario (CA Funcionales)
                  </span>
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
                    {historiasCount} creadas
                  </span>
                </div>
                <p className="font-mono text-[9px] text-zinc-500">
                  Asocia historias de usuario detalladas a cada una de tus
                  Épicas importadas.
                </p>
              </div>
              <button
                disabled={epicasCount === 0}
                onClick={copiarPromptHistoriasModulares}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20 disabled:opacity-40"
              >
                📋 Copiar Prompt Historias
              </button>
            </div>
            <textarea
              disabled={epicasCount === 0}
              value={historiasJson}
              onChange={(e) => setHistoriasJson(e.target.value)}
              placeholder="Pega aquí el JSON de Historias de Usuario devuelto por la IA..."
              rows={4}
              className="border-zinc-855 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none disabled:opacity-50"
            />
            <div className="flex justify-end gap-2">
              {historiasCount > 0 && (
                <button
                  onClick={handleLimpiarHistorias}
                  className="rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-red-400 uppercase hover:bg-red-500/25"
                >
                  🗑️ Limpiar Historias
                </button>
              )}
              <button
                disabled={epicasCount === 0}
                onClick={handleImportarHistoriasModulares}
                className="rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400 disabled:opacity-40"
              >
                Procesar e Importar Historias
              </button>
            </div>
          </div>

          {/* Step 3: Actividades */}
          <div
            className={`flex flex-col gap-2 rounded-xl border p-4 ${historiasCount === 0 ? "border-zinc-900 bg-zinc-950/20 opacity-50" : "border-zinc-900 bg-zinc-950"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Fase 3: Actividades Técnicas (Desglose DB, API, UI)
                  </span>
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
                    {tareasCount} creadas
                  </span>
                </div>
                <p className="font-mono text-[9px] text-zinc-500">
                  Descompone las historias de usuario en tareas o actividades
                  técnicas concretas.
                </p>
              </div>
              <button
                disabled={historiasCount === 0}
                onClick={copiarPromptActividadesModulares}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20 disabled:opacity-40"
              >
                📋 Copiar Prompt Actividades
              </button>
            </div>
            <textarea
              disabled={historiasCount === 0}
              value={actividadesJson}
              onChange={(e) => setActividadesJson(e.target.value)}
              placeholder="Pega aquí el JSON de Actividades Técnicas devuelto por la IA..."
              rows={4}
              className="border-zinc-855 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none disabled:opacity-50"
            />
            <div className="flex justify-end gap-2">
              {tareasCount > 0 && (
                <button
                  onClick={handleLimpiarActividades}
                  className="rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-red-400 uppercase hover:bg-red-500/25"
                >
                  🗑️ Limpiar Actividades
                </button>
              )}
              <button
                disabled={historiasCount === 0}
                onClick={handleImportarActividadesModulares}
                className="rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400 disabled:opacity-40"
              >
                Procesar e Importar Actividades
              </button>
            </div>
          </div>

          {/* Step 4: Technical Configuration of Activities */}
          <div
            className={`flex flex-col gap-2 rounded-xl border p-4 ${tareasCount === 0 ? "border-zinc-900 bg-zinc-950/20 opacity-50" : "border-zinc-900 bg-zinc-950"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Fase 4: Configuración Técnica (Rol, Pasos y Componentes)
                  </span>
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
                    {configCount} configuradas
                  </span>
                </div>
                <p className="font-mono text-[9px] text-zinc-500">
                  Importa el JSON con el rol recomendado, componente, ruta,
                  módulo y lista de pasos de checklist dinámico de la IA para
                  cada actividad.
                </p>
              </div>
              <button
                disabled={tareasCount === 0}
                onClick={copiarPromptConfigActividades}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20 disabled:opacity-40"
              >
                📋 Copiar Prompt Config
              </button>
            </div>
            <textarea
              disabled={tareasCount === 0}
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              placeholder="Pega aquí el JSON de configuración técnica de actividades..."
              rows={5}
              className="border-zinc-855 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none disabled:opacity-50"
            />
            <div className="flex justify-end gap-2">
              {configCount > 0 && (
                <button
                  onClick={handleLimpiarConfigActividades}
                  className="rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-red-400 uppercase hover:bg-red-500/25"
                >
                  🗑️ Restablecer Configuración
                </button>
              )}
              <button
                disabled={tareasCount === 0}
                onClick={handleImportarConfigActividades}
                className="rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400 disabled:opacity-40"
              >
                Procesar y Configurar Actividades
              </button>
            </div>
          </div>

          {/* Step 5: Acceptance Criteria */}
          <div
            className={`flex flex-col gap-3 rounded-xl border p-4 ${tareasCount === 0 ? "border-zinc-900 bg-zinc-950/20 opacity-50" : "border-zinc-900 bg-zinc-950"}`}
          >
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Fase 5: Criterios de Aceptación por Actividad (Fusión
                    BDD/QA)
                  </span>
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
                    {criteriosCount} con criterios
                  </span>
                </div>
                <p className="font-mono text-[9px] text-zinc-500">
                  Asocia criterios de aceptación BDD y QA a cada una de tus
                  actividades técnicas inyectadas.
                </p>
              </div>
              <button
                disabled={tareasCount === 0}
                onClick={copiarPromptCriterios}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20 disabled:opacity-40"
              >
                📋 Copiar Prompt Criterios
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              {/* Import Box */}
              <div className="flex flex-col gap-2 md:col-span-6">
                <span className="text-zinc-455 mb-1 block font-mono text-[8px] font-bold uppercase">
                  📥 Importador de Criterios (JSON)
                </span>
                <textarea
                  disabled={tareasCount === 0}
                  value={criteriosJson}
                  onChange={(e) => setCriteriosJson(e.target.value)}
                  placeholder="Pega aquí el JSON de criterios de aceptación..."
                  rows={6}
                  className="border-zinc-855 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none focus:border-emerald-500/30 disabled:opacity-50"
                />
                <div className="flex justify-end gap-2">
                  {criteriosCount > 0 && (
                    <button
                      onClick={handleLimpiarCriterios}
                      className="rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-red-400 uppercase hover:bg-red-500/25"
                    >
                      🗑️ Limpiar Criterios
                    </button>
                  )}
                  <button
                    disabled={tareasCount === 0}
                    onClick={handleImportarCriterios}
                    className="rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase shadow-sm transition-all hover:bg-emerald-400 disabled:opacity-40"
                  >
                    Procesar y Vincular Criterios
                  </button>
                </div>
              </div>

              {/* Visualizer list */}
              <div className="flex flex-col gap-2 border-t border-zinc-900 pt-4 md:col-span-6 md:border-t-0 md:border-l md:pt-0 md:pl-4">
                <span className="text-zinc-455 mb-1 block font-mono text-[8px] font-bold uppercase">
                  🔍 Visualizador de Criterios Vinculados
                </span>

                {(() => {
                  const listToShow = (tareasConCriterios || []) as any[];
                  if (listToShow.length === 0) {
                    return (
                      <div className="rounded border border-zinc-900/60 bg-zinc-900/10 py-8 text-center font-mono text-[9px] text-zinc-500">
                        Aún no hay criterios vinculados. Pega el JSON a la
                        izquierda para procesar.
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-2">
                      <div className="flex max-h-[140px] flex-col gap-1 overflow-y-auto rounded border border-zinc-900 bg-zinc-900/20 p-1.5 pr-1">
                        {listToShow.map((t) => {
                          const isSelected = selectedAuditTareaId === t.id;
                          const listSize = Array.isArray(t.criteriosAceptacion)
                            ? t.criteriosAceptacion.length
                            : 1;
                          return (
                            <button
                              key={t.id}
                              onClick={() =>
                                setSelectedAuditTareaId(
                                  isSelected ? null : t.id
                                )
                              }
                              className={`flex w-full items-center justify-between gap-2 rounded border p-1.5 text-left font-mono text-[8px] transition-all ${
                                isSelected
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                  : "border-zinc-800/40 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900/80"
                              }`}
                            >
                              <span className="flex-1 truncate">
                                {t.titulo}
                              </span>
                              <span className="shrink-0 rounded border border-zinc-800 bg-zinc-900/80 px-1 py-0.5 font-bold text-zinc-400">
                                📋 {listSize}{" "}
                                {listSize === 1 ? "criterio" : "criterios"}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Selected task criteria list detail view */}
                      {(() => {
                        if (!selectedAuditTareaId) return null;
                        const activeT = listToShow.find(
                          (t) => t.id === selectedAuditTareaId
                        );
                        if (!activeT) return null;

                        let criteriaArr: string[] = [];
                        if (Array.isArray(activeT.criteriosAceptacion)) {
                          criteriaArr = activeT.criteriosAceptacion;
                        } else if (
                          typeof activeT.criterioAceptacion === "string"
                        ) {
                          criteriaArr = [activeT.criterioAceptacion];
                        }

                        return (
                          <div className="mt-1 max-h-[150px] overflow-y-auto rounded border border-emerald-500/10 bg-emerald-500/5 p-2.5 pr-1">
                            <span className="mb-1 block text-[8px] font-bold text-emerald-400 uppercase">
                              Criterios para: {activeT.titulo}
                            </span>
                            <ul className="flex list-disc flex-col gap-1 pl-3 font-mono text-[9px] text-zinc-300">
                              {criteriaArr.map((crit, idx) => (
                                <li key={idx} className="leading-normal">
                                  {crit}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Step 6: Sprints Configuration */}
          <div
            className={`flex flex-col gap-2 rounded-xl border p-4 ${historiasCount === 0 ? "border-zinc-900 bg-zinc-950/20 opacity-50" : "border-zinc-900 bg-zinc-950"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Fase 6: Sprints (Planificación y Agrupación)
                  </span>
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
                    {sprintsCount} sprints
                  </span>
                </div>
                <p className="font-mono text-[9px] text-zinc-500">
                  Organiza las historias de usuario en Sprints pegando el JSON
                  devuelto por la IA.
                </p>
              </div>
              <button
                disabled={historiasCount === 0}
                onClick={copiarPromptSprints}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20 disabled:opacity-40"
              >
                📋 Copiar Prompt Sprints
              </button>
            </div>
            <textarea
              disabled={historiasCount === 0}
              value={sprintsJson}
              onChange={(e) => setSprintsJson(e.target.value)}
              placeholder="Pega aquí el JSON de configuración de Sprints..."
              rows={5}
              className="border-zinc-855 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none disabled:opacity-50"
            />
            <div className="flex justify-end gap-2">
              {sprintsCount > 0 && (
                <button
                  onClick={handleLimpiarSprints}
                  className="rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-red-400 uppercase hover:bg-red-500/25"
                >
                  🗑️ Limpiar Sprints
                </button>
              )}
              <button
                disabled={historiasCount === 0}
                onClick={handleImportarSprints}
                className="rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400 disabled:opacity-40"
              >
                Procesar e Importar Sprints
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
