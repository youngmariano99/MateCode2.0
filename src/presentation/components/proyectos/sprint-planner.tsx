"use client";

import React, { useState } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { Input } from "../input";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { GestionarBacklogUseCase } from "../../../application/use-cases/proyecto/gestionar-backlog.use-case";
import { useToast } from "../../hooks/useToast";

interface SprintPlannerProps {
  proyectoId: string;
}

interface SprintCRM {
  id: string;
  nombre: string;
  duracionSemanas: number;
  fechaInicio: number;
  fechaFin: number;
  objetivo: string;
  capacidad: number;
  estado: string;
}

interface HistoriaCRM {
  id: string;
  titulo: string;
  estimacion: number;
  estado: string;
}

export const SprintPlanner: React.FC<SprintPlannerProps> = ({ proyectoId }) => {
  const { mostrarToast } = useToast();
  const backlogUC = new GestionarBacklogUseCase();

  const [nombre, setNombre] = useState("");
  const [duracion, setDuracion] = useState(2);
  const [objetivo, setObjetivo] = useState("");
  const [capacidad, setCapacidad] = useState(20);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);

  const sprints =
    ((useLiveQuery(() =>
      db.sprints.where("proyectoId").equals(proyectoId).toArray()
    ) || []) as unknown as SprintCRM[]) || [];
  const backlogStories =
    ((useLiveQuery(() =>
      db.historias
        .where("proyectoId")
        .equals(proyectoId)
        .filter((h) => h.estado === "backlog" || !h.estado)
        .toArray()
    ) || []) as unknown as HistoriaCRM[]) || [];

  const handleCrearSprint = async () => {
    if (!nombre.trim()) {
      mostrarToast("El nombre del sprint es obligatorio.", "error");
      return;
    }
    if (seleccionadas.length === 0) {
      mostrarToast(
        "Debes seleccionar al menos una historia de usuario.",
        "error"
      );
      return;
    }

    const res = await backlogUC.planificarSprint(proyectoId, {
      nombre,
      duracionSemanas: duracion,
      objetivo,
      descripcion: objetivo,
      capacidad,
      miembros: ["Mariano"],
      historiasIds: seleccionadas,
    });

    if (res.ok) {
      mostrarToast("Sprint creado e iniciado con éxito.", "exito");
      setNombre("");
      setObjetivo("");
      setSeleccionadas([]);
      setMostrarForm(false);
    }
  };

  const handleFinalizarSprint = async (id: string) => {
    const res = await backlogUC.finalizarSprint(id);
    if (res.ok) {
      mostrarToast(
        "Sprint finalizado. Las historias pendientes volvieron al Backlog.",
        "exito"
      );
    }
  };

  const toggleHistoria = (id: string) => {
    if (seleccionadas.includes(id)) {
      setSeleccionadas(seleccionadas.filter((x) => x !== id));
    } else {
      setSeleccionadas([...seleccionadas, id]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2E] pb-3">
          <div>
            <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
              Sprint Planning
            </h3>
            <p className="font-mono text-[10px] text-zinc-500">
              Planifica iteraciones cortas moviendo historias del backlog
            </p>
          </div>
          <Button onClick={() => setMostrarForm(!mostrarForm)}>
            {mostrarForm ? "Cancelar" : "Nuevo Sprint"}
          </Button>
        </div>

        {mostrarForm && (
          <div className="mb-4 flex flex-col gap-4 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
            <Input
              label="Nombre del Sprint"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Sprint 1: MVP Core Checkout"
            />
            <Input
              label="Duración (Semanas)"
              type="number"
              value={duracion}
              onChange={(e) => setDuracion(Number(e.target.value))}
            />
            <Input
              label="Objetivo del Sprint"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Poder comprar un producto usando tarjeta..."
            />
            <Input
              label="Capacidad sugerida (Puntos)"
              type="number"
              value={capacidad}
              onChange={(e) => setCapacidad(Number(e.target.value))}
            />

            <span className="mt-2 block text-[10px] font-bold text-zinc-400">
              Seleccionar Historias del Backlog:
            </span>
            <div className="flex max-h-[140px] flex-col gap-1.5 overflow-y-auto pr-1">
              {backlogStories.map((h) => (
                <label
                  key={h.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#2A2A2E] bg-zinc-900 p-2"
                >
                  <input
                    type="checkbox"
                    checked={seleccionadas.includes(h.id)}
                    onChange={() => toggleHistoria(h.id)}
                    className="rounded border-[#2A2A2E] bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>
                    {h.titulo} ({h.estimacion} pts)
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <Button onClick={handleCrearSprint}>Iniciar Sprint</Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {sprints.length === 0 ? (
            <span className="font-mono text-[10px] text-zinc-500 italic">
              No hay sprints planificados.
            </span>
          ) : (
            sprints.map((sp) => (
              <div
                key={sp.id}
                className="flex items-center justify-between rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4 font-mono text-xs"
              >
                <div>
                  <span className="block font-bold text-zinc-200">
                    {sp.nombre}
                  </span>
                  <span className="mt-1 block text-[10px] text-zinc-500">
                    Meta: {sp.objetivo} • Capacidad: {sp.capacidad} pts
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[9px] font-bold ${
                      sp.estado === "activo"
                        ? "animate-pulse border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {sp.estado.toUpperCase()}
                  </span>
                  {sp.estado === "activo" && (
                    <button
                      onClick={() => handleFinalizarSprint(sp.id)}
                      className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-500/20"
                    >
                      Finalizar Sprint
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
