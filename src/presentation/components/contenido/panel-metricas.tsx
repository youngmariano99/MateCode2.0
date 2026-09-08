"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Select } from "../select";
import { Badge } from "../badge";

const SIN_CONTENIDOS: never[] = [];
const SIN_KPIS: never[] = [];

type Periodo = "semana" | "mes" | "trimestre" | "anio";

function inicioDePeriodo(periodo: Periodo): number {
  const d = new Date();
  if (periodo === "semana") {
    const dia = (d.getDay() + 6) % 7; // lunes = 0
    d.setDate(d.getDate() - dia);
  } else if (periodo === "mes") {
    d.setDate(1);
  } else if (periodo === "trimestre") {
    d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
  } else {
    d.setMonth(0, 1);
  }
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Estación 6: trazabilidad — cantidad por tipo/canal + KPIs reales vs. meta, filtrable por período. */
export const PanelMetricas: React.FC = () => {
  const [periodo, setPeriodo] = useState<Periodo>("semana");

  const contenidos =
    useLiveQuery(() => db.contenido.toArray()) || SIN_CONTENIDOS;
  const kpis =
    useLiveQuery(() => db.catalogo_kpi_contenido.toArray()) || SIN_KPIS;

  const publicadosEnPeriodo = useMemo(() => {
    const desde = inicioDePeriodo(periodo);
    return contenidos.filter(
      (c) =>
        c.estado === "Publicado" &&
        c.fechaPublicacion &&
        c.fechaPublicacion >= desde
    );
  }, [contenidos, periodo]);

  const porTipo = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const c of publicadosEnPeriodo)
      mapa.set(c.tipoContenido, (mapa.get(c.tipoContenido) || 0) + 1);
    return Array.from(mapa.entries());
  }, [publicadosEnPeriodo]);

  const porCanal = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const c of publicadosEnPeriodo) {
      for (const canal of c.canales)
        mapa.set(canal, (mapa.get(canal) || 0) + 1);
    }
    return Array.from(mapa.entries());
  }, [publicadosEnPeriodo]);

  const promedioKpi = (kpiId: string): number | null => {
    const valores = publicadosEnPeriodo
      .map((c) => c.metricas[kpiId])
      .filter((v): v is number => typeof v === "number");
    if (valores.length === 0) return null;
    return valores.reduce((a, b) => a + b, 0) / valores.length;
  };

  return (
    <div className="flex flex-col gap-4">
      <Select
        label="Período"
        value={periodo}
        onChange={(v) => setPeriodo(v as Periodo)}
        options={[
          { value: "semana", label: "Esta semana" },
          { value: "mes", label: "Este mes" },
          { value: "trimestre", label: "Este trimestre" },
          { value: "anio", label: "Este año" },
        ]}
        className="max-w-xs"
      />

      <div className="rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
        <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Publicados en el período
        </span>
        <span className="mt-1 block text-2xl font-bold text-emerald-400">
          {publicadosEnPeriodo.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
          <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Por tipo
          </span>
          {porTipo.map(([tipo, cant]) => (
            <div key={tipo} className="flex items-center justify-between">
              <Badge color="sky">{tipo}</Badge>
              <span className="text-sm font-bold text-zinc-200">{cant}</span>
            </div>
          ))}
          {porTipo.length === 0 && (
            <span className="text-sm text-zinc-600">Sin datos.</span>
          )}
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
          <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Por canal
          </span>
          {porCanal.map(([canal, cant]) => (
            <div key={canal} className="flex items-center justify-between">
              <Badge color="violet">{canal}</Badge>
              <span className="text-sm font-bold text-zinc-200">{cant}</span>
            </div>
          ))}
          {porCanal.length === 0 && (
            <span className="text-sm text-zinc-600">Sin datos.</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
        <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          KPIs vs. meta
        </span>
        {kpis.map((kpi) => {
          const promedio = promedioKpi(kpi.id);
          const cumple =
            promedio !== null && kpi.meta !== undefined
              ? promedio >= kpi.meta
              : null;
          return (
            <div
              key={kpi.id}
              className="flex items-center justify-between border-b border-[#2A2A2E]/50 pb-2"
            >
              <div className="flex flex-col">
                <span className="text-sm text-zinc-200">{kpi.nombre}</span>
                {kpi.meta !== undefined && (
                  <span className="text-xs text-zinc-500">
                    Meta: {kpi.meta}
                    {kpi.unidad || ""}
                  </span>
                )}
              </div>
              <span
                className={`text-sm font-bold ${
                  cumple === null
                    ? "text-zinc-500"
                    : cumple
                      ? "text-emerald-400"
                      : "text-red-400"
                }`}
              >
                {promedio !== null
                  ? `${promedio.toFixed(1)}${kpi.unidad || ""}`
                  : "Sin datos"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
