"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Icono } from "../../icons";
import { Badge } from "../../badge";
import { useToast } from "../../../hooks/useToast";
import { GestionarActividadesUseCase } from "../../../../application/use-cases/personal/gestionar-actividades.use-case";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../../domain/entidades/personal.entity";
import { useAreaPorObjetivo } from "../calendario-utils";
import { ChipsMotivoDesvio } from "../chips-motivo-desvio";
import { ModalTrazabilidadActividad } from "./modal-trazabilidad-actividad";
import type {
  Actividad,
  MotivoDesvio,
} from "../../../../domain/entidades/actividad.entity";

const actividadesUseCase = new GestionarActividadesUseCase();

export const CockpitTareasHoy: React.FC = () => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();
  const areaDe = useAreaPorObjetivo();

  const [vista, setVista] = useState<"pendientes" | "hechas">("pendientes");
  const [actividadSeleccionada, setActividadSeleccionada] =
    useState<Actividad | null>(null);
  const [actividadDesvio, setActividadDesvio] = useState<{
    id: string;
    accion: "migrar" | "cancelar";
  } | null>(null);
  const [inputAvance, setInputAvance] = useState<{ [id: string]: string }>({});

  const actividades =
    useLiveQuery(
      () =>
        db.actividad
          .where("diaTarea")
          .equals(hoy)
          .and((a) => a.tipo !== "backlog")
          .toArray(),
      [hoy]
    ) ?? [];

  const entregables = useLiveQuery(() => db.entregable.toArray(), []) ?? [];
  const entregablesMap = new Map(entregables.map((e) => [e.id, e]));

  const pendientes = actividades.filter((a) => a.estado === "pendiente");
  const hechas = actividades.filter((a) => a.estado === "completada");

  const total = actividades.length;
  const porcentaje = total > 0 ? Math.round((hechas.length / total) * 100) : 0;

  const completarTarea = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await actividadesUseCase.completarActividad(id);
    if (res.ok) mostrarToast("Tarea completada.", "exito");
    else mostrarToast(res.error?.mensaje || "Error al completar.", "error");
  };

  const registrarAvance = async (
    actividad: Actividad,
    cantidadSumar: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (cantidadSumar <= 0) return;
    const res = await actividadesUseCase.registrarAvance(
      actividad.id,
      cantidadSumar
    );
    if (!res.ok)
      mostrarToast(res.error?.mensaje || "Error al registrar avance.", "error");
    else {
      setInputAvance((prev) => ({ ...prev, [actividad.id]: "" }));
    }
  };

  const resolverDesvio = async (motivo?: MotivoDesvio) => {
    if (!actividadDesvio) return;
    const { id, accion } = actividadDesvio;
    setActividadDesvio(null);

    const res =
      accion === "migrar"
        ? await actividadesUseCase.migrarActividad({
            id,
            nuevoDiaTarea: sumarDias(hoy, 1),
            motivo,
          })
        : await actividadesUseCase.cancelarActividad(id, motivo);

    if (res.ok) {
      mostrarToast(
        accion === "migrar"
          ? "Tarea migrada a mañana."
          : "Tarea cancelada con motivo.",
        "info"
      );
    } else {
      mostrarToast(res.error?.mensaje || "Error en desvío.", "error");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      {/* Cabecera del Cockpit */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2A2E] pb-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Icono.Target className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold tracking-wide text-zinc-100 uppercase">
              Cockpit del Día ({hoy})
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500">
            {hechas.length} de {total} completadas ({porcentaje}%)
          </span>
        </div>

        {/* Barra de progreso visual */}
        <div className="flex items-center gap-3">
          <div className="h-2 w-28 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${porcentaje}%` }}
            />
          </div>

          {/* Selector Pendientes vs Hechas */}
          <div className="flex rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-0.5">
            <button
              onClick={() => setVista("pendientes")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                vista === "pendientes"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Pendientes ({pendientes.length})
            </button>
            <button
              onClick={() => setVista("hechas")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                vista === "hechas"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Hechas ({hechas.length})
            </button>
          </div>
        </div>
      </div>

      {/* Popover / Selección de motivo de desvío */}
      {actividadDesvio && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
          <span className="text-xs font-bold text-amber-300">
            {actividadDesvio.accion === "migrar"
              ? "¿Por qué pasás esta tarea a mañana?"
              : "¿Por qué cancelás esta tarea?"}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <ChipsMotivoDesvio onElegir={(m) => void resolverDesvio(m)} />
            <button
              onClick={() => void resolverDesvio(undefined)}
              className="rounded px-2 py-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200"
            >
              Sin motivo
            </button>
            <button
              onClick={() => setActividadDesvio(null)}
              className="rounded px-2 py-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-300"
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {/* Lista de Actividades */}
      <div className="flex flex-col gap-2">
        {vista === "pendientes" ? (
          pendientes.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              {total === 0
                ? "No hay tareas programadas para hoy. Podés crearlas desde Planificación o empezar algo suelto."
                : "🎉 ¡Completaste todas las tareas planificadas para hoy!"}
            </div>
          ) : (
            pendientes.map((act) => {
              const area = areaDe(act.objetivoId);
              const ent = act.entregableId
                ? entregablesMap.get(act.entregableId)
                : undefined;
              const piso =
                act.cantidadObjetivo && ent?.bandaAceptable
                  ? Math.round(
                      act.cantidadObjetivo * (ent.bandaAceptable / 100)
                    )
                  : undefined;

              return (
                <div
                  key={act.id}
                  onClick={() => setActividadSeleccionada(act)}
                  className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-l-4 border-[#2A2A2E] bg-[#0D0D0F] p-3 transition-all hover:border-zinc-700"
                  style={{ borderLeftColor: area.color }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-200 group-hover:text-emerald-400">
                          {act.descripcion}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          🔍 Ver trazabilidad
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span className="flex items-center gap-1 text-[10px]">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: area.color }}
                          />
                          {area.nombre}
                        </span>

                        {act.cantidadObjetivo !== undefined && (
                          <span className="text-zinc-400">
                            · Avance:{" "}
                            <strong>
                              {act.progresoActual ?? 0}/{act.cantidadObjetivo}{" "}
                              {act.unidad || ""}
                            </strong>
                            {piso !== undefined && (
                              <span className="ml-1.5 text-amber-400">
                                (Piso mín: {piso} {act.unidad || ""})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones de la Tarea */}
                    <div
                      className="flex shrink-0 items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Check de completar */}
                      <button
                        onClick={(e) => void completarTarea(act.id, e)}
                        title="Completar tarea"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      >
                        <Icono.Check className="h-4 w-4" />
                      </button>

                      {/* Migrar a mañana */}
                      <button
                        onClick={() =>
                          setActividadDesvio({ id: act.id, accion: "migrar" })
                        }
                        title="Pasar a mañana"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2A2A2E] bg-[#18181B] text-zinc-500 hover:text-sky-400"
                      >
                        <Icono.ChevronRight className="h-3.5 w-3.5" />
                      </button>

                      {/* Cancelar con motivo */}
                      <button
                        onClick={() =>
                          setActividadDesvio({ id: act.id, accion: "cancelar" })
                        }
                        title="Cancelar tarea"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2A2A2E] bg-[#18181B] text-zinc-500 hover:text-red-400"
                      >
                        <Icono.Close className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Input rápido de avance si tiene cantidad */}
                  {act.cantidadObjetivo !== undefined && (
                    <div
                      className="flex items-center gap-2 border-t border-zinc-900 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => void registrarAvance(act, 1, e)}
                        className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-300 hover:bg-zinc-700"
                      >
                        +1 {act.unidad || ""}
                      </button>
                      <input
                        type="number"
                        placeholder="Sumar cantidad..."
                        value={inputAvance[act.id] ?? ""}
                        onChange={(e) =>
                          setInputAvance({
                            ...inputAvance,
                            [act.id]: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = Number(inputAvance[act.id]);
                            if (val > 0)
                              void registrarAvance(
                                act,
                                val,
                                e as unknown as React.MouseEvent
                              );
                          }
                        }}
                        className="w-28 rounded border border-[#2A2A2E] bg-[#18181B] px-2 py-0.5 text-[10px] text-zinc-200 outline-none focus:border-emerald-500/50"
                      />
                      {Boolean(inputAvance[act.id]) && (
                        <button
                          onClick={(e) =>
                            void registrarAvance(
                              act,
                              Number(inputAvance[act.id]),
                              e
                            )
                          }
                          className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400"
                        >
                          Sumar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : hechas.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            Aún no has completado tareas hoy.
          </div>
        ) : (
          hechas.map((act) => {
            const area = areaDe(act.objetivoId);
            return (
              <div
                key={act.id}
                onClick={() => setActividadSeleccionada(act)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-l-4 border-[#2A2A2E] bg-[#0D0D0F] p-3 opacity-60 transition-all hover:opacity-100"
                style={{ borderLeftColor: area.color }}
              >
                <div className="flex flex-col">
                  <span className="text-sm text-zinc-300 line-through">
                    {act.descripcion}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {act.cantidadObjetivo !== undefined &&
                      `${act.progresoActual ?? 0}/${act.cantidadObjetivo} ${act.unidad || ""}`}
                  </span>
                </div>
                <Badge color="emerald">Completada</Badge>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Trazabilidad */}
      <ModalTrazabilidadActividad
        actividad={actividadSeleccionada}
        onCerrar={() => setActividadSeleccionada(null)}
      />
    </div>
  );
};
