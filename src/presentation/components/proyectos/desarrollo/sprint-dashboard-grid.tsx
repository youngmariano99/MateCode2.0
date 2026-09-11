/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { Icono } from "../../icons";

interface SprintDashboardGridProps {
  sprints: any[];
  tareas: any[];
  historias: any[];
  handleEliminarSprintSoft: (sprintId: string) => void;
  handleIniciarSprintFromDashboard: (sprintId: string) => void;
  handleVerSprintDetails: (sprintId: string) => void;
  handleReabrirSprintClick: (sprintId?: string) => void;
}

// Vista "Dashboard": grilla con todos los sprints del proyecto, extraída de
// SprintEnfoqueTab — es uno de los dos modos de vista (el otro es el
// tablero Kanban) que se togglean con `viewMode`, así que es un bloque de
// JSX totalmente autocontenido.
export const SprintDashboardGrid: React.FC<SprintDashboardGridProps> = ({
  sprints,
  tareas,
  historias,
  handleEliminarSprintSoft,
  handleIniciarSprintFromDashboard,
  handleVerSprintDetails,
  handleReabrirSprintClick,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sprints.map((s) => {
          const stories = tareas.filter((t) =>
            historias.some((h) => h.sprintId === s.id && h.id === t.historiaId)
          );
          const completedCount = stories.filter(
            (t) =>
              t.estado === "completado" ||
              t.estado === "Completado" ||
              t.estado === "done" ||
              t.estado === "Done" ||
              t.estado === "Finalizado"
          ).length;
          const progressPct =
            stories.length > 0
              ? Math.round((completedCount / stories.length) * 100)
              : 0;

          return (
            <div
              key={s.id}
              className={`flex flex-col rounded-xl border p-4 font-mono transition-all hover:bg-zinc-900/10 ${
                s.estado === "activo"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : s.estado === "completado"
                    ? "border-zinc-900 bg-zinc-950/20 opacity-70"
                    : "border-zinc-900 bg-zinc-950/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="truncate text-[11px] font-bold text-zinc-200">
                  {s.nombre}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`py-0.2 rounded border px-1.5 text-[7px] font-bold uppercase ${
                      s.estado === "activo"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : s.estado === "completado"
                          ? "border-zinc-800 bg-zinc-900 text-zinc-500"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    {s.estado === "activo"
                      ? "Activo"
                      : s.estado === "completado"
                        ? "Completado"
                        : "Planificado"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEliminarSprintSoft(s.id);
                    }}
                    className="text-zinc-650 flex min-h-11 min-w-11 items-center justify-center rounded transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Eliminar Sprint (Soft Delete)"
                  >
                    <Icono.Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <p className="mt-2 line-clamp-2 min-h-[24px] text-[8px] leading-normal text-zinc-400">
                {s.objetivo || "Sin objetivo definido."}
              </p>

              {/* Micro stats grid */}
              <div className="my-3 grid grid-cols-3 gap-2 border-t border-b border-zinc-900/60 py-2 text-[8px] text-zinc-500">
                <div>
                  <span className="block text-[7px] text-zinc-600 uppercase">
                    Capacidad
                  </span>
                  <span className="text-zinc-350 font-bold">
                    {s.capacidad || 0} Ptos
                  </span>
                </div>
                <div>
                  <span className="block text-[7px] text-zinc-600 uppercase">
                    Duración
                  </span>
                  <span className="text-zinc-350 font-bold">
                    {s.duracionSemanas || 2} Semanas
                  </span>
                </div>
                <div>
                  <span className="block text-[7px] text-zinc-600 uppercase">
                    Tareas
                  </span>
                  <span className="text-zinc-350 font-bold">
                    {completedCount}/{stories.length}
                  </span>
                </div>
              </div>

              {/* Start/End/Completion Dates */}
              <div className="mb-3 flex flex-col gap-0.5 border-b border-zinc-900/40 pb-2.5 font-mono text-[8px] text-zinc-500">
                {s.fechaInicio && (
                  <div className="flex justify-between">
                    <span className="text-zinc-650">INICIO:</span>
                    <span className="font-bold text-zinc-400">
                      {new Date(s.fechaInicio).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                )}
                {s.fechaFin && s.estado !== "completado" && (
                  <div className="flex justify-between">
                    <span className="text-zinc-650">FIN ESTIMADO:</span>
                    <span className="font-bold text-zinc-400">
                      {new Date(s.fechaFin).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                )}
                {s.finalizadoEn && (
                  <div className="flex justify-between">
                    <span className="text-zinc-650 text-emerald-500/80">
                      COMPLETADO:
                    </span>
                    <span className="font-bold text-emerald-400">
                      {new Date(s.finalizadoEn).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {stories.length > 0 && (
                <div className="mb-4">
                  <div className="mb-1 flex items-center justify-between text-[7px] text-zinc-500">
                    <span>Progreso</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-900">
                    <div
                      className={`h-full ${s.estado === "activo" ? "animate-pulse bg-emerald-500" : "bg-sky-500"}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions footer */}
              <div className="mt-auto flex gap-2 pt-2">
                {s.estado === "planificado" && (
                  <button
                    onClick={() => handleIniciarSprintFromDashboard(s.id)}
                    className="flex-1 rounded bg-emerald-500 py-1.5 text-center text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
                  >
                    Comenzar
                  </button>
                )}
                {s.estado === "activo" && (
                  <button
                    onClick={() => handleVerSprintDetails(s.id)}
                    className="flex-1 rounded border border-emerald-500/30 bg-emerald-500/20 py-1.5 text-center text-[9px] font-bold text-emerald-400 uppercase transition-all hover:bg-emerald-500/30"
                  >
                    Tablero
                  </button>
                )}
                {s.estado === "completado" && (
                  <button
                    onClick={() => handleReabrirSprintClick(s.id)}
                    className="flex-1 rounded border border-amber-500/20 bg-amber-500/10 py-1.5 text-center text-[9px] font-bold text-amber-400 uppercase transition-all hover:bg-amber-500/20"
                    title="Reabrir sprint para agregar tareas o registrar bugs manteniendo la fecha de inicio"
                  >
                    Reabrir
                  </button>
                )}
                <button
                  onClick={() => handleVerSprintDetails(s.id)}
                  className="flex-1 rounded border border-zinc-800 bg-zinc-900 py-1.5 text-center text-[9px] font-bold text-zinc-400 uppercase transition-all hover:text-zinc-200"
                >
                  {s.estado === "completado" ? "Ver / Handoff" : "Detalles"}
                </button>
              </div>
            </div>
          );
        })}

        {sprints.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-zinc-900 bg-zinc-900/10 py-10 text-center font-mono text-[10px] text-zinc-500">
            No hay sprints creados en la planificación de este proyecto.
          </div>
        )}
      </div>
    </div>
  );
};
