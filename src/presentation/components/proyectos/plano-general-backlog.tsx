"use client";

import React from "react";
import { db } from "../../../offline/dexie/db";
import { useLiveQuery } from "dexie-react-hooks";

interface Epica {
  id: string;
  proyectoId: string;
  nombre: string;
  descripcion?: string;
}

interface Historia {
  id: string;
  proyectoId: string;
  epicaId: string;
  sprintId?: string;
  titulo: string;
  descripcion?: string;
  prioridad?: string;
  estimacion?: number;
  estado?: string;
}

interface PlanoGeneralBacklogProps {
  proyectoId: string;
}

export const PlanoGeneralBacklog: React.FC<PlanoGeneralBacklogProps> = ({
  proyectoId,
}) => {
  // Query epics and stories reactively
  const epicas = (useLiveQuery(
    () => db.epicas.where("proyectoId").equals(proyectoId).toArray(),
    [proyectoId]
  ) || []) as unknown as Epica[];
  const historias = (useLiveQuery(
    () => db.historias.where("proyectoId").equals(proyectoId).toArray(),
    [proyectoId]
  ) || []) as unknown as Historia[];

  // Toggle/cycle story status in IndexedDB
  const alternarEstadoHistoria = async (
    historiaId: string,
    estadoActual: string
  ) => {
    let proximoEstado = "Todo";
    if (estadoActual === "Todo") proximoEstado = "InProgress";
    else if (estadoActual === "InProgress") proximoEstado = "Done";

    try {
      await db.historias.update(historiaId, { estado: proximoEstado });
    } catch {
      // Ignorar errores silenciosamente
    }
  };

  // Overall calculations
  const totalHistorias = historias.length;
  const completadasHistorias = historias.filter(
    (h) => h.estado === "Done"
  ).length;
  const progresoGlobal =
    totalHistorias > 0
      ? Math.round((completadasHistorias / totalHistorias) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6 text-zinc-300">
      {/* Global progress header summary */}
      <div className="rounded-2xl border border-[#2A2A2E] bg-zinc-950/60 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h4 className="font-mono text-sm font-bold text-white uppercase">
              Progreso General de Entregables
            </h4>
            <p className="mt-1 font-mono text-[10px] text-zinc-500">
              {completadasHistorias} de {totalHistorias} historias técnicas
              implementadas con éxito.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black text-emerald-400">
              {progresoGlobal}%
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full border border-zinc-800/40 bg-zinc-900">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progresoGlobal}%` }}
          />
        </div>
      </div>

      {/* Epics layout grid */}
      <div className="flex flex-col gap-5">
        {epicas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center font-mono text-xs text-zinc-500 italic">
            No hay épicas ni backlog registrado para este proyecto. Puedes
            importarlo desde la sección de Ingesta IA.
          </div>
        ) : (
          epicas.map((ep) => {
            const historiasEpica = historias.filter((h) => h.epicaId === ep.id);
            const totalEp = historiasEpica.length;
            const doneEp = historiasEpica.filter(
              (h) => h.estado === "Done"
            ).length;
            const inProgressEp = historiasEpica.filter(
              (h) => h.estado === "InProgress"
            ).length;
            const progresoEp =
              totalEp > 0 ? Math.round((doneEp / totalEp) * 100) : 0;

            return (
              <div
                key={ep.id}
                className="rounded-2xl border border-[#2A2A2E] bg-zinc-950/20 p-5 transition-colors hover:border-zinc-800"
              >
                {/* Epic Header with Epic Progress bar */}
                <div className="flex flex-col justify-between gap-2 border-b border-zinc-900 pb-3 md:flex-row md:items-center">
                  <div>
                    <h5 className="font-mono text-xs font-bold text-white uppercase">
                      📁 {ep.nombre}
                    </h5>
                    <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                      {ep.descripcion || "Sin descripción."}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-zinc-400">
                      {doneEp}/{totalEp} Historias ({progresoEp}%)
                    </span>
                    <div className="border-zinc-850 h-2 w-24 overflow-hidden rounded-full border bg-zinc-900">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${progresoEp}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Associated User Stories List */}
                <div className="mt-4 flex flex-col gap-2">
                  {historiasEpica.length === 0 ? (
                    <div className="py-2 text-center font-mono text-[9px] text-zinc-600 italic">
                      No hay historias vinculadas a esta épica.
                    </div>
                  ) : (
                    historiasEpica.map((h) => {
                      let statusBadge =
                        "bg-zinc-900 text-zinc-500 border-zinc-850";
                      let dotColor = "bg-zinc-600";

                      if (h.estado === "Done") {
                        statusBadge =
                          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        dotColor = "bg-emerald-500";
                      } else if (h.estado === "InProgress") {
                        statusBadge =
                          "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        dotColor = "bg-amber-500";
                      }

                      let prioColor = "text-zinc-500 border-zinc-800";
                      if (h.prioridad === "Alta")
                        prioColor =
                          "text-rose-400 border-rose-900/20 bg-rose-950/20";
                      else if (h.prioridad === "Media")
                        prioColor =
                          "text-amber-400 border-amber-900/20 bg-amber-950/20";

                      return (
                        <div
                          key={h.id}
                          className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-900 bg-zinc-950/40 px-4 py-3 hover:bg-zinc-950/60 sm:flex-row sm:items-center"
                        >
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-zinc-200">
                              {h.titulo}
                            </span>
                            <span className="mt-0.5 font-mono text-[10px] leading-relaxed text-zinc-500">
                              {h.descripcion}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 sm:justify-end">
                            {/* Priority Badge */}
                            {h.prioridad && (
                              <span
                                className={`rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase ${prioColor}`}
                              >
                                {h.prioridad}
                              </span>
                            )}

                            {/* Estimation points */}
                            {h.estimacion !== undefined && (
                              <span className="rounded-md border border-zinc-800/80 bg-zinc-900 px-2 py-0.5 font-mono text-[9px] text-zinc-400 select-none">
                                {h.estimacion} SP
                              </span>
                            )}

                            {/* Status Cycler Badge */}
                            <button
                              onClick={() =>
                                alternarEstadoHistoria(h.id, h.estado || "Todo")
                              }
                              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono text-[9px] font-bold tracking-wide uppercase transition-all select-none hover:brightness-110 active:scale-95 ${statusBadge}`}
                              title="Haz clic para cambiar de estado"
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${dotColor}`}
                              />
                              {h.estado || "Todo"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
