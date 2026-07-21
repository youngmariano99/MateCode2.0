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
  const ds = useLiveQuery(
    () => db.proyecto_design_system.get(proyectoId),
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

  // Form states for Feature ticket
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

  // Tickets (executions) loaded
  const ticketExecutions = (useLiveQuery(() =>
    db.task_executions.where("proyectoId").equals(proyectoId).toArray()
  ) || []) as any[];

  // Collapsible cards state: record of ticketId -> isExpanded
  const [expandedTicketIds, setExpandedTicketIds] = useState<
    Record<string, boolean>
  >({});

  // Auto-expand newly created tickets
  useEffect(() => {
    if (ticketExecutions.length > 0) {
      setExpandedTicketIds((prev) => {
        const next = { ...prev };
        let hasNew = false;
        ticketExecutions.forEach((t) => {
          if (next[t.id] === undefined) {
            next[t.id] = true;
            hasNew = true;
          }
        });
        return hasNew ? next : prev;
      });
    }
  }, [ticketExecutions]);

  const toggleExpandTicket = (id: string) => {
    setExpandedTicketIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Automatically select active sprint or first sprint
  useEffect(() => {
    const active = sprints.find((s) => s.estado === "activo");
    if (active) {
      setSelectedSprintId(active.id);
    } else if (sprints.length > 0 && !selectedSprintId) {
      setSelectedSprintId(sprints[0].id);
    }
  }, [sprints, selectedSprintId]);

  const focusedSprint = sprints.find((s) => s.id === selectedSprintId);
  const historiasSprint = historias.filter(
    (h) => h.sprintId === selectedSprintId
  );
  const actividadesSprint = tareas.filter((t) =>
    historiasSprint.some((h) => h.id === t.historiaId)
  );

  const iniciarSprint = async () => {
    if (!selectedSprintId) return;
    try {
      await db.sprints.update(selectedSprintId, { estado: "activo" });
      mostrarToast("Sprint iniciado con éxito.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al iniciar sprint: ${err.message}`, "error");
    }
  };

  const handleUpdateActividadEstado = async (id: string, estado: string) => {
    try {
      await db.tareas.update(id, { estado });
      mostrarToast("Estado de actividad actualizado.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al actualizar actividad: ${err.message}`, "error");
    }
  };

  // Create Feature Ticket
  const iniciarFeatureTicket = async () => {
    if (!selectedActividadId) {
      mostrarToast("Selecciona una actividad para iniciar el ticket.", "error");
      return;
    }

    const actividad = tareas.find((t) => t.id === selectedActividadId);
    const historia = historias.find((h) => h.id === actividad?.historiaId);
    const epica = epicas.find((e) => e.id === historia?.epicaId);

    const ticketId = `tick_feat_${Date.now()}`;
    try {
      await db.transaction(
        "rw",
        [db.task_executions, db.task_step_states, db.tareas],
        async () => {
          await db.task_executions.put({
            id: ticketId,
            proyectoId,
            templateId: "workflow_feature_code",
            titulo: `${epica?.nombre || "General"} > ${historia?.titulo || ""} > ${
              actividad?.nombre || ""
            }`,
            estado: "IN_PROGRESS",
            usuarioAsignadoId: ticketMiembro,
            fechaInicio: Date.now(),
            metadata: {
              actividadId: selectedActividadId,
              historiaId: historia?.id,
              epicaId: epica?.id,
              extraContext: featureExtraContext,
              criterioAceptacion,
              rol: selectedRole === "custom" ? customRoleText : selectedRole,
              iterations: [],
            },
          });

          await db.tareas.update(selectedActividadId, { estado: "doing" });

          const steps = [
            "Análisis de Requisitos e Integración de Dominio",
            "Diseño de Arquitectura y Contratos TDD",
            "Implementación de Código y Componente UI",
            "Pruebas Unitarias e Integración Continuous Integration",
            "Code Review, Refactorización y Cierre de Ticket",
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

      setExpandedTicketIds((prev) => ({ ...prev, [ticketId]: true }));
      setFeatureExtraContext("");
      setCriterioAceptacion("");
      setSelectedActividadId("");
      mostrarToast("Ticket de Feature iniciado con éxito.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al iniciar ticket: ${err.message}`, "error");
    }
  };

  // Create Landing Section Ticket (With unique section ticket check)
  const iniciarSeccionLandingTicket = async () => {
    const targetSeccion =
      seccionNombre === "Sección Personalizada"
        ? seccionNombreCustom
        : seccionNombre;
    if (!targetSeccion.trim()) {
      mostrarToast("Escribe o selecciona el nombre de la sección.", "error");
      return;
    }

    const targetUpper = targetSeccion.trim().toUpperCase();

    // Unique Section Ticket Validation: check if an active ticket exists for this section
    const existingOpenTicket = ticketExecutions.find(
      (t: any) =>
        t.estado !== "COMPLETED" &&
        (t.metadata?.seccionNombre?.trim().toUpperCase() === targetUpper ||
          t.titulo?.trim().toUpperCase().includes(`SECCIÓN: ${targetUpper}`))
    );

    if (existingOpenTicket) {
      mostrarToast(
        `Ya existe un ticket activo para la sección "${targetSeccion}".`,
        "info"
      );
      setExpandedTicketIds((prev) => ({
        ...prev,
        [existingOpenTicket.id]: true,
      }));
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

      setExpandedTicketIds((prev) => ({ ...prev, [ticketId]: true }));
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

  // Create Bug Ticket
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

      setExpandedTicketIds((prev) => ({ ...prev, [ticketId]: true }));
      setBugNombre("");
      setBugLogs("");
      setLinkedTicketId("");
      setIsBugModalOpen(false);
      mostrarToast(`Ticket de ${bugType} iniciado con éxito.`, "exito");
    } catch (err: any) {
      mostrarToast(`Error al iniciar bug: ${err.message}`, "error");
    }
  };

  const handleEliminarTicket = async (ticketId: string, titulo: string) => {
    const seguro = confirm(
      `¿Deseas eliminar permanentemente el ticket "${titulo}"?`
    );
    if (!seguro) return;

    try {
      await db.task_executions.delete(ticketId);
      const stepStates = await db.task_step_states
        .where("executionId")
        .equals(ticketId)
        .toArray();
      for (const s of stepStates) {
        await db.task_step_states.delete(s.id as any);
      }
      mostrarToast(`Ticket "${titulo}" eliminado.`, "exito");
    } catch (err: any) {
      mostrarToast(`Error al eliminar ticket: ${err.message}`, "error");
    }
  };

  // Sort tickets chronologically (oldest at top, newly opened at bottom)
  const ticketsOrdenados = [...ticketExecutions].sort(
    (a, b) => (a.fechaInicio || 0) - (b.fechaInicio || 0)
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header bar with controls */}
      <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-3">
        <div>
          <h2 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
            Taller de Ejecución & Desarrollo Seccional
          </h2>
          <p className="text-zinc-550 font-mono text-[10px]">
            Inicia tickets por sección o por sprints, abre múltiples tarjetas
            desplegables y genera prompts limpios para la IA.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBugModalOpen(true)}
            className="rounded border border-red-500/20 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-red-400 uppercase transition-all hover:bg-red-500/20"
          >
            🐛 Reportar Bug / Hotfix
          </button>
        </div>
      </div>

      {/* Mode switcher tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTabMode("secciones")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTabMode === "secciones"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          🎨 Desarrollo de Secciones (Landing / Sitio)
        </button>
        <button
          onClick={() => setActiveTabMode("tickets")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTabMode === "tickets"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          ⚡ Desarrollo por Sprints & Actividades
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Left panel: Sprint / Section Ticket Form */}
        <div className="flex flex-col gap-4 xl:col-span-6">
          {activeTabMode === "secciones" ? (
            <Card>
              <div className="mb-4 border-b border-zinc-900 pb-3">
                <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
                  Desarrollo Seccional del Sitio
                </h3>
                <p className="text-zinc-550 mt-0.5 font-mono text-[9px]">
                  Selecciona la sección a maquetar o refinar para generar el
                  ticket y prompt visual
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
                                        className="border-zinc-850 rounded border bg-zinc-900 p-1 font-mono text-[8px] text-zinc-300 outline-none"
                                      >
                                        {COMPONENTES_PUNTOS.map((cp) => (
                                          <option key={cp.key} value={cp.key}>
                                            {cp.label}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() =>
                                          setSelectedActividadId(t.id)
                                        }
                                        className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[8px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
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

          {/* Start implementing widget inline for Sprint Activities */}
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

        {/* Right panel: Stack of Collapsible Ticket Cards */}
        <div className="flex flex-col gap-4 xl:col-span-6">
          <Card>
            <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
                  Consola de Tickets Abiertos ({ticketsOrdenados.length})
                </h3>
                <p className="text-zinc-550 mt-0.5 font-mono text-[9px]">
                  Apilados en orden de creación. Despliega cada tarjeta para
                  consultar prompts e iterar con la IA.
                </p>
              </div>
            </div>

            {ticketsOrdenados.length === 0 ? (
              <p className="text-zinc-550 py-10 text-center font-mono text-[10px]">
                Ningún ticket en curso en este momento. Selecciona una sección o
                actividad para comenzar.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {ticketsOrdenados.map((ticket) => (
                  <TicketCardItem
                    key={ticket.id}
                    ticket={ticket}
                    proyecto={proyecto}
                    contexto={contexto}
                    ds={ds}
                    isExpanded={!!expandedTicketIds[ticket.id]}
                    onToggleExpand={() => toggleExpandTicket(ticket.id)}
                    onDeleteTicket={() =>
                      handleEliminarTicket(ticket.id, ticket.titulo)
                    }
                    mostrarToast={mostrarToast}
                  />
                ))}
              </div>
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

// Reusable Collapsible Ticket Card Component
interface TicketCardItemProps {
  ticket: any;
  proyecto: any;
  contexto: any;
  ds: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDeleteTicket: () => void;
  mostrarToast: (msg: string, tipo: "exito" | "error" | "info") => void;
}

const TicketCardItem: React.FC<TicketCardItemProps> = ({
  ticket,
  proyecto,
  contexto,
  ds,
  isExpanded,
  onToggleExpand,
  onDeleteTicket,
  mostrarToast,
}) => {
  // Load steps for this specific ticket
  const stepStates = (useLiveQuery(
    () => db.task_step_states.where("executionId").equals(ticket.id).toArray(),
    [ticket.id]
  ) || []) as any[];

  // Local form states
  const [refinamientoInput, setRefinamientoInput] = useState("");
  const [checklistJsonInput, setChecklistJsonInput] = useState("");
  const [aiSummaryInput, setAiSummaryInput] = useState(
    ticket.metadata?.aiSummary || ""
  );

  const toggleStepCompleted = async (stepStateId: string, current: boolean) => {
    try {
      await db.task_step_states.update(stepStateId, { completado: !current });
    } catch (err: any) {
      mostrarToast(`Error al actualizar paso: ${err.message}`, "error");
    }
  };

  // Compile ultra-structured clean prompt matching requested template format
  const compileTicketPrompt = () => {
    const stackList: string[] = [];
    if (proyecto?.stack) {
      Object.entries(proyecto.stack).forEach(([layer, techs]) => {
        if (Array.isArray(techs) && techs.length > 0) {
          stackList.push(`${layer}: ${(techs as string[]).join(", ")}`);
        }
      });
    }
    const stackText =
      stackList.length > 0
        ? stackList.join(", ")
        : "Next.js (App Router), Tailwind CSS, React, TypeScript";

    const estList: string[] = [];
    if (proyecto?.estandares) {
      Object.entries(proyecto.estandares).forEach(([cat, techs]) => {
        if (Array.isArray(techs) && techs.length > 0) {
          estList.push(
            `${cat}: ${Array.isArray(techs) ? techs.join(", ") : techs}`
          );
        }
      });
    }
    const estText =
      estList.length > 0
        ? estList.join(" | ")
        : "NO neones, NO degradados, NO sombras pesadas, NO íconos 3D, NO rounded-full en botones (máximo rounded-md).";

    const arquetipo =
      ds?.arquetipo ||
      "Enterprise B2B, Swiss Design, ultra-minimalist, brutalist clean";
    const paleta =
      ds?.reglaColor ||
      "Background (#FFFFFF), Text (#1F2937), Sapphire Blue (#0A192F), Emerald Green (#10B981)";

    const rawSecName =
      ticket.metadata?.seccionNombre || ticket.titulo || "Componente";
    const cleanName = rawSecName
      .replace(/^SECCIÓN:\s*/i, "")
      .replace(/[^a-zA-Z0-9]/g, "");
    const componentFileName =
      cleanName.endsWith(".tsx") || cleanName.endsWith(".jsx")
        ? cleanName
        : `${cleanName || "Componente"}.tsx`;

    let prompt = `ROL: ${
      ticket.metadata?.rol ||
      "Senior Frontend Developer (Next.js + Tailwind CSS + TypeScript)"
    }.\n\n`;

    prompt += `DS / UI DESIGN SYSTEM:\n`;
    prompt += `- Estilo: ${arquetipo}\n`;
    prompt += `- Paleta: ${paleta}\n\n`;

    prompt += `ESTÁNDARES:\n`;
    prompt += `- Restricciones: ${estText}\n\n`;

    prompt += `STACK DE ESTE COMPONENTE:\n`;
    prompt += `- ${stackText}\n\n`;

    prompt += `TAREA / TICKET:\n`;
    prompt += `- Componente: ${componentFileName}\n`;
    prompt += `- Tipo: ${ticket.titulo}\n\n`;

    prompt += `REQUISITOS Y COPY DEL COMPONENTE:\n`;
    if (ticket.metadata?.seccionDescripcion) {
      prompt += `${ticket.metadata.seccionDescripcion}\n`;
    }
    if (contexto?.copyContenido) {
      prompt += `\nContenido & Copywriting de Marca:\n${contexto.copyContenido}\n`;
    }
    if (
      Array.isArray(contexto?.linksInspiracion) &&
      contexto.linksInspiracion.length > 0
    ) {
      prompt += `\nReferencias de Inspiración Visual:\n${contexto.linksInspiracion.join(
        "\n"
      )}\n`;
    }
    if (ticket.metadata?.extraContext) {
      prompt += `\nInstrucciones Extra:\n${ticket.metadata.extraContext}\n`;
    }
    if (ticket.metadata?.criterioAceptacion) {
      prompt += `\nCriterios de Aceptación:\n${ticket.metadata.criterioAceptacion}\n`;
    }
    if (ticket.metadata?.logs) {
      prompt += `\nLogs del Error:\n${ticket.metadata.logs}\n`;
    }

    prompt += `\nINSTRUCCIONES DE RESPUESTA:\n`;
    prompt += `1. Analiza los requisitos y el sistema de diseño.\n`;
    prompt += `2. Escribe el código completo del componente en TypeScript y Tailwind CSS.\n`;
    prompt += `3. Al finalizar tu respuesta, incluye obligatoriamente este JSON para sincronizar el checklist:\n`;
    prompt += `{\n  "resumen_ia": "Breve descripción técnica de lo implementado",\n  "checklist": [\n    { "paso": 1, "completado": true },\n    { "paso": 2, "completado": true }\n  ]\n}`;

    return prompt;
  };

  const copiarPromptTicket = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = compileTicketPrompt();
    navigator.clipboard.writeText(prompt);
    mostrarToast(
      `Prompt de '${ticket.titulo}' copiado al portapapeles.`,
      "exito"
    );
  };

  const registrarIteracionRefinamiento = async () => {
    if (!refinamientoInput.trim()) {
      mostrarToast(
        "Escribe las consideraciones de refinamiento primero.",
        "error"
      );
      return;
    }

    try {
      const currentMeta = ticket.metadata || {};
      const prevIterations = Array.isArray(currentMeta.iterations)
        ? currentMeta.iterations
        : [];
      const newIteration = {
        fecha: new Date().toLocaleTimeString(),
        consideraciones: refinamientoInput.trim(),
      };

      await db.task_executions.update(ticket.id, {
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

  const copiarPromptRefinamiento = () => {
    if (!refinamientoInput.trim()) {
      mostrarToast("Escribe tus ajustes primero.", "error");
      return;
    }

    let prompt = `ROL: ${
      ticket.metadata?.rol || "Senior Frontend Developer"
    }.\n\n`;
    prompt += `TICKET BASE: ${ticket.titulo}\n`;
    prompt += `AJUSTES Y REFINAMIENTO SOLICITADO:\n${refinamientoInput.trim()}\n\n`;
    prompt += `Instrucción: Aplica los ajustes indicados arriba manteniendo la consistencia con el componente actual.\n`;
    prompt += `Al finalizar, incluye el JSON obligatorio de respuesta:\n`;
    prompt += `{\n  "resumen_ia": "Descripción de los ajustes",\n  "checklist": [{ "paso": 1, "completado": true }]\n}`;

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de refinamiento copiado al portapapeles.", "exito");
  };

  const importarChecklistIA = async () => {
    if (!checklistJsonInput.trim()) {
      mostrarToast("Pega el JSON devuelto por la IA primero.", "error");
      return;
    }

    try {
      const parsed = JSON.parse(checklistJsonInput);
      if (Array.isArray(parsed.checklist)) {
        for (const item of parsed.checklist) {
          const stepObj = stepStates[item.paso - 1];
          if (stepObj) {
            await db.task_step_states.update(stepObj.id, {
              completado: !!item.completado,
            });
          }
        }
      }

      if (parsed.resumen_ia) {
        setAiSummaryInput(parsed.resumen_ia);
        const currentMeta = ticket.metadata || {};
        await db.task_executions.update(ticket.id, {
          metadata: {
            ...currentMeta,
            aiSummary: parsed.resumen_ia,
          },
        });
      }

      setChecklistJsonInput("");
      mostrarToast("Checklist e historial sincronizados desde la IA.", "exito");
    } catch (err: any) {
      mostrarToast(
        `JSON no válido: ${err.message}. Asegúrate de pegar el objeto JSON devuelto por la IA.`,
        "error"
      );
    }
  };

  const finalizarTicket = async () => {
    try {
      await db.transaction("rw", [db.task_executions, db.tareas], async () => {
        const metadata = ticket.metadata || {};
        await db.task_executions.update(ticket.id, {
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

      mostrarToast(
        "Ticket cerrado con éxito. Registro de auditoría completado.",
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al cerrar ticket: ${err.message}`, "error");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#2A2A2E] bg-zinc-950/80 shadow-md transition-all">
      {/* Header Bar */}
      <div
        onClick={onToggleExpand}
        className="flex cursor-pointer items-center justify-between border-b border-zinc-900 bg-zinc-900/60 p-3 hover:bg-zinc-900"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] font-bold text-zinc-400">
            {isExpanded ? "▲" : "▼"}
          </span>
          <span
            className={`rounded px-2 py-0.5 font-mono text-[8px] font-bold ${
              ticket.estado === "COMPLETED"
                ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : ticket.titulo.startsWith("BUG") ||
                    ticket.titulo.startsWith("HOTFIX")
                  ? "border border-red-500/20 bg-red-500/10 text-red-400"
                  : "border border-amber-500/20 bg-amber-500/10 text-amber-400"
            }`}
          >
            {ticket.estado}
          </span>
          <h4 className="font-mono text-[11px] font-bold text-zinc-200 uppercase">
            {ticket.titulo}
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[8px] text-zinc-500 sm:inline">
            Encargado: {ticket.usuarioAsignadoId}
          </span>
          <button
            type="button"
            onClick={copiarPromptTicket}
            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[8px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
          >
            📋 Prompt Base
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTicket();
            }}
            className="px-1 font-mono text-[10px] text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      </div>

      {/* Expanded Content Body */}
      {isExpanded && (
        <div className="flex flex-col gap-3 p-3">
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
                      disabled={ticket.estado === "COMPLETED"}
                      onChange={() => toggleStepCompleted(st.id, st.completado)}
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

          {ticket.estado === "IN_PROGRESS" && (
            <>
              {/* Prompt Compiler box */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
                <div>
                  <span className="block font-mono text-[9px] font-bold text-zinc-400 uppercase">
                    🚀 1. Prompt Base para la IA
                  </span>
                  <span className="text-zinc-650 mt-0.5 block text-[8px]">
                    Plantilla limpia estructurada con DS, Estándares y
                    Requisitos de esta sección
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copiarPromptTicket}
                  className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
                >
                  Copiar Prompt Base
                </button>
              </div>

              {/* Refinement Console */}
              <div className="flex flex-col gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
                <span className="font-mono text-[9px] font-bold text-sky-400 uppercase">
                  🔄 2. Refinamiento & Ajustes Iterativos
                </span>
                <textarea
                  value={refinamientoInput}
                  onChange={(e) => setRefinamientoInput(e.target.value)}
                  placeholder="Escribe las correcciones sobre lo que hizo la IA (ej: 'Cambia el botón a verde y ajusta el padding')..."
                  rows={2}
                  className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[9px] text-zinc-200 outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={registrarIteracionRefinamiento}
                    className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-[9px] font-bold text-zinc-300 uppercase transition-all hover:bg-zinc-800"
                  >
                    + Guardar Iteración
                  </button>
                  <button
                    type="button"
                    onClick={copiarPromptRefinamiento}
                    className="rounded bg-sky-500 px-3 py-1 font-mono text-[9px] font-bold text-zinc-950 uppercase shadow transition-all hover:bg-sky-400"
                  >
                    Copiar Prompt Refinamiento
                  </button>
                </div>

                {/* Iterations History */}
                {Array.isArray(ticket.metadata?.iterations) &&
                  ticket.metadata.iterations.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1 border-t border-sky-500/20 pt-2">
                      <span className="font-mono text-[8px] font-bold text-zinc-400 uppercase">
                        Historial de Ajustes (
                        {ticket.metadata.iterations.length}):
                      </span>
                      <div className="flex max-h-[90px] flex-col gap-1 overflow-y-auto">
                        {ticket.metadata.iterations.map(
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

              {/* JSON Checklist Auto Sync */}
              <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950/20 p-3">
                <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                  📥 Sincronizar Checklist desde la IA (JSON)
                </span>
                <textarea
                  value={checklistJsonInput}
                  onChange={(e) => setChecklistJsonInput(e.target.value)}
                  placeholder='Pega el JSON devuelto por la IA para auto-tildar los pasos... (ej: {"checklist": [{"paso": 1, "completado": true}], "resumen_ia": "..."})'
                  rows={2}
                  className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[9px] text-zinc-300 outline-none"
                />
                <button
                  type="button"
                  onClick={importarChecklistIA}
                  className="self-end rounded border border-zinc-800 bg-zinc-900 px-3 py-1 font-mono text-[9px] font-bold text-zinc-300 uppercase transition-all hover:bg-zinc-800"
                >
                  Sincronizar
                </button>
              </div>

              {/* Post-Mortem and Finalize */}
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
                  type="button"
                  onClick={finalizarTicket}
                  className="w-full rounded bg-emerald-500 py-2 text-[10px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-600"
                >
                  Finalizar Ticket y Registrar
                </button>
              </div>
            </>
          )}

          {ticket.metadata?.aiSummary && (
            <div className="mt-1 rounded-xl border border-zinc-900 bg-zinc-950 p-3">
              <span className="mb-1 block font-mono text-[9px] font-bold text-zinc-500 uppercase">
                💾 Resumen Técnico Guardado:
              </span>
              <p className="text-zinc-350 font-mono text-[10px] leading-relaxed">
                {ticket.metadata.aiSummary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
