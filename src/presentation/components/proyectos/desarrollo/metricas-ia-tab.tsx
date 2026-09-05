/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";

interface MetricasIATabProps {
  proyectoId: string;
  tareas: any[];
}

interface FilaMetrica {
  checkpointId: string;
  actividadId: string;
  titulo: string;
  rol: string;
  estado: string;
  minutos: number | null;
  tokensInput: number;
  tokensOutput: number;
  costoUsd: number;
  reintentos: number;
  prEstado?: string;
  prUrl?: string;
  ciEstado?: string;
  actualizadoEn: number;
}

const ETIQUETA_ESTADO_CORTA: Record<string, string> = {
  IDLE: "En cola",
  IN_PROGRESS_AI: "Desarrollando",
  QA_VALIDATING: "Verificando",
  QA_RETRYING: "Reintentando",
  BLOQUEADO_ACCION_CRITICA: "Bloqueado",
  PAUSED_CHECKPOINT: "Pausado",
  COMPLETED_HANDOFF: "Para revisar",
  VERIFICADO_HUMANO: "Verificado",
};

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatMin(n: number | null): string {
  if (n === null) return "—";
  if (n < 1) return "<1 min";
  return `${n.toFixed(1)} min`;
}

export const MetricasIATab: React.FC<MetricasIATabProps> = ({
  proyectoId,
  tareas,
}) => {
  const checkpointsQuery = useLiveQuery(
    () =>
      db.task_execution_checkpoints
        .where("proyectoId")
        .equals(proyectoId)
        .toArray(),
    [proyectoId]
  ) as any[] | undefined;
  const checkpoints = useMemo(() => checkpointsQuery || [], [checkpointsQuery]);

  const filas: FilaMetrica[] = useMemo(() => {
    return checkpoints
      .map((cp) => {
        const tarea = tareas.find((t) => t.id === cp.actividadId);
        const minutos =
          cp.tiempoInicio && cp.tiempoFin
            ? (cp.tiempoFin - cp.tiempoInicio) / 60000
            : null;
        return {
          checkpointId: cp.id,
          actividadId: cp.actividadId,
          titulo: tarea?.titulo || cp.actividadId,
          rol: tarea?.rol || "Sin rol",
          estado: cp.estadoCheckpoint,
          minutos,
          tokensInput: cp.tokensInput || 0,
          tokensOutput: cp.tokensOutput || 0,
          costoUsd: cp.costoUsd || 0,
          reintentos: cp.reintentosFallidos || 0,
          prEstado: cp.prEstado,
          prUrl: cp.prUrl,
          ciEstado: cp.ciEstado,
          actualizadoEn: cp.actualizadoEn || 0,
        };
      })
      .sort((a, b) => b.actualizadoEn - a.actualizadoEn);
  }, [checkpoints, tareas]);

  const totales = useMemo(() => {
    const terminados = filas.filter((f) => f.minutos !== null);
    const costoTotal = filas.reduce((acc, f) => acc + f.costoUsd, 0);
    const tokensTotal = filas.reduce(
      (acc, f) => acc + f.tokensInput + f.tokensOutput,
      0
    );
    const minutosTotal = terminados.reduce(
      (acc, f) => acc + (f.minutos || 0),
      0
    );
    const reintentosTotal = filas.reduce((acc, f) => acc + f.reintentos, 0);
    return {
      cantidad: filas.length,
      costoTotal,
      tokensTotal,
      minutosTotal,
      costoPromedio: terminados.length ? costoTotal / terminados.length : 0,
      minutosPromedio: terminados.length ? minutosTotal / terminados.length : 0,
      reintentosPromedio: filas.length ? reintentosTotal / filas.length : 0,
    };
  }, [filas]);

  const porRol = useMemo(() => {
    const grupos = new Map<
      string,
      { cantidad: number; costo: number; minutos: number; reintentos: number }
    >();
    for (const f of filas) {
      const g = grupos.get(f.rol) || {
        cantidad: 0,
        costo: 0,
        minutos: 0,
        reintentos: 0,
      };
      g.cantidad += 1;
      g.costo += f.costoUsd;
      g.minutos += f.minutos || 0;
      g.reintentos += f.reintentos;
      grupos.set(f.rol, g);
    }
    return Array.from(grupos.entries())
      .map(([rol, g]) => ({
        rol,
        cantidad: g.cantidad,
        costoPromedio: g.costo / g.cantidad,
        minutosPromedio: g.minutos / g.cantidad,
        reintentosPromedio: g.reintentos / g.cantidad,
      }))
      .sort((a, b) => b.costoPromedio - a.costoPromedio);
  }, [filas]);

  if (filas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-900/60 py-12 text-center font-mono text-[9px] text-zinc-600">
        Todavía no hay tickets automatizados con IA en este proyecto. Las
        métricas aparecen acá apenas el runner procese el primer checkpoint.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cards de totales */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
          <span className="block font-mono text-[7px] font-bold text-zinc-500 uppercase">
            Tickets con IA
          </span>
          <span className="block font-mono text-[16px] font-bold text-zinc-200">
            {totales.cantidad}
          </span>
        </div>
        <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
          <span className="block font-mono text-[7px] font-bold text-zinc-500 uppercase">
            Costo total
          </span>
          <span className="block font-mono text-[16px] font-bold text-emerald-400">
            {formatUsd(totales.costoTotal)}
          </span>
          <span className="block font-mono text-[7px] text-zinc-600">
            Prom: {formatUsd(totales.costoPromedio)}/ticket
          </span>
        </div>
        <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
          <span className="block font-mono text-[7px] font-bold text-zinc-500 uppercase">
            Tiempo total
          </span>
          <span className="block font-mono text-[16px] font-bold text-sky-400">
            {formatMin(totales.minutosTotal)}
          </span>
          <span className="block font-mono text-[7px] text-zinc-600">
            Prom: {formatMin(totales.minutosPromedio)}/ticket
          </span>
        </div>
        <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
          <span className="block font-mono text-[7px] font-bold text-zinc-500 uppercase">
            Reintentos promedio
          </span>
          <span
            className={`block font-mono text-[16px] font-bold ${
              totales.reintentosPromedio > 1
                ? "text-amber-400"
                : "text-zinc-200"
            }`}
          >
            {totales.reintentosPromedio.toFixed(1)}
          </span>
          <span className="block font-mono text-[7px] text-zinc-600">
            {totales.tokensTotal.toLocaleString()} tokens totales
          </span>
        </div>
      </div>

      {/* Costo/tiempo por rol — para detectar qué tipo de ticket sale más caro */}
      {porRol.length > 1 && (
        <div className="rounded-xl border border-zinc-900 bg-zinc-950/20 p-3">
          <span className="mb-2 block font-mono text-[9px] font-bold text-zinc-400 uppercase">
            Costo/tiempo promedio por rol
          </span>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[8px] text-zinc-300">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 uppercase">
                  <th className="py-1 text-left">Rol</th>
                  <th className="py-1 text-right">Tickets</th>
                  <th className="py-1 text-right">Costo prom.</th>
                  <th className="py-1 text-right">Tiempo prom.</th>
                  <th className="py-1 text-right">Reintentos prom.</th>
                </tr>
              </thead>
              <tbody>
                {porRol.map((g) => (
                  <tr key={g.rol} className="border-b border-zinc-900/50">
                    <td className="py-1">{g.rol}</td>
                    <td className="py-1 text-right">{g.cantidad}</td>
                    <td className="py-1 text-right text-emerald-400">
                      {formatUsd(g.costoPromedio)}
                    </td>
                    <td className="py-1 text-right text-sky-400">
                      {formatMin(g.minutosPromedio)}
                    </td>
                    <td
                      className={`py-1 text-right ${g.reintentosPromedio > 1 ? "text-amber-400" : ""}`}
                    >
                      {g.reintentosPromedio.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalle por ticket */}
      <div className="rounded-xl border border-zinc-900 bg-zinc-950/20 p-3">
        <span className="mb-2 block font-mono text-[9px] font-bold text-zinc-400 uppercase">
          Detalle por ticket
        </span>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[8px] text-zinc-300">
            <thead>
              <tr className="border-b border-zinc-900 text-zinc-500 uppercase">
                <th className="py-1 text-left">Ticket</th>
                <th className="py-1 text-left">Rol</th>
                <th className="py-1 text-left">Estado</th>
                <th className="py-1 text-right">Tiempo</th>
                <th className="py-1 text-right">Costo</th>
                <th className="py-1 text-right">Reint.</th>
                <th className="py-1 text-center">CI</th>
                <th className="py-1 text-center">PR</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr
                  key={f.checkpointId}
                  className="border-b border-zinc-900/50"
                >
                  <td className="max-w-[220px] truncate py-1" title={f.titulo}>
                    {f.titulo}
                  </td>
                  <td className="py-1 text-zinc-500">{f.rol}</td>
                  <td className="py-1">
                    {ETIQUETA_ESTADO_CORTA[f.estado] || f.estado}
                  </td>
                  <td className="py-1 text-right">{formatMin(f.minutos)}</td>
                  <td className="py-1 text-right text-emerald-400">
                    {formatUsd(f.costoUsd)}
                  </td>
                  <td
                    className={`py-1 text-right ${f.reintentos > 1 ? "text-amber-400" : ""}`}
                  >
                    {f.reintentos}
                  </td>
                  <td className="py-1 text-center">
                    {f.ciEstado === "paso"
                      ? "✓"
                      : f.ciEstado === "fallo"
                        ? "✗"
                        : "—"}
                  </td>
                  <td className="py-1 text-center">
                    {f.prUrl ? (
                      <a
                        href={f.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline"
                      >
                        Ver
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
