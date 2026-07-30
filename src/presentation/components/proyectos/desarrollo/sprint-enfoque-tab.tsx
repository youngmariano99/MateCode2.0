/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import React from "react";
import { Card } from "../../card";
import { db } from "../../../../offline/dexie/db";

interface SprintEnfoqueTabProps {
  sprints: any[];
  historiasSprint: any[];
  epicas: any[];
  tareas: any[];
  actividadesSprint: any[];
  focusedSprint: any | null;
  selectedSprintId: string;
  setSelectedSprintId: (id: string) => void;
  storiesPage: number;
  setStoriesPage: (p: number) => void;
  expandedStoryIds: Record<string, boolean>;
  setExpandedStoryIds: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  iniciarSprint: () => void;
  setIsImportDesvioOpen: (open: boolean) => void;
  selectedActividadId: string;
  setSelectedActividadId: (id: string) => void;
  handleUpdateActividadEstado: (id: string, nuevoEstado: string) => void;
  iniciarCintaProduccion: (hist: any) => void;
  cintaPipelineConfig: string[];
  handleTogglePipelineStation: (st: string) => void;
  mostrarToast: (msg: string, type: "exito" | "error" | "info") => void;
}

const COMPONENTES_PUNTOS = [
  { key: "todo", label: "Por Hacer" },
  { key: "doing", label: "En Desarrollo" },
  { key: "review", label: "En Revisión" },
  { key: "testing", label: "Testing" },
  { key: "blocked", label: "Bloqueado" },
  { key: "done", label: "Finalizado" },
];

