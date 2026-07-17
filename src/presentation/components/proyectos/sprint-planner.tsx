"use client";

import React, { useState } from "react";
import { Card } from "../card";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { useToast } from "../../hooks/useToast";

interface SprintPlannerProps {
  proyectoId: string;
}

interface SprintCRM {
  id: string;
  proyectoId: string;
  nombre: string;
  duracionSemanas: number;
  fechaInicio: number;
  fechaFin: number;
  objetivo: string;
  capacidad: number;
  estado: "planificacion" | "activo" | "finalizado";
}

interface HistoriaCRM {
  id: string;
  proyectoId: string;
  epicaId: string;
  sprintId?: string;
  titulo: string;
  descripcion?: string;
  prioridad?: string;
  estimacion?: number;
  estado?: string;
}

interface Tarea {
  id: string;
  proyectoId: string;
  historiaId: string;
  titulo: string;
  estado: string; // "todo" | "doing" | "review" | "testing" | "blocked" | "done"
}

export const SprintPlanner: React.FC<SprintPlannerProps> = ({ proyectoId }) => {
  const { mostrarToast } = useToast();

  // Reactive IndexedDB queries
  const sprints = (useLiveQuery(
    () => db.sprints.where("proyectoId").equals(proyectoId).toArray(),
    [proyectoId]
  ) || []) as unknown as SprintCRM[];
  const historias = (useLiveQuery(
    () => db.historias.where("proyectoId").equals(proyectoId).toArray(),
    [proyectoId]
  ) || []) as unknown as HistoriaCRM[];
  const tareas = (useLiveQuery(
    () => db.tareas.where("proyectoId").equals(proyectoId).toArray(),
    [proyectoId]
  ) || []) as unknown as Tarea[];

  // Local state for Sprint Creation
  const [mostrarCrearForm, setMostrarCrearForm] = useState(false);
  const [nombreSprint, setNombreSprint] = useState("");
  const [objetivoSprint, setObjetivoSprint] = useState("");
  const [duracionSemanas, setDuracionSemanas] = useState(2);
  const [capacidadSprint, setCapacidadSprint] = useState(20);

  // Local state for Finalize/Rollover Modal
  const [sprintCerrandoId, setSprintCerrandoId] = useState<string | null>(null);
  const [accionesRollover, setAccionesRollover] = useState<
    Record<
      string,
      {
        tipo: "backlog" | "sprint" | "nuevo" | "eliminar";
        destinoSprintId?: string;
      }
    >
  >({});

  // Helper values
  const plannedSprints = sprints.filter((s) => s.estado === "planificacion");
  const activeSprint = sprints.find((s) => s.estado === "activo");
  const backlogStories = historias.filter((h) => !h.sprintId);

  // Actions
  const crearSprint = async () => {
    if (!nombreSprint.trim()) {
      mostrarToast("El nombre del sprint es obligatorio.", "error");
      return;
    }
    const newSprintId = `spr_${Date.now()}`;
    const start = Date.now();
    const end = start + duracionSemanas * 7 * 24 * 60 * 60 * 1000;

    try {
      await db.sprints.add({
        id: newSprintId,
        proyectoId,
        nombre: nombreSprint,
        duracionSemanas,
        fechaInicio: start,
        fechaFin: end,
        objetivo: objetivoSprint,
        capacidad: capacidadSprint,
        estado: "planificacion",
      });
      setNombreSprint("");
      setObjetivoSprint("");
      setMostrarCrearForm(false);
      mostrarToast("Sprint planificado con éxito.", "exito");
    } catch {
      mostrarToast("Error al crear el sprint.", "error");
    }
  };

  const iniciarSprint = async (sprintId: string) => {
    if (activeSprint) {
      mostrarToast(
        "Ya existe un sprint activo. Finalízalo antes de iniciar otro.",
        "error"
      );
      return;
    }
    try {
      await db.sprints.update(sprintId, { estado: "activo" });
      mostrarToast(
        "Sprint iniciado con éxito. Las actividades ya están en el tablero Kanban.",
        "exito"
      );
    } catch {
      mostrarToast("Error al iniciar el sprint.", "error");
    }
  };

  // Reassign story to another sprint or backlog
  const reasignarHistoria = async (storyId: string, sprintId: string) => {
    try {
      await db.historias.update(storyId, { sprintId: sprintId || "" });
      mostrarToast("Historia reasignada correctamente.", "info");
    } catch {
      mostrarToast("Error al reasignar la historia.", "error");
    }
  };

  // Prepare close/finalize modal
  const abrirCierreSprint = (sprintId: string) => {
    const historiasSprint = historias.filter((h) => h.sprintId === sprintId);
    const iniciales: typeof accionesRollover = {};

    historiasSprint.forEach((h) => {
      const actividades = tareas.filter((t) => t.historiaId === h.id);
      const pendientes = actividades.some((t) => t.estado !== "done");

      // Default rollover action for incomplete/pending stories is to move to backlog
      if (pendientes || actividades.length === 0) {
        iniciales[h.id] = { tipo: "backlog" };
      }
    });

    setAccionesRollover(iniciales);
    setSprintCerrandoId(sprintId);
  };

  const procesarCierreSprint = async () => {
    if (!sprintCerrandoId) return;

    try {
      await db.transaction(
        "rw",
        [db.sprints, db.historias, db.tareas],
        async () => {
          // 1. Mark sprint as finished
          await db.sprints.update(sprintCerrandoId, {
            estado: "finalizado",
            fechaFin: Date.now(),
          });

          const historiasSprint = historias.filter(
            (h) => h.sprintId === sprintCerrandoId
          );

          for (const h of historiasSprint) {
            const accion = accionesRollover[h.id];

            // If no rollover action defined (meaning it was fully completed), keep it in this finished sprint and set estado to "Done"
            if (!accion) {
              await db.historias.update(h.id, { estado: "Done" });
              continue;
            }

            if (accion.tipo === "backlog") {
              await db.historias.update(h.id, { sprintId: "", estado: "Todo" });
            } else if (accion.tipo === "sprint" && accion.destinoSprintId) {
              await db.historias.update(h.id, {
                sprintId: accion.destinoSprintId,
                estado: "Todo",
              });
            } else if (accion.tipo === "nuevo") {
              // Create a new planned sprint on the fly
              const newSprintId = `spr_auto_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
              await db.sprints.add({
                id: newSprintId,
                proyectoId,
                nombre: `Sprint Planificado Rollover`,
                duracionSemanas: 2,
                fechaInicio: Date.now(),
                fechaFin: Date.now() + 2 * 7 * 24 * 60 * 60 * 1000,
                objetivo:
                  "Completar entregables pendientes del sprint anterior",
                capacidad: 15,
                estado: "planificacion",
              });
              await db.historias.update(h.id, {
                sprintId: newSprintId,
                estado: "Todo",
              });
            } else if (accion.tipo === "eliminar") {
              await db.historias.delete(h.id);
              await db.tareas.where("historiaId").equals(h.id).delete();
            }
          }
        }
      );

      setSprintCerrandoId(null);
      mostrarToast(
        "Sprint finalizado y rollover procesado con éxito.",
        "exito"
      );
    } catch {
      mostrarToast("Error al procesar el cierre del sprint.", "error");
    }
  };

  return (
    <div className="flex flex-col gap-6 text-zinc-300">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-900 pb-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-mono text-sm font-bold text-white uppercase">
            Sprint Planning
          </h3>
          <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
            Planifica múltiples sprints o distribuye historias del backlog
          </p>
        </div>
        <button
          onClick={() => setMostrarCrearForm(!mostrarCrearForm)}
          className="shrink-0 rounded-lg bg-emerald-500 px-3.5 py-1.5 font-mono text-xs font-bold text-zinc-950 transition-all hover:bg-emerald-600 active:scale-95"
        >
          {mostrarCrearForm ? "Cancelar" : "＋ Crear Sprint"}
        </button>
      </div>

      {/* New Sprint Creation Form */}
      {mostrarCrearForm && (
        <Card>
          <div className="flex flex-col gap-4 font-mono text-xs text-zinc-300">
            <span className="font-bold text-white uppercase">
              📋 Crear Nuevo Sprint
            </span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">
                  Nombre del Sprint
                </span>
                <input
                  type="text"
                  value={nombreSprint}
                  onChange={(e) => setNombreSprint(e.target.value)}
                  placeholder="Ej: Sprint 1: MVP Core Checkout"
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">
                  Duración (Semanas)
                </span>
                <input
                  type="number"
                  value={duracionSemanas}
                  onChange={(e) => setDuracionSemanas(Number(e.target.value))}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">
                  Objetivo del Sprint
                </span>
                <input
                  type="text"
                  value={objetivoSprint}
                  onChange={(e) => setObjetivoSprint(e.target.value)}
                  placeholder="Poder comprar un producto usando tarjeta..."
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">
                  Capacidad (Puntos)
                </span>
                <input
                  type="number"
                  value={capacidadSprint}
                  onChange={(e) => setCapacidadSprint(Number(e.target.value))}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="mt-1 flex justify-end gap-2">
              <button
                onClick={crearSprint}
                className="rounded-lg bg-emerald-500 px-4 py-1.5 font-bold text-zinc-950 hover:bg-emerald-600"
              >
                Planificar Sprint
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Main planner grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Backlog Stories Column */}
        <div className="flex flex-col gap-3 lg:col-span-1">
          <div className="border-b border-zinc-900 pb-2">
            <h4 className="font-mono text-xs font-bold text-white uppercase">
              🗃️ Backlog del Proyecto
            </h4>
            <p className="font-mono text-[9px] text-zinc-500">
              Historias sin asignar a ningún Sprint ({backlogStories.length})
            </p>
          </div>
          <div className="flex max-h-[70vh] flex-col gap-2.5 overflow-y-auto pr-1">
            {backlogStories.length === 0 ? (
              <span className="text-zinc-650 border-zinc-850 rounded-xl border border-dashed py-4 text-center font-mono text-[10px] italic">
                No hay historias en el backlog.
              </span>
            ) : (
              backlogStories.map((h) => (
                <div
                  key={h.id}
                  className="flex flex-col gap-2.5 rounded-xl border border-zinc-900 bg-zinc-950/40 p-3 font-mono text-[10px] hover:border-zinc-800"
                >
                  <div>
                    <span className="font-bold text-zinc-200">{h.titulo}</span>
                    {h.descripcion && (
                      <span className="mt-0.5 block truncate text-[9px] leading-relaxed text-zinc-500">
                        {h.descripcion}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-900/50 pt-2">
                    <span className="rounded border border-zinc-900 bg-zinc-950 px-1 py-0.5 text-[8px] font-bold text-zinc-500">
                      {h.estimacion || 1} SP
                    </span>
                    <select
                      onChange={(e) => reasignarHistoria(h.id, e.target.value)}
                      value=""
                      className="rounded border border-zinc-800 bg-zinc-900 p-0.5 text-[9px] text-emerald-400 outline-none"
                    >
                      <option value="" disabled>
                        Asignar a...
                      </option>
                      {sprints
                        .filter((s) => s.estado !== "finalizado")
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre} (
                            {s.estado === "activo" ? "Activo" : "Planificado"})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sprints Column */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="border-b border-zinc-900 pb-2">
            <h4 className="font-mono text-xs font-bold text-white uppercase">
              ⏳ Planificación de Iteraciones
            </h4>
            <p className="font-mono text-[9px] text-zinc-500">
              Sprints planificados o activos
            </p>
          </div>

          <div className="flex flex-col gap-5">
            {sprints.filter((s) => s.estado !== "finalizado").length === 0 ? (
              <span className="text-zinc-650 border-zinc-850 rounded-2xl border border-dashed py-8 text-center font-mono text-[10px] italic">
                No hay sprints planificados ni activos. Crea uno arriba.
              </span>
            ) : (
              sprints
                .filter((s) => s.estado !== "finalizado")
                .map((sp) => {
                  const historiasSprint = historias.filter(
                    (h) => h.sprintId === sp.id
                  );
                  const totalSpPoints = historiasSprint.reduce(
                    (acc, h) => acc + (h.estimacion || 0),
                    0
                  );

                  return (
                    <div
                      key={sp.id}
                      className={`flex flex-col gap-4.5 rounded-2xl border p-4.5 font-mono text-xs ${
                        sp.estado === "activo"
                          ? "border-emerald-500/30 bg-emerald-950/5"
                          : "border-zinc-850 bg-zinc-950/20"
                      }`}
                    >
                      {/* Sprint Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-2.5">
                        <div>
                          <span className="flex items-center gap-2 font-bold text-white uppercase">
                            {sp.nombre}
                            <span
                              className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
                                sp.estado === "activo"
                                  ? "animate-pulse border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                  : "bg-zinc-850 text-zinc-400"
                              }`}
                            >
                              {sp.estado.toUpperCase()}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[10px] text-zinc-500">
                            Meta: {sp.objetivo || "Sin objetivo."} • Carga:{" "}
                            {totalSpPoints}/{sp.capacidad} SP
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          {sp.estado === "planificacion" && (
                            <button
                              onClick={() => iniciarSprint(sp.id)}
                              className="rounded bg-emerald-500 px-3 py-1 text-[10px] font-bold text-zinc-950 transition-all hover:bg-emerald-600"
                            >
                              Iniciar Sprint
                            </button>
                          )}
                          {sp.estado === "activo" && (
                            <button
                              onClick={() => abrirCierreSprint(sp.id)}
                              className="rounded border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-bold text-red-400 transition-all hover:bg-red-500/20"
                            >
                              Finalizar Sprint
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sprint Stories List */}
                      <div className="flex flex-col gap-2">
                        {historiasSprint.length === 0 ? (
                          <span className="py-2 text-[10px] text-zinc-600 italic">
                            Arrastra o asigna historias desde el backlog a este
                            Sprint.
                          </span>
                        ) : (
                          historiasSprint.map((h) => {
                            const actStories = tareas.filter(
                              (t) => t.historiaId === h.id
                            );
                            const doneCount = actStories.filter(
                              (t) => t.estado === "done"
                            ).length;

                            return (
                              <div
                                key={h.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-zinc-950/60 p-3 hover:border-zinc-800"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="block truncate font-bold text-zinc-200">
                                    {h.titulo}
                                  </span>
                                  <span className="text-[9px] text-zinc-500">
                                    {h.estimacion || 1} SP • {doneCount}/
                                    {actStories.length} Actividades listas
                                  </span>
                                </div>
                                <select
                                  onChange={(e) =>
                                    reasignarHistoria(h.id, e.target.value)
                                  }
                                  value={sp.id}
                                  className="shrink-0 rounded border border-zinc-800 bg-zinc-900 p-0.5 text-[9px] text-zinc-400 outline-none"
                                >
                                  <option value="">Mover al Backlog</option>
                                  {sprints
                                    .filter((s) => s.estado !== "finalizado")
                                    .map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.nombre}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Retrospective / Rollover Modal on Finalize Sprint */}
      {sprintCerrandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSprintCerrandoId(null)}
          />

          {/* Modal Container */}
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-[#121214] p-6 font-mono text-xs shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-900 pb-3">
              <h4 className="font-bold text-white uppercase">
                🏁 Retrospectiva y Rollover del Sprint
              </h4>
              <button
                onClick={() => setSprintCerrandoId(null)}
                className="font-mono text-zinc-500 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4 pr-1">
              <p className="text-[10px] text-zinc-400">
                Estás a punto de finalizar el sprint. Revisa los entregables
                pendientes y define el destino de las historias incompletas. Las
                historias completadas permanecerán archivadas en este sprint.
              </p>

              {historias.filter((h) => h.sprintId === sprintCerrandoId)
                .length === 0 ? (
                <div className="text-zinc-650 py-6 text-center italic">
                  No hay historias registradas en este sprint.
                </div>
              ) : (
                historias
                  .filter((h) => h.sprintId === sprintCerrandoId)
                  .map((h) => {
                    const actividades = tareas.filter(
                      (t) => t.historiaId === h.id
                    );
                    const doneAct = actividades.filter(
                      (t) => t.estado === "done"
                    ).length;
                    const esIncompleta =
                      doneAct < actividades.length || actividades.length === 0;

                    return (
                      <div
                        key={h.id}
                        className={`flex flex-col gap-3 rounded-2xl border p-4 ${
                          esIncompleta
                            ? "border-zinc-850 bg-zinc-950/20"
                            : "border-emerald-500/20 bg-emerald-950/5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <span className="font-bold text-zinc-200">
                              {h.titulo}
                            </span>
                            <span className="mt-0.5 block text-[9px] text-zinc-500">
                              {doneAct}/{actividades.length} Actividades
                              Completadas
                            </span>
                          </div>
                          <span
                            className={`rounded px-2 py-0.5 text-[9px] font-bold ${
                              esIncompleta
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            {esIncompleta ? "INCOMPLETA" : "COMPLETADA"}
                          </span>
                        </div>

                        {/* If story has pending activities, show rollover choices */}
                        {esIncompleta && (
                          <div className="flex flex-col gap-2 border-t border-zinc-900 pt-3">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">
                              Definir Rollover:
                            </span>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-900 bg-zinc-950/40 p-1.5">
                                <input
                                  type="radio"
                                  name={`rollover_${h.id}`}
                                  checked={
                                    accionesRollover[h.id]?.tipo === "backlog"
                                  }
                                  onChange={() =>
                                    setAccionesRollover({
                                      ...accionesRollover,
                                      [h.id]: { tipo: "backlog" },
                                    })
                                  }
                                  className="border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                                />
                                <span>Volver al Backlog</span>
                              </label>

                              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-900 bg-zinc-950/40 p-1.5">
                                <input
                                  type="radio"
                                  name={`rollover_${h.id}`}
                                  checked={
                                    accionesRollover[h.id]?.tipo === "nuevo"
                                  }
                                  onChange={() =>
                                    setAccionesRollover({
                                      ...accionesRollover,
                                      [h.id]: { tipo: "nuevo" },
                                    })
                                  }
                                  className="border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                                />
                                <span>Mover a Nuevo Sprint</span>
                              </label>

                              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-900 bg-zinc-950/40 p-1.5">
                                <input
                                  type="radio"
                                  name={`rollover_${h.id}`}
                                  checked={
                                    accionesRollover[h.id]?.tipo === "eliminar"
                                  }
                                  onChange={() =>
                                    setAccionesRollover({
                                      ...accionesRollover,
                                      [h.id]: { tipo: "eliminar" },
                                    })
                                  }
                                  className="border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                                />
                                <span className="text-rose-400">
                                  Eliminar Historia
                                </span>
                              </label>

                              {plannedSprints.length > 0 && (
                                <div className="flex items-center gap-2 rounded-lg border border-zinc-900 bg-zinc-950/40 p-1.5">
                                  <input
                                    type="radio"
                                    name={`rollover_${h.id}`}
                                    checked={
                                      accionesRollover[h.id]?.tipo === "sprint"
                                    }
                                    onChange={() =>
                                      setAccionesRollover({
                                        ...accionesRollover,
                                        [h.id]: {
                                          tipo: "sprint",
                                          destinoSprintId:
                                            plannedSprints[0]?.id,
                                        },
                                      })
                                    }
                                    className="border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                                  />
                                  <select
                                    disabled={
                                      accionesRollover[h.id]?.tipo !== "sprint"
                                    }
                                    value={
                                      accionesRollover[h.id]?.destinoSprintId ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      setAccionesRollover({
                                        ...accionesRollover,
                                        [h.id]: {
                                          tipo: "sprint",
                                          destinoSprintId: e.target.value,
                                        },
                                      })
                                    }
                                    className="cursor-pointer border-none bg-transparent p-0 text-[9px] text-zinc-300 outline-none focus:ring-0"
                                  >
                                    {plannedSprints.map((s) => (
                                      <option
                                        key={s.id}
                                        value={s.id}
                                        className="text-zinc-350 bg-[#121214]"
                                      >
                                        Mover a {s.nombre}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            <div className="flex shrink-0 justify-end gap-2.5 border-t border-zinc-900 pt-3">
              <button
                onClick={() => setSprintCerrandoId(null)}
                className="rounded-lg border border-zinc-800 px-4 py-2 hover:bg-zinc-900"
              >
                Volver
              </button>
              <button
                onClick={procesarCierreSprint}
                className="rounded-lg bg-emerald-500 px-5 py-2 font-bold text-zinc-950 transition-all hover:bg-emerald-600 active:scale-95"
              >
                Confirmar Finalización
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
