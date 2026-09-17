"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Icono } from "../../icons";
import { Badge, type BadgeColor } from "../../badge";
import {
  calcularRitmoObjetivo,
  type EstadoRitmoObjetivo,
} from "../../../../domain/entidades/objetivo-cuantificable.entity";
import { obtenerDiaTareaHoy } from "../../../../domain/entidades/personal.entity";
import type { FasePersonal } from "../../../../domain/entidades/fase-personal.entity";

const SIN_FASES: FasePersonal[] = [];

const ETIQUETA_RITMO: Record<EstadoRitmoObjetivo, string> = {
  cumplido: "Cumplido",
  vencido: "Vencido",
  al_dia: "Al día",
  atrasado: "Atrasado",
  adelantado: "Adelantado",
};

const COLOR_RITMO: Record<EstadoRitmoObjetivo, BadgeColor> = {
  cumplido: "emerald",
  vencido: "red",
  al_dia: "sky",
  atrasado: "amber",
  adelantado: "emerald",
};

/**
 * Cuánto falta HOY para no quedar atrás de cada Fase abierta — reusa
 * calcularRitmoObjetivo (mismo cálculo que WidgetObjetivo) porque
 * FasePersonal tiene el mismo shape cantidadObjetivo/progresoActual/
 * diaInicio/diaLimite. Fases ya vencidas sin cerrar siguen apareciendo acá
 * (badge "Vencido") además del aviso en Planificación — ese resuelve el
 * cierre, esto solo informa el ritmo mientras se trabaja.
 */
export const FasesActivas: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();

  const fases =
    useLiveQuery(() =>
      db.fase_personal.where("estado").equals("abierta").toArray()
    ) || SIN_FASES;
  const entregablesPorId = useLiveQuery(async () => {
    const todos = await db.entregable.toArray();
    return new Map(todos.map((e) => [e.id, e.titulo]));
  });

  if (fases.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.Target className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Fases activas
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {fases.map((f) => {
          const ritmo = calcularRitmoObjetivo(f, hoy);
          return (
            <div
              key={f.id}
              className="flex flex-col gap-1 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-zinc-200">
                  {entregablesPorId?.get(f.entregableId) ?? "…"} — {f.titulo}
                </span>
                <Badge color={COLOR_RITMO[ritmo.estado]}>
                  {ETIQUETA_RITMO[ritmo.estado]}
                </Badge>
              </div>
              <span className="text-xs text-zinc-500">
                {f.progresoActual}/{f.cantidadObjetivo} {f.unidad}
                {ritmo.estado === "vencido" && " — la fecha límite ya pasó"}
                {ritmo.estado !== "cumplido" &&
                  ritmo.estado !== "vencido" &&
                  ` — necesitás ${ritmo.porDiaNecesario.toFixed(1)} ${f.unidad}/día para llegar`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
