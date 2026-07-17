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
  estado: string; // "todo" | "doing" | "review" | "testing" | "blocked" | "done"
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

  // Local state for Epic CRUD
  const [mostrarCrearEpicForm, setMostrarCrearEpicForm] = useState(false);
  const [nuevoEpicNombre, setNuevoEpicNombre] = useState("");
  const [nuevoEpicDesc, setNuevoEpicDesc] = useState("");

  const [epicEditandoId, setEpicEditandoId] = useState<string | null>(null);
  const [epicEditandoNombre, setEpicEditandoNombre] = useState("");
  const [epicEditandoDesc, setEpicEditandoDesc] = useState("");

  // Local state for User Story CRUD
  const [nuevaHistoriaEpicId, setNuevaHistoriaEpicId] = useState<string | null>(
    null
  );
  const [nuevaHistTitulo, setNuevaHistTitulo] = useState("");
  const [nuevaHistDesc, setNuevaHistDesc] = useState("");
  const [nuevaHistPrio, setNuevaHistPrio] = useState("Media");
  const [nuevaHistEst, setNuevaHistEst] = useState(3);

  const [historiaEditandoId, setHistoriaEditandoId] = useState<string | null>(
    null
  );
  const [historiaEditandoTitulo, setHistoriaEditandoTitulo] = useState("");
  const [historiaEditandoDesc, setHistoriaEditandoDesc] = useState("");
  const [historiaEditandoPrio, setHistoriaEditandoPrio] = useState("Media");
  const [historiaEditandoEst, setHistoriaEditandoEst] = useState(3);

  // Local state for Tasks
  const [nuevaActividadTexto, setNuevaActividadTexto] = useState<
    Record<string, string>
  >({});
  const [actividadEditandoId, setActividadEditandoId] = useState<string | null>(
    null
  );
  const [actividadEditandoTexto, setActividadEditandoTexto] = useState("");

  // Epic Actions
  const crearEpic = async () => {
    if (!nuevoEpicNombre.trim()) return;
    const newId = `epi_${Date.now()}`;
    try {
      await db.epicas.add({
        id: newId,
        proyectoId,
        nombre: nuevoEpicNombre,
        descripcion: nuevoEpicDesc,
        creadoEn: Date.now(),
      });
      setNuevoEpicNombre("");
      setNuevoEpicDesc("");
      setMostrarCrearEpicForm(false);
    } catch {}
  };

  const guardarEdicionEpic = async (epicId: string) => {
    if (!epicEditandoNombre.trim()) return;
    try {
      await db.epicas.update(epicId, {
        nombre: epicEditandoNombre,
        descripcion: epicEditandoDesc,
      });
      setEpicEditandoId(null);
    } catch {}
  };

  const eliminarEpic = async (epicId: string) => {
    if (
      confirm(
        "¿Estás seguro de que deseas eliminar esta épica y todas sus historias y tareas asociadas en cascada?"
      )
    ) {
      try {
        await db.transaction(
          "rw",
          [db.epicas, db.historias, db.tareas],
          async () => {
            await db.epicas.delete(epicId);
            const hist = (await db.historias
              .where("epicaId")
              .equals(epicId)
              .toArray()) as unknown as Historia[];
            const histIds = hist.map((h) => h.id);
            await db.historias.where("epicaId").equals(epicId).delete();
            for (const hId of histIds) {
              await db.tareas.where("historiaId").equals(hId).delete();
            }
          }
        );
      } catch {}
    }
  };

  // Story Actions
  const crearHistoria = async (epicId: string) => {
    if (!nuevaHistTitulo.trim()) return;
    const newId = `his_${Date.now()}`;
    try {
      await db.historias.add({
        id: newId,
        proyectoId,
        epicaId: epicId,
        sprintId: "",
        titulo: nuevaHistTitulo,
        descripcion: nuevaHistDesc,
        prioridad: nuevaHistPrio,
        estimacion: nuevaHistEst,
        estado: "Todo",
        creadoEn: Date.now(),
      });
      setNuevaHistTitulo("");
      setNuevaHistDesc("");
      setNuevaHistPrio("Media");
      setNuevaHistEst(3);
      setNuevaHistoriaEpicId(null);
    } catch {}
  };

  const guardarEdicionHistoria = async (historiaId: string) => {
    if (!historiaEditandoTitulo.trim()) return;
    try {
      await db.historias.update(historiaId, {
        titulo: historiaEditandoTitulo,
        descripcion: historiaEditandoDesc,
        prioridad: historiaEditandoPrio,
        estimacion: historiaEditandoEst,
      });
      setHistoriaEditandoId(null);
    } catch {}
  };

  const eliminarHistoria = async (historiaId: string) => {
    if (
      confirm(
        "¿Estás seguro de que deseas eliminar esta historia y todas sus actividades asociadas?"
      )
    ) {
      try {
        await db.transaction("rw", [db.historias, db.tareas], async () => {
          await db.historias.delete(historiaId);
          await db.tareas.where("historiaId").equals(historiaId).delete();
        });
      } catch {}
    }
  };

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
    } catch {}
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
        estado: "todo",
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      });
      setNuevaActividadTexto((prev) => ({ ...prev, [historiaId]: "" }));
    } catch {}
  };

  const alternarEstadoActividad = async (
    tareaId: string,
    estadoActual: string
  ) => {
    const proximo = estadoActual === "done" ? "todo" : "done";
    try {
      await db.tareas.update(tareaId, {
        estado: proximo,
        actualizadoEn: Date.now(),
      });
    } catch {}
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
    } catch {}
  };

  const borrarActividad = async (tareaId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta actividad?")) {
      try {
        await db.tareas.delete(tareaId);
      } catch {}
    }
  };

  // Overall calculations
  const totalHistorias = historias.length;
  const completadasHistorias = historias.filter(
    (h) => h.estado === "Done" || h.estado === "done"
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
            <button
              onClick={() => setMostrarCrearEpicForm(!mostrarCrearEpicForm)}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 font-mono text-xs font-bold text-zinc-950 transition-all hover:bg-emerald-600 active:scale-95"
            >
              📁 Nueva Épica
            </button>
            <span className="pl-2 font-mono text-xl font-black text-emerald-400">
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

      {/* Epic Creation Form */}
      {mostrarCrearEpicForm && (
        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 font-mono text-xs">
          <h4 className="font-bold text-white uppercase">
            📁 Crear Nueva Épica (Módulo de Negocio)
          </h4>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-zinc-500">
              Nombre de la Épica
            </span>
            <input
              type="text"
              value={nuevoEpicNombre}
              onChange={(e) => setNuevoEpicNombre(e.target.value)}
              placeholder="Ej: CRM Comercial y Facturación"
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-zinc-500">Descripción</span>
            <textarea
              value={nuevoEpicDesc}
              onChange={(e) => setNuevoEpicDesc(e.target.value)}
              placeholder="Ej: Contratos, cobros y flujos comerciales offline..."
              rows={2}
              className="resize-none rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 outline-none focus:border-emerald-500"
            />
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <button
              onClick={() => setMostrarCrearEpicForm(false)}
              className="rounded-lg border border-zinc-800 px-3.5 py-1.5 hover:bg-zinc-900"
            >
              Cancelar
            </button>
            <button
              onClick={crearEpic}
              className="rounded-lg bg-emerald-500 px-4 py-1.5 font-bold text-zinc-950 hover:bg-emerald-600"
            >
              Crear Épica
            </button>
          </div>
        </div>
      )}

      {/* Epics layout grid */}
      <div className="flex flex-col gap-5">
        {epicas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center font-mono text-xs text-zinc-500 italic">
            No hay épicas ni backlog registrado para este proyecto. Puedes
            pulsar &quot;Nueva Épica&quot; arriba o importarlo.
          </div>
        ) : (
          epicas.map((ep) => {
            const historiasEpica = historias.filter((h) => h.epicaId === ep.id);
            const totalEp = historiasEpica.length;
            const doneEp = historiasEpica.filter(
              (h) => h.estado === "Done" || h.estado === "done"
            ).length;
            const progresoEp =
              totalEp > 0 ? Math.round((doneEp / totalEp) * 100) : 0;
            const isEpicEditing = epicEditandoId === ep.id;

            return (
              <div
                key={ep.id}
                className="rounded-2xl border border-[#2A2A2E] bg-zinc-950/20 p-5 transition-colors hover:border-zinc-800"
              >
                {/* Epic Header with Epic Progress bar and CRUD triggers */}
                <div className="flex flex-col justify-between gap-3 border-b border-zinc-900 pb-3 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    {isEpicEditing ? (
                      <div className="mt-1 flex max-w-lg flex-col gap-2 font-mono text-xs">
                        <input
                          type="text"
                          value={epicEditandoNombre}
                          onChange={(e) =>
                            setEpicEditandoNombre(e.target.value)
                          }
                          className="border-zinc-850 rounded border bg-zinc-900 p-1 text-zinc-200 outline-none"
                        />
                        <input
                          type="text"
                          value={epicEditandoDesc}
                          onChange={(e) => setEpicEditandoDesc(e.target.value)}
                          className="border-zinc-850 rounded border bg-zinc-900 p-1 text-zinc-200 outline-none"
                        />
                        <div className="mt-1 flex gap-2">
                          <button
                            onClick={() => guardarEdicionEpic(ep.id)}
                            className="rounded bg-emerald-500 px-2 py-0.5 font-bold text-zinc-950"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEpicEditandoId(null)}
                            className="rounded border border-zinc-800 px-2 py-0.5"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="group/epicHead flex items-center gap-3">
                        <div>
                          <h5 className="font-mono text-xs font-bold text-white uppercase">
                            📁 {ep.nombre}
                          </h5>
                          <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                            {ep.descripcion || "Sin descripción."}
                          </p>
                        </div>
                        <div className="flex gap-1.5 opacity-0 transition-opacity group-hover/epicHead:opacity-100">
                          <button
                            onClick={() => {
                              setEpicEditandoId(ep.id);
                              setEpicEditandoNombre(ep.nombre);
                              setEpicEditandoDesc(ep.descripcion || "");
                            }}
                            className="text-[10px] text-zinc-500 hover:text-zinc-300"
                            title="Editar Épica"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => eliminarEpic(ep.id)}
                            className="pl-0.5 text-[10px] text-zinc-600 hover:text-rose-400"
                            title="Eliminar Épica"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-[10px] text-zinc-400">
                      {doneEp}/{totalEp} Historias ({progresoEp})%
                    </span>
                    <div className="border-zinc-850 h-2 w-24 overflow-hidden rounded-full border bg-zinc-900">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${progresoEp}%` }}
                      />
                    </div>
                    <button
                      onClick={() =>
                        setNuevaHistoriaEpicId(
                          nuevaHistoriaEpicId === ep.id ? null : ep.id
                        )
                      }
                      className="hover:bg-zinc-850 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[9px] font-bold text-emerald-400 transition-all select-none active:scale-95"
                    >
                      ＋ Historia
                    </button>
                  </div>
                </div>

                {/* Form to create user story under this epic */}
                {nuevaHistoriaEpicId === ep.id && (
                  <div className="border-zinc-850 mt-4 flex flex-col gap-3 rounded-xl border bg-zinc-950/60 p-4 font-mono text-xs">
                    <span className="font-bold text-white uppercase">
                      ＋ Nueva Historia de Usuario
                    </span>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <span className="text-[9px] text-zinc-500">
                          Título de la Historia
                        </span>
                        <input
                          type="text"
                          value={nuevaHistTitulo}
                          onChange={(e) => setNuevaHistTitulo(e.target.value)}
                          placeholder="Ej: Registro de contratos de clientes"
                          className="rounded border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-200 outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-zinc-500">
                          Prioridad
                        </span>
                        <select
                          value={nuevaHistPrio}
                          onChange={(e) => setNuevaHistPrio(e.target.value)}
                          className="text-zinc-250 rounded border border-zinc-800 bg-zinc-900 p-1.5 outline-none"
                        >
                          <option value="Alta">Alta</option>
                          <option value="Media">Media</option>
                          <option value="Baja">Baja</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <span className="text-[9px] text-zinc-500">
                          Descripción
                        </span>
                        <input
                          type="text"
                          value={nuevaHistDesc}
                          onChange={(e) => setNuevaHistDesc(e.target.value)}
                          placeholder="Como preventista quiero adjuntar un contrato firmado al cliente..."
                          className="rounded border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-200 outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-zinc-500">
                          Estimación (SP)
                        </span>
                        <input
                          type="number"
                          value={nuevaHistEst}
                          onChange={(e) =>
                            setNuevaHistEst(Number(e.target.value))
                          }
                          className="rounded border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-200 outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="mt-1 flex justify-end gap-2">
                      <button
                        onClick={() => setNuevaHistoriaEpicId(null)}
                        className="rounded border border-zinc-800 px-2.5 py-1 hover:bg-zinc-900"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => crearHistoria(ep.id)}
                        className="rounded bg-emerald-500 px-3 py-1 font-bold text-zinc-950 hover:bg-emerald-600"
                      >
                        Agregar Historia
                      </button>
                    </div>
                  </div>
                )}

                {/* Associated User Stories List */}
                <div className="mt-4 flex flex-col gap-2">
                  {historiasEpica.length === 0 ? (
                    <div className="text-zinc-650 py-2 text-center font-mono text-[9px] italic">
                      No hay historias vinculadas a esta épica.
                    </div>
                  ) : (
                    historiasEpica.map((h) => {
                      let statusBadge =
                        "bg-zinc-900 text-zinc-500 border-zinc-850";
                      let dotColor = "bg-zinc-600";

                      if (h.estado === "Done" || h.estado === "done") {
                        statusBadge =
                          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        dotColor = "bg-emerald-500";
                      } else if (
                        h.estado === "InProgress" ||
                        h.estado === "doing"
                      ) {
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
                        (t) => t.estado === "done"
                      ).length;
                      const isStoryEditing = historiaEditandoId === h.id;

                      return (
                        <div
                          key={h.id}
                          className="flex flex-col gap-3 rounded-xl border border-zinc-900 bg-zinc-950/40 px-4 py-3 hover:bg-zinc-950/60"
                        >
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            {isStoryEditing ? (
                              <div className="flex max-w-xl flex-1 flex-col gap-2 font-mono text-xs">
                                <input
                                  type="text"
                                  value={historiaEditandoTitulo}
                                  onChange={(e) =>
                                    setHistoriaEditandoTitulo(e.target.value)
                                  }
                                  className="rounded border border-zinc-800 bg-zinc-900 p-1 text-zinc-200 outline-none"
                                />
                                <input
                                  type="text"
                                  value={historiaEditandoDesc}
                                  onChange={(e) =>
                                    setHistoriaEditandoDesc(e.target.value)
                                  }
                                  className="rounded border border-zinc-800 bg-zinc-900 p-1 text-zinc-200 outline-none"
                                />
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-zinc-500">
                                      Prio:
                                    </span>
                                    <select
                                      value={historiaEditandoPrio}
                                      onChange={(e) =>
                                        setHistoriaEditandoPrio(e.target.value)
                                      }
                                      className="border-zinc-850 rounded border bg-zinc-900 p-0.5 text-zinc-200 outline-none"
                                    >
                                      <option value="Alta">Alta</option>
                                      <option value="Media">Media</option>
                                      <option value="Baja">Baja</option>
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-zinc-500">
                                      SP:
                                    </span>
                                    <input
                                      type="number"
                                      value={historiaEditandoEst}
                                      onChange={(e) =>
                                        setHistoriaEditandoEst(
                                          Number(e.target.value)
                                        )
                                      }
                                      className="border-zinc-850 w-12 rounded border bg-zinc-900 p-0.5 text-zinc-200 outline-none"
                                    />
                                  </div>
                                  <button
                                    onClick={() => guardarEdicionHistoria(h.id)}
                                    className="ml-auto rounded bg-emerald-500 px-2 py-0.5 font-bold text-zinc-950"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    onClick={() => setHistoriaEditandoId(null)}
                                    className="rounded border border-zinc-800 px-2 py-0.5"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="group/storyTitle flex min-w-0 flex-1 items-start gap-3">
                                <div className="min-w-0 flex-1">
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
                                  <span className="mt-0.5 block font-mono text-[10px] leading-relaxed text-zinc-500">
                                    {h.descripcion}
                                  </span>
                                </div>
                                <div className="flex gap-1 opacity-0 transition-opacity group-hover/storyTitle:opacity-100">
                                  <button
                                    onClick={() => {
                                      setHistoriaEditandoId(h.id);
                                      setHistoriaEditandoTitulo(h.titulo);
                                      setHistoriaEditandoDesc(
                                        h.descripcion || ""
                                      );
                                      setHistoriaEditandoPrio(
                                        h.prioridad || "Media"
                                      );
                                      setHistoriaEditandoEst(h.estimacion || 3);
                                    }}
                                    className="text-[9px] text-zinc-500 hover:text-zinc-300"
                                    title="Editar Historia"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => eliminarHistoria(h.id)}
                                    className="pl-0.5 text-[9px] text-zinc-600 hover:text-rose-400"
                                    title="Eliminar Historia"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            )}

                            {!isStoryEditing && (
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
                            )}
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
                                      checked={act.estado === "done"}
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
                                          act.estado === "done"
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
                                      className="text-zinc-750 hover:text-rose-450 font-mono text-[9px]"
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
