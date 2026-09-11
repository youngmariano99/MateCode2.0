"use client";

import React from "react";

interface ModalCancelarSprintProps {
  isOpen: boolean;
  onClose: () => void;
  resetTasksOnCancel: boolean;
  setResetTasksOnCancel: (v: boolean) => void;
  onConfirm: () => void;
}

export const ModalCancelarSprint: React.FC<ModalCancelarSprintProps> = ({
  isOpen,
  onClose,
  resetTasksOnCancel,
  setResetTasksOnCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm duration-200">
      <div className="w-[450px] rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-mono shadow-2xl">
        <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
          <span className="text-[10px] font-bold text-red-400 uppercase">
            Cancelar Sprint Activo
          </span>
          <button
            onClick={onClose}
            className="hover:text-zinc-350 text-[9px] text-zinc-500 uppercase"
          >
            Cerrar
          </button>
        </div>
        <p className="mb-4 text-[9px] leading-relaxed text-zinc-400">
          Esta acción detendrá el desarrollo y devolverá el sprint al estado
          **&quot;Planificado&quot;**. Podrás iniciarlo de nuevo más tarde.
        </p>

        <div className="flex flex-col gap-3">
          <span className="block text-[8px] font-bold text-zinc-500 uppercase">
            ¿Qué hacer con las tareas del sprint?
          </span>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-900 bg-zinc-900/10 p-2.5 hover:border-zinc-800">
            <input
              type="radio"
              checked={resetTasksOnCancel}
              onChange={() => setResetTasksOnCancel(true)}
              className="mt-0.5 accent-emerald-500"
            />
            <div className="text-[9px]">
              <span className="block font-bold text-zinc-200">
                Reiniciar Progreso (Recomendado)
              </span>
              <span className="block text-[8px] leading-normal text-zinc-500">
                Restablece todas las actividades de este sprint al estado
                **&quot;Por Hacer&quot;** (todo).
              </span>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-900 bg-zinc-900/10 p-2.5 hover:border-zinc-800">
            <input
              type="radio"
              checked={!resetTasksOnCancel}
              onChange={() => setResetTasksOnCancel(false)}
              className="mt-0.5 accent-emerald-500"
            />
            <div className="text-[9px]">
              <span className="block font-bold text-zinc-200">
                Mantener Progreso
              </span>
              <span className="block text-[8px] leading-normal text-zinc-500">
                Conserva el estado actual de las actividades (ej: las que ya
                estaban completadas seguirán completadas).
              </span>
            </div>
          </label>

          <div className="mt-4 flex gap-2">
            <button
              onClick={onClose}
              className="text-zinc-450 flex-1 rounded border border-zinc-800 bg-zinc-900 py-2 text-center text-[9px] font-bold uppercase transition-all hover:text-zinc-200"
            >
              Volver atrás
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded bg-red-500 py-2 text-center text-[9px] font-bold text-zinc-100 uppercase transition-all hover:bg-red-600"
            >
              Sí, Cancelar Sprint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
