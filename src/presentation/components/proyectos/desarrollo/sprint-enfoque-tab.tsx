/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../../card";
import { db } from "../../../../offline/dexie/db";

interface SprintEnfoqueTabProps {
  sprints: any[];
  historias: any[];
  historiasSprint: any[];
  epicas: any[];
  tareas: any[];
  actividadesSprint: any[];
  focusedSprint: any | null;
  selectedSprintId: string;
  setSelectedSprintId: (id: string) => void;
  iniciarSprint: () => void;
  finalizarSprint: (targetSprintId?: string) => void;
  cancelarSprint: (reiniciarTareas: boolean) => void;
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
  historias,
  historiasSprint,
  epicas,
  tareas,
  actividadesSprint,
  focusedSprint,
  selectedSprintId,
  setSelectedSprintId,
  iniciarSprint,
  finalizarSprint,
  cancelarSprint,
  iniciarCintaProduccionActividad,
  handleUpdateActividadEstado,
  setIsImportDesvioOpen,
}) => {
  // viewMode can be "dashboard" (list of all sprints) or "kanban" (focus view of a sprint)
  const [viewMode, setViewMode] = useState<"dashboard" | "kanban">("dashboard");

  // Context modals
  const [activeModalContext, setActiveModalContext] = useState<{
    tipo: "epica" | "historia";
    nombre: string;
    descripcion: string;
  } | null>(null);

  // Rollover dialog
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [rolloverTargetSprintId, setRolloverTargetSprintId] = useState("");

  // Cancel sprint dialog
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [resetTasksOnCancel, setResetTasksOnCancel] = useState(true);

  // Auto-switch to Kanban mode if there is an active sprint
  useEffect(() => {
    const activeSprint = sprints.find((s) => s.estado === "activo");
    if (activeSprint && viewMode !== "kanban") {
      const timer = setTimeout(() => {
        setSelectedSprintId(activeSprint.id);
        setViewMode("kanban");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [sprints, viewMode, setSelectedSprintId]);

  const descargarHandoffsSprint = async () => {
    if (!selectedSprintId || !focusedSprint) return;
    try {
      const stories = historias.filter((h) => h.sprintId === selectedSprintId);
      if (stories.length === 0) {
        alert("No hay historias en este sprint para descargar.");
        return;
      }

      let mdContent = `# Handoffs y Entregables del Sprint - ${focusedSprint.nombre}\n\n`;
      mdContent += `**Objetivo:** ${focusedSprint.objetivo || "Sin objetivo definido."}\n`;
      mdContent += `**Capacidad:** ${focusedSprint.capacidad || 0} Ptos | **Duración:** ${focusedSprint.duracionSemanas || 2} Semanas\n`;
      mdContent += `**Estado del Sprint:** ${focusedSprint.estado.toUpperCase()}\n\n`;
      mdContent += `--- \n\n`;

      for (const story of stories) {
        mdContent += `## 🎯 HU: ${story.titulo}\n`;
        if (story.descripcion) {
          mdContent += `*Criterios de Aceptación/Descripción:*\n\`\`\`text\n${story.descripcion}\n\`\`\`\n\n`;
        }

        const subTasks = tareas.filter((t) => t.historiaId === story.id);
        if (subTasks.length === 0) {
          mdContent += `*Sin actividades programadas.*\n\n`;
          continue;
        }

        for (const task of subTasks) {
          const isCompletado =
            task.estado === "completado" ||
            task.estado === "Completado" ||
            task.estado === "done" ||
            task.estado === "Done" ||
            task.estado === "Finalizado";

          mdContent += `### 📄 [${isCompletado ? "✔ COMPLETADA" : "⏳ PENDIENTE"}] ${task.titulo}\n`;
          mdContent += `- **Rol:** ${task.rol || "General"}\n`;
          mdContent += `- **Componente/Ruta:** \`${task.componente || "N/A"}\` (${task.ruta || "N/A"})\n\n`;
          const executionId = `execution_act_${task.id}`;
          const execution = (await db.task_executions.get(executionId)) as any;

          // Intentar obtener handoff singular, o recopilar de handoffs plurales
          const handoffsList: any[] = [];
          if (execution && execution.metadata) {
            if (execution.metadata.handoff) {
              handoffsList.push(execution.metadata.handoff);
            }
            if (
              execution.metadata.handoffs &&
              typeof execution.metadata.handoffs === "object"
            ) {
              Object.values(execution.metadata.handoffs).forEach((ho: any) => {
                if (ho && typeof ho === "object") {
                  handoffsList.push(ho);
                }
              });
            }
          }

          if (handoffsList.length > 0) {
            mdContent += `#### 💾 Devolución / Handoff de la IA:\n`;
            for (const ho of handoffsList) {
              if (ho.resumen_tecnico) {
                mdContent += `**Resumen Técnico:**\n${ho.resumen_tecnico}\n\n`;
              }
              if (
                ho.archivos_creados_o_modificados &&
                ho.archivos_creados_o_modificados.length > 0
              ) {
                mdContent += `**Archivos Modificados:**\n`;
                ho.archivos_creados_o_modificados.forEach((f: string) => {
                  mdContent += `- \`${f}\`\n`;
                });
                mdContent += `\n`;
              }
              if (
                ho.firmas_o_contratos_exportados &&
                ho.firmas_o_contratos_exportados.length > 0
              ) {
                mdContent += `**Contratos y API signatures:**\n`;
                ho.firmas_o_contratos_exportados.forEach((c: string) => {
                  mdContent += `- \`${c}\`\n`;
                });
                mdContent += `\n`;
              }
            }
          } else {
            mdContent += `*No se registró devolución técnica para esta actividad.*\n\n`;
          }
          mdContent += `\n`;
        }
        mdContent += `--- \n\n`;
      }

      const blob = new Blob([mdContent], {
        type: "text/markdown;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const cleanName = focusedSprint.nombre
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      link.setAttribute("href", url);
      link.setAttribute("download", `devoluciones-${cleanName}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error al generar handoffs: ${err.message}`);
    }
  };

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
        setViewMode("dashboard");
      }
    }
  };

  const handleIniciarSprintFromDashboard = (sprintId: string) => {
    setSelectedSprintId(sprintId);
    // Execute iniciarSprint next tick
    setTimeout(() => {
      iniciarSprint();
      setViewMode("kanban");
    }, 50);
  };

  const handleVerSprintDetails = (sprintId: string) => {
    setSelectedSprintId(sprintId);
    setViewMode("kanban");
  };

  return (
    <Card>
      {/* View Switcher Top Bar */}
      <div className="mb-4 flex flex-col justify-between gap-3 border-b border-zinc-900 pb-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
              {viewMode === "dashboard"
                ? "Planificador y Control de Sprints"
                : `Tablero de Trabajo: ${focusedSprint?.nombre || ""}`}
            </h3>
            {focusedSprint &&
              focusedSprint.estado === "activo" &&
              viewMode === "kanban" && (
                <span className="animate-pulse rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[7px] text-emerald-400 uppercase">
                  Sprint en Curso
                </span>
              )}
          </div>
          <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
            {viewMode === "dashboard"
              ? "Dashboard general con el estado, capacidad y métricas de todos los sprints."
              : "Vista de ejecución por estados de actividad y modo enfoque."}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {viewMode === "kanban" && (
            <button
              onClick={() => setViewMode("dashboard")}
              className="text-zinc-350 hover:bg-zinc-850 rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-[9px] font-bold uppercase transition-all hover:text-zinc-100"
            >
              📂 Ver Sprints
            </button>
          )}

          {viewMode === "kanban" && focusedSprint && (
            <button
              onClick={descargarHandoffsSprint}
              className="rounded border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-sky-400 uppercase transition-all hover:bg-sky-500/20"
              title="Descargar devoluciones de la IA de este Sprint en un archivo .md"
            >
              📥 Descargar Handoffs (.md)
            </button>
          )}

          {viewMode === "kanban" &&
            focusedSprint &&
            focusedSprint.estado === "planificado" && (
              <button
                onClick={iniciarSprint}
                className="rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
              >
                ⚡ Comenzar Sprint
              </button>
            )}

          {viewMode === "kanban" &&
            focusedSprint &&
            focusedSprint.estado === "activo" && (
              <>
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="rounded border border-red-500/20 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-red-400 uppercase transition-all hover:bg-red-500/20"
                >
                  ❌ Cancelar Sprint
                </button>
                <button
                  onClick={handleFinalizarSprintClick}
                  className="rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
                >
                  🏁 Finalizar Sprint
                </button>
              </>
            )}

          <button
            onClick={() => setIsImportDesvioOpen(true)}
            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
          >
            ➕ Importar Desvío
          </button>
        </div>
      </div>

      {/* DASHBOARD MODE: Sprint Grid List */}
      {viewMode === "dashboard" ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sprints.map((s) => {
              const stories = tareas.filter((t) =>
                historias.some(
                  (h) => h.sprintId === s.id && h.id === t.historiaId
                )
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
                        ⚡ Comenzar
                      </button>
                    )}
                    {s.estado === "activo" && (
                      <button
                        onClick={() => handleVerSprintDetails(s.id)}
                        className="flex-1 rounded border border-emerald-500/30 bg-emerald-500/20 py-1.5 text-center text-[9px] font-bold text-emerald-400 uppercase transition-all hover:bg-emerald-500/30"
                      >
                        🎯 Tablero
                      </button>
                    )}
                    <button
                      onClick={() => handleVerSprintDetails(s.id)}
                      className="flex-1 rounded border border-zinc-800 bg-zinc-900 py-1.5 text-center text-[9px] font-bold text-zinc-400 uppercase transition-all hover:text-zinc-200"
                    >
                      📋 Detalles
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
      ) : (
        /* KANBAN / SCOPE VIEW MODE */
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
                Revisa los ítems asignados o haz clic en &quot;Comenzar
                Sprint&quot; en la barra de control para habilitar el Kanban de
                ejecución.
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
                            {focusedSprint?.estado === "activo" &&
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
              tareas pendientes a otro sprint (o al Backlog general):
            </p>
            <div className="flex flex-col gap-3">
              <select
                value={rolloverTargetSprintId}
                onChange={(e) => setRolloverTargetSprintId(e.target.value)}
                className="w-full rounded border border-zinc-900 bg-zinc-900 p-2 text-[9px] text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="backlog">
                  (Enviar al Backlog - Sin Sprint)
                </option>
                {sprints
                  .filter(
                    (s) =>
                      s.id !== selectedSprintId && s.estado !== "completado"
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      Reprogramar a: {s.nombre} (
                      {s.estado === "planificado"
                        ? "En Planificación"
                        : "Activo"}
                      )
                    </option>
                  ))}
              </select>

              <button
                onClick={() => {
                  finalizarSprint(rolloverTargetSprintId || "backlog");
                  setIsRolloverOpen(false);
                  setViewMode("dashboard");
                }}
                className="hover:bg-red-650 w-full rounded bg-red-500 py-2 text-center text-[10px] font-bold text-zinc-100 uppercase transition-all"
              >
                Confirmar y Finalizar Sprint 🏁
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Sprint Dialog Modal */}
      {isCancelModalOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm duration-200">
          <div className="w-[450px] rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-mono shadow-2xl">
            <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-[10px] font-bold text-red-400 uppercase">
                ⚠️ Cancelar Sprint Activo
              </span>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="hover:text-zinc-350 text-[9px] text-zinc-500 uppercase"
              >
                Cerrar
              </button>
            </div>
            <p className="mb-4 text-[9px] leading-relaxed text-zinc-400">
              Esta acción detendrá el desarrollo y devolverá el sprint al estado
              **&quot;Planificado&quot;**. Podrás iniciarlo de nuevo más tarde.
            </p>

            <div className="flex flex-col gap-3">
              <span className="block text-[8px] font-bold text-zinc-500 uppercase">
                ¿Qué hacer con las tareas del sprint?
              </span>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-900 bg-zinc-900/10 p-2.5 hover:border-zinc-800">
                <input
                  type="radio"
                  checked={resetTasksOnCancel}
                  onChange={() => setResetTasksOnCancel(true)}
                  className="mt-0.5 accent-emerald-500"
                />
                <div className="text-[9px]">
                  <span className="block font-bold text-zinc-200">
                    Reiniciar Progreso (Recomendado)
                  </span>
                  <span className="block text-[8px] leading-normal text-zinc-500">
                    Restablece todas las actividades de este sprint al estado
                    **&quot;Por Hacer&quot;** (todo).
                  </span>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-900 bg-zinc-900/10 p-2.5 hover:border-zinc-800">
                <input
                  type="radio"
                  checked={!resetTasksOnCancel}
                  onChange={() => setResetTasksOnCancel(false)}
                  className="mt-0.5 accent-emerald-500"
                />
                <div className="text-[9px]">
                  <span className="block font-bold text-zinc-200">
                    Mantener Progreso
                  </span>
                  <span className="block text-[8px] leading-normal text-zinc-500">
                    Conserva el estado actual de las actividades (ej: las que ya
                    estaban completadas seguirán completadas).
                  </span>
                </div>
              </label>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setIsCancelModalOpen(false)}
                  className="text-zinc-450 flex-1 rounded border border-zinc-800 bg-zinc-900 py-2 text-center text-[9px] font-bold uppercase transition-all hover:text-zinc-200"
                >
                  Volver atrás
                </button>
                <button
                  onClick={() => {
                    cancelarSprint(resetTasksOnCancel);
                    setIsCancelModalOpen(false);
                    setViewMode("dashboard");
                  }}
                  className="flex-1 rounded bg-red-500 py-2 text-center text-[9px] font-bold text-zinc-100 uppercase transition-all hover:bg-red-600"
                >
                  Sí, Cancelar Sprint
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
