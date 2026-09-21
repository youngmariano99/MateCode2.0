"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { useToast } from "../../hooks/useToast";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import type { Actividad } from "../../../domain/entidades/actividad.entity";

const useCase = new GestionarActividadesUseCase();

/** Proyectos del módulo Proyectos en los que tiene sentido trabajar (no los cerrados ni cancelados). */
export function useProyectosDeTrabajo() {
  return (
    useLiveQuery(async () => {
      const todos = await db.proyectos.toArray();
      return todos
        .map((p) => ({
          id: p.id as string,
          nombre:
            (typeof p.nombre === "string" && p.nombre) || "Proyecto sin nombre",
          estado: typeof p.estado === "string" ? p.estado.toLowerCase() : "",
        }))
        .filter(
          (p) => !p.estado.includes("complet") && !p.estado.includes("cancel")
        );
    }, []) ?? []
  );
}

/**
 * Detalle de una actividad genérica (ej. "Desarrollo"): qué voy a hacer / qué
 * hice, y en qué proyecto. Se ve debajo del título y se edita con un toque,
 * antes de hacerla, al completarla o después. Lo que se anota queda ligado
 * al proyecto junto con el tiempo del cronómetro.
 */
export const DetalleActividad: React.FC<{ actividad: Actividad }> = ({
  actividad,
}) => {
  const { mostrarToast } = useToast();
  const proyectos = useProyectosDeTrabajo();
  const [editando, setEditando] = useState(false);
  const [nota, setNota] = useState(actividad.nota ?? "");
  const [proyectoId, setProyectoId] = useState(
    actividad.proyectoTrabajoId ?? ""
  );
  const [guardando, setGuardando] = useState(false);

  const proyecto = proyectos.find((p) => p.id === actividad.proyectoTrabajoId);

  const abrir = () => {
    setNota(actividad.nota ?? "");
    setProyectoId(actividad.proyectoTrabajoId ?? "");
    setEditando(true);
  };

  const guardar = async () => {
    setGuardando(true);
    const res = await useCase.editarDetalle(actividad.id, {
      nota,
      proyectoTrabajoId: proyectoId || null,
    });
    setGuardando(false);
    if (res.ok) setEditando(false);
    else mostrarToast(res.error!.mensaje, "error");
  };

  if (editando) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-[#2A2A2E] bg-[#111113] p-2">
        <select
          value={proyectoId}
          onChange={(e) => setProyectoId(e.target.value)}
          className="rounded border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/40"
        >
          <option value="">Sin proyecto</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
          placeholder="Qué voy a hacer / qué hice"
          className="rounded border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/40"
        />
        <div className="flex gap-2">
          <button
            onClick={() => void guardar()}
            disabled={guardando}
            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20 disabled:opacity-40"
          >
            Guardar
          </button>
          <button
            onClick={() => setEditando(false)}
            className="px-2 text-[10px] font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {proyecto && (
        <span className="rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">
          {proyecto.nombre}
        </span>
      )}
      {actividad.nota && (
        <span className="text-xs text-zinc-400 italic">{actividad.nota}</span>
      )}
      <button
        onClick={abrir}
        className="text-[10px] font-bold text-zinc-600 uppercase hover:text-zinc-300"
      >
        {actividad.nota || actividad.proyectoTrabajoId
          ? "Editar detalle"
          : "+ Detalle"}
      </button>
    </div>
  );
};
