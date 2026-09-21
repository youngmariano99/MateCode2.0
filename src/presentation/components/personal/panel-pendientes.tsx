"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Select } from "../select";
import { Badge, type BadgeColor } from "../badge";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import { ArmarSemana } from "./armar-semana";
import {
  obtenerDiaTareaHoy,
  lunesDeLaSemana,
  PRIORIDADES_PENDIENTE,
  type PrioridadPendiente,
} from "../../../domain/entidades/personal.entity";
import type { Actividad } from "../../../domain/entidades/actividad.entity";

const useCase = new GestionarActividadesUseCase();
const SIN_PENDIENTES: never[] = [];

const ETIQUETA_PRIORIDAD: Record<PrioridadPendiente, string> = {
  urgente: "Urgente",
  importante: "Importante",
  puede_esperar: "Puede esperar",
};

const COLOR_PRIORIDAD: Record<PrioridadPendiente, BadgeColor> = {
  urgente: "red",
  importante: "amber",
  puede_esperar: "zinc",
};

const ORDEN_PRIORIDAD: PrioridadPendiente[] = [
  "urgente",
  "importante",
  "puede_esperar",
];

const FilaPendiente: React.FC<{ pendiente: Actividad }> = ({ pendiente }) => {
  const { mostrarToast } = useToast();

  const promover = async (tipo: "enfoque" | "mantenimiento") => {
    const res = await useCase.promoverAAgenda(
      pendiente.id,
      obtenerDiaTareaHoy(),
      tipo
    );
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const completar = async () => {
    const res = await useCase.completarActividad(pendiente.id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const descartar = async () => {
    const res = await useCase.descartarActividad(pendiente.id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-zinc-200">{pendiente.descripcion}</span>
        <Badge color={COLOR_PRIORIDAD[pendiente.prioridad || "importante"]}>
          {ETIQUETA_PRIORIDAD[pendiente.prioridad || "importante"]}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => void promover("enfoque")}
          className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
        >
          → Enfoque hoy
        </button>
        <button
          onClick={() => void promover("mantenimiento")}
          className="rounded border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
        >
          → Mantenimiento hoy
        </button>
        <button
          onClick={() => void completar()}
          className="rounded border border-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase hover:text-emerald-400"
        >
          Completar
        </button>
        <button
          onClick={() => void descartar()}
          className="rounded border border-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase hover:text-red-400"
        >
          Descartar
        </button>
      </div>
    </div>
  );
};

/**
 * Backlog de todo lo que sí o sí hay que hacer pero no entró en la agenda
 * de hoy — triage de 3 niveles, para no perderlo de vista sin saturar el
 * compromiso diario. Actividades de tipo "backlog" (ver Sprint 20).
 */
export const PanelPendientes: React.FC = () => {
  const { mostrarToast } = useToast();
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState<PrioridadPendiente>("importante");
  const [guardando, setGuardando] = useState(false);

  const hoy = obtenerDiaTareaHoy();
  const semanaActual = lunesDeLaSemana(hoy);

  const pendientes =
    useLiveQuery(() =>
      db.actividad
        .where("estado")
        .equals("pendiente")
        .and((a) => a.tipo === "backlog" && !a.esFaltante)
        .toArray()
    ) || SIN_PENDIENTES;

  const ordenar = (lista: Actividad[]) =>
    [...lista].sort(
      (a, b) =>
        ORDEN_PRIORIDAD.indexOf(a.prioridad || "importante") -
        ORDEN_PRIORIDAD.indexOf(b.prioridad || "importante")
    );
  const estaSemana = ordenar(
    pendientes.filter((p) => p.semanaId === semanaActual)
  );
  const backlogGeneral = ordenar(
    pendientes.filter((p) => p.semanaId !== semanaActual)
  );

  const crear = async () => {
    if (!descripcion.trim()) return;
    setGuardando(true);
    const res = await useCase.crearActividad({
      tipo: "backlog",
      descripcion,
      prioridad,
      area: "ambas",
    });
    setGuardando(false);
    if (res.ok) {
      setDescripcion("");
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ArmarSemana />

      <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
        <div className="flex items-center gap-2">
          <Icono.ListTodo className="h-4 w-4 text-zinc-500" />
          <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Pendientes
          </h3>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void crear();
            }}
            placeholder="Algo que hay que hacer, pero no ahora..."
            className="flex-1 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/40"
          />
          <Select
            value={prioridad}
            onChange={(v) => setPrioridad(v as PrioridadPendiente)}
            options={PRIORIDADES_PENDIENTE.map((p) => ({
              value: p,
              label: ETIQUETA_PRIORIDAD[p],
            }))}
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

        <div className="flex flex-col gap-2 border-t border-[#2A2A2E] pt-3">
          <span className="text-[10px] font-bold tracking-wider text-zinc-600 uppercase">
            Esta semana
          </span>
          {estaSemana.length === 0 && (
            <span className="text-xs text-zinc-600">
              Nada asignado a esta semana todavía.
            </span>
          )}
          {estaSemana.map((p) => (
            <FilaPendiente key={p.id} pendiente={p} />
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-[#2A2A2E] pt-3">
          <span className="text-[10px] font-bold tracking-wider text-zinc-600 uppercase">
            Backlog general ({backlogGeneral.length})
          </span>
          {backlogGeneral.length === 0 && (
            <span className="text-xs text-zinc-600">
              Sin pendientes — todo lo que hay que hacer está en la agenda de
              hoy o ya en esta semana.
            </span>
          )}
          {backlogGeneral.map((p) => (
            <FilaPendiente key={p.id} pendiente={p} />
          ))}
        </div>
      </div>
    </div>
  );
};
