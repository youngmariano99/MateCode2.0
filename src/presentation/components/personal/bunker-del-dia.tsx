"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import {
  MAX_TAREAS_ENFOQUE_POR_DIA,
  MAX_TAREAS_MANTENIMIENTO_POR_DIA,
  type Actividad,
} from "../../../domain/entidades/actividad.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

const useCase = new GestionarActividadesUseCase();
const SIN_ACTIVIDADES: never[] = [];

const FilaActividad: React.FC<{ actividad: Actividad }> = ({ actividad }) => {
  const { mostrarToast } = useToast();

  const completar = async () => {
    const res = await useCase.completarActividad(actividad.id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const migrarAMañana = async () => {
    const res = await useCase.migrarActividad({
      id: actividad.id,
      nuevoDiaTarea: sumarDias(actividad.diaTarea!, 1),
    });
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const cancelar = async () => {
    const res = await useCase.cancelarActividad(actividad.id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
      <span className="text-sm text-zinc-200">{actividad.descripcion}</span>
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

const FormularioNuevaActividad: React.FC<{
  tipo: "enfoque" | "mantenimiento";
  diaTarea: string;
}> = ({ tipo, diaTarea }) => {
  const { mostrarToast } = useToast();
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    if (!descripcion.trim()) return;
    setGuardando(true);
    const res = await useCase.crearActividad({ diaTarea, tipo, descripcion });
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
 * Agenda de hoy: el compromiso del día — recomendado 1 actividad de enfoque
 * profundo + hasta 3 de mantenimiento, pero sin tope duro (ver Sprint 20:
 * MAX_TAREAS_* son solo una cantidad recomendada, el formulario para seguir
 * agregando sigue disponible aunque ya se llegó a esa cantidad). Se resuelven
 * inline (completar/migrar/cancelar), sin pantallas separadas ni rituales, y
 * sin objetivos mezclados acá — eso vive en la vista jerárquica (tab "Mes").
 */
export const BunkerDelDia: React.FC = () => {
  const diaTarea = obtenerDiaTareaHoy();

  const actividadesHoy =
    useLiveQuery(
      () =>
        db.actividad
          .where({ diaTarea })
          .and((a) => a.estado === "pendiente" && a.tipo !== "backlog")
          .toArray(),
      [diaTarea]
    ) || SIN_ACTIVIDADES;

  const proximasActividades =
    useLiveQuery(
      () =>
        db.actividad
          .where("diaTarea")
          .above(diaTarea)
          .and((a) => a.estado === "pendiente" && a.tipo !== "backlog")
          .sortBy("diaTarea"),
      [diaTarea]
    ) || SIN_ACTIVIDADES;

  const enfoque = actividadesHoy.filter((a) => a.tipo === "enfoque");
  const mantenimiento = actividadesHoy.filter(
    (a) => a.tipo === "mantenimiento"
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.Sunrise className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Agenda de hoy
        </h3>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
          Enfoque profundo{" "}
          {enfoque.length > MAX_TAREAS_ENFOQUE_POR_DIA && (
            <span className="text-zinc-600">
              ({enfoque.length}, recomendado {MAX_TAREAS_ENFOQUE_POR_DIA})
            </span>
          )}
        </span>
        {enfoque.map((a) => (
          <FilaActividad key={a.id} actividad={a} />
        ))}
        <FormularioNuevaActividad tipo="enfoque" diaTarea={diaTarea} />
      </div>

      <div className="flex flex-col gap-2 border-t border-[#2A2A2E] pt-3">
        <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
          Mantenimiento ({mantenimiento.length}/
          {MAX_TAREAS_MANTENIMIENTO_POR_DIA} recomendado)
        </span>
        {mantenimiento.map((a) => (
          <FilaActividad key={a.id} actividad={a} />
        ))}
        <FormularioNuevaActividad tipo="mantenimiento" diaTarea={diaTarea} />
      </div>

      {proximasActividades.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[#2A2A2E] pt-3">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Próximas actividades
          </span>
          {proximasActividades.map((a) => (
            <div key={a.id} className="flex flex-col gap-1">
              <span className="text-[10px] text-zinc-600">{a.diaTarea}</span>
              <FilaActividad actividad={a} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
