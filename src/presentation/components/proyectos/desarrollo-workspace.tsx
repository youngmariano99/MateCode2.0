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
  { key: "disenador_ui", label: "Diseñador UI/UX & Frontend" },
  { key: "custom", label: "Rol Personalizado" },
];

const SECCIONES_LANDING_DEFAULT = [
  "Hero Section (Portada & CTA)",
  "Propuesta de Valor / Beneficios Clave",
  "Servicios / Productos / Características",
  "Prueba Social / Testimonios / Logos",
  "Precios / Planes / Oferta",
  "Preguntas Frecuentes (FAQ)",
  "Footer & Formulario de Contacto (CTA)",
  "Sección Personalizada",
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

  // Load project details & context
  const proyecto = useLiveQuery(
    () => db.proyectos.get(proyectoId),
    [proyectoId]
  );
  const contexto = useLiveQuery(
    () => db.proyecto_contexto.get(proyectoId),
    [proyectoId]
  );

  const isLandingType =
    (proyecto?.tipo as string)?.toLowerCase().includes("landing") ||
    (proyecto?.tipo as string)?.toLowerCase().includes("institucional");

  const [activeTabMode, setActiveTabMode] = useState<"secciones" | "tickets">(
    isLandingType ? "secciones" : "tickets"
  );

  useEffect(() => {
    if (isLandingType) {
      setActiveTabMode("secciones");
    }
  }, [isLandingType]);

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
  const [selectedRole, setSelectedRole] = useState(
    isLandingType ? "disenador_ui" : "desarrollador"
  );
  const [customRoleText, setCustomRoleText] = useState("");
  const [criterioAceptacion, setCriterioAceptacion] = useState("");
  const [ticketMiembro, setTicketMiembro] = useState("Mariano");

  // Form states for Landing Section Tickets
  const [seccionNombre, setSeccionNombre] = useState(
    SECCIONES_LANDING_DEFAULT[0]
  );
  const [seccionNombreCustom, setSeccionNombreCustom] = useState("");
  const [seccionDescripcion, setSeccionDescripcion] = useState("");
  const [refinamientoInput, setRefinamientoInput] = useState("");

  // Dynamic sitemap sections loaded from planning context
  const seccionesSitemap =
    (contexto?.seccionesSitemap as Array<{
      id: string;
      nombre: string;
      descripcion: string;
    }>) || [];

  const seccionesDisponibles =
    seccionesSitemap.length > 0
      ? seccionesSitemap.map((s) => s.nombre)
      : SECCIONES_LANDING_DEFAULT;

  useEffect(() => {
    if (seccionesSitemap.length > 0 && !seccionDescripcion) {
      setSeccionNombre(seccionesSitemap[0].nombre);
      setSeccionDescripcion(seccionesSitemap[0].descripcion);
    }
  }, [seccionesSitemap, seccionDescripcion]);

  const handleSeleccionarSeccion = (val: string) => {
    setSeccionNombre(val);
    const matched = seccionesSitemap.find(
      (s) => s.nombre.toUpperCase() === val.toUpperCase()
    );
    if (matched && matched.descripcion) {
      setSeccionDescripcion(matched.descripcion);
    }
  };

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

  const iniciarSeccionLandingTicket = async () => {
    const targetSeccion =
      seccionNombre === "Sección Personalizada"
        ? seccionNombreCustom
        : seccionNombre;
    if (!targetSeccion.trim()) {
      mostrarToast("Escribe o selecciona el nombre de la sección.", "error");
      return;
    }

    const ticketId = `tick_sec_${Date.now()}`;
    try {
      await db.transaction(
        "rw",
        [db.task_executions, db.task_step_states],
        async () => {
          await db.task_executions.put({
            id: ticketId,
            proyectoId,
            templateId: "workflow_section_landing",
            titulo: `SECCIÓN: ${targetSeccion}`,
            estado: "IN_PROGRESS",
            usuarioAsignadoId: ticketMiembro,
            fechaInicio: Date.now(),
            metadata: {
              seccionNombre: targetSeccion,
              seccionDescripcion,
              rol: selectedRole === "custom" ? customRoleText : selectedRole,
              iterations: [],
            },
          });

          const steps = [
            "Análisis de Copy & Referencias Visuales",
            "Generación de Maquetado e IA Prompt Base",
            "Refinamiento e Iteraciones Visuales",
            "Pruebas Responsive y Aprobación",
            "Cierre y Guardado de Sección",
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
      setSeccionDescripcion("");
      setSeccionNombreCustom("");
      mostrarToast(`Ticket de Sección '${targetSeccion}' iniciado.`, "exito");
    } catch (err: any) {
      mostrarToast(
        `Error al iniciar ticket de sección: ${err.message}`,
        "error"
      );
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

  const registrarIteracionRefinamiento = async () => {
    if (!activeTicketId || !refinamientoInput.trim()) {
      mostrarToast(
        "Escribe las consideraciones de refinamiento primero.",
        "error"
      );
      return;
    }

    try {
      const currentMeta = activeTicket?.metadata || {};
      const prevIterations = Array.isArray(currentMeta.iterations)
        ? currentMeta.iterations
        : [];
      const newIteration = {
        fecha: new Date().toLocaleTimeString(),
        consideraciones: refinamientoInput.trim(),
      };

      await db.task_executions.update(activeTicketId, {
        metadata: {
          ...currentMeta,
          iterations: [...prevIterations, newIteration],
        },
      });

      setRefinamientoInput("");
      mostrarToast("Iteración registrada en el historial del ticket.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al registrar iteración: ${err.message}`, "error");
    }
  };

  // Compile prompt for AI Ticket
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

    let prompt = `Actúa en el rol de: ${
      activeTicket.metadata?.rol || "Desarrollador / Diseñador UI/UX"
    }.\n\n`;
    prompt += `CONTEXTO DEL PROYECTO:\n`;
    prompt += `- Stack: ${stackText}\n`;
    prompt += `- Estándares: ${estText}\n`;

    if (contexto?.copyContenido) {
      prompt += `- Copywriting & Contenido de Marca:\n${contexto.copyContenido}\n`;
    }
    if (
      Array.isArray(contexto?.linksInspiracion) &&
      contexto.linksInspiracion.length > 0
    ) {
      prompt += `- Referencias de Inspiración Visual:\n${contexto.linksInspiracion.join(
        "\n"
      )}\n`;
    }
    prompt += `\n`;

    prompt += `TAREA A REALIZAR:\n`;
    prompt += `- Ticket: ${activeTicket.titulo}\n`;
    if (activeTicket.metadata?.seccionDescripcion) {
      prompt += `- Descripción de la Sección: ${activeTicket.metadata.seccionDescripcion}\n`;
    }
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
    prompt += `1. Analiza el contexto, copy y referencias visuales.\n`;
    prompt += `2. Escribe el código e instrucciones de diseño de alta calidad y rendimiento.\n`;
    prompt += `3. Al finalizar tu respuesta, incluye obligatoriamente este JSON para sincronizar el checklist:\n`;
    prompt += `{\n  "resumen_ia": "Breve descripción técnica de lo implementado",\n  "checklist": [\n    { "paso": 1, "completado": true },\n    { "paso": 2, "completado": true }\n  ]\n}`;

    return prompt;
  };

  const compileRefinamientoPrompt = () => {
    if (!activeTicket || !refinamientoInput.trim()) return "";

    let prompt = `REFINAMIENTO E ITERACIÓN VISUAL / TÉCNICA:\n`;
    prompt += `Estamos trabajando en el ticket: ${activeTicket.titulo}.\n\n`;
    prompt += `CONSIDERACIONES Y AJUSTES REQUERIDOS:\n`;
    prompt += `"${refinamientoInput.trim()}"\n\n`;
    prompt += `INSTRUCCIÓN CRÍTICA DE REFINAMIENTO:\n`;
    prompt += `1. Aplica ÚNICAMENTE los cambios indicados en las consideraciones anteriores.\n`;
    prompt += `2. Debes mantener intactos el resto de componentes, lógica, estilos y estructura que ya funcionaban bien sin realizar modificaciones no solicitadas.`;

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

  const copiarPromptRefinamiento = () => {
    const prompt = compileRefinamientoPrompt();
    if (!prompt) {
      mostrarToast(
        "Escribe las consideraciones de refinamiento primero.",
        "error"
      );
      return;
    }
    navigator.clipboard.writeText(prompt);
    mostrarToast(
      "¡Prompt de refinamiento (sin modificar lo demás) copiado!",
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
    <div className="flex flex-col gap-4">
      {/* Sub-Header Navigation Tabs */}
      <div className="border-zinc-850 flex items-center justify-between rounded-xl border bg-zinc-950 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTabMode("secciones")}
            className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
              activeTabMode === "secciones"
                ? "bg-emerald-500 text-zinc-950 shadow"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            🎨 Desarrollo por Secciones (Landing / Institucional)
          </button>
          <button
            onClick={() => setActiveTabMode("tickets")}
            className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
              activeTabMode === "tickets"
                ? "bg-emerald-500 text-zinc-950 shadow"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            ⚡ Tablero de Sprints y Tickets (Sistemas)
          </button>
        </div>

        <button
          onClick={() => setIsBugModalOpen(true)}
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1 text-center font-mono text-[9px] font-bold text-red-400 uppercase transition-all hover:bg-red-500/20"
        >
          🐛 Abrir Bug / Hotfix
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Left panel: Sprint / Section selector */}
        <div className="flex flex-col gap-4 xl:col-span-6">
          {activeTabMode === "secciones" ? (
            <Card>
              <div className="mb-4 border-b border-zinc-900 pb-3">
                <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
                  Desarrollo Seccional del Sitio
                </h3>
                <p className="text-zinc-550 mt-0.5 font-mono text-[9px]">
                  Selecciona la sección a maquetar o refinar para generar los
                  prompts visuales
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                    Sección a Trabajar
                  </label>
                  <select
                    value={seccionNombre}
                    onChange={(e) => handleSeleccionarSeccion(e.target.value)}
                    className="border-zinc-850 rounded border bg-zinc-900 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                  >
                    {seccionesDisponibles.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>

                {seccionNombre === "Sección Personalizada" && (
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                      Nombre de Sección Personalizada
                    </label>
                    <input
                      type="text"
                      value={seccionNombreCustom}
                      onChange={(e) => setSeccionNombreCustom(e.target.value)}
                      placeholder="Ej: Calculadora de Tarifas..."
                      className="border-zinc-850 rounded border bg-zinc-900 p-2 text-[10px] text-zinc-200 outline-none"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                    Descripción & Indicaciones Específicas
                  </label>
                  <textarea
                    value={seccionDescripcion}
                    onChange={(e) => setSeccionDescripcion(e.target.value)}
                    placeholder="Escribe cómo deseas que sea esta sección (ej: fondo oscuro con degradado, botón verde esmeralda centrado)..."
                    rows={3}
                    className="border-zinc-850 rounded border bg-zinc-900 p-2 font-mono text-[10px] text-zinc-200 outline-none"
                  />
                </div>

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

                <button
                  onClick={iniciarSeccionLandingTicket}
                  className="mt-2 w-full rounded-lg bg-emerald-500 py-2.5 text-[10px] font-bold text-zinc-950 uppercase shadow transition-all hover:bg-emerald-600"
                >
                  🚀 Iniciar Ticket de Sección
                </button>
              </div>
            </Card>
          ) : (
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
                  {focusedSprint &&
                    focusedSprint.estado === "planificacion" && (
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
                  <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto pr-1">
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
          )}

          {/* Start implementing widget / Drawer inline for Sprint Activities */}
          {selectedActividadId && activeTabMode === "tickets" && (
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

        {/* Right panel: Active Ticket Console & Refinement Console */}
        <div className="flex flex-col gap-4 xl:col-span-6">
          <Card>
            <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
                  Consola de Ticket Activo
                </h3>
                <p className="text-zinc-550 mt-0.5 font-mono text-[9px]">
                  Consola para resolver y refinar el ticket en curso con la IA
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

                {/* Steps Checklist */}
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
                          🚀 1. Prompt Base para la IA
                        </span>
                        <span className="text-zinc-650 mt-0.5 block text-[8px]">
                          Junta Copy, Links de Inspiración y Design System en un
                          solo prompt
                        </span>
                      </div>
                      <button
                        onClick={copiarPromptTicket}
                        className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
                      >
                        Copiar Prompt Base
                      </button>
                    </div>

                    {/* Consola de Refinamiento e Iteraciones Visuales */}
                    <div className="flex flex-col gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
                      <span className="font-mono text-[9px] font-bold text-sky-400 uppercase">
                        🔄 2. Refinamiento & Ajustes Iterativos
                      </span>
                      <textarea
                        value={refinamientoInput}
                        onChange={(e) => setRefinamientoInput(e.target.value)}
                        placeholder="Escribe las correcciones sobre lo que te hizo la IA (ej: 'Cábiame el botón a verde y haz el título más grande sin modificar nada más')..."
                        rows={2}
                        className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[9px] text-zinc-200 outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={registrarIteracionRefinamiento}
                          className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-[9px] font-bold text-zinc-300 uppercase transition-all hover:bg-zinc-800"
                        >
                          + Guardar Iteración
                        </button>
                        <button
                          onClick={copiarPromptRefinamiento}
                          className="rounded bg-sky-500 px-3 py-1 font-mono text-[9px] font-bold text-zinc-950 uppercase shadow transition-all hover:bg-sky-400"
                        >
                          Copiar Prompt Refinamiento
                        </button>
                      </div>

                      {/* Historial de Iteraciones del Ticket */}
                      {Array.isArray(activeTicket.metadata?.iterations) &&
                        activeTicket.metadata.iterations.length > 0 && (
                          <div className="mt-2 flex flex-col gap-1 border-t border-sky-500/20 pt-2">
                            <span className="font-mono text-[8px] font-bold text-zinc-400 uppercase">
                              Historial de Ajustes (
                              {activeTicket.metadata.iterations.length}):
                            </span>
                            <div className="flex max-h-[90px] flex-col gap-1 overflow-y-auto">
                              {activeTicket.metadata.iterations.map(
                                (it: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="border-zinc-850 rounded border bg-zinc-950/60 p-1.5 font-mono text-[8px] text-zinc-300"
                                  >
                                    <span className="font-bold text-sky-400">
                                      [{it.fecha}]
                                    </span>{" "}
                                    {it.consideraciones}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
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
                        rows={2}
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
                Ningún ticket en curso en este momento. Selecciona una sección o
                actividad para comenzar.
              </p>
            )}
          </Card>
        </div>
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
