"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { GestionarEntregablesUseCase } from "../../../application/use-cases/personal/gestionar-entregables.use-case";
import {
  metasDelPeriodo,
  type MetaPeriodo,
} from "../../../domain/entidades/metas-periodo.entity";
import { useColorPorObjetivo, formatoDiaCorto } from "./calendario-utils";

const entregablesUseCase = new GestionarEntregablesUseCase();
const SIN_ITEMS: never[] = [];

const TarjetaMeta: React.FC<{ meta: MetaPeriodo; color: string }> = ({
  meta,
  color,
}) => {
  const { mostrarToast } = useToast();
  const [cantidad, setCantidad] = useState("");
  const [guardando, setGuardando] = useState(false);

  const entregableId = meta.tipo === "entregable" ? meta.id : undefined;
  // Una Fase anota el avance contra su Entregable (la fecha decide en qué Fase cae).
  const fase = useLiveQuery(
    () => (meta.tipo === "fase" ? db.fase_personal.get(meta.id) : undefined),
    [meta.id, meta.tipo]
  );
  const destino = entregableId ?? fase?.entregableId;

  const porcentaje = Math.min((meta.progreso / meta.meta) * 100, 100);
  const logroMinimo = meta.minimo !== undefined && meta.progreso >= meta.minimo;
  const marcaMinimo =
    meta.minimo !== undefined
      ? Math.min((meta.minimo / meta.meta) * 100, 100)
      : undefined;

  const anotar = async (n: number) => {
    if (!destino) return;
    setGuardando(true);
    const res = await entregablesUseCase.anotarAvance(destino, n);
    setGuardando(false);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
    else setCantidad("");
  };

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border-l-2 bg-[#0D0D0F] p-3"
      style={{ borderLeftColor: color }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-xs font-bold text-zinc-200">
            {meta.contexto ? `${meta.contexto} · ` : ""}
            {meta.titulo}
          </span>
          <span className="text-[10px] text-zinc-600">
            {meta.tipo === "fase" ? "Fase" : "Entregable"} ·{" "}
            {formatoDiaCorto(meta.diaInicio)} →{" "}
            {formatoDiaCorto(meta.diaLimite)}
            {meta.cuotaSemanal !== undefined &&
              ` · ${meta.cuotaSemanal} ${meta.unidad ?? ""} por semana`}
          </span>
        </div>
        <span className="text-xs font-bold text-zinc-300">
          {meta.progreso}/{meta.meta} {meta.unidad}
        </span>
      </div>

      <div className="relative h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full"
          style={{
            width: `${porcentaje}%`,
            backgroundColor: logroMinimo ? "#38BDF8" : color,
          }}
        />
        {marcaMinimo !== undefined && (
          <span
            className="absolute top-0 h-full w-0.5 bg-sky-300"
            style={{ left: `${marcaMinimo}%` }}
            title={`Mínimo: ${meta.minimo}`}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] text-zinc-500">
          {meta.minimo !== undefined ? (
            logroMinimo ? (
              <span className="text-sky-400">
                Mínimo cumplido ({meta.minimo})
              </span>
            ) : (
              <>Mínimo: {meta.minimo}</>
            )
          ) : (
            "Sin mínimo definido"
          )}
        </span>
        {!meta.tieneActividadesDiarias && destino && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => void anotar(1)}
              disabled={guardando}
              className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40"
            >
              +1 hecho
            </button>
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="+cant."
              className="w-14 rounded border border-[#2A2A2E] bg-transparent px-1.5 py-0.5 text-[10px] text-zinc-200 placeholder-zinc-700 outline-none focus:border-emerald-500/40"
            />
            <button
              onClick={() => void anotar(Number(cantidad))}
              disabled={guardando || !cantidad}
              title="Anotar avance"
              className="rounded border border-emerald-500/20 bg-emerald-500/10 p-1 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40"
            >
              <Icono.Plus className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Lo que hay que cumplir en el período (semana o mes): Fases y Entregables
 * con meta, con lo logrado, el mínimo y — si la meta es de más de una semana —
 * cuánto toca por semana. Sirve para saber cómo se va aunque no haya
 * actividades diarias; en esos casos se anota lo hecho con "+1".
 */
export const PanelMetasPeriodo: React.FC<{
  desde: string;
  hasta: string;
  titulo?: string;
}> = ({ desde, hasta, titulo = "Metas del período" }) => {
  const colorPorObjetivo = useColorPorObjetivo();

  const metas =
    useLiveQuery(async () => {
      const [entregables, fases, actividades] = await Promise.all([
        db.entregable.toArray(),
        db.fase_personal.toArray(),
        db.actividad
          .where("diaTarea")
          .between(desde, hasta, true, true)
          .toArray(),
      ]);
      // Para "tiene actividades diarias" se miran las del rango de cada meta, no solo las del período.
      const rangos = fases.map((f) => [f.diaInicio, f.diaLimite] as const);
      const extra = await Promise.all(
        rangos.map(([i, f]) =>
          db.actividad.where("diaTarea").between(i, f, true, true).toArray()
        )
      );
      const todas = new Map(actividades.map((a) => [a.id, a]));
      extra.flat().forEach((a) => todas.set(a.id, a));
      return metasDelPeriodo(
        entregables,
        fases,
        [...todas.values()],
        desde,
        hasta
      );
    }, [desde, hasta]) || SIN_ITEMS;

  if (metas.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
        {titulo}
      </h3>
      {metas.map((m) => (
        <TarjetaMeta
          key={`${m.tipo}-${m.id}`}
          meta={m}
          color={colorPorObjetivo(m.objetivoId)}
        />
      ))}
    </div>
  );
};
