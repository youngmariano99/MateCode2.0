"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { useToast } from "../../hooks/useToast";

interface DesarrolloWorkspaceProps {
  proyectoId: string;
}

const ROLES = [
  { key: "desarrollador", label: "Desarrollador Fullstack" },
  { key: "arquitecto", label: "Arquitecto de Software" },
  { key: "ciberseguridad", label: "Ingeniero de Ciberseguridad" },
  { key: "custom", label: "Rol Personalizado" },
];

const COMPONENTES_PUNTOS = [
  { key: "todo", label: "Por Hacer" },
  { key: "doing", label: "En Desarrollo" },
  { key: "review", label: "En Revisión" },
  { key: "testing", label: "Testing" },
  { key: "blocked", label: "Bloqueado" },
  { key: "done", label: "Finalizado" },
];

export const DesarrolloWorkspace: React.FC<DesarrolloWorkspaceProps> = ({
  proyectoId,
}) => {
  const { mostrarToast } = useToast();

  // Load project details
  const proyecto = useLiveQuery(
    () => db.proyectos.get(proyectoId),
    [proyectoId]
  );

  // Load Sprints, Stories, and Activities reactively
  const sprints = (useLiveQuery(() =>
    db.sprints.where("proyectoId").equals(proyectoId).toArray()
  ) || []) as any[];

  const historias = (useLiveQuery(() =>
    db.historias.where("proyectoId").equals(proyectoId).toArray()
  ) || []) as any[];

  const tareas = (useLiveQuery(() =>
    db.tareas.where("proyectoId").equals(proyectoId).toArray()
  ) || []) as any[];

  const epicas = (useLiveQuery(() =>
    db.epicas.where("proyectoId").equals(proyectoId).toArray()
  ) || []) as any[];

  // Active focused Sprint State
  const [selectedSprintId, setSelectedSprintId] = useState("");

  // Tickets (executions) loaded
  const ticketExecutions = (useLiveQuery(() =>
    db.task_executions.where("proyectoId").equals(proyectoId).toArray()
  ) || []) as any[];

  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // Active ticket detail
  const activeTicket = ticketExecutions.find((t) => t.id === activeTicketId);

  // Step states for active ticket
  const stepStates = (useLiveQuery(async () => {
    if (!activeTicketId) return [];
    return await db.task_step_states
      .where("executionId")
      .equals(activeTicketId)
      .toArray();
  }, [activeTicketId]) || []) as any[];

  // Form states for creating Feature ticket
  const [selectedActividadId, setSelectedActividadId] = useState("");
  const [featureExtraContext, setFeatureExtraContext] = useState("");
  const [selectedRole, setSelectedRole] = useState("desarrollador");
  const [customRoleText, setCustomRoleText] = useState("");
  const [criterioAceptacion, setCriterioAceptacion] = useState("");
  const [ticketMiembro, setTicketMiembro] = useState("Mariano");

  // Form states for creating Bug ticket
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [bugNombre, setBugNombre] = useState("");
  const [linkedTicketId, setLinkedTicketId] = useState("");
  const [bugLogs, setBugLogs] = useState("");
  const [bugType, setBugType] = useState<"bugfix" | "hotfix">("bugfix");

  // Checklist import JSON text
  const [checklistJsonInput, setChecklistJsonInput] = useState("");
  const [aiSummaryInput, setAiSummaryInput] = useState("");

  // Automatically select active sprint or first sprint
  useEffect(() => {
    const active = sprints.find((s) => s.estado === "activo");
    if (active) {
      setSelectedSprintId(active.id);
    } else if (sprints.length > 0 && !selectedSprintId) {
      setSelectedSprintId(sprints[0].id);
    }
  }, [sprints]);

  // Load last active ticket if none selected
  useEffect(() => {
    if (ticketExecutions.length > 0 && !activeTicketId) {
      const active = ticketExecutions.find((t) => t.estado === "IN_PROGRESS");
      if (active) {
        setActiveTicketId(active.id);
      }
    }
  }, [ticketExecutions]);

  const focusedSprint = sprints.find((s) => s.id === selectedSprintId);
  const historiasSprint = historias.filter(
    (h) => h.sprintId === selectedSprintId
  );
  const historiasSprintIds = historiasSprint.map((h) => h.id);
  const actividadesSprint = tareas.filter((t) =>
    historiasSprintIds.includes(t.historiaId)
  );

  const iniciarSprint = async () => {
    if (!selectedSprintId) return;
    try {
      await db.sprints.update(selectedSprintId, { estado: "activo" });
      mostrarToast("Sprint inicializado y enfocado.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al iniciar sprint: ${err.message}`, "error");
    }
  };

  const handleUpdateActividadEstado = async (
    actId: string,
    nuevoEstado: string
  ) => {
    try {
      await db.tareas.update(actId, { estado: nuevoEstado });
      mostrarToast("Estado de actividad actualizado.", "info");
    } catch (err: any) {
      mostrarToast(`Error al actualizar estado: ${err.message}`, "error");
    }
  };

  const iniciarFeatureTicket = async () => {
    if (!selectedActividadId) {
      mostrarToast("Selecciona una actividad para desarrollar.", "error");
      return;
    }
    const actividad = tareas.find((t) => t.id === selectedActividadId);
    if (!actividad) return;

    const ticketId = `tick_feat_${Date.now()}`;
    try {
      await db.transaction(
        "rw",
        [db.task_executions, db.task_step_states, db.tareas],
        async () => {
          // Create execution ticket
          await db.task_executions.put({
            id: ticketId,
            proyectoId,
            templateId: "workflow_feature",
            titulo: `FEAT: ${actividad.titulo}`,
            estado: "IN_PROGRESS",
            usuarioAsignadoId: ticketMiembro,
            fechaInicio: Date.now(),
            metadata: {
              actividadId: selectedActividadId,
              extraContext: featureExtraContext,
              rol: selectedRole === "custom" ? customRoleText : selectedRole,
              criterioAceptacion,
            },
          });

          // Initialize 5 feature steps
          const steps = [
            "Preparación del Entorno (Git Flow)",
            "Desarrollo e IA Prompt (Coding)",
            "Pull Request y CI Validation",
            "Pruebas de Calidad (Staging & QA)",
            "Despliegue y Cierre de Ticket",
          ];

          for (let i = 0; i < steps.length; i++) {
            await db.task_step_states.put({
              id: `state_${ticketId}_step_${i + 1}`,
              executionId: ticketId,
              stepId: `step_${i + 1}`,
              titulo: steps[i],
              completado: false,
            });
          }

          // Update task state to "doing"
          await db.tareas.update(selectedActividadId, { estado: "doing" });
        }
      );

      setActiveTicketId(ticketId);
      setFeatureExtraContext("");
      setCriterioAceptacion("");
      setSelectedActividadId("");
      mostrarToast("Ticket de Feature iniciado con éxito.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al iniciar ticket: ${err.message}`, "error");
    }
  };

  const iniciarBugTicket = async () => {
    if (!bugNombre.trim()) {
      mostrarToast("Escribe un nombre para el bug.", "error");
      return;
    }

    const ticketId = `tick_bug_${Date.now()}`;
    try {
      await db.transaction(
        "rw",
        [db.task_executions, db.task_step_states],
        async () => {
          await db.task_executions.put({
            id: ticketId,
            proyectoId,
            templateId: "workflow_bugfix",
            titulo: `${bugType.toUpperCase()}: ${bugNombre}`,
            estado: "IN_PROGRESS",
            usuarioAsignadoId: ticketMiembro,
            fechaInicio: Date.now(),
            metadata: {
              linkedTicketId,
              logs: bugLogs,
              tipoBug: bugType,
            },
          });

          const steps = [
            "Aislamiento y Rama (Git Checkout)",
            "Pruebas de Regresión (TDD para Bug)",
            "La Solución (Debugging & Fix)",
            "Pull Request y QA Review",
            "Despliegue y Post-Mortem",
          ];

          for (let i = 0; i < steps.length; i++) {
            await db.task_step_states.put({
              id: `state_${ticketId}_step_${i + 1}`,
              executionId: ticketId,
              stepId: `step_${i + 1}`,
              titulo: steps[i],
              completado: false,
            });
          }
        }
      );

      setActiveTicketId(ticketId);
      setBugNombre("");
      setBugLogs("");
      setLinkedTicketId("");
      setIsBugModalOpen(false);
      mostrarToast(`Ticket de ${bugType} iniciado con éxito.`, "exito");
    } catch (err: any) {
      mostrarToast(`Error al iniciar bug: ${err.message}`, "error");
    }
  };

  const toggleStepCompleted = async (stepStateId: string, current: boolean) => {
    try {
      await db.task_step_states.update(stepStateId, { completado: !current });
    } catch (err: any) {
      mostrarToast(`Error al actualizar paso: ${err.message}`, "error");
    }
  };

  const finalizarTicket = async () => {
    if (!activeTicketId) return;
    try {
      await db.transaction("rw", [db.task_executions, db.tareas], async () => {
        const metadata = activeTicket?.metadata || {};
        await db.task_executions.update(activeTicketId, {
          estado: "COMPLETED",
          fechaFin: Date.now(),
          metadata: {
            ...metadata,
            aiSummary: aiSummaryInput,
          },
        });

        // If it was linked to an activity, move it to "done"
        if (metadata.actividadId) {
          await db.tareas.update(metadata.actividadId, { estado: "done" });
        }
      });

      setAiSummaryInput("");
      mostrarToast(
        "Ticket cerrado con éxito. Registro de auditoría completado.",
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al cerrar ticket: ${err.message}`, "error");
    }
  };

  // Compile prompt for AI
  const compileTicketPrompt = () => {
    if (!activeTicket) return "";

    const stackText = proyecto?.stack
      ? Object.entries(proyecto.stack)
          .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
          .join(" | ")
      : "";

    const estText = proyecto?.estandares
      ? Object.entries(proyecto.estandares)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ")
      : "";

    let prompt = `Actúa en el rol de: ${activeTicket.metadata?.rol || "Desarrollador Senior"}.\n\n`;
    prompt += `CONTEXTO DEL PROYECTO:\n`;
    prompt += `- Stack: ${stackText}\n`;
    prompt += `- Estándares: ${estText}\n\n`;

    prompt += `TAREA A REALIZAR:\n`;
    prompt += `- Ticket: ${activeTicket.titulo}\n`;
    if (activeTicket.metadata?.extraContext) {
      prompt += `- Instrucciones Extra: ${activeTicket.metadata.extraContext}\n`;
    }
    if (activeTicket.metadata?.criterioAceptacion) {
      prompt += `- Criterios de Aceptación: ${activeTicket.metadata.criterioAceptacion}\n`;
    }
    if (activeTicket.metadata?.logs) {
      prompt += `- Logs del Error: ${activeTicket.metadata.logs}\n`;
    }

    prompt += `\nINSTRUCCIONES DE RESPUESTA:\n`;
    prompt += `1. Analiza el contexto y el stack tecnológico.\n`;
    prompt += `2. Escribe el código necesario e instrucciones de desarrollo claras para un desarrollador junior.\n`;
    prompt += `3. Al finalizar tu respuesta, debes incluir obligatoriamente un bloque JSON con el resumen de tareas completadas para sincronizar el checklist. El JSON debe lucir así:\n`;
    prompt += `{\n  "resumen_ia": "Breve descripción técnica de lo implementado",\n  "checklist": [\n    { "paso": 1, "completado": true },\n    { "paso": 2, "completado": true }\n  ]\n}`;

    return prompt;
  };

  const copiarPromptTicket = () => {
    const prompt = compileTicketPrompt();
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    mostrarToast(
      "Prompt de trabajo de ticket copiado al portapapeles.",
      "exito"
    );
  };

  const importarChecklistIA = async () => {
    try {
      const data = JSON.parse(checklistJsonInput);
      if (data.checklist && Array.isArray(data.checklist)) {
        for (const item of data.checklist) {
          const stepIndex = Number(item.paso);
          const comp = !!item.completado;
          const matchedStep = stepStates.find(
            (s) => s.stepId === `step_${stepIndex}`
          );
          if (matchedStep) {
            await db.task_step_states.update(matchedStep.id, {
              completado: comp,
            });
          }
        }
      }
      if (data.resumen_ia) {
        setAiSummaryInput(data.resumen_ia);
      }
      setChecklistJsonInput("");
      mostrarToast(
        "Checklist y resumen sincronizados desde el JSON de la IA.",
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`JSON Inválido: ${err.message}`, "error");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      {/* Left panel: Sprint Backlog */}
      <div className="flex flex-col gap-4 xl:col-span-6">
        <Card>
          <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
            <div>
              <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
                Sprint de Enfoque Activo
              </h3>
              <p className="text-zinc-550 mt-0.5 font-mono text-[9px]">
                Visualiza y enfoca el desarrollo en un sprint de trabajo
              </p>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedSprintId}
                onChange={(e) => setSelectedSprintId(e.target.value)}
                className="border-zinc-850 rounded border bg-zinc-900 px-2.5 py-1 font-mono text-[10px] text-zinc-200 outline-none"
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
            </div>
          </div>

          {focusedSprint ? (
            <div className="flex flex-col gap-2">
              <div className="mb-2 grid grid-cols-3 gap-2 rounded-lg border border-zinc-900 bg-zinc-950/40 p-2.5">
                <div className="border-r border-zinc-900 text-center">
                  <span className="text-zinc-550 block font-mono text-[8px] uppercase">
                    Objetivo
                  </span>
                  <span className="block truncate font-mono text-[10px] font-bold text-zinc-300">
                    {focusedSprint.objetivo || "Sin objetivo"}
                  </span>
                </div>
                <div className="border-r border-zinc-900 text-center">
                  <span className="text-zinc-550 block font-mono text-[8px] uppercase">
                    Capacidad
                  </span>
                  <span className="block font-mono text-[10px] font-bold text-zinc-300">
                    {focusedSprint.capacidad || 0} Ptos
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-zinc-550 block font-mono text-[8px] uppercase">
                    Semanas
                  </span>
                  <span className="block font-mono text-[10px] font-bold text-zinc-300">
                    {focusedSprint.duracionSemanas || 2} Sem
                  </span>
                </div>
              </div>

              {/* Grouped by Epic/Stories */}
              <div className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-1">
                {historiasSprint.length === 0 ? (
                  <p className="text-zinc-550 py-5 text-center font-mono text-[10px]">
                    No hay historias asociadas a este sprint.
                  </p>
                ) : (
                  historiasSprint.map((hist) => {
                    const matchedEpic = epicas.find(
                      (e) => e.id === hist.epicaId
                    );
                    const subTareas = actividadesSprint.filter(
                      (t) => t.historiaId === hist.id
                    );

                    return (
                      <div
                        key={hist.id}
                        className="rounded-lg border border-zinc-900 bg-zinc-950/20 p-3"
                      >
                        <div className="mb-2 flex items-start justify-between border-b border-zinc-900/60 pb-1.5">
                          <div>
                            <span className="rounded border border-sky-500/20 bg-sky-500/10 px-1 font-mono text-[8px] font-bold text-sky-400 uppercase">
                              {matchedEpic
                                ? matchedEpic.nombre
                                : "Épica general"}
                            </span>
                            <h4 className="mt-1 text-[10px] font-bold text-zinc-200">
                              {hist.titulo}
                            </h4>
                          </div>
                          <span className="shrink-0 font-mono text-[9px] text-zinc-500">
                            {hist.prioridad} · {hist.estimacion}h
                          </span>
                        </div>

                        {/* Activities list */}
                        <div className="mt-2 flex flex-col gap-1.5">
                          {subTareas.length === 0 ? (
                            <span className="text-zinc-550 font-mono text-[8px]">
                              Sin actividades.
                            </span>
                          ) : (
                            subTareas.map((t) => (
                              <div
                                key={t.id}
                                className="hover:border-zinc-850 flex items-center justify-between rounded border border-zinc-900/40 bg-zinc-950/40 p-2"
                              >
                                <span className="font-mono text-[10px] text-zinc-300">
                                  {t.titulo}
                                </span>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={t.estado || "todo"}
                                    onChange={(e) =>
                                      handleUpdateActividadEstado(
                                        t.id,
                                        e.target.value
                                      )
                                    }
                                    className="border-zinc-850 rounded border bg-zinc-900 px-1 py-0.5 font-mono text-[8px] text-zinc-400 outline-none"
                                  >
                                    {COMPONENTES_PUNTOS.map((col) => (
                                      <option key={col.key} value={col.key}>
                                        {col.label}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => {
                                      setSelectedActividadId(t.id);
                                      setFeatureExtraContext(
                                        `Desarrollar la funcionalidad: ${t.titulo}.`
                                      );
                                    }}
                                    className="font-mono text-[9px] font-bold text-emerald-400 hover:text-emerald-300"
                                  >
                                    🚀 Implementar
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <p className="text-zinc-550 py-5 text-center font-mono text-[10px]">
              Selecciona o crea un sprint para enfocar el desarrollo.
            </p>
          )}
        </Card>

        {/* Global Bug Trigger Button */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsBugModalOpen(true)}
            className="flex-1 rounded-xl border border-red-500/20 bg-red-500/10 py-3 text-center font-mono text-xs font-bold text-red-400 uppercase transition-all hover:bg-red-500/20"
          >
            🐛 Abrir Ticket de Bug / Emergencia
          </button>
        </div>
      </div>

      {/* Right panel: Active Ticket Console */}
      <div className="flex flex-col gap-4 xl:col-span-6">
        {/* Ticket Selector / Active status */}
        <Card>
          <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
            <div>
              <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
                Consola de Ticket Activo
              </h3>
              <p className="text-zinc-550 mt-0.5 font-mono text-[9px]">
                Consola para resolver el ticket en curso con checklists e IA
              </p>
            </div>
            <select
              value={activeTicketId || ""}
              onChange={(e) => setActiveTicketId(e.target.value)}
              className="border-zinc-850 rounded border bg-zinc-900 px-2.5 py-1 font-mono text-[10px] text-zinc-200 outline-none"
            >
              <option value="">Ninguno activo...</option>
              {ticketExecutions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titulo} ({t.estado})
                </option>
              ))}
            </select>
          </div>

          {activeTicket ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between rounded-lg border border-zinc-900 bg-zinc-950 p-3">
                <div>
                  <span className="block font-mono text-[8px] font-bold text-zinc-500 uppercase">
                    Ticket ID: {activeTicket.id} · Encargado:{" "}
                    {activeTicket.usuarioAsignadoId}
                  </span>
                  <h4 className="mt-1 text-[11px] font-bold text-zinc-200 uppercase">
                    {activeTicket.titulo}
                  </h4>
                </div>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-[8px] font-bold ${
                    activeTicket.estado === "COMPLETED"
                      ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {activeTicket.estado}
                </span>
              </div>

              {/* 5 Steps Checklist */}
              <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
                <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                  📋 Pasos de Implementación
                </span>
                <div className="mt-1 flex flex-col gap-2">
                  {stepStates.map((st, idx) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between border-b border-zinc-900/60 pb-1.5 last:border-none"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={st.completado}
                          disabled={activeTicket.estado === "COMPLETED"}
                          onChange={() =>
                            toggleStepCompleted(st.id, st.completado)
                          }
                          className="h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:ring-offset-0 focus:outline-none"
                        />
                        <span
                          className={`font-mono text-[10px] ${
                            st.completado
                              ? "text-zinc-550 line-through"
                              : "text-zinc-300"
                          }`}
                        >
                          Paso {idx + 1}: {st.titulo}
                        </span>
                      </div>

                      {/* Commands helper for developer */}
                      {idx === 0 && (
                        <button
                          onClick={() => {
                            const name = activeTicket.titulo
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-");
                            const br =
                              activeTicket.templateId === "workflow_bugfix"
                                ? `bugfix/${name}`
                                : `feature/${name}`;
                            navigator.clipboard.writeText(
                              `git checkout -b ${br}`
                            );
                            mostrarToast(
                              "Git checkout comando copiado.",
                              "info"
                            );
                          }}
                          className="hover:text-zinc-350 font-mono text-[8px] text-zinc-500 underline"
                        >
                          Copiar git checkout
                        </button>
                      )}
                      {idx === 4 && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              "git checkout main\ngit merge -"
                            );
                            mostrarToast(
                              "Git merge comandos copiados.",
                              "info"
                            );
                          }}
                          className="hover:text-zinc-350 font-mono text-[8px] text-zinc-500 underline"
                        >
                          Copiar git merge
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {activeTicket.estado === "IN_PROGRESS" && (
                <>
                  {/* Prompt Compiler box */}
                  <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
                    <div>
                      <span className="block font-mono text-[9px] font-bold text-zinc-400 uppercase">
                        🚀 Copiar Prompt para la IA
                      </span>
                      <span className="text-zinc-650 mt-0.5 block text-[8px]">
                        Prepara las instrucciones de stack, estándares y roles
                        para Claude / GPT
                      </span>
                    </div>
                    <button
                      onClick={copiarPromptTicket}
                      className="rounded border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
                    >
                      Copiar Prompt IA
                    </button>
                  </div>

                  {/* JSON Checklist auto-importer */}
                  <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950/20 p-3">
                    <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                      📥 Sincronizar Checklist desde la IA (JSON)
                    </span>
                    <textarea
                      value={checklistJsonInput}
                      onChange={(e) => setChecklistJsonInput(e.target.value)}
                      placeholder='Pega aquí el JSON de retorno de la IA para auto-tildar los pasos... (ej: {"checklist": [{"paso": 2, "completado": true}], "resumen_ia": "..."})'
                      rows={3}
                      className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[9px] text-zinc-300 outline-none"
                    />
                    <button
                      onClick={importarChecklistIA}
                      className="self-end rounded border border-zinc-800 bg-zinc-900 px-3 py-1 font-mono text-[9px] font-bold text-zinc-300 uppercase transition-all hover:bg-zinc-800"
                    >
                      Sincronizar
                    </button>
                  </div>

                  {/* Summary & Finalize action */}
                  <div className="flex flex-col gap-2 border-t border-zinc-900 pt-3">
                    <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                      Post-Mortem / Resumen Técnico (Para auditoría futura)
                    </label>
                    <textarea
                      value={aiSummaryInput}
                      onChange={(e) => setAiSummaryInput(e.target.value)}
                      placeholder="Resume qué archivos cambiaste y qué lógica agregaste..."
                      rows={2}
                      className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-300 outline-none"
                    />
                    <button
                      onClick={finalizarTicket}
                      className="w-full rounded bg-emerald-500 py-2 text-[10px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-600"
                    >
                      Finalizar Ticket y Registrar
                    </button>
                  </div>
                </>
              )}

              {activeTicket.metadata?.aiSummary && (
                <div className="mt-1 rounded-xl border border-zinc-900 bg-zinc-950 p-3">
                  <span className="mb-1 block font-mono text-[9px] font-bold text-zinc-500 uppercase">
                    💾 Resumen Técnico Guardado:
                  </span>
                  <p className="text-zinc-350 font-mono text-[10px] leading-relaxed">
                    {activeTicket.metadata.aiSummary}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-zinc-550 py-10 text-center font-mono text-[10px]">
              Ningún ticket en curso en este momento. Selecciona una actividad
              del backlog para comenzar.
            </p>
          )}
        </Card>

        {/* Start implementing widget / Drawer inline */}
        {selectedActividadId && (
          <Card className="animate-in fade-in zoom-in-95 border border-emerald-500/20 bg-emerald-500/5">
            <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase">
                🚀 Inicializar Feature Ticket
              </span>
              <button
                onClick={() => setSelectedActividadId("")}
                className="font-mono text-[9px] text-zinc-500 uppercase hover:text-zinc-300"
              >
                Cancelar
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                    Encargado
                  </label>
                  <input
                    type="text"
                    value={ticketMiembro}
                    onChange={(e) => setTicketMiembro(e.target.value)}
                    className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                    Rol IA
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedRole === "custom" && (
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                    Especificar Rol
                  </label>
                  <input
                    type="text"
                    value={customRoleText}
                    onChange={(e) => setCustomRoleText(e.target.value)}
                    placeholder="Ej: React Native Specialist..."
                    className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                  Criterios de Aceptación
                </label>
                <textarea
                  value={criterioAceptacion}
                  onChange={(e) => setCriterioAceptacion(e.target.value)}
                  placeholder="Detalla cómo sabremos que esta actividad está terminada..."
                  rows={2}
                  className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
                />
              </div>

              <button
                onClick={iniciarFeatureTicket}
                className="w-full rounded bg-emerald-500 py-2 text-[10px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-600"
              >
                Comenzar Feature
              </button>
            </div>
          </Card>
        )}
      </div>

      {/* Modal / Panel for Bug Tickets */}
      {isBugModalOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="border-zinc-850 w-[500px] rounded-xl border bg-zinc-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
              <span className="font-mono text-xs font-bold text-red-400 uppercase">
                🐛 Registrar Bug / Hotfix
              </span>
              <button
                onClick={() => setIsBugModalOpen(false)}
                className="font-mono text-[10px] text-zinc-500 uppercase hover:text-zinc-300"
              >
                Cerrar
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                  Nombre / Título del Bug
                </label>
                <input
                  type="text"
                  value={bugNombre}
                  onChange={(e) => setBugNombre(e.target.value)}
                  placeholder="Ej: CRM-404 error filtro de clientes..."
                  className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                    Tipo de Bug
                  </label>
                  <select
                    value={bugType}
                    onChange={(e) => setBugType(e.target.value as any)}
                    className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
                  >
                    <option value="bugfix">Bugfix (Normal - Staging)</option>
                    <option value="hotfix">
                      Hotfix (Urgente - Producción)
                    </option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                    Vincular a Ticket (Opcional)
                  </label>
                  <select
                    value={linkedTicketId}
                    onChange={(e) => setLinkedTicketId(e.target.value)}
                    className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none"
                  >
                    <option value="">Ninguno...</option>
                    {ticketExecutions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                  Logs / Detalles Técnicos
                </label>
                <textarea
                  value={bugLogs}
                  onChange={(e) => setBugLogs(e.target.value)}
                  placeholder="Pega aquí los logs de consola o errores detectados..."
                  rows={4}
                  className="border-zinc-850 rounded border bg-zinc-900 p-1.5 font-mono text-[10px] text-zinc-200 outline-none"
                />
              </div>

              <button
                onClick={iniciarBugTicket}
                className="mt-2 w-full rounded bg-red-500 py-2 text-[10px] font-bold text-zinc-950 uppercase transition-all hover:bg-red-600"
              >
                Comenzar Solución
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
