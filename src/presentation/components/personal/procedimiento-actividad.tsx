"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { EjecutarProcedimientoUseCase } from "../../../application/use-cases/personal/ejecutar-procedimiento.use-case";
import { GestionarProcedimientosUseCase } from "../../../application/use-cases/personal/gestionar-procedimientos.use-case";
import type { Actividad } from "../../../domain/entidades/actividad.entity";
import type {
  EjecucionProcedimiento,
  Procedimiento,
} from "../../../domain/entidades/procedimiento.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";

const ejecutarUseCase = new EjecutarProcedimientoUseCase();
const procedimientosUseCase = new GestionarProcedimientosUseCase();

interface ProcedimientoActividadProps {
  actividad: Actividad;
}

export const ProcedimientoActividad: React.FC<ProcedimientoActividadProps> = ({
  actividad,
}) => {
  const { mostrarToast } = useToast();
  const [expandido, setExpandido] = useState(false);
  const [mostrandoSelector, setMostrandoSelector] = useState(false);
  const [pasoEditandoNota, setPasoEditandoNota] = useState<string | null>(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [procesando, setProcesando] = useState(false);

  // Consulta en vivo de la ejecución vinculada
  const ejecucion = useLiveQuery<
    EjecucionProcedimiento | undefined
  >(async () => {
    if (actividad.procedimientoEjecucionId) {
      const e = await db.ejecucion_procedimiento.get(
        actividad.procedimientoEjecucionId
      );
      if (e && !e.eliminadoEn) return e;
    }
    // Fallback: buscar por actividadId
    const porActividad = await db.ejecucion_procedimiento
      .where("actividadId")
      .equals(actividad.id)
      .first();
    if (porActividad && !porActividad.eliminadoEn) return porActividad;

    return undefined;
  }, [actividad.id, actividad.procedimientoEjecucionId]);

  // Lista de procedimientos disponibles para vincular si no tiene uno activo
  const procedimientosDisponibles = useLiveQuery<Procedimiento[]>(async () => {
    return procedimientosUseCase.listar({ soloActivos: true });
  }, []);

  const iniciarConProcedimiento = async (procedimientoId: string) => {
    setProcesando(true);
    const res = await ejecutarUseCase.iniciarEjecucion({
      procedimientoId,
      actividadId: actividad.id,
      diaTarea: actividad.diaTarea ?? obtenerDiaTareaHoy(),
    });
    setProcesando(false);
    if (!res.ok) {
      mostrarToast(res.error!.mensaje, "error");
    } else {
      mostrarToast("Procedimiento iniciado para esta actividad.", "exito");
      setMostrandoSelector(false);
      setExpandido(true);
    }
  };

  const alternarPaso = async (pasoId: string, completadoActual: boolean) => {
    if (!ejecucion) return;
    setProcesando(true);
    const res = await ejecutarUseCase.tildarPaso({
      ejecucionId: ejecucion.id,
      pasoId,
      completado: !completadoActual,
      autoCompletarActividad: true,
    });
    setProcesando(false);
    if (!res.ok) {
      mostrarToast(res.error!.mensaje, "error");
    } else if (res.valor?.estado === "completado") {
      mostrarToast(
        "¡Procedimiento completado! Actividad marcada como lista.",
        "exito"
      );
    }
  };

  const alternarPausa = async () => {
    if (!ejecucion) return;
    setProcesando(true);
    const res =
      ejecucion.estado === "pausado"
        ? await ejecutarUseCase.reanudarEjecucion(ejecucion.id)
        : await ejecutarUseCase.pausarEjecucion(ejecucion.id);
    setProcesando(false);
    if (!res.ok) {
      mostrarToast(res.error!.mensaje, "error");
    } else {
      mostrarToast(
        ejecucion.estado === "pausado"
          ? "Procedimiento reanudado."
          : "Procedimiento pausado.",
        "info"
      );
    }
  };

  const guardarNotaPaso = async (pasoId: string) => {
    if (!ejecucion) return;
    setProcesando(true);
    const paso = ejecucion.pasos.find((p) => p.pasoId === pasoId);
    const res = await ejecutarUseCase.tildarPaso({
      ejecucionId: ejecucion.id,
      pasoId,
      completado: paso?.completado ?? false,
      nota: notaTexto.trim() || undefined,
    });
    setProcesando(false);
    setPasoEditandoNota(null);
    if (!res.ok) {
      mostrarToast(res.error!.mensaje, "error");
    } else {
      mostrarToast("Nota de paso guardada.", "exito");
    }
  };

  // 1. Caso: Sin procedimiento vinculado todavía
  if (!ejecucion) {
    return (
      <div className="relative mt-1">
        <button
          type="button"
          onClick={() => setMostrandoSelector(!mostrandoSelector)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#2A2A2E] bg-[#141417]/80 px-2 py-0.5 text-[10px] font-medium text-zinc-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
        >
          <Icono.Check className="h-3 w-3 text-zinc-500" />
          <span>+ Vincular Procedimiento (SOP)</span>
        </button>

        {mostrandoSelector && (
          <div className="absolute top-full left-0 z-20 mt-1 w-64 rounded-xl border border-[#2A2A2E] bg-[#18181B] p-2 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-1.5">
              <span className="text-[11px] font-bold text-zinc-300">
                Seleccionar Procedimiento
              </span>
              <button
                type="button"
                onClick={() => setMostrandoSelector(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            {(!procedimientosDisponibles ||
              procedimientosDisponibles.length === 0) && (
              <p className="py-3 text-center text-[10px] text-zinc-500 italic">
                No hay procedimientos creados todavía. Podés crearlos desde el
                Catálogo de Procedimientos.
              </p>
            )}

            <div className="mt-1.5 max-h-48 space-y-1 overflow-y-auto">
              {procedimientosDisponibles?.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={procesando}
                  onClick={() => void iniciarConProcedimiento(p.id)}
                  className="group flex w-full items-center justify-between rounded-lg p-1.5 text-left transition-colors hover:bg-[#222226]"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-zinc-200 group-hover:text-emerald-400">
                      {p.titulo}
                    </span>
                    <span className="block text-[9px] text-zinc-500">
                      {p.pasos.length} pasos • {p.categoria.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 opacity-0 transition-opacity group-hover:opacity-100">
                    Activar →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Caso: Con ejecución vinculada
  const esCompletado = ejecucion.estado === "completado";
  const esPausado = ejecucion.estado === "pausado";

  return (
    <div className="mt-1.5 flex flex-col rounded-xl border border-[#2A2A2E] bg-[#121215] p-2.5 transition-all">
      {/* Barra de cabecera del procedimiento */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpandido(!expandido)}
          className="group flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold text-emerald-400">
            {esCompletado ? "✓" : "📋"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-semibold text-zinc-200 transition-colors group-hover:text-emerald-400">
                {ejecucion.tituloProcedimiento}
              </span>
              {esPausado && (
                <span className="py-0.2 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 text-[9px] font-bold text-amber-400">
                  Pausado
                </span>
              )}
              {esCompletado && (
                <span className="py-0.2 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 text-[9px] font-bold text-emerald-400">
                  100% Listo
                </span>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Métricas compactas */}
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
            <span>
              {ejecucion.pasosCompletados}/{ejecucion.totalPasos}
            </span>
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full transition-all duration-300 ${
                  esCompletado ? "bg-emerald-400" : "bg-sky-400"
                }`}
                style={{ width: `${ejecucion.porcentajeAvance}%` }}
              />
            </div>
            <span className="font-bold text-zinc-300">
              {ejecucion.porcentajeAvance}%
            </span>
          </div>

          {!esCompletado && (
            <button
              type="button"
              disabled={procesando}
              onClick={() => void alternarPausa()}
              title={esPausado ? "Reanudar SOP" : "Pausar SOP"}
              className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                esPausado
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {esPausado ? "▶ Reanudar" : "⏸ Pausa"}
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpandido(!expandido)}
            className="p-1 text-zinc-500 transition-colors hover:text-zinc-300"
          >
            {expandido ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* Checklist expandida interactiva */}
      {expandido && (
        <div className="mt-3 space-y-1.5 border-t border-[#2A2A2E]/60 pt-2.5">
          {ejecucion.pasos.map((paso, idx) => {
            const completado = paso.completado;
            const tieneNota = Boolean(paso.nota);

            return (
              <div
                key={paso.pasoId}
                className={`group flex flex-col gap-1 rounded-lg border p-2 transition-all ${
                  completado
                    ? "border-emerald-500/15 bg-emerald-950/10"
                    : "border-[#2A2A2E]/50 bg-[#17171B]/50 hover:border-[#38383E]"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={completado}
                    disabled={procesando}
                    onChange={() => void alternarPaso(paso.pasoId, completado)}
                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-[#38383E] bg-[#0E0E10] text-emerald-500 focus:ring-0 focus:ring-offset-0"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-zinc-500">
                        {idx + 1}.
                      </span>
                      <span
                        className={`text-xs ${
                          completado
                            ? "text-zinc-500 line-through"
                            : "font-medium text-zinc-200"
                        }`}
                      >
                        {paso.titulo}
                      </span>

                      {!paso.esObligatorio && (
                        <span className="py-0.2 rounded bg-zinc-800 px-1.5 text-[9px] text-zinc-400">
                          Opcional
                        </span>
                      )}

                      {paso.duracionEstimadaMin && (
                        <span className="font-mono text-[9px] text-zinc-500">
                          ⏱ {paso.duracionEstimadaMin}m
                        </span>
                      )}
                    </div>

                    {paso.descripcion && !completado && (
                      <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                        {paso.descripcion}
                      </p>
                    )}

                    {tieneNota && pasoEditandoNota !== paso.pasoId && (
                      <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-sky-400">
                        <span>💬 {paso.nota}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPasoEditandoNota(paso.pasoId);
                            setNotaTexto(paso.nota ?? "");
                          }}
                          className="ml-1 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-zinc-300"
                        >
                          ✎
                        </button>
                      </div>
                    )}

                    {pasoEditandoNota === paso.pasoId && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={notaTexto}
                          onChange={(e) => setNotaTexto(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              void guardarNotaPaso(paso.pasoId);
                            if (e.key === "Escape") setPasoEditandoNota(null);
                          }}
                          placeholder="Nota o resultado de este paso..."
                          className="flex-1 rounded border border-[#2A2A2E] bg-[#0E0E10] px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => void guardarNotaPaso(paso.pasoId)}
                          className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20"
                        >
                          Listo
                        </button>
                      </div>
                    )}
                  </div>

                  {!tieneNota && pasoEditandoNota !== paso.pasoId && (
                    <button
                      type="button"
                      onClick={() => {
                        setPasoEditandoNota(paso.pasoId);
                        setNotaTexto("");
                      }}
                      className="p-1 text-[10px] text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-zinc-300"
                      title="Agregar nota a este paso"
                    >
                      + nota
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
