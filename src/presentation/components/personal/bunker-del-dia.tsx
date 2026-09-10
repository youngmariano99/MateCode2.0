"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { GestionarBunkerUseCase } from "../../../application/use-cases/personal/gestionar-bunker.use-case";
import {
  obtenerDiaTareaHoy,
  sumarDias,
  MAX_TAREAS_ENFOQUE_POR_DIA,
  MAX_TAREAS_MANTENIMIENTO_POR_DIA,
  type TareaDiaria,
} from "../../../domain/entidades/personal.entity";

const useCase = new GestionarBunkerUseCase();
const SIN_TAREAS: never[] = [];

const FilaTarea: React.FC<{ tarea: TareaDiaria }> = ({ tarea }) => {
  const { mostrarToast } = useToast();

  const completar = async () => {
    const res = await useCase.completarTarea(tarea.id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const migrarAMañana = async () => {
    const res = await useCase.migrarTarea({
      id: tarea.id,
      nuevoDiaTarea: sumarDias(tarea.diaTarea, 1),
    });
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const cancelar = async () => {
    const res = await useCase.cancelarTarea(tarea.id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
      <span className="text-sm text-zinc-200">{tarea.descripcion}</span>
      <div className="flex shrink-0 gap-1.5">
        <button
          onClick={() => void completar()}
          title="Completar"
          className="rounded border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-emerald-400 hover:bg-emerald-500/20"
        >
          <Icono.Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => void migrarAMañana()}
          title="Migrar a mañana"
          className="rounded border border-sky-500/20 bg-sky-500/10 p-1.5 text-sky-400 hover:bg-sky-500/20"
        >
          <Icono.ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => void cancelar()}
          title="Cancelar (decisión estratégica, no fracaso)"
          className="rounded border border-zinc-800 p-1.5 text-zinc-500 hover:text-red-400"
        >
          <Icono.Close className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

const FormularioNuevaTarea: React.FC<{
  tipo: "enfoque" | "mantenimiento";
  diaTarea: string;
}> = ({ tipo, diaTarea }) => {
  const { mostrarToast } = useToast();
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    if (!descripcion.trim()) return;
    setGuardando(true);
    const res = await useCase.crearTareaDiaria({ diaTarea, tipo, descripcion });
    setGuardando(false);
    if (res.ok) {
      setDescripcion("");
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  return (
    <div className="flex gap-2">
      <input
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void crear();
        }}
        placeholder={
          tipo === "enfoque"
            ? "La única cosa de hoy..."
            : "Tarea de mantenimiento..."
        }
        className="flex-1 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/40"
      />
      <Button
        onClick={crear}
        cargando={guardando}
        disabled={!descripcion.trim()}
        variant="outline"
        icono={<Icono.Plus className="h-4 w-4" />}
      >
        Agregar
      </Button>
    </div>
  );
};

/**
 * Búnker del Enfoque: el compromiso del día — 1 tarea de enfoque profundo +
 * hasta 3 de mantenimiento. Se resuelven inline (completar/migrar/cancelar),
 * sin pantallas separadas ni rituales.
 */
export const BunkerDelDia: React.FC = () => {
  const diaTarea = obtenerDiaTareaHoy();

  const tareasHoy =
    useLiveQuery(
      () =>
        db.tarea_diaria
          .where({ diaTarea })
          .and((t) => t.estado === "pendiente")
          .toArray(),
      [diaTarea]
    ) || SIN_TAREAS;

  const enfoque = tareasHoy.filter((t) => t.tipo === "enfoque");
  const mantenimiento = tareasHoy.filter((t) => t.tipo === "mantenimiento");

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.Sunrise className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Búnker del Enfoque — Hoy
        </h3>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
          Enfoque profundo
        </span>
        {enfoque.map((t) => (
          <FilaTarea key={t.id} tarea={t} />
        ))}
        {enfoque.length < MAX_TAREAS_ENFOQUE_POR_DIA && (
          <FormularioNuevaTarea tipo="enfoque" diaTarea={diaTarea} />
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-[#2A2A2E] pt-3">
        <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
          Mantenimiento ({mantenimiento.length}/
          {MAX_TAREAS_MANTENIMIENTO_POR_DIA})
        </span>
        {mantenimiento.map((t) => (
          <FilaTarea key={t.id} tarea={t} />
        ))}
        {mantenimiento.length < MAX_TAREAS_MANTENIMIENTO_POR_DIA && (
          <FormularioNuevaTarea tipo="mantenimiento" diaTarea={diaTarea} />
        )}
      </div>
    </div>
  );
};
