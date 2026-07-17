/* eslint-disable react-hooks/purity */
"use client";

import React, { useState } from "react";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";

interface Epica {
  id: string;
  proyectoId: string;
  nombre: string;
  descripcion?: string;
}

interface Historia {
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
  estado: string; // "Todo" | "Done"
  creadoEn?: number;
  actualizadoEn?: number;
}

interface PlanoGeneralBacklogProps {
  proyectoId: string;
}

export const PlanoGeneralBacklog: React.FC<PlanoGeneralBacklogProps> = ({
  proyectoId,
}) => {
  // Query epics, stories and tasks reactively
  const epicas = (useLiveQuery(
    () => db.epicas.where("proyectoId").equals(proyectoId).toArray(),
    [proyectoId]
  ) || []) as unknown as Epica[];
  const historias = (useLiveQuery(
    () => db.historias.where("proyectoId").equals(proyectoId).toArray(),
    [proyectoId]
  ) || []) as unknown as Historia[];
  const tareas = (useLiveQuery(
    () => db.tareas.where("proyectoId").equals(proyectoId).toArray(),
    [proyectoId]
  ) || []) as unknown as Tarea[];

  // Local state for adding tasks
  const [nuevaActividadTexto, setNuevaActividadTexto] = useState<
    Record<string, string>
  >({});

  // Local state for editing tasks
  const [actividadEditandoId, setActividadEditandoId] = useState<string | null>(
    null
  );
  const [actividadEditandoTexto, setActividadEditandoTexto] = useState("");

  // Toggle/cycle story status in IndexedDB
  const alternarEstadoHistoria = async (
    historiaId: string,
    estadoActual: string
  ) => {
    let proximoEstado = "Todo";
    if (estadoActual === "Todo") proximoEstado = "InProgress";
    else if (estadoActual === "InProgress") proximoEstado = "Done";

    try {
      await db.historias.update(historiaId, { estado: proximoEstado });
    } catch {
      // Ignorar errores silenciosamente
    }
  };

  // CRUD actions for nested tasks
  const crearActividad = async (historiaId: string) => {
    const texto = nuevaActividadTexto[historiaId]?.trim();
    if (!texto) return;

    const newId = `tar_${Math.random().toString(36).substring(2, 9)}`;
    try {
      await db.tareas.add({
        id: newId,
        proyectoId,
        historiaId,
        titulo: texto,
        estado: "Todo",
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      });
      setNuevaActividadTexto((prev) => ({ ...prev, [historiaId]: "" }));
    } catch {
      // Ignorar silenciosamente
    }
  };

  const alternarEstadoActividad = async (
    tareaId: string,
    estadoActual: string
  ) => {
    const proximo = estadoActual === "Done" ? "Todo" : "Done";
    try {
      await db.tareas.update(tareaId, {
        estado: proximo,
        actualizadoEn: Date.now(),
      });
    } catch {
      // Ignorar silenciosamente
    }
  };

  const guardarEdicionActividad = async (tareaId: string) => {
    const texto = actividadEditandoTexto.trim();
    if (!texto) return;

    try {
      await db.tareas.update(tareaId, {
        titulo: texto,
        actualizadoEn: Date.now(),
      });
      setActividadEditandoId(null);
    } catch {
      // Ignorar silenciosamente
    }
  };

  const borrarActividad = async (tareaId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta actividad?")) {
      try {
        await db.tareas.delete(tareaId);
      } catch {
        // Ignorar silenciosamente
      }
    }
  };

  // Overall calculations
  const totalHistorias = historias.length;
  const completadasHistorias = historias.filter(
    (h) => h.estado === "Done"
  ).length;
  const progresoGlobal =
    totalHistorias > 0
      ? Math.round((completadasHistorias / totalHistorias) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6 text-zinc-300">
      {/* Global progress header summary */}
      <div className="rounded-2xl border border-[#2A2A2E] bg-zinc-950/60 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h4 className="font-mono text-sm font-bold text-white uppercase">
              Progreso General de Entregables
            </h4>
            <p className="mt-1 font-mono text-[10px] text-zinc-500">
              {completadasHistorias} de {totalHistorias} historias técnicas
              implementadas con éxito.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black text-emerald-400">
              {progresoGlobal}%
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full border border-zinc-800/40 bg-zinc-900">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progresoGlobal}%` }}
          />
        </div>
      </div>

      {/* Epics layout grid */}
      <div className="flex flex-col gap-5">
        {epicas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center font-mono text-xs text-zinc-500 italic">
            No hay épicas ni backlog registrado para este proyecto. Puedes
            importarlo desde la sección de Ingesta IA.
          </div>
        ) : (
          epicas.map((ep) => {
            const historiasEpica = historias.filter((h) => h.epicaId === ep.id);
            const totalEp = historiasEpica.length;
            const doneEp = historiasEpica.filter(
              (h) => h.estado === "Done"
            ).length;
            const progresoEp =
              totalEp > 0 ? Math.round((doneEp / totalEp) * 100) : 0;

            return (
              <div
                key={ep.id}
                className="rounded-2xl border border-[#2A2A2E] bg-zinc-950/20 p-5 transition-colors hover:border-zinc-800"
              >
                {/* Epic Header with Epic Progress bar */}
                <div className="flex flex-col justify-between gap-2 border-b border-zinc-900 pb-3 md:flex-row md:items-center">
                  <div>
                    <h5 className="font-mono text-xs font-bold text-white uppercase">
                      📁 {ep.nombre}
                    </h5>
                    <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                      {ep.descripcion || "Sin descripción."}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-zinc-400">
                      {doneEp}/{totalEp} Historias ({progresoEp}%)
                    </span>
                    <div className="border-zinc-850 h-2 w-24 overflow-hidden rounded-full border bg-zinc-900">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${progresoEp}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Associated User Stories List */}
                <div className="mt-4 flex flex-col gap-2">
                  {historiasEpica.length === 0 ? (
                    <div className="py-2 text-center font-mono text-[9px] text-zinc-600 italic">
                      No hay historias vinculadas a esta épica.
                    </div>
                  ) : (
                    historiasEpica.map((h) => {
                      let statusBadge =
                        "bg-zinc-900 text-zinc-500 border-zinc-850";
                      let dotColor = "bg-zinc-600";

                      if (h.estado === "Done") {
                        statusBadge =
                          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        dotColor = "bg-emerald-500";
                      } else if (h.estado === "InProgress") {
                        statusBadge =
                          "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        dotColor = "bg-amber-500";
                      }

                      let prioColor = "text-zinc-500 border-zinc-800";
                      if (h.prioridad === "Alta")
                        prioColor =
                          "text-rose-400 border-rose-900/20 bg-rose-950/20";
                      else if (h.prioridad === "Media")
                        prioColor =
                          "text-amber-400 border-amber-900/20 bg-amber-950/20";

                      // Calculate nested activities status
                      const actividadesStory = tareas.filter(
                        (t) => t.historiaId === h.id
                      );
                      const totalAct = actividadesStory.length;
                      const doneAct = actividadesStory.filter(
                        (t) => t.estado === "Done"
                      ).length;

                      return (
                        <div
                          key={h.id}
                          className="flex flex-col gap-3 rounded-xl border border-zinc-900 bg-zinc-950/40 px-4 py-3 hover:bg-zinc-950/60"
                        >
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div className="flex min-w-0 flex-col">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-zinc-200">
                                  {h.titulo}
                                </span>
                                {totalAct > 0 && (
                                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-500">
                                    {doneAct}/{totalAct} Tareas
                                  </span>
                                )}
                              </div>
                              <span className="mt-0.5 font-mono text-[10px] leading-relaxed text-zinc-500">
                                {h.descripcion}
                              </span>
                            </div>

                            <div className="flex shrink-0 items-center gap-2.5 sm:justify-end">
                              {/* Priority Badge */}
                              {h.prioridad && (
                                <span
                                  className={`rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase ${prioColor}`}
                                >
                                  {h.prioridad}
                                </span>
                              )}

                              {/* Estimation points */}
                              {h.estimacion !== undefined && (
                                <span className="rounded-md border border-zinc-800/80 bg-zinc-900 px-2 py-0.5 font-mono text-[9px] text-zinc-400 select-none">
                                  {h.estimacion} SP
                                </span>
                              )}

                              {/* Status Cycler Badge */}
                              <button
                                onClick={() =>
                                  alternarEstadoHistoria(
                                    h.id,
                                    h.estado || "Todo"
                                  )
                                }
                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono text-[9px] font-bold tracking-wide uppercase transition-all select-none hover:brightness-110 active:scale-95 ${statusBadge}`}
                                title="Haz clic para cambiar de estado"
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${dotColor}`}
                                />
                                {h.estado || "Todo"}
                              </button>
                            </div>
                          </div>

                          {/* Nested Activities CRUD Checklist */}
                          <div className="mt-1.5 flex flex-col gap-2 border-l border-zinc-900 pl-3">
                            {actividadesStory.map((act) => {
                              const isEditing = actividadEditandoId === act.id;
                              return (
                                <div
                                  key={act.id}
                                  className="group/act flex items-center justify-between gap-3 py-0.5"
                                >
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={act.estado === "Done"}
                                      onChange={() =>
                                        alternarEstadoActividad(
                                          act.id,
                                          act.estado
                                        )
                                      }
                                      className="h-3 w-3 cursor-pointer rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-zinc-950"
                                    />
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={actividadEditandoTexto}
                                        onChange={(e) =>
                                          setActividadEditandoTexto(
                                            e.target.value
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            guardarEdicionActividad(act.id);
                                          if (e.key === "Escape")
                                            setActividadEditandoId(null);
                                        }}
                                        onBlur={() =>
                                          guardarEdicionActividad(act.id)
                                        }
                                        autoFocus
                                        className="border-zinc-850 w-full rounded border bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-200 outline-none"
                                      />
                                    ) : (
                                      <span
                                        onDoubleClick={() => {
                                          setActividadEditandoId(act.id);
                                          setActividadEditandoTexto(act.titulo);
                                        }}
                                        className={`cursor-pointer truncate font-mono text-[10px] select-none ${
                                          act.estado === "Done"
                                            ? "text-zinc-650 line-through"
                                            : "text-zinc-400 hover:text-zinc-300"
                                        }`}
                                        title="Doble clic para editar"
                                      >
                                        {act.titulo}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover/act:opacity-100">
                                    {!isEditing && (
                                      <button
                                        onClick={() => {
                                          setActividadEditandoId(act.id);
                                          setActividadEditandoTexto(act.titulo);
                                        }}
                                        className="font-mono text-[9px] text-zinc-600 hover:text-zinc-400"
                                        title="Editar"
                                      >
                                        Editar
                                      </button>
                                    )}
                                    <button
                                      onClick={() => borrarActividad(act.id)}
                                      className="text-zinc-750 font-mono text-[9px] hover:text-rose-400"
                                      title="Borrar"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Add Activity Input */}
                            <div className="flex items-center gap-2 border-t border-zinc-900/40 pt-1">
                              <input
                                type="text"
                                placeholder="＋ Añadir tarea técnica para el desarrollador..."
                                value={nuevaActividadTexto[h.id] || ""}
                                onChange={(e) =>
                                  setNuevaActividadTexto({
                                    ...nuevaActividadTexto,
                                    [h.id]: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") crearActividad(h.id);
                                }}
                                className="placeholder-zinc-750 flex-1 border-none bg-transparent font-mono text-[9px] text-zinc-500 outline-none focus:text-zinc-400 focus:placeholder-zinc-500"
                              />
                            </div>
                          </div>
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
  );
};
