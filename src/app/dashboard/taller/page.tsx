"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */

import React, { useState, useEffect } from "react";
import { MainLayout } from "../../../presentation/components/layout";
import { Card } from "../../../presentation/components/card";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";
import { GestionarWorkflowsUseCase } from "../../../application/use-cases/proyecto/gestionar-workflows.use-case";
import { useToast } from "../../../presentation/hooks/useToast";

export default function TallerIA() {
  const { mostrarToast } = useToast();
  const uc = new GestionarWorkflowsUseCase();

  // DB queries
  const proyectos = (useLiveQuery(() => db.proyectos.toArray()) || []) as any[];
  const templates = (useLiveQuery(() => db.workflow_templates.toArray()) ||
    []) as any[];
  const steps = (useLiveQuery(() => db.workflow_steps.toArray()) ||
    []) as any[];

  // Selected project & active workflow execution
  const [proyectoSeleccionadoId, setProyectoSeleccionadoId] = useState("");
  const [executionActivaId, setExecutionActivaId] = useState<string | null>(
    null
  );

  // New execution form states
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [nuevoTituloEjecucion, setNuevoTituloEjecucion] = useState("");
  const [usuarioAsignado, setUsuarioAsignado] = useState("Mariano");

  // Selection of step within the active execution
  const [stepSeleccionadoId, setStepSeleccionadoId] = useState<string | null>(
    null
  );

  // Inputs/Outputs for the active step
  const [inputsText, setInputsText] = useState("");
  const [outputsText, setOutputsText] = useState("");
  const [especificacionPrompt, setEspecificacionPrompt] = useState("");

  // Comments bitacora textbox
  const [nuevoComentarioText, setNuevoComentarioText] = useState("");

  // Reassignment user textbox
  const [nuevoResponsableAsignado, setNuevoResponsableAsignado] =
    useState("Mariano");

  // Default project selection
  useEffect(() => {
    if (proyectos.length > 0 && !proyectoSeleccionadoId) {
      setProyectoSeleccionadoId(proyectos[0].id);
    }
  }, [proyectos, proyectoSeleccionadoId]);

  // Load executions dynamically
  const executions = (useLiveQuery(async () => {
    if (!proyectoSeleccionadoId) return [];
    return await db.task_executions
      .where("proyectoId")
      .equals(proyectoSeleccionadoId)
      .toArray();
  }, [proyectoSeleccionadoId]) || []) as any[];

  // Load active execution detail
  const activeExecution = (executions as any[]).find(
    (e) => e.id === executionActivaId
  );

  // Load step states for this execution
  const stepStates = (useLiveQuery(async () => {
    if (!executionActivaId) return [];
    return await db.task_step_states
      .where("executionId")
      .equals(executionActivaId)
      .toArray();
  }, [executionActivaId]) || []) as any[];

  // Load comments for active execution
  const activeComments = (useLiveQuery(async () => {
    if (!executionActivaId) return [];
    return await db.task_comments
      .where("executionId")
      .equals(executionActivaId)
      .toArray();
  }, [executionActivaId]) || []) as any[];

  // Load audit logs
  const auditLogs = (useLiveQuery(async () => {
    if (!executionActivaId) return [];
    return await db.actas_auditoria
      .where("executionId")
      .equals(executionActivaId)
      .toArray();
  }, [executionActivaId]) || []) as any[];

  // Load inputs/outputs whenever a step is selected
  useEffect(() => {
    if (executionActivaId && stepSeleccionadoId) {
      const state = (stepStates as any[]).find(
        (st) => st.stepId === stepSeleccionadoId
      );
      if (state) {
        setInputsText((state.inputs as string) || "");
        setOutputsText((state.outputs as string) || "");
      } else {
        setInputsText("");
        setOutputsText("");
      }
    }
  }, [executionActivaId, stepSeleccionadoId, stepStates]);

  // Actions
  const crearEjecucion = async () => {
    if (!proyectoSeleccionadoId) {
      mostrarToast("Debes seleccionar un proyecto primero.", "error");
      return;
    }
    if (!selectedTemplateId) {
      mostrarToast("Selecciona una plantilla de procedimiento.", "error");
      return;
    }
    if (!nuevoTituloEjecucion.trim()) {
      mostrarToast("Escribe un título para identificar este flujo.", "error");
      return;
    }

    const res = await uc.iniciarEjecucion(
      proyectoSeleccionadoId,
      selectedTemplateId,
      nuevoTituloEjecucion,
      usuarioAsignado
    );

    if (res.ok) {
      setNuevoTituloEjecucion("");
      setSelectedTemplateId("");
      setExecutionActivaId(res.valor);
      // Select first step
      const templateSteps = steps.filter(
        (s) => s.templateId === selectedTemplateId
      );
      if (templateSteps.length > 0) {
        setStepSeleccionadoId(templateSteps[0].id);
      }
      mostrarToast("Procedimiento iniciado con éxito.", "exito");
    } else {
      mostrarToast(res.error?.mensaje || "Error al iniciar flujo.", "error");
    }
  };

  const alternarCompletitudPaso = async (
    stepId: string,
    completadoActual: boolean
  ) => {
    if (!executionActivaId) return;
    const res = await uc.actualizarEstadoPaso(
      executionActivaId,
      stepId,
      !completadoActual,
      inputsText,
      outputsText,
      activeExecution?.usuarioAsignadoId || "Anon"
    );

    if (res.ok) {
      mostrarToast(
        !completadoActual
          ? "Paso marcado como completado."
          : "Paso revertido a pendiente.",
        "info"
      );
    } else {
      mostrarToast(res.error?.mensaje || "Error al actualizar paso.", "error");
    }
  };

  const guardarCambiosPaso = async () => {
    if (!executionActivaId || !stepSeleccionadoId) return;
    const state = (stepStates as any[]).find(
      (s) => s.stepId === stepSeleccionadoId
    );
    const res = await uc.actualizarEstadoPaso(
      executionActivaId,
      stepSeleccionadoId,
      state?.completado || false,
      inputsText,
      outputsText,
      activeExecution?.usuarioAsignadoId || "Anon"
    );

    if (res.ok) {
      mostrarToast("Cambios del paso guardados localmente.", "exito");
    } else {
      mostrarToast(res.error?.mensaje || "Error al guardar paso.", "error");
    }
  };

  const copiarPromptInicial = async () => {
    if (!executionActivaId || !stepSeleccionadoId) return;
    if (!especificacionPrompt.trim()) {
      mostrarToast(
        "Por favor describe brevemente qué feature o tarea vas a realizar.",
        "error"
      );
      return;
    }

    const res = await uc.compilarPromptInicial(
      executionActivaId,
      stepSeleccionadoId,
      especificacionPrompt
    );

    if (res.ok) {
      navigator.clipboard.writeText(res.valor);
      mostrarToast("¡Prompt inicial copiado al portapapeles!", "exito");
    } else {
      mostrarToast(res.error?.mensaje || "Error al compilar prompt.", "error");
    }
  };

  const copiarPromptReanudacion = async () => {
    if (!executionActivaId) return;
    const res = await uc.compilarPromptReanudacion(executionActivaId);

    if (res.ok) {
      navigator.clipboard.writeText(res.valor);
      mostrarToast("¡Prompt de reanudación copiado al portapapeles!", "exito");
    } else {
      mostrarToast(res.error?.mensaje || "Error al compilar prompt.", "error");
    }
  };

  const cambiarEstadoFlujo = async (
    nuevoEstado: "NOT_STARTED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED"
  ) => {
    if (!executionActivaId) return;
    const res = await uc.cambiarEstado(
      executionActivaId,
      nuevoEstado,
      activeExecution?.usuarioAsignadoId || "Anon"
    );

    if (res.ok) {
      mostrarToast(`Estado de la tarea cambiado a ${nuevoEstado}`, "info");
    } else {
      mostrarToast(res.error?.mensaje || "Error al cambiar estado.", "error");
    }
  };

  const reasignarRelevo = async () => {
    if (!executionActivaId) return;
    const res = await uc.asignarResponsable(
      executionActivaId,
      nuevoResponsableAsignado,
      activeExecution?.usuarioAsignadoId || "Anon"
    );

    if (res.ok) {
      mostrarToast(
        `Tarea asignada al desarrollador ${nuevoResponsableAsignado}`,
        "exito"
      );
    } else {
      mostrarToast(res.error?.mensaje || "Error al reasignar tarea.", "error");
    }
  };

  const enviarComentario = async () => {
    if (!executionActivaId || !nuevoComentarioText.trim()) return;
    const res = await uc.agregarComentario(
      executionActivaId,
      stepSeleccionadoId,
      nuevoComentarioText,
      activeExecution?.usuarioAsignadoId || "Anon"
    );

    if (res.ok) {
      setNuevoComentarioText("");
      mostrarToast("Comentario agregado a la bitácora.", "exito");
    } else {
      mostrarToast(
        res.error?.mensaje || "Error al agregar comentario.",
        "error"
      );
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 font-mono text-xs text-zinc-300">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-[#2A2A2E] pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-mono text-sm font-bold text-white uppercase">
              Taller de Desarrollo Asistido por IA
            </h2>
            <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
              Orquesta el flujo de ingeniería de software inyectando contexto
              para Claude
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-500">Proyecto Activo</span>
            <select
              value={proyectoSeleccionadoId}
              onChange={(e) => {
                setProyectoSeleccionadoId(e.target.value);
                setExecutionActivaId(null);
                setStepSeleccionadoId(null);
              }}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-[10px] text-zinc-200 outline-none focus:border-emerald-500"
            >
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Column Left: Executions list & trigger form */}
          <div className="flex flex-col gap-5 lg:col-span-1">
            {/* New execution Card */}
            <Card>
              <div className="flex flex-col gap-3">
                <span className="border-b border-zinc-900 pb-1.5 font-bold text-white uppercase">
                  🚀 Iniciar Actividad / Procedimiento
                </span>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-555 text-[9px] font-bold uppercase">
                      Procedimiento / Workflow
                    </span>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="rounded border border-zinc-800 bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none focus:border-emerald-500"
                    >
                      <option value="" disabled>
                        Selecciona plantilla...
                      </option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} ({t.fase})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-555 text-[9px] font-bold uppercase">
                      Identificador / Título Tarea
                    </span>
                    <input
                      type="text"
                      value={nuevoTituloEjecucion}
                      onChange={(e) => setNuevoTituloEjecucion(e.target.value)}
                      placeholder="Ej: Feature checkout o Fix auth"
                      className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-555 text-[9px] font-bold uppercase">
                      Desarrollador Asignado
                    </span>
                    <input
                      type="text"
                      value={usuarioAsignado}
                      onChange={(e) => setUsuarioAsignado(e.target.value)}
                      className="border-zinc-850 rounded border bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    onClick={crearEjecucion}
                    className="mt-2 w-full rounded bg-emerald-500 py-2 text-[10px] font-bold text-zinc-950 transition-all hover:bg-emerald-600 active:scale-95"
                  >
                    Iniciar Flujo de Tarea
                  </button>
                </div>
              </div>
            </Card>

            {/* Executions log List */}
            <Card>
              <div className="flex flex-col gap-3">
                <span className="border-b border-zinc-900 pb-1.5 font-bold text-white uppercase">
                  📁 Procedimientos Activos ({executions.length})
                </span>
                <div className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto pr-1">
                  {executions.length === 0 ? (
                    <span className="text-zinc-650 py-2 text-center text-[10px] italic">
                      No hay tareas iniciadas en este proyecto.
                    </span>
                  ) : (
                    executions.map((exe) => {
                      let stateColor =
                        "text-zinc-500 bg-zinc-900 border-zinc-850";
                      if (exe.estado === "COMPLETED")
                        stateColor =
                          "text-emerald-400 bg-emerald-950/20 border-emerald-900/30";
                      else if (exe.estado === "IN_PROGRESS")
                        stateColor =
                          "text-sky-400 bg-sky-950/20 border-sky-900/30 animate-pulse";
                      else if (exe.estado === "PAUSED")
                        stateColor =
                          "text-amber-400 bg-amber-950/20 border-amber-900/30";

                      return (
                        <div
                          key={exe.id}
                          onClick={() => {
                            setExecutionActivaId(exe.id);
                            // Auto select first step
                            const templateSteps = steps.filter(
                              (s) => s.templateId === exe.templateId
                            );
                            if (templateSteps.length > 0) {
                              setStepSeleccionadoId(templateSteps[0].id);
                            }
                          }}
                          className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-all hover:bg-zinc-950/40 ${
                            executionActivaId === exe.id
                              ? "border-emerald-500/40 bg-zinc-950/80"
                              : "border-zinc-900 bg-[#121214]/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="block truncate font-bold text-zinc-200">
                              {exe.titulo}
                            </span>
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[8px] font-bold ${stateColor}`}
                            >
                              {exe.estado}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-zinc-500">
                            <span>PO: {exe.usuarioAsignadoId}</span>
                            <span>
                              {new Date(exe.creadoEn).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Column Center & Right: Taller / Active workspace */}
          <div className="flex flex-col gap-5 lg:col-span-2">
            {!activeExecution ? (
              <Card>
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <span className="text-zinc-650 text-[11px] italic">
                    Selecciona un procedimiento de la barra izquierda para abrir
                    el taller.
                  </span>
                  <p className="text-zinc-550 max-w-sm text-[9px] leading-relaxed">
                    El Taller de IA consolidará el briefing, stack tecnológico e
                    inyecciones de código para que puedas pair-programar con
                    Claude eficientemente.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Active Task Workspace Details */}
                <Card>
                  <div className="flex flex-col gap-4">
                    {/* Execution Title Control panel */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-3">
                      <div>
                        <span className="block text-sm font-bold text-white uppercase">
                          🔧 {activeExecution.titulo}
                        </span>
                        <span className="text-[9px] text-zinc-500">
                          Template:{" "}
                          {
                            templates.find(
                              (t) => t.id === activeExecution.templateId
                            )?.nombre
                          }
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={activeExecution.estado}
                          onChange={(e) =>
                            cambiarEstadoFlujo(e.target.value as any)
                          }
                          className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300 outline-none focus:border-emerald-500"
                        >
                          <option value="NOT_STARTED">Not Started</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="PAUSED">Paused</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                        <button
                          onClick={copiarPromptReanudacion}
                          className="rounded bg-sky-500 px-2.5 py-1 text-[9px] font-bold text-zinc-950 hover:bg-sky-600"
                          title="Copia el contexto acumulado de traspaso"
                        >
                          🔄 Prompt Relevo
                        </button>
                      </div>
                    </div>

                    {/* Workshop Workspace Split */}
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                      {/* Sub-Left: Procedimiento steps checklist */}
                      <div className="flex flex-col gap-2 md:col-span-1">
                        <span className="text-[9px] font-bold text-white uppercase">
                          Pasos del Proceso
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {steps
                            .filter(
                              (s) => s.templateId === activeExecution.templateId
                            )
                            .map((s) => {
                              const state = stepStates.find(
                                (st) => st.stepId === s.id
                              );
                              const isSelected = stepSeleccionadoId === s.id;

                              return (
                                <div
                                  key={s.id}
                                  onClick={() => setStepSeleccionadoId(s.id)}
                                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-all hover:bg-zinc-950/40 ${
                                    isSelected
                                      ? "border-emerald-500/40 bg-zinc-900/60"
                                      : "border-zinc-900 bg-zinc-950/20"
                                  }`}
                                >
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={state?.completado || false}
                                      onChange={() =>
                                        alternarCompletitudPaso(
                                          s.id,
                                          state?.completado || false
                                        )
                                      }
                                      className="h-3 w-3 cursor-pointer rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                                    />
                                    <span
                                      className={`block truncate text-[10px] ${
                                        state?.completado
                                          ? "text-zinc-650 line-through"
                                          : "text-zinc-300"
                                      }`}
                                    >
                                      {s.titulo}
                                    </span>
                                  </div>
                                  <span className="text-zinc-650 text-[8px] uppercase">
                                    {s.tipo}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Sub-Right: Active step workspace and Prompt compiler */}
                      <div className="flex flex-col gap-3.5 border-l border-zinc-900 pl-0 md:col-span-2 md:pl-5">
                        {(() => {
                          const activeStep = steps.find(
                            (s) => s.id === stepSeleccionadoId
                          );
                          const activeState = stepStates.find(
                            (s) => s.stepId === stepSeleccionadoId
                          );
                          if (!activeStep)
                            return (
                              <span className="text-zinc-650 text-[10px] italic">
                                Selecciona un paso del checklist.
                              </span>
                            );

                          return (
                            <div className="flex flex-col gap-3">
                              <div>
                                <span className="block text-[11px] font-bold text-white uppercase">
                                  {activeStep.titulo}
                                </span>
                                <span className="text-zinc-555 mt-0.5 block text-[9px] leading-relaxed">
                                  {activeStep.descripcion}
                                </span>
                              </div>

                              {activeStep.tipo === "prompt" ? (
                                <div className="mt-1 flex flex-col gap-2.5 rounded-2xl border border-zinc-900 bg-zinc-900/30 p-3.5">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase">
                                      1. Especificar Feature / Tarea
                                    </span>
                                    <input
                                      type="text"
                                      value={especificacionPrompt}
                                      onChange={(e) =>
                                        setEspecificacionPrompt(e.target.value)
                                      }
                                      placeholder="Ej: Añadir validación de correo y token de auth..."
                                      className="rounded border border-zinc-800 bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                  <button
                                    onClick={copiarPromptInicial}
                                    className="w-full rounded bg-emerald-500 py-1.5 text-[10px] font-bold text-zinc-950 transition-all hover:bg-emerald-600 active:scale-95"
                                  >
                                    📋 Copiar Prompt Contextual para Claude
                                  </button>
                                  <div className="mt-2.5 flex flex-col gap-1">
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase">
                                      2. Output de Código (Pegar Código
                                      Generado)
                                    </span>
                                    <textarea
                                      value={outputsText}
                                      onChange={(e) =>
                                        setOutputsText(e.target.value)
                                      }
                                      placeholder="Pega el código final devuelto por la IA..."
                                      rows={6}
                                      className="border-zinc-850 resize-none rounded border bg-zinc-950 p-2 font-mono text-[9px] text-zinc-300 outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                  <button
                                    onClick={guardarCambiosPaso}
                                    className="hover:bg-zinc-850 self-end rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10px] text-zinc-300"
                                  >
                                    Guardar Código
                                  </button>
                                </div>
                              ) : (
                                <div className="border-zinc-850 flex flex-col gap-2 rounded-2xl border border-dashed bg-zinc-900/20 p-4 text-center">
                                  <span className="text-zinc-550 text-[10px]">
                                    Este es un paso de acción manual. Realiza la
                                    acción en tu equipo y marca el checklist al
                                    finalizar.
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Reassign & bitacora panel grid split */}
                    <div className="grid grid-cols-1 gap-6 border-t border-zinc-900 pt-4 md:grid-cols-2">
                      {/* Comments & Handover Notes Bitacora */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-bold text-white uppercase">
                          Bitácora de Traspaso
                        </span>
                        <div className="flex max-h-[160px] flex-col gap-2 overflow-y-auto pr-1">
                          {activeComments.length === 0 ? (
                            <span className="text-zinc-655 text-[9px] italic">
                              No hay comentarios de traspaso registrados.
                            </span>
                          ) : (
                            activeComments.map((c) => (
                              <div
                                key={c.id}
                                className="flex flex-col gap-1 rounded-lg border border-zinc-900 bg-zinc-950/60 p-2.5 leading-relaxed"
                              >
                                <div className="text-zinc-650 flex items-center justify-between text-[8px]">
                                  <span>Desarrollador: {c.usuarioId}</span>
                                  <span>
                                    {new Date(c.creadoEn).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="font-mono text-[10px] text-zinc-400">
                                  {c.comentario}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={nuevoComentarioText}
                            onChange={(e) =>
                              setNuevoComentarioText(e.target.value)
                            }
                            placeholder="Escribe una nota para el traspaso de relevo..."
                            className="flex-1 rounded border border-zinc-800 bg-zinc-900 p-1.5 text-[10px] text-zinc-200 outline-none focus:border-emerald-500"
                          />
                          <button
                            onClick={enviarComentario}
                            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-[10px] font-bold text-zinc-300 hover:bg-zinc-700"
                          >
                            Agregar
                          </button>
                        </div>
                      </div>

                      {/* Assignment Handover & Audit Log drawer */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-bold text-white uppercase">
                          Gestión de Relevos y Trazabilidad
                        </span>

                        {/* Assignment picker */}
                        <div className="flex items-center gap-3 rounded-lg border border-zinc-900 bg-zinc-950/40 p-2.5">
                          <div className="flex-1">
                            <span className="text-zinc-555 block text-[9px]">
                              Asignado a:{" "}
                              <b>{activeExecution.usuarioAsignadoId}</b>
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={nuevoResponsableAsignado}
                              onChange={(e) =>
                                setNuevoResponsableAsignado(e.target.value)
                              }
                              className="w-20 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[9px] text-zinc-200 outline-none"
                            />
                            <button
                              onClick={reasignarRelevo}
                              className="rounded bg-emerald-500 px-2 py-1 text-[9px] font-bold text-zinc-950 transition-all hover:bg-emerald-600 active:scale-95"
                            >
                              Entregar
                            </button>
                          </div>
                        </div>

                        {/* Audit Log list */}
                        <span className="mt-2 block text-[8px] font-bold text-white uppercase">
                          Libro de Actas (Auditoría)
                        </span>
                        <div className="flex max-h-[80px] flex-col gap-1 overflow-y-auto pr-1">
                          {auditLogs.map((l) => (
                            <div
                              key={l.id}
                              className="text-zinc-555 flex items-center justify-between border-b border-zinc-950 pb-1 text-[8px]"
                            >
                              <span>
                                📅 {new Date(l.fecha).toLocaleTimeString()}:{" "}
                                {l.mensaje}
                              </span>
                              <span className="text-zinc-650 shrink-0 pl-2 uppercase">
                                [{l.tipoEvento}]
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