export const SprintEnfoqueTab: React.FC<SprintEnfoqueTabProps> = ({
  sprints,
  historiasSprint,
  epicas,
  tareas,
  actividadesSprint,
  focusedSprint,
  selectedSprintId,
  setSelectedSprintId,
  storiesPage,
  setStoriesPage,
  expandedStoryIds,
  setExpandedStoryIds,
  iniciarSprint,
  setIsImportDesvioOpen,
  selectedActividadId,
  setSelectedActividadId,
  handleUpdateActividadEstado,
  iniciarCintaProduccion,
  cintaPipelineConfig,
  handleTogglePipelineStation,
  mostrarToast,
}) => {
  return (
    <Card>
      <div className="mb-4 flex flex-col justify-between gap-3 border-b border-zinc-900 pb-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Sprint de Enfoque Activo
          </h3>
          <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
            Visualiza y enfoca el desarrollo en un sprint de trabajo
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <select
            value={selectedSprintId}
            onChange={(e) => setSelectedSprintId(e.target.value)}
            className="max-w-[320px] rounded border-zinc-800 bg-zinc-900 px-2.5 py-1.5 font-mono text-[10px] text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Selecciona sprint...</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} ({s.estado})
              </option>
            ))}
          </select>
          {focusedSprint && focusedSprint.estado === "planificacion" && (
            <button
              onClick={iniciarSprint}
              className="rounded bg-emerald-500 px-2 py-1 font-mono text-[9px] font-bold text-zinc-950 uppercase"
            >
              Iniciar
            </button>
          )}
          <button
            onClick={() => setIsImportDesvioOpen(true)}
            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
          >
            ➕ Importar Desvío
          </button>
        </div>
      </div>

      {focusedSprint ? (
        <div className="flex flex-col gap-2">
          <div className="mb-2 grid grid-cols-3 gap-2 rounded-lg border border-zinc-900 bg-zinc-950/40 p-2.5">
            <div className="border-r border-zinc-900 text-center">
              <span className="block font-mono text-[8px] text-zinc-500 uppercase">
                Objetivo
              </span>
              <span className="block truncate font-mono text-[10px] font-bold text-zinc-300">
                {focusedSprint.objetivo || "Sin objetivo"}
              </span>
            </div>
            <div className="border-r border-zinc-900 text-center">
              <span className="block font-mono text-[8px] text-zinc-500 uppercase">
                Capacidad
              </span>
              <span className="block font-mono text-[10px] font-bold text-zinc-300">
                {focusedSprint.capacidad || 0} Ptos
              </span>
            </div>
            <div className="text-center">
              <span className="block font-mono text-[8px] text-zinc-500 uppercase">
                Semanas
              </span>
              <span className="block font-mono text-[10px] font-bold text-zinc-300">
                {focusedSprint.duracionSemanas || 2} Sem
              </span>
            </div>
          </div>

          {/* Spacious Table list of User Stories */}
          {(() => {
            if (historiasSprint.length === 0) {
              return (
                <p className="rounded-xl border border-zinc-900 bg-zinc-950/20 py-8 text-center font-mono text-[10px] text-zinc-500">
                  No hay historias asociadas a este sprint de enfoque.
                </p>
              );
            }

            const storiesList = historiasSprint;
            const totalStories = storiesList.length;
            const itemsPerPage = 4;
            const totalPages = Math.ceil(totalStories / itemsPerPage);
            const activePage = Math.max(1, Math.min(storiesPage, totalPages));
            const startIndex = (activePage - 1) * itemsPerPage;
            const paginatedStories = storiesList.slice(
              startIndex,
              startIndex + itemsPerPage
            );

            return (
              <div className="flex flex-col gap-4">
                <div className="overflow-x-auto rounded-xl border border-zinc-900 bg-zinc-950/20">
                  <table className="w-full border-collapse text-left font-mono">
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-950/60 text-[9px] font-bold text-zinc-400 uppercase">
                        <th className="w-[180px] p-3">Épica / Módulo</th>
                        <th className="p-3">Historia de Usuario</th>
                        <th className="w-[120px] p-3 text-center">
                          Estimación / Prioridad
                        </th>
                        <th className="w-[100px] p-3 text-center">Estado</th>
                        <th className="w-[230px] p-3">Mover Sprint</th>
                        <th className="w-[130px] p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/60 text-[10px]">
                      {paginatedStories.map((hist) => {
                        const matchedEpic = epicas.find(
                          (e) => e.id === hist.epicaId
                        );
                        const subTareas = tareas.filter(
                          (t) => t.historiaId === hist.id
                        );
                        const isExpanded = !!expandedStoryIds[hist.id];

                        let priorityColor =
                          "bg-zinc-900 text-zinc-400 border-zinc-800";
                        if (
                          hist.prioridad === "Alta" ||
                          hist.prioridad === "Crítica"
                        ) {
                          priorityColor =
                            "bg-red-500/10 text-red-400 border-red-500/20";
                        } else if (hist.prioridad === "Media") {
                          priorityColor =
                            "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        } else {
                          priorityColor =
                            "bg-sky-500/10 text-sky-400 border-sky-500/20";
                        }

                        let statusColor =
                          "bg-zinc-900 text-zinc-400 border-zinc-850";
                        if (hist.estado === "done") {
                          statusColor =
                            "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
                        } else if (hist.estado === "doing") {
                          statusColor =
                            "bg-sky-500/10 text-sky-400 border-sky-500/25";
                        }

                        return (
                          <React.Fragment key={hist.id}>
                            <tr
                              className={`transition-all hover:bg-zinc-900/20 ${isExpanded ? "bg-zinc-900/10" : ""}`}
                            >
                              <td className="p-3 align-middle">
                                <span className="inline-block max-w-[170px] truncate rounded border border-sky-500/20 bg-sky-500/5 px-2 py-0.5 text-[8px] font-bold text-sky-400 uppercase">
                                  {matchedEpic
                                    ? matchedEpic.nombre
                                    : "Épica General"}
                                </span>
                              </td>
                              <td className="p-3 align-middle font-bold text-zinc-200">
                                {hist.titulo}
                              </td>
                              <td className="p-3 text-center align-middle">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[9px] font-bold text-zinc-400">
                                    {hist.estimacion}h
                                  </span>
                                  <span
                                    className={`py-0.2 rounded border px-1.5 text-[7px] font-bold uppercase ${priorityColor}`}
                                  >
                                    {hist.prioridad}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-center align-middle">
                                <span
                                  className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase ${statusColor}`}
                                >
                                  {hist.estado || "todo"}
                                </span>
                              </td>
                              <td className="p-3 align-middle">
                                <select
                                  value={hist.sprintId || ""}
                                  onChange={async (e) => {
                                    const newSprintId = e.target.value;
                                    try {
                                      await db.historias.update(hist.id, {
                                        sprintId: newSprintId,
                                      });
                                      mostrarToast(
                                        "Historia reasignada de sprint correctamente.",
                                        "exito"
                                      );
                                    } catch (err: any) {
                                      mostrarToast(
                                        `Error al mover historia: ${err.message}`,
                                        "error"
                                      );
                                    }
                                  }}
                                  className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[9px] text-zinc-400 outline-none focus:ring-1 focus:ring-emerald-500/25"
                                >
                                  <option value="">
                                    (Sin Sprint / Backlog)
                                  </option>
                                  {sprints.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      Mover a: {s.nombre}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-3 text-center align-middle">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() =>
                                      setExpandedStoryIds((prev) => ({
                                        ...prev,
                                        [hist.id]: !prev[hist.id],
                                      }))
                                    }
                                    className={`rounded border px-2.5 py-1.5 text-[8px] font-bold uppercase transition-all ${
                                      isExpanded
                                        ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
                                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                                    }`}
                                  >
                                    {isExpanded
                                      ? "Ocultar"
                                      : `Ver Tareas (${subTareas.length})`}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="border-t border-zinc-900/40 bg-zinc-950/60 p-4"
                                >
                                  <div className="flex flex-col gap-3 font-mono">
                                    <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                                      <span className="text-[8px] font-bold text-zinc-500 uppercase">
                                        Actividades Técnicas Relacionadas
                                      </span>
                                      <button
                                        onClick={() =>
                                          iniciarCintaProduccion(hist)
                                        }
                                        className="flex items-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[8px] font-bold text-emerald-400 uppercase shadow-sm transition-all hover:border-emerald-500/45 hover:bg-emerald-500/20"
                                      >
                                        ⚙️ Iniciar Cinta de Producción
                                      </button>
                                    </div>

                                    {subTareas.length === 0 ? (
                                      <div className="py-4 text-center text-[9px] text-zinc-500">
                                        Esta historia no contiene actividades
                                        técnicas.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {subTareas.map((t) => {
                                          const isTarget =
                                            selectedActividadId === t.id;
                                          return (
                                            <div
                                              key={t.id}
                                              className={`flex flex-col gap-2 rounded-lg border p-3 transition-all ${
                                                isTarget
                                                  ? "border-emerald-500/30 bg-emerald-500/5 shadow-md shadow-emerald-500/5"
                                                  : "border-zinc-900 bg-zinc-950/20 hover:border-zinc-800"
                                              }`}
                                            >
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                  <span className="block truncate text-[9px] font-bold text-zinc-200">
                                                    {t.titulo}
                                                  </span>
                                                  <div className="text-zinc-550 mt-1 flex flex-wrap gap-2 text-[7px]">
                                                    {t.modulo && (
                                                      <span>📦 {t.modulo}</span>
                                                    )}
                                                    {t.rol && (
                                                      <span>👤 {t.rol}</span>
                                                    )}
                                                    {t.componente && (
                                                      <span>
                                                        📄 {t.componente}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                <span className="shrink-0 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[7px] font-bold text-zinc-400 uppercase">
                                                  {(t.etiquetas || []).join(
                                                    ", "
                                                  ) || "GENERAL"}
                                                </span>
                                              </div>

                                              {t.pasos &&
                                                t.pasos.length > 0 && (
                                                  <div className="border-t border-zinc-900/60 pt-1.5">
                                                    <span className="mb-1 block text-[7px] font-bold text-zinc-500 uppercase">
                                                      Pasos Técnicos (
                                                      {t.pasos.length}):
                                                    </span>
                                                    <div className="max-h-[60px] overflow-y-auto pr-1 text-[8px] leading-normal text-zinc-400">
                                                      {t.pasos.map(
                                                        (
                                                          p: string,
                                                          pidx: number
                                                        ) => (
                                                          <div
                                                            key={pidx}
                                                            className="truncate"
                                                          >
                                                            • {p}
                                                          </div>
                                                        )
                                                      )}
                                                    </div>
                                                  </div>
                                                )}

                                              <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-900/60 pt-2">
                                                <select
                                                  value={t.estado || "todo"}
                                                  onChange={(e) =>
                                                    handleUpdateActividadEstado(
                                                      t.id,
                                                      e.target.value
                                                    )
                                                  }
                                                  className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[8px] text-zinc-300 outline-none focus:ring-1 focus:ring-emerald-500/25"
                                                >
                                                  {COMPONENTES_PUNTOS.map(
                                                    (cp) => (
                                                      <option
                                                        key={cp.key}
                                                        value={cp.key}
                                                      >
                                                        {cp.label}
                                                      </option>
                                                    )
                                                  )}
                                                </select>

                                                <button
                                                  onClick={() =>
                                                    setSelectedActividadId(t.id)
                                                  }
                                                  className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold text-emerald-400 uppercase transition-all hover:bg-emerald-500/20"
                                                >
                                                  🚀 Implementar
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-zinc-900 pt-3">
                    <span className="font-mono text-[8px] text-zinc-500">
                      Mostrando historias {startIndex + 1}-
                      {Math.min(startIndex + itemsPerPage, totalStories)} de{" "}
                      {totalStories}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={activePage === 1}
                        onClick={() => setStoriesPage(activePage - 1)}
                        className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[8px] font-bold text-zinc-300 hover:text-zinc-100 disabled:opacity-40"
                      >
                        ◀ Anterior
                      </button>
                      <span className="font-mono text-[9px] font-bold text-zinc-400">
                        Pág {activePage} de {totalPages}
                      </span>
                      <button
                        disabled={activePage === totalPages}
                        onClick={() => setStoriesPage(activePage + 1)}
                        className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[8px] font-bold text-zinc-300 hover:text-zinc-100 disabled:opacity-40"
                      >
                        Siguiente ▶
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        <p className="py-5 text-center font-mono text-[10px] text-zinc-500">
          Selecciona o crea un sprint para enfocar el desarrollo.
        </p>
      )}
    </Card>
  );
};
