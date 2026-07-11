"use client";

import React from "react";
import { Card } from "../card";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { GestionarBacklogUseCase } from "../../../application/use-cases/proyecto/gestionar-backlog.use-case";
import { useToast } from "../../hooks/useToast";

interface KanbanBoardProps {
  proyectoId: string;
}

interface HistoriaCRM {
  id: string;
  sprintId?: string;
  titulo: string;
  prioridad: string;
  estimacion: number;
  estado: string;
}

const COLUMNAS = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "Por Hacer" },
  { key: "doing", label: "En Desarrollo" },
  { key: "review", label: "En Revisión" },
  { key: "testing", label: "Testing" },
  { key: "blocked", label: "Bloqueado" },
  { key: "done", label: "Finalizado" },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ proyectoId }) => {
  const { mostrarToast } = useToast();
  const backlogUC = new GestionarBacklogUseCase();

  const historias =
    ((useLiveQuery(() =>
      db.historias.where("proyectoId").equals(proyectoId).toArray()
    ) || []) as unknown as HistoriaCRM[]) || [];

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetEstado: string) => {
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;

    const res = await backlogUC.actualizarEstadoHistoria(id, targetEstado);
    if (res.ok) {
      mostrarToast(
        `Historia movida a ${
          COLUMNAS.find((c) => c.key === targetEstado)?.label
        }`,
        "info"
      );
    }
  };

  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-3">
        <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
          Tablero Kanban del Proyecto
        </h3>
        <p className="font-mono text-[10px] text-zinc-500">
          Arrastra y suelta las tarjetas para actualizar el estado del
          desarrollo
        </p>
      </div>

      <div className="flex min-h-[400px] items-start gap-3 overflow-x-auto pt-1 pb-4">
        {COLUMNAS.map((col) => {
          const historiasEnCol = historias.filter(
            (h) => h.estado === col.key || (!h.estado && col.key === "backlog")
          );
          return (
            <div
              key={col.key}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
              className="flex min-h-[360px] w-[260px] shrink-0 flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3.5"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                  {col.label}
                </span>
                <span className="rounded-full bg-zinc-900 px-2 py-0.5 font-mono text-[9px] font-bold text-zinc-500">
                  {historiasEnCol.length}
                </span>
              </div>

              <div className="flex max-h-[380px] flex-col gap-2.5 overflow-y-auto pr-0.5">
                {historiasEnCol.map((h) => (
                  <div
                    key={h.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, h.id)}
                    className="flex cursor-grab flex-col gap-2 rounded-xl border border-zinc-800 bg-[#18181B] p-3 shadow transition-all hover:border-zinc-700 active:cursor-grabbing"
                  >
                    <span className="block font-mono text-[11px] leading-relaxed font-bold text-zinc-200">
                      {h.titulo}
                    </span>

                    <div className="mt-1 flex items-center justify-between">
                      <span className="rounded border border-zinc-900 bg-zinc-950 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400">
                        {h.estimacion} pts
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
                          h.prioridad === "Alta"
                            ? "bg-red-500/10 text-red-400"
                            : h.prioridad === "Media"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-zinc-900 text-zinc-500"
                        }`}
                      >
                        {h.prioridad}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
