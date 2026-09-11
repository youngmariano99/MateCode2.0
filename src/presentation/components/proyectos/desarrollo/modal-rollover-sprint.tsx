/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";

interface ModalRolloverSprintProps {
  isOpen: boolean;
  onClose: () => void;
  rolloverTargetSprintId: string;
  setRolloverTargetSprintId: (v: string) => void;
  sprints: any[];
  selectedSprintId: string;
  onConfirm: () => void;
}

export const ModalRolloverSprint: React.FC<ModalRolloverSprintProps> = ({
  isOpen,
  onClose,
  rolloverTargetSprintId,
  setRolloverTargetSprintId,
  sprints,
  selectedSprintId,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm duration-200">
      <div className="w-[480px] rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-mono shadow-2xl">
        <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
          <span className="text-[10px] font-bold text-red-400 uppercase">
            Finalizar Sprint con Tareas Pendientes
          </span>
          <button
            onClick={onClose}
            className="hover:text-zinc-350 text-[9px] text-zinc-500 uppercase"
          >
            Cancelar
          </button>
        </div>
        <p className="mb-3 text-[9px] leading-relaxed text-zinc-400">
          Detectamos actividades no completadas en este sprint. Para poder
          cerrar el sprint, debes reprogramar las Historias de Usuario con
          tareas pendientes a otro sprint (o al Backlog general):
        </p>
        <div className="flex flex-col gap-3">
          <select
            value={rolloverTargetSprintId}
            onChange={(e) => setRolloverTargetSprintId(e.target.value)}
            className="w-full rounded border border-zinc-900 bg-zinc-900 p-2 text-[9px] text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="backlog">(Enviar al Backlog - Sin Sprint)</option>
            {sprints
              .filter(
                (s) => s.id !== selectedSprintId && s.estado !== "completado"
              )
              .map((s) => (
                <option key={s.id} value={s.id}>
                  Reprogramar a: {s.nombre} (
                  {s.estado === "planificado" ? "En Planificación" : "Activo"})
                </option>
              ))}
          </select>

          <button
            onClick={onConfirm}
            className="hover:bg-red-650 w-full rounded bg-red-500 py-2 text-center text-[10px] font-bold text-zinc-100 uppercase transition-all"
          >
            Confirmar y Finalizar Sprint
          </button>
        </div>
      </div>
    </div>
  );
};
