/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { Card } from "../../card";

interface SprintEnfoqueTabProps {
  sprints: any[];
  historiasSprint: any[];
  epicas: any[];
  tareas: any[];
  actividadesSprint: any[];
  focusedSprint: any | null;
  selectedSprintId: string;
  setSelectedSprintId: (id: string) => void;
  iniciarSprint: () => void;
  finalizarSprint: (targetSprintId?: string) => void;
  iniciarCintaProduccionActividad: (act: any) => void;
  handleUpdateActividadEstado: (id: string, nuevoEstado: string) => void;
  setIsImportDesvioOpen: (open: boolean) => void;
}

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

const COLUMN_FLOW = ["todo", "in_progress", "in_revision", "completado"];

export const SprintEnfoqueTab: React.FC<SprintEnfoqueTabProps> = ({
  sprints,
  historiasSprint,
  epicas,
  tareas,
  actividadesSprint,
  focusedSprint,
  selectedSprintId,
  setSelectedSprintId,
  iniciarSprint,
  finalizarSprint,
  iniciarCintaProduccionActividad,
  handleUpdateActividadEstado,
  setIsImportDesvioOpen,
}) => {
  // Context modals
  const [activeModalContext, setActiveModalContext] = useState<{
    tipo: "epica" | "historia";
    nombre: string;
    descripcion: string;
  } | null>(null);

  // Rollover dialog
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [rolloverTargetSprintId, setRolloverTargetSprintId] = useState("");

  const getActividadesByCol = (colKey: string) => {
    return actividadesSprint.filter((t) => {
      const st = t.estado || "todo";
      if (colKey === "todo") return st === "todo";
      if (colKey === "in_progress")
        return st === "doing" || st === "in_progress";
      if (colKey === "in_revision")
        return st === "review" || st === "testing" || st === "in_revision";
      if (colKey === "completado") return st === "done" || st === "completado";
      return false;
    });
  };

  const handleMoveState = (
    actId: string,
    currentState: string,
    direction: "prev" | "next"
  ) => {
    let flowKey = "todo";
    if (currentState === "doing" || currentState === "in_progress")
      flowKey = "in_progress";
    else if (
      currentState === "review" ||
      currentState === "testing" ||
      currentState === "in_revision"
    )
      flowKey = "in_revision";
    else if (currentState === "done" || currentState === "completado")
      flowKey = "completado";

    const currentIndex = COLUMN_FLOW.indexOf(flowKey);
    let nextIndex = currentIndex;
    if (direction === "next" && currentIndex < COLUMN_FLOW.length - 1) {
      nextIndex++;
    } else if (direction === "prev" && currentIndex > 0) {
      nextIndex--;
    }

    if (nextIndex !== currentIndex) {
      handleUpdateActividadEstado(actId, COLUMN_FLOW[nextIndex]);
    }
  };

  const handleFinalizarSprintClick = () => {
    const incomplete = actividadesSprint.filter((t) => {
      const st = t.estado || "todo";
      return st !== "done" && st !== "completado";
    });

    if (incomplete.length > 0) {
      setIsRolloverOpen(true);
    } else {
      if (
        confirm(
          "¿Estás seguro de finalizar este sprint? Todas las tareas han sido completadas."
        )
      ) {
        finalizarSprint();
      }
    }
  };

  return (
    <Card>
      {/* Top Header Controls */}
      <div className="mb-4 flex flex-col justify-between gap-3 border-b border-zinc-900 pb-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Desarrollo por Sprints & Kanban
          </h3>
          <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
            Gestiona el sprint de desarrollo, visualiza las tareas por estados e
            inicia el modo enfoque.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <select
            value={selectedSprintId}
            onChange={(e) => setSelectedSprintId(e.target.value)}
            className="max-w-[320px] rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 font-mono text-[10px] text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Selecciona un sprint...</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} (
                {s.estado === "planificacion"
                  ? "En Planificación"
                  : s.estado === "activo"
                    ? "Activo"
                    : "Completado"}
                )
              </option>
            ))}
          </select>

          {focusedSprint && focusedSprint.estado === "planificacion" && (
            <button
              onClick={iniciarSprint}
              className="rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
            >
              ⚡ Comenzar Sprint
            </button>
          )}

          {focusedSprint && focusedSprint.estado === "activo" && (
            <button
              onClick={handleFinalizarSprintClick}
              className="rounded bg-red-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-100 uppercase transition-all hover:bg-red-600"
            >
              🏁 Finalizar Sprint
            </button>
          )}

          <button
            onClick={() => setIsImportDesvioOpen(true)}
            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
          >
            ➕ Importar Desvío
          </button>
        </div>
      </div>

      {focusedSprint ? (
        <div className="flex flex-col gap-4">
          {/* Metadata banner */}
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-900 bg-zinc-950/40 p-2.5 sm:grid-cols-3">
            <div className="border-zinc-900 text-center sm:border-r">
              <span className="block font-mono text-[8px] text-zinc-500 uppercase">
                Objetivo del Sprint
              </span>
              <span className="block truncate font-mono text-[10px] font-bold text-zinc-300">
                {focusedSprint.objetivo || "Sin objetivo definido"}
              </span>
            </div>
            <div className="border-zinc-900 text-center sm:border-r">
              <span className="block font-mono text-[8px] text-zinc-500 uppercase">
                Capacidad Planeada
              </span>
              <span className="block font-mono text-[10px] font-bold text-zinc-300">
                {focusedSprint.capacidad || 0} Ptos de Historia
              </span>
            </div>
            <div className="text-center">
              <span className="block font-mono text-[8px] text-zinc-500 uppercase">
                Duración
              </span>
              <span className="block font-mono text-[10px] font-bold text-zinc-300">
                {focusedSprint.duracionSemanas || 2} Semanas
              </span>
            </div>
          </div>

          {/* Planning state fallback */}
          {focusedSprint.estado === "planificacion" ? (
            <div className="rounded-xl border border-zinc-900 bg-zinc-950/20 p-8 text-center font-mono">
              <p className="text-[10px] text-zinc-400">
                Este sprint se encuentra actualmente en **Planificación**.
              </p>
              <p className="text-zinc-650 mt-1 text-[8px]">
                Revisa los ítems asignados o haz clic en &quot;Comenzar
                Sprint&quot; en la barra de control para habilitar el Kanban de
                ejecución.
              </p>

              <div className="mt-6 overflow-x-auto text-left">
                <span className="mb-2 block text-[8px] font-bold text-zinc-500 uppercase">
                  Historias y Actividades Programadas
                </span>
                <table className="w-full border-collapse text-[9px] text-zinc-400">
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
                        <td
                          colSpan={3}
                          className="py-4 text-center text-zinc-600"
                        >
                          No hay historias asignadas a este sprint.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Kanban Board */
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
                              {focusedSprint.estado === "activo" && (
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
                                  📦 {matchedEpic.nombre.slice(0, 15)}...
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
                                  🎯 HU-
                                  {matchedStory.id.slice(-4).toUpperCase()}
                                </button>
                              )}
                            </div>

                            {/* Technical meta info */}
                            <div className="mt-0.5 flex flex-col gap-0.5 border-t border-zinc-900/60 pt-1.5 font-mono text-[7px] text-zinc-500">
                              {t.rol && <span>👤 Rol: {t.rol}</span>}
                              {t.componente && (
                                <span>📄 File: {t.componente}</span>
                              )}
                              {t.ruta && (
                                <span className="truncate">
                                  📂 Path: {t.ruta}
                                </span>
                              )}
                            </div>

                            {/* Launch focus mode */}
                            {focusedSprint.estado === "activo" &&
                              !isCompletado && (
                                <button
                                  onClick={() =>
                                    iniciarCintaProduccionActividad(t)
                                  }
                                  className="mt-1 flex items-center justify-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/10 py-1 font-mono text-[8px] font-bold text-emerald-400 uppercase transition-all hover:bg-emerald-500/20"
                                >
                                  🎯 Modo Enfoque
                                </button>
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
      ) : (
        <p className="py-5 text-center font-mono text-[10px] text-zinc-500">
          Selecciona un sprint en el menú para cargar su planificación.
        </p>
      )}

      {/* Sutil Context Modal for Epics / HUs */}
      {activeModalContext && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm duration-200">
          <div className="w-[450px] rounded-xl border border-zinc-800 bg-zinc-950/90 p-5 font-mono shadow-2xl">
            <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-[10px] font-bold text-sky-400 uppercase">
                Contexto:{" "}
                {activeModalContext.tipo === "epica"
                  ? "Épica / Módulo"
                  : "Historia de Usuario"}
              </span>
              <button
                onClick={() => setActiveModalContext(null)}
                className="hover:text-zinc-350 text-[9px] text-zinc-500 uppercase"
              >
                Cerrar
              </button>
            </div>
            <h4 className="mb-2 text-[11px] leading-snug font-bold text-zinc-100">
              {activeModalContext.nombre}
            </h4>
            <div className="max-h-[220px] overflow-y-auto rounded border border-zinc-900/60 bg-zinc-900/20 p-2.5 pr-1 text-[9px] leading-relaxed text-zinc-400">
              {activeModalContext.descripcion}
            </div>
          </div>
        </div>
      )}

      {/* Rollover Modal */}
      {isRolloverOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm duration-200">
          <div className="w-[480px] rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-mono shadow-2xl">
            <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-[10px] font-bold text-red-400 uppercase">
                ⚠️ Finalizar Sprint con Tareas Pendientes
              </span>
              <button
                onClick={() => setIsRolloverOpen(false)}
                className="hover:text-zinc-350 text-[9px] text-zinc-500 uppercase"
              >
                Cancelar
              </button>
            </div>
            <p className="mb-3 text-[9px] leading-relaxed text-zinc-400">
              Detectamos actividades no completadas en este sprint. Para poder
              cerrar el sprint, debes reprogramar las Historias de Usuario con
              tareas pendientes a otro sprint:
            </p>
            <div className="flex flex-col gap-3">
              <select
                value={rolloverTargetSprintId}
                onChange={(e) => setRolloverTargetSprintId(e.target.value)}
                className="w-full rounded border border-zinc-900 bg-zinc-900 p-2 text-[9px] text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">(Volver al Backlog / Sin Sprint)</option>
                {sprints
                  .filter(
                    (s) =>
                      s.id !== selectedSprintId && s.estado !== "completado"
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      Reprogramar a: {s.nombre} (
                      {s.estado === "planificacion"
                        ? "En Planificación"
                        : "Activo"}
                      )
                    </option>
                  ))}
              </select>

              <button
                onClick={() => {
                  finalizarSprint(rolloverTargetSprintId || undefined);
                  setIsRolloverOpen(false);
                }}
                className="hover:bg-red-650 w-full rounded bg-red-500 py-2 text-center text-[10px] font-bold text-zinc-100 uppercase transition-all"
              >
                Confirmar y Finalizar Sprint 🏁
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
