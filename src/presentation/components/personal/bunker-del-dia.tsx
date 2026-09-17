"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Icono } from "../icons";
import { Badge, type BadgeColor } from "../badge";
import { useToast } from "../../hooks/useToast";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import {
  MAX_TAREAS_ENFOQUE_POR_DIA,
  MAX_TAREAS_MANTENIMIENTO_POR_DIA,
  type Actividad,
  type EstadoActividad,
} from "../../../domain/entidades/actividad.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

const useCase = new GestionarActividadesUseCase();
const SIN_ACTIVIDADES: never[] = [];

const ETIQUETA_ESTADO_RESUELTO: Partial<Record<EstadoActividad, string>> = {
  completada: "Hecha",
  cancelada: "Cancelada",
  migrada: "Pasó a mañana",
  descartada: "Descartada",
};

const COLOR_ESTADO_RESUELTO: Partial<Record<EstadoActividad, BadgeColor>> = {
  completada: "emerald",
  cancelada: "zinc",
  migrada: "sky",
  descartada: "zinc",
};

/**
 * Input de avance parcial — solo aparece en Actividades cuantificables
 * (`cantidadObjetivo` declarado): "hice 1 de 2" es tan válido como "hice los
 * 2", y se puede seguir sumando (registrarAvance acumula, no reemplaza).
 */
const AvanceParcial: React.FC<{ actividad: Actividad }> = ({ actividad }) => {
  const { mostrarToast } = useToast();
  const [cantidad, setCantidad] = useState("");
  const [guardando, setGuardando] = useState(false);

  const agregar = async () => {
    const valor = Number(cantidad);
    if (!Number.isFinite(valor) || valor === 0) return;
    setGuardando(true);
    const res = await useCase.registrarAvance(actividad.id, valor);
    setGuardando(false);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
    else setCantidad("");
  };

  const progreso = actividad.progresoActual ?? 0;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-zinc-500">
        {progreso}/{actividad.cantidadObjetivo} {actividad.unidad || ""}
      </span>
      <input
        type="number"
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void agregar();
        }}
        placeholder="+cant."
        className="w-14 rounded border border-[#2A2A2E] bg-transparent px-1.5 py-0.5 text-[10px] text-zinc-200 placeholder-zinc-700 outline-none focus:border-emerald-500/40"
      />
      <button
        onClick={() => void agregar()}
        disabled={guardando || !cantidad}
        title="Agregar avance"
        className="rounded border border-emerald-500/20 bg-emerald-500/10 p-1 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40"
      >
        <Icono.Plus className="h-3 w-3" />
      </button>
    </div>
  );
};

/**
 * Tarea pendiente — 3 acciones con texto visible (no solo ícono, mismo
 * criterio que los botones de promoción en captura-inbox.tsx) para que no
 * haga falta adivinar qué hace cada una: "Hecha" la manda al final tachada,
 * "Mañana" la mueve al día siguiente, "Cancelar" la manda al final marcada
 * "Cancelada" — ninguna de las tres borra nada, todas quedan visibles abajo.
 */
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
    <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-zinc-200">{actividad.descripcion}</span>
        {actividad.cantidadObjetivo !== undefined && (
          <AvanceParcial actividad={actividad} />
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => void completar()}
          title="Marcar como hecha"
          className="flex min-h-11 items-center justify-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 text-[10px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
        >
          <Icono.Check className="h-3.5 w-3.5" />
          Hecha
        </button>
        <button
          onClick={() => void migrarAMañana()}
          title="Pasar a mañana"
          className="flex min-h-11 items-center justify-center gap-1 rounded border border-sky-500/20 bg-sky-500/10 px-3 text-[10px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
        >
          <Icono.ArrowRight className="h-3.5 w-3.5" />
          Mañana
        </button>
        <button
          onClick={() => void cancelar()}
          title="Cancelar — no se borra, queda marcada abajo (decisión estratégica, no fracaso)"
          className="flex min-h-11 items-center justify-center gap-1 rounded border border-zinc-800 px-3 text-[10px] font-bold text-zinc-500 uppercase hover:border-red-500/30 hover:text-red-400"
        >
          <Icono.Close className="h-3.5 w-3.5" />
          Cancelar
        </button>
      </div>
    </div>
  );
};

/** Tarea ya resuelta — tachada y al final del listado, con una etiqueta de qué pasó (nunca desaparece del día). */
const FilaResuelta: React.FC<{ actividad: Actividad }> = ({ actividad }) => (
  <div className="flex items-center justify-between gap-2 rounded-xl border border-[#2A2A2E]/60 bg-[#0D0D0F]/50 p-3">
    <span className="text-sm text-zinc-500 line-through">
      {actividad.descripcion}
    </span>
    <Badge color={COLOR_ESTADO_RESUELTO[actividad.estado] || "zinc"}>
      {ETIQUETA_ESTADO_RESUELTO[actividad.estado] || actividad.estado}
    </Badge>
  </div>
);

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
 * Lo resuelto no desaparece: baja a "Resueltas hoy", tachado y marcado con
 * qué pasó, para poder mirar atrás y confirmar que no se perdió nada.
 */
export const BunkerDelDia: React.FC = () => {
  const diaTarea = obtenerDiaTareaHoy();

  const actividadesHoy =
    useLiveQuery(
      () =>
        db.actividad
          .where({ diaTarea })
          .and((a) => a.tipo !== "backlog")
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

  const pendientesHoy = actividadesHoy.filter((a) => a.estado === "pendiente");
  const resueltasHoy = [...actividadesHoy]
    .filter((a) => a.estado !== "pendiente")
    .sort((a, b) => b.actualizadoEn - a.actualizadoEn);

  const enfoque = pendientesHoy.filter((a) => a.tipo === "enfoque");
  const mantenimiento = pendientesHoy.filter((a) => a.tipo === "mantenimiento");

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

      {resueltasHoy.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-[#2A2A2E] pt-3">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Resueltas hoy ({resueltasHoy.length})
          </span>
          {resueltasHoy.map((a) => (
            <FilaResuelta key={a.id} actividad={a} />
          ))}
        </div>
      )}

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
