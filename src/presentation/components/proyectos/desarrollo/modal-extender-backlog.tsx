/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";

interface ModalExtenderBacklogProps {
  isOpen: boolean;
  onClose: () => void;
  extensionTab: "sprint" | "backlog" | "ia";
  setExtensionTab: (tab: "sprint" | "backlog" | "ia") => void;

  // Tab IA
  userInstructions: string;
  setUserInstructions: (v: string) => void;
  handleCopiarPromptIA: () => void;
  backlogJson: string;
  setBacklogJson: (v: string) => void;
  handleImportarSprintsJson: () => void;

  // Tab Sprint manual
  newSprintNombre: string;
  setNewSprintNombre: (v: string) => void;
  newSprintCapacidad: number;
  setNewSprintCapacidad: (v: number) => void;
  newSprintDuracion: number;
  setNewSprintDuracion: (v: number) => void;
  newSprintObjetivo: string;
  setNewSprintObjetivo: (v: string) => void;
  handleCrearSprintManual: () => void;

  // Tab Backlog
  selectedSprintForAssign: string;
  setSelectedSprintForAssign: (v: string) => void;
  sprints: any[];
  historias: any[];
  handleAsignarHistoriaASprint: (storyId: string) => void;
}

// Modal de extensión de backlog/sprints de DesarrolloWorkspace > SprintEnfoqueTab
// — extraído porque era un bloque de ~240 líneas totalmente autocontenido
// (3 pestañas: importar con IA, crear sprint manual, vincular backlog huérfano).
export const ModalExtenderBacklog: React.FC<ModalExtenderBacklogProps> = ({
  isOpen,
  onClose,
  extensionTab,
  setExtensionTab,
  userInstructions,
  setUserInstructions,
  handleCopiarPromptIA,
  backlogJson,
  setBacklogJson,
  handleImportarSprintsJson,
  newSprintNombre,
  setNewSprintNombre,
  newSprintCapacidad,
  setNewSprintCapacidad,
  newSprintDuracion,
  setNewSprintDuracion,
  newSprintObjetivo,
  setNewSprintObjetivo,
  handleCrearSprintManual,
  selectedSprintForAssign,
  setSelectedSprintForAssign,
  sprints,
  historias,
  handleAsignarHistoriaASprint,
}) => {
  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm duration-200">
      <div className="flex max-h-[85vh] w-[650px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-6 font-mono shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
            <span className="text-[11px] font-bold tracking-wider text-zinc-100 uppercase">
              Extender Backlog & Sprints
            </span>
          </div>
          <button
            onClick={onClose}
            className="hover:text-zinc-350 text-[10px] font-bold text-zinc-500 uppercase"
          >
            Cerrar
          </button>
        </div>

        {/* Modal Tabs Header */}
        <div className="mb-4 flex gap-1 border-b border-zinc-900 pb-2">
          {[
            { id: "ia", label: "Importar con IA (Recomendado)" },
            { id: "sprint", label: "Crear Sprint Manual" },
            { id: "backlog", label: "Vincular Backlog" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setExtensionTab(t.id as any)}
              className={`rounded-lg border px-3 py-1.5 text-[9px] font-bold uppercase transition-all ${
                extensionTab === t.id
                  ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
                  : "hover:text-zinc-350 border-transparent text-zinc-500 hover:bg-zinc-900/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto pr-1 text-left">
          {extensionTab === "ia" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-sky-500/10 bg-sky-500/5 p-3 text-[9px] leading-relaxed text-sky-300">
                **¿Cómo funciona?**
                <br />
                1. Escribe en las instrucciones lo que deseas agregar o corregir
                (ej. &quot;Falta agregar cupones de descuento y reparar el flujo
                de login que falla al expirar token&quot;).
                <br />
                2. Haz clic en **Copiar Prompt** para enviar a la IA todo el
                contexto actual (backlog, stack y sitemap).
                <br />
                3. Pega el JSON que te devuelva la IA abajo y haz clic en
                **Importar**. Se creará todo de forma estructurada
                automáticamente.
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-bold tracking-wider text-zinc-500 uppercase">
                  1. Instrucciones para la IA (Ajustes o Nuevas Funcionalidades)
                </label>
                <textarea
                  value={userInstructions}
                  onChange={(e) => setUserInstructions(e.target.value)}
                  placeholder="Escribe lo que falta desarrollar o los nuevos requerimientos..."
                  className="h-20 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 font-mono text-[9px] text-zinc-300 placeholder-zinc-700 focus:border-sky-500/40 focus:outline-none"
                />
              </div>

              <button
                onClick={handleCopiarPromptIA}
                className="w-full rounded bg-sky-500 py-2 text-center text-[9px] font-bold text-zinc-950 uppercase shadow-md shadow-sky-500/25 transition-all hover:bg-sky-400"
              >
                Generar & Copiar Prompt para la IA
              </button>

              <div className="flex flex-col gap-1.5 border-t border-zinc-900 pt-4">
                <label className="text-[8px] font-bold tracking-wider text-zinc-500 uppercase">
                  2. Pegar JSON de respuesta de la IA
                </label>
                <textarea
                  value={backlogJson}
                  onChange={(e) => setBacklogJson(e.target.value)}
                  placeholder="Pega el array JSON devuelto por la IA..."
                  className="h-28 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 font-mono text-[8px] text-zinc-300 placeholder-zinc-700 focus:border-emerald-500/40 focus:outline-none"
                />
              </div>

              <button
                onClick={handleImportarSprintsJson}
                className="w-full rounded bg-emerald-500 py-2.5 text-center text-[9px] font-bold text-zinc-950 uppercase shadow-md shadow-emerald-500/25 transition-all hover:bg-emerald-400"
              >
                Procesar e Importar Backlog de Extensión
              </button>
            </div>
          )}

          {extensionTab === "sprint" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-bold text-zinc-500 uppercase">
                    Nombre del Sprint
                  </label>
                  <input
                    type="text"
                    value={newSprintNombre}
                    onChange={(e) => setNewSprintNombre(e.target.value)}
                    placeholder="Ej: Sprint 5: Ajustes y QA"
                    className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 font-mono text-[9px] text-zinc-200 focus:border-sky-500/40 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-bold text-zinc-500 uppercase">
                    Capacidad (Puntos)
                  </label>
                  <input
                    type="number"
                    value={newSprintCapacidad}
                    onChange={(e) =>
                      setNewSprintCapacidad(Number(e.target.value))
                    }
                    className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 font-mono text-[9px] text-zinc-200 focus:border-sky-500/40 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-bold text-zinc-500 uppercase">
                  Duración (Semanas)
                </label>
                <select
                  value={newSprintDuracion}
                  onChange={(e) => setNewSprintDuracion(Number(e.target.value))}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 font-mono text-[9px] text-zinc-200 focus:border-sky-500/40 focus:outline-none"
                >
                  <option value={1}>1 Semana</option>
                  <option value={2}>2 Semanas</option>
                  <option value={3}>3 Semanas</option>
                  <option value={4}>4 Semanas</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-bold text-zinc-500 uppercase">
                  Objetivo del Sprint
                </label>
                <textarea
                  value={newSprintObjetivo}
                  onChange={(e) => setNewSprintObjetivo(e.target.value)}
                  placeholder="Describir el objetivo principal o alcance del sprint..."
                  className="h-20 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 font-mono text-[9px] text-zinc-300 focus:border-sky-500/40 focus:outline-none"
                />
              </div>

              <button
                onClick={handleCrearSprintManual}
                className="w-full rounded bg-emerald-500 py-2 text-center text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
              >
                Planificar Sprint
              </button>
            </div>
          )}

          {extensionTab === "backlog" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-bold text-zinc-500 uppercase">
                  Seleccionar Sprint de Destino
                </label>
                <select
                  value={selectedSprintForAssign}
                  onChange={(e) => setSelectedSprintForAssign(e.target.value)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 font-mono text-[9px] text-zinc-200 focus:border-sky-500/40 focus:outline-none"
                >
                  <option value="">-- Selecciona un Sprint --</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} ({s.estado})
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-zinc-900 pt-3">
                <span className="mb-2 block text-[8px] font-bold text-zinc-500 uppercase">
                  Historias Huérfanas (Sin Sprint Asignado)
                </span>

                <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto pr-1">
                  {historias.filter((h) => !h.sprintId).length === 0 ? (
                    <p className="py-6 text-center text-[9px] text-zinc-500">
                      No hay historias sin sprint asignado.
                    </p>
                  ) : (
                    historias
                      .filter((h) => !h.sprintId)
                      .map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-900 bg-zinc-900/20 p-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-[9px] font-bold text-zinc-200">
                              {h.titulo}
                            </span>
                            <span className="block truncate text-[7px] text-zinc-500">
                              Prioridad: {h.prioridad || "Media"} • Estimación:{" "}
                              {h.estimacion || 0} Ptos
                            </span>
                          </div>
                          <button
                            onClick={() => handleAsignarHistoriaASprint(h.id)}
                            className="shrink-0 rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[8px] font-bold text-sky-400 uppercase transition-all hover:bg-sky-500/20"
                          >
                            Vincular
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
