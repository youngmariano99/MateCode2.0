/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { EjecucionIAControl } from "./ejecucion-ia-control";

const KANBAN_COLUMNS = [
  { key: "todo", label: "Por Hacer", color: "text-zinc-400 border-zinc-800" },
  {
    key: "in_progress",
    label: "En Progreso",
    color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  },
  {
    key: "in_revision",
    label: "En Revisión",
    color: "text-sky-400 border-sky-500/20 bg-sky-500/5",
  },
  {
    key: "completado",
    label: "Completado",
    color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  },
];

interface SprintKanbanBoardProps {
  proyecto: any;
  focusedSprint: any | null;
  historiasSprint: any[];
  tareas: any[];
  epicas: any[];
  getActividadesByCol: (colKey: string) => any[];
  handleMoveState: (
    id: string,
    estadoActual: string,
    direction: "prev" | "next"
  ) => void;
  setActiveModalContext: (
    ctx: {
      tipo: "epica" | "historia";
      nombre: string;
      descripcion: string;
    } | null
  ) => void;
  iniciarCintaProduccionActividad: (act: any) => void;
}

// Vista "Kanban / Enfoque de Sprint" de SprintEnfoqueTab: si el sprint
// seleccionado está en planificación muestra la tabla de historias/
// actividades programadas; si está activo/completado muestra el tablero
// Kanban por columnas. Es el otro modo de vista junto a
// SprintDashboardGrid, autocontenido de la misma forma.
export const SprintKanbanBoard: React.FC<SprintKanbanBoardProps> = ({
  proyecto,
  focusedSprint,
  historiasSprint,
  tareas,
  epicas,
  getActividadesByCol,
  handleMoveState,
  setActiveModalContext,
  iniciarCintaProduccionActividad,
}) => {
  return (
    <div className="animate-in fade-in flex flex-col gap-4 duration-200">
      {/* Metadata banner */}
      <div className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-900 bg-zinc-950/40 p-2.5 sm:grid-cols-3">
        <div className="border-zinc-900 text-center sm:border-r">
          <span className="block font-mono text-[8px] text-zinc-500 uppercase">
            Objetivo del Sprint
          </span>
          <span className="block truncate font-mono text-[10px] font-bold text-zinc-300">
            {focusedSprint?.objetivo || "Sin objetivo definido"}
          </span>
        </div>
        <div className="border-zinc-900 text-center sm:border-r">
          <span className="block font-mono text-[8px] text-zinc-500 uppercase">
            Capacidad Planeada
          </span>
          <span className="block font-mono text-[10px] font-bold text-zinc-300">
            {focusedSprint?.capacidad || 0} Ptos de Historia
          </span>
        </div>
        <div className="text-center">
          <span className="block font-mono text-[8px] text-zinc-500 uppercase">
            Duración
          </span>
          <span className="block font-mono text-[10px] font-bold text-zinc-300">
            {focusedSprint?.duracionSemanas || 2} Semanas
          </span>
        </div>
      </div>

      {/* Planning view if the selected sprint is NOT started yet */}
      {focusedSprint?.estado === "planificado" ? (
        <div className="rounded-xl border border-zinc-900 bg-zinc-950/20 p-8 text-center font-mono">
          <p className="text-[10px] text-zinc-400">
            Este sprint se encuentra actualmente en **Planificación**.
          </p>
          <p className="text-zinc-650 mt-1 text-[8px]">
            Revisa los ítems asignados o haz clic en &quot;Comenzar Sprint&quot;
            en la barra de control para habilitar el Kanban de ejecución.
          </p>

          <div className="mt-6 overflow-x-auto text-left">
            <span className="mb-2 block text-[8px] font-bold text-zinc-500 uppercase">
              Historias y Actividades Programadas
            </span>
            <table className="w-full border-collapse font-mono text-[9px] text-zinc-400">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 uppercase">
                  <th className="p-2 text-left">Historia de Usuario</th>
                  <th className="p-2 text-left">Estimación</th>
                  <th className="p-2 text-left">Actividades asignadas</th>
                </tr>
              </thead>
              <tbody>
                {historiasSprint.map((h) => {
                  const sub = tareas.filter((t) => t.historiaId === h.id);
                  return (
                    <tr key={h.id} className="border-b border-zinc-900/40">
                      <td className="p-2 font-bold text-zinc-300">
                        {h.titulo}
                      </td>
                      <td className="p-2">{h.estimacion}h</td>
                      <td className="p-2">
                        {sub.length > 0 ? (
                          <div className="flex flex-col gap-1 text-[8px]">
                            {sub.map((t) => (
                              <div key={t.id} className="text-zinc-450">
                                • {t.titulo}{" "}
                                <span className="text-[7px] text-zinc-600">
                                  ({t.rol})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic">
                            Sin actividades asignadas
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {historiasSprint.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-zinc-600">
                      No hay historias asignadas a este sprint.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {KANBAN_COLUMNS.map((col) => {
            const acts = getActividadesByCol(col.key);
            return (
              <div
                key={col.key}
                className="flex min-h-[500px] flex-col rounded-xl border border-zinc-900 bg-zinc-950/20 p-3"
              >
                {/* Column Header */}
                <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span
                    className={`font-mono text-[10px] font-bold uppercase ${col.color.split(" ")[0]}`}
                  >
                    {col.label}
                  </span>
                  <span className="py-0.2 rounded border border-zinc-800 bg-zinc-900 px-1.5 font-mono text-[8px] font-bold text-zinc-400">
                    {acts.length}
                  </span>
                </div>

                {/* Column Items */}
                <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                  {acts.map((t) => {
                    const matchedStory = historiasSprint.find(
                      (h) => h.id === t.historiaId
                    );
                    const matchedEpic = matchedStory
                      ? epicas.find((e) => e.id === matchedStory.epicaId)
                      : null;

                    const isCompletado =
                      t.estado === "done" || t.estado === "completado";
                    const isRevision =
                      t.estado === "review" ||
                      t.estado === "testing" ||
                      t.estado === "in_revision";
                    const isEnProgreso =
                      t.estado === "doing" || t.estado === "in_progress";

                    return (
                      <div
                        key={t.id}
                        className={`flex flex-col gap-2 rounded-lg border border-zinc-900 bg-zinc-900/10 p-3 transition-all hover:border-zinc-800 hover:bg-zinc-900/30 ${
                          isEnProgreso
                            ? "border-amber-500/20 bg-amber-500/5"
                            : isRevision
                              ? "border-sky-500/20 bg-sky-500/5"
                              : isCompletado
                                ? "border-emerald-500/20 bg-emerald-500/5 opacity-70"
                                : ""
                        }`}
                      >
                        {/* Card Top Title & ID */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                            ACT-{t.id.slice(-4).toUpperCase()}
                          </span>
                          {/* Arrow state changers */}
                          {focusedSprint?.estado === "activo" && (
                            <div className="flex shrink-0 items-center gap-1">
                              {col.key !== "todo" && (
                                <button
                                  onClick={() =>
                                    handleMoveState(
                                      t.id,
                                      t.estado || "todo",
                                      "prev"
                                    )
                                  }
                                  className="rounded border border-zinc-800 bg-zinc-900 px-1 font-mono text-[8px] text-zinc-400 hover:text-zinc-200"
                                  title="Mover columna anterior"
                                >
                                  ◀
                                </button>
                              )}
                              {col.key !== "completado" && (
                                <button
                                  onClick={() =>
                                    handleMoveState(
                                      t.id,
                                      t.estado || "todo",
                                      "next"
                                    )
                                  }
                                  className="rounded border border-zinc-800 bg-zinc-900 px-1 font-mono text-[8px] text-zinc-400 hover:text-zinc-200"
                                  title="Mover columna siguiente"
                                >
                                  ▶
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <span className="font-mono text-[9px] leading-normal font-bold text-zinc-200">
                          {t.titulo}
                        </span>

                        {/* Tags layer (Epic & HU) */}
                        <div className="flex flex-wrap gap-1.5">
                          {matchedEpic && (
                            <button
                              onClick={() =>
                                setActiveModalContext({
                                  tipo: "epica",
                                  nombre: matchedEpic.nombre,
                                  descripcion:
                                    matchedEpic.descripcion ||
                                    "Sin descripción",
                                })
                              }
                              className="py-0.2 rounded border border-sky-500/20 bg-sky-500/5 px-1 font-mono text-[7px] text-sky-400 uppercase transition-all hover:bg-sky-500/10"
                              title="Ver Épica"
                            >
                              {matchedEpic.nombre.slice(0, 15)}...
                            </button>
                          )}
                          {matchedStory && (
                            <button
                              onClick={() =>
                                setActiveModalContext({
                                  tipo: "historia",
                                  nombre: matchedStory.titulo,
                                  descripcion:
                                    matchedStory.descripcion ||
                                    "Sin descripción de criterios de aceptación.",
                                })
                              }
                              className="py-0.2 rounded border border-purple-500/20 bg-purple-500/5 px-1 font-mono text-[7px] text-purple-400 uppercase transition-all hover:bg-purple-500/10"
                              title="Ver Historia de Usuario"
                            >
                              HU-{matchedStory.id.slice(-4).toUpperCase()}
                            </button>
                          )}
                        </div>

                        {/* Technical meta info */}
                        <div className="mt-0.5 flex flex-col gap-0.5 border-t border-zinc-900/60 pt-1.5 font-mono text-[7px] text-zinc-500">
                          {t.rol && <span>Rol: {t.rol}</span>}
                          {t.componente && <span>File: {t.componente}</span>}
                          {t.ruta && (
                            <span className="truncate">Path: {t.ruta}</span>
                          )}
                        </div>

                        {/* Launch focus mode (manual) */}
                        {focusedSprint?.estado === "activo" &&
                          !isCompletado && (
                            <button
                              onClick={() => iniciarCintaProduccionActividad(t)}
                              className="mt-1 flex items-center justify-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/10 py-1 font-mono text-[8px] font-bold text-emerald-400 uppercase transition-all hover:bg-emerald-500/20"
                            >
                              Modo Enfoque
                            </button>
                          )}

                        {/* Ejecución automatizada con IA (Fase 3) */}
                        {focusedSprint?.estado === "activo" &&
                          !isCompletado && (
                            <EjecucionIAControl
                              proyectoId={proyecto.id}
                              actividad={{ id: t.id, titulo: t.titulo }}
                            />
                          )}
                      </div>
                    );
                  })}
                  {acts.length === 0 && (
                    <div className="rounded-xl border border-dashed border-zinc-900/60 py-8 text-center font-mono text-[8px] text-zinc-600">
                      Vacio
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
