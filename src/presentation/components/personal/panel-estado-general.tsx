"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { Badge, type BadgeColor } from "../badge";
import {
  calcularRitmoObjetivo,
  type EstadoRitmoObjetivo,
} from "../../../domain/entidades/objetivo-cuantificable.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

const SIN_OBJETIVOS: never[] = [];
const SIN_HABITOS: never[] = [];
const SIN_REGISTROS: never[] = [];

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
 * Radar de una sola pantalla: objetivos con su ritmo real + salud de
 * hábitos/compromisos (último registro), filtrable por área — para saber
 * "en qué tengo que avanzar" sin ir módulo por módulo. Todo lectura de lo
 * que ya calculan `calcularRitmoObjetivo`/`habito_registro`, sin tablas
 * nuevas.
 */
export const PanelEstadoGeneral: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const [filtroArea, setFiltroArea] = useState<string | null>(null);

  const objetivos =
    useLiveQuery(() =>
      db.objetivo_cuantificable
        .where("estado")
        .anyOf(["activo", "vencido"])
        .toArray()
    ) || SIN_OBJETIVOS;

  const habitos =
    useLiveQuery(() => db.habito_definicion.toArray()) || SIN_HABITOS;
  const habitosActivos = habitos.filter((h) => h.activo);

  const registrosRecientes =
    useLiveQuery(() =>
      db.habito_registro
        .where("diaTarea")
        .aboveOrEqual(sumarDias(hoy, -30))
        .toArray()
    ) || SIN_REGISTROS;

  const areasDisponibles = Array.from(
    new Set(
      [
        ...objetivos.map((o) => o.etiquetaArea),
        ...habitosActivos.map((h) => h.etiquetaArea),
      ].filter((a): a is string => !!a)
    )
  );

  const objetivosFiltrados = filtroArea
    ? objetivos.filter((o) => o.etiquetaArea === filtroArea)
    : objetivos;
  const habitosFiltrados = filtroArea
    ? habitosActivos.filter((h) => h.etiquetaArea === filtroArea)
    : habitosActivos;

  const ultimoRegistroDe = (habitoId: string): string | null => {
    const registros = registrosRecientes
      .filter((r) => r.habitoId === habitoId)
      .sort((a, b) => (a.diaTarea < b.diaTarea ? 1 : -1));
    return registros[0]?.diaTarea ?? null;
  };

  if (objetivos.length === 0 && habitosActivos.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.Activity className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Estado general
        </h3>
      </div>

      {areasDisponibles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFiltroArea(null)}
            className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase transition-all ${
              !filtroArea
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-[#2A2A2E] text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Todas
          </button>
          {areasDisponibles.map((area) => (
            <button
              key={area}
              onClick={() => setFiltroArea(area)}
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase transition-all ${
                filtroArea === area
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-[#2A2A2E] text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      )}

      {objetivosFiltrados.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-zinc-600 uppercase">
            Objetivos
          </span>
          {objetivosFiltrados.map((o) => {
            const ritmo = calcularRitmoObjetivo(o, hoy);
            return (
              <div
                key={o.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2.5"
              >
                <span className="truncate text-sm text-zinc-200">
                  {o.titulo}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[10px] text-zinc-500">
                    {o.progresoActual}/{o.cantidadObjetivo} {o.unidad}
                  </span>
                  <Badge color={COLOR_RITMO[ritmo.estado]}>
                    {ETIQUETA_RITMO[ritmo.estado]}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {habitosFiltrados.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-[#2A2A2E] pt-3">
          <span className="text-[10px] font-bold tracking-wider text-zinc-600 uppercase">
            Compromisos
          </span>
          {habitosFiltrados.map((h) => {
            const ultimo = ultimoRegistroDe(h.id);
            const alDia = ultimo === hoy || ultimo === sumarDias(hoy, -1);
            return (
              <div
                key={h.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2.5"
              >
                <span className="truncate text-sm text-zinc-200">
                  {h.nombre}
                </span>
                <span
                  className={`shrink-0 text-[10px] ${alDia ? "text-emerald-400" : "text-amber-400"}`}
                >
                  {ultimo
                    ? `Último: ${ultimo === hoy ? "hoy" : ultimo === sumarDias(hoy, -1) ? "ayer" : ultimo}`
                    : "Sin registros recientes"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
