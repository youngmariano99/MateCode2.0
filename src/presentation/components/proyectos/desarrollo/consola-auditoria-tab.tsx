/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { Card } from "../../card";

interface ConsolaAuditoriaTabProps {
  ticketExecutions: any[];
  descargarContextoCompleto: () => void;
  auditSearchQuery: string;
  setAuditSearchQuery: (query: string) => void;
  auditFilterType: string;
  setAuditFilterType: (filter: string) => void;
}

export const ConsolaAuditoriaTab: React.FC<ConsolaAuditoriaTabProps> = ({
  ticketExecutions,
  descargarContextoCompleto,
  auditSearchQuery,
  setAuditSearchQuery,
  auditFilterType,
  setAuditFilterType,
}) => {
  return (
    <Card className="col-span-12 font-mono">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-3">
        <div>
          <h3 className="text-xs font-bold text-zinc-100 uppercase">
            Consola de Auditoría y Contexto del Proyecto
          </h3>
          <p className="mt-0.5 text-[9px] text-zinc-500">
            Busca, filtra e inspecciona el historial de handoffs, refinamientos
            de iteración y logs de bugs del proyecto.
          </p>
        </div>
        <button
          onClick={descargarContextoCompleto}
          className="rounded bg-emerald-500 px-3.5 py-1.5 text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
        >
          📥 Exportar Contexto de Sesión (.md)
        </button>
      </div>

      {/* Filters Row */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={auditSearchQuery}
          onChange={(e) => setAuditSearchQuery(e.target.value)}
          placeholder="Buscar por título, módulo o resumen técnico..."
          className="min-w-[200px] flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10px] text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500/30"
        />
        <select
          value={auditFilterType}
          onChange={(e) => setAuditFilterType(e.target.value)}
          className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[10px] text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500/30"
        >
          <option value="all">Todas las Ejecuciones</option>
          <option value="IN_PROGRESS">En Progreso</option>
          <option value="COMPLETED">Finalizadas</option>
          <option value="bugs">Con Bugs Activos/Resueltos</option>
          <option value="iterations">Con Iteraciones</option>
        </select>
      </div>

      {/* Ticket Executions list */}
      {(() => {
        const filtered = ticketExecutions.filter((t: any) => {
          const matchesSearch =
            (t.titulo || "")
              .toLowerCase()
              .includes(auditSearchQuery.toLowerCase()) ||
            (t.metadata?.aiSummary || "")
              .toLowerCase()
              .includes(auditSearchQuery.toLowerCase()) ||
            (t.metadata?.handoffs &&
              JSON.stringify(t.metadata.handoffs)
                .toLowerCase()
                .includes(auditSearchQuery.toLowerCase()));

          let matchesFilter = true;
          if (auditFilterType === "IN_PROGRESS") {
            matchesFilter = t.estado === "IN_PROGRESS";
          } else if (auditFilterType === "COMPLETED") {
            matchesFilter = t.estado === "COMPLETED";
          } else if (auditFilterType === "bugs") {
            matchesFilter =
              Array.isArray(t.metadata?.bugs) && t.metadata.bugs.length > 0;
          } else if (auditFilterType === "iterations") {
            matchesFilter =
              Array.isArray(t.metadata?.iterations) &&
              t.metadata.iterations.length > 0;
          }

          return matchesSearch && matchesFilter;
        });

        if (filtered.length === 0) {
          return (
            <div className="rounded-xl border border-zinc-900 bg-zinc-950/20 py-8 text-center text-[10px] text-zinc-500">
              Ninguna ejecución de ticket coincide con los criterios de
              búsqueda.
            </div>
          );
        }

        return (
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
            {filtered.map((t: any) => {
              const bugsCount = t.metadata?.bugs?.length || 0;
              const activeBugsCount =
                t.metadata?.bugs?.filter((b: any) => !b.resuelto).length || 0;
              const iterationsCount = t.metadata?.iterations?.length || 0;
              const hasHandoffs =
                t.metadata?.handoffs &&
                Object.keys(t.metadata.handoffs).length > 0;

              return (
                <div
                  key={t.id}
                  className="flex flex-col gap-3 rounded-xl border border-zinc-900 bg-zinc-950/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-900 pb-2">
                    <div>
                      <span
                        className={`mr-2 rounded border px-1.5 py-0.5 text-[8px] font-bold ${
                          t.estado === "COMPLETED"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border-sky-500/20 bg-sky-500/10 text-sky-400"
                        }`}
                      >
                        {t.estado}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-200">
                        {t.titulo}
                      </span>
                      <span className="mt-1 block text-[8px] text-zinc-500">
                        ID: {t.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {bugsCount > 0 && (
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[8px] font-bold ${
                            activeBugsCount > 0
                              ? "animate-pulse border-red-500/20 bg-red-500/10 text-red-400"
                              : "border-zinc-700 bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          || {bugsCount} {bugsCount === 1 ? "Bug" : "Bugs"}{" "}
                          {activeBugsCount > 0 ? "Activo" : ""}
                        </span>
                      )}
                      {iterationsCount > 0 && (
                        <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold text-amber-400">
                          🔄 {iterationsCount}{" "}
                          {iterationsCount === 1 ? "Iteración" : "Iteraciones"}
                        </span>
                      )}
                    </div>
                  </div>

                  {t.metadata?.aiSummary && (
                    <div className="rounded border border-zinc-900 bg-zinc-950 p-2.5">
                      <span className="mb-1 block text-[8px] font-bold text-zinc-500 uppercase">
                        💾 Resumen Técnico Guardado:
                      </span>
                      <p className="text-[10px] leading-relaxed text-zinc-300">
                        {t.metadata.aiSummary}
                      </p>
                    </div>
                  )}

                  {hasHandoffs && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[8px] font-bold text-zinc-500 uppercase">
                        Handoffs Registrados por Estación:
                      </span>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
                        {Object.entries(t.metadata.handoffs).map(
                          ([station, handoff]: [string, any]) => (
                            <div
                              key={station}
                              className="rounded border border-zinc-900 bg-zinc-950/60 p-2 text-[9px]"
                            >
                              <span className="mb-1 block border-b border-zinc-900 pb-1 font-bold text-sky-400">
                                {station}
                              </span>
                              <p className="line-clamp-3 font-mono leading-snug text-zinc-400">
                                {handoff.resumen_tecnico || "Sin notas."}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </Card>
  );
};
