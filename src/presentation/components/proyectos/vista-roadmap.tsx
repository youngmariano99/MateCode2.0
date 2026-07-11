"use client";

import React, { useState } from "react";
import { Button } from "../button";
import { Input } from "../input";
import { Select } from "../select";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { GestionarTareaUseCase } from "../../../application/use-cases/proyecto/gestionar-tarea.use-case";
import { useToast } from "../../hooks/useToast";

interface TareaCRM {
  id: string;
  proyectoId: string;
  titulo: string;
  descripcion?: string;
  estado: string;
  prioridad: string;
  responsable?: string;
}

interface VistaRoadmapProps {
  proyectoId: string;
}

const ESTADOS_TAREAS = ["Pendiente", "Desarrollo", "Testing", "Finalizado"];
const PRIORIDADES = ["Baja", "Media", "Alta", "Urgente"];

export const VistaRoadmap: React.FC<VistaRoadmapProps> = ({ proyectoId }) => {
  const { mostrarToast } = useToast();
  const taskUseCase = new GestionarTareaUseCase();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [estado, setEstado] = useState("Pendiente");
  const responsable = "Mariano";

  const rawTareas =
    useLiveQuery(() =>
      db.tareas.where("proyectoId").equals(proyectoId).toArray()
    ) || [];

  const tareas = rawTareas as unknown as TareaCRM[];

  const guardarTarea = async () => {
    if (!titulo.trim()) {
      mostrarToast("El título de la tarea es obligatorio.", "error");
      return;
    }

    const payload = {
      proyectoId,
      titulo,
      descripcion,
      prioridad,
      estado,
      responsable,
    };

    const res = await taskUseCase.crearTarea(payload);
    if (res.ok) {
      mostrarToast("Tarea creada correctamente.", "exito");
      setModalAbierto(false);
      setTitulo("");
      setDescripcion("");
    }
  };

  const cambiarEstado = async (t: TareaCRM, nuevoEstado: string) => {
    const res = await taskUseCase.actualizarTarea(t.id, {
      ...t,
      estado: nuevoEstado,
    });
    if (res.ok) {
      mostrarToast("Estado de tarea actualizado.", "exito");
    }
  };

  const eliminarTarea = async (id: string) => {
    const res = await taskUseCase.eliminarTarea(id);
    if (res.ok) {
      mostrarToast("Tarea eliminada.", "exito");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-2">
        <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
          Roadmap y Tareas
        </h3>
        <Button onClick={() => setModalAbierto(true)}>Nueva Tarea</Button>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-4">
        {ESTADOS_TAREAS.map((colName) => {
          const enCol = tareas.filter((t) => t.estado === colName);
          return (
            <div
              key={colName}
              className="flex min-h-[300px] flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4"
            >
              <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-2">
                <span className="block font-mono text-[10px] font-extrabold tracking-wider text-zinc-300 uppercase">
                  {colName}
                </span>
                <span className="rounded border border-[#2A2A2E] bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-500">
                  {enCol.length}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {enCol.length === 0 ? (
                  <span className="py-4 text-center font-mono text-[10px] text-zinc-600 italic">
                    Sin tareas
                  </span>
                ) : (
                  enCol.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-zinc-200">
                          {t.titulo}
                        </span>
                        <button
                          onClick={() => eliminarTarea(t.id)}
                          className="font-mono text-[10px] font-bold text-red-400 hover:text-red-300"
                        >
                          ×
                        </button>
                      </div>
                      <p className="truncate text-[10px] leading-relaxed text-zinc-500">
                        {t.descripcion || "Sin descripción"}
                      </p>

                      <div className="mt-1 flex items-center justify-between border-t border-[#2A2A2E]/50 pt-2">
                        <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-400">
                          {t.prioridad}
                        </span>
                        <div className="flex gap-1.5">
                          {ESTADOS_TAREAS.filter((e) => e !== colName).map(
                            (e) => (
                              <button
                                key={e}
                                onClick={() => cambiarEstado(t, e)}
                                className="font-mono text-[9px] font-bold text-emerald-400 hover:underline"
                              >
                                {e.charAt(0)}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="animate-in zoom-in w-full max-w-md rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6 shadow-2xl duration-150">
            <div className="mb-5 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
              <h3 className="font-mono text-base font-extrabold tracking-tight text-white">
                Nueva Tarea del Proyecto
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="font-mono font-bold text-zinc-500 hover:text-zinc-300"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <Input
                label="Título de la tarea"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
              <Input
                label="Descripción corta"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
              <Select
                label="Prioridad"
                options={PRIORIDADES.map((p) => ({ value: p, label: p }))}
                value={prioridad}
                onChange={(val) => setPrioridad(val)}
              />
              <Select
                label="Estado inicial"
                options={ESTADOS_TAREAS.map((e) => ({
                  value: e,
                  label: e,
                }))}
                value={estado}
                onChange={(val) => setEstado(val)}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-[#2A2A2E] pt-4">
              <button
                onClick={() => setModalAbierto(false)}
                className="rounded-xl bg-zinc-800 px-4 py-2 font-mono text-xs font-bold text-zinc-100 hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <Button onClick={guardarTarea}>Crear Tarea</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
