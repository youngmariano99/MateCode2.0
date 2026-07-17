"use client";

import React from "react";
import { Card } from "../card";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { useToast } from "../../hooks/useToast";

interface KanbanBoardProps {
  proyectoId: string;
}

interface SprintCRM {
  id: string;
  proyectoId: string;
  nombre: string;
  estado: string;
}

interface HistoriaCRM {
  id: string;
  sprintId?: string;
  titulo: string;
  prioridad: string;
  estimacion: number;
  estado: string;
}

interface Tarea {
  id: string;
  proyectoId: string;
  historiaId: string;
  titulo: string;
  estado: string; // "todo" | "doing" | "review" | "testing" | "blocked" | "done"
}

const COLUMNAS = [
  { key: "todo", label: "Por Hacer" },
  { key: "doing", label: "En Desarrollo" },
  { key: "review", label: "En Revisión" },
  { key: "testing", label: "Testing" },
  { key: "blocked", label: "Bloqueado" },
  { key: "done", label: "Finalizado" },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ proyectoId }) => {
  const { mostrarToast } = useToast();

  // Reactive DB queries
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

  const activeSprint = sprints.find((s) => s.estado === "activo");
  const historiasSprintIds = activeSprint
    ? historias.filter((h) => h.sprintId === activeSprint.id).map((h) => h.id)
    : [];

  // Filter tasks that belong to stories in the active sprint
  const actividadesActivas = tareas.filter(
    (t) => t.historiaId && historiasSprintIds.includes(t.historiaId)
  );

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetEstado: string) => {
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;

    try {
      await db.tareas.update(id, { estado: targetEstado });
      mostrarToast(
        `Actividad movida a ${
          COLUMNAS.find((c) => c.key === targetEstado)?.label
        }`,
        "info"
      );
    } catch {
      mostrarToast("Error al mover la actividad.", "error");
    }
  };

  if (!activeSprint) {
    return (
      <Card>
        <div className="mb-4 border-b border-[#2A2A2E] pb-3">
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Ejecución del Proyecto
          </h3>
          <p className="font-mono text-[10px] text-zinc-500">
            Tablero Kanban de Tareas Técnicas
          </p>
        </div>
        <div className="border-zinc-850 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-12 text-center">
          <span className="text-zinc-650 font-mono text-xs italic">
            No hay ningún sprint activo en este momento.
          </span>
          <p className="text-zinc-550 max-w-sm font-mono text-[10px] leading-relaxed">
            Ve a la pestaña de <b>Planificación de Sprints</b>, planifica
            historias del backlog y presiona &quot;Iniciar Sprint&quot; para ver
            y gestionar las tareas técnicas en este tablero.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex flex-col justify-between gap-3 border-b border-[#2A2A2E] pb-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-emerald-400 uppercase">
            🚀 Kanban: {activeSprint.nombre}
          </h3>
          <p className="font-mono text-[10px] text-zinc-500">
            Arrastra y suelta las tareas técnicas para actualizar el estado del
            desarrollo
          </p>
        </div>
        <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
          {actividadesActivas.length} Tareas Activas
        </span>
      </div>

      <div className="flex min-h-[420px] items-start gap-3 overflow-x-auto pt-1 pb-4">
        {COLUMNAS.map((col) => {
          const actividadesEnCol = actividadesActivas.filter(
            (t) => t.estado === col.key || (!t.estado && col.key === "todo")
          );

          return (
            <div
              key={col.key}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
              className="flex min-h-[380px] w-[260px] shrink-0 flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3.5"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                  {col.label}
                </span>
                <span className="rounded-full bg-zinc-900 px-2 py-0.5 font-mono text-[9px] font-bold text-zinc-500">
                  {actividadesEnCol.length}
                </span>
              </div>

              <div className="flex max-h-[400px] flex-col gap-2.5 overflow-y-auto pr-0.5">
                {actividadesEnCol.map((t) => {
                  const parentStory = historias.find(
                    (h) => h.id === t.historiaId
                  );

                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      className="flex cursor-grab flex-col gap-2 rounded-xl border border-zinc-900 bg-[#141416] p-3 shadow-md transition-all hover:border-zinc-700 hover:bg-zinc-950/40 active:cursor-grabbing"
                    >
                      <span className="block font-mono text-[11px] leading-relaxed font-bold text-zinc-200">
                        {t.titulo}
                      </span>
                      {parentStory && (
                        <span className="mt-0.5 block truncate border-t border-zinc-900/60 pt-1.5 font-mono text-[9px] text-zinc-500">
                          📖 {parentStory.titulo}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
