"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Dialog } from "../../dialog";
import { Icono } from "../../icons";
import { Badge } from "../../badge";
import type { Actividad } from "../../../../domain/entidades/actividad.entity";

interface ModalTrazabilidadActividadProps {
  actividad: Actividad | null;
  onCerrar: () => void;
}

export const ModalTrazabilidadActividad: React.FC<
  ModalTrazabilidadActividadProps
> = ({ actividad, onCerrar }) => {
  const jerarquia = useLiveQuery(async () => {
    if (!actividad) return null;

    const entregable = actividad.entregableId
      ? await db.entregable.get(actividad.entregableId)
      : undefined;

    const proyectoId = entregable?.proyectoId ?? actividad.proyectoId;
    const proyecto = proyectoId
      ? await db.proyecto_personal.get(proyectoId)
      : undefined;

    const objetivoId =
      proyecto?.objetivoId ?? entregable?.objetivoId ?? actividad.objetivoId;
    const objetivo = objetivoId
      ? await db.objetivo_cuantificable.get(objetivoId)
      : undefined;

    const areaId = objetivo?.areaId;
    const area = areaId ? await db.area_personal.get(areaId) : undefined;

    const proyectoTrabajo = actividad.proyectoTrabajoId
      ? await db.proyectos.get(actividad.proyectoTrabajoId)
      : undefined;

    return {
      area,
      objetivo,
      proyecto,
      entregable,
      proyectoTrabajo,
    };
  }, [actividad?.id]);

  if (!actividad) return null;

  const entregable = jerarquia?.entregable;
  const proyecto = jerarquia?.proyecto;
  const objetivo = jerarquia?.objetivo;
  const area = jerarquia?.area;

  // Cálculo de piso mínimo del entregable
  const pisoMinimo =
    entregable?.cantidadObjetivo && entregable?.bandaAceptable
      ? Math.round(
          entregable.cantidadObjetivo * (entregable.bandaAceptable / 100)
        )
      : undefined;

  return (
    <Dialog
      abierto={Boolean(actividad)}
      onClose={onCerrar}
      titulo="Trazabilidad Jerárquica de la Tarea"
      maxWidth="lg"
    >
      <div className="flex flex-col gap-4 py-1">
        <p className="text-xs text-zinc-400">
          Esta vista te muestra exactamente a qué Área, Objetivo, Proyecto y
          Entregable pertenece la tarea en la que estás trabajando hoy.
        </p>

        <div className="relative flex flex-col gap-3">
          {/* 1. ÁREA */}
          <div className="flex items-start gap-3 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
            <div
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: area?.color || "#10B981" }}
            >
              <Icono.Package className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                Área Estratégica
              </span>
              <h4 className="text-sm font-semibold text-zinc-100">
                {area?.nombre || "Área sin asignar"}
              </h4>
            </div>
          </div>

          {/* 2. OBJETIVO */}
          <div className="ml-4 flex items-start gap-3 border-l-2 border-emerald-500/20 pl-4">
            <div className="flex-1 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                  Objetivo General
                </span>
                {objetivo?.diaLimite && (
                  <span className="text-[10px] text-zinc-500">
                    Vence: {objetivo.diaLimite}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-medium text-zinc-200">
                {objetivo?.titulo || "Objetivo directo"}
              </h4>
              {objetivo?.cantidadObjetivo !== undefined && (
                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                  <span>
                    Progreso: {objetivo.progresoActual ?? 0} /{" "}
                    {objetivo.cantidadObjetivo} {objetivo.unidad || ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. PROYECTO */}
          {proyecto && (
            <div className="ml-8 flex items-start gap-3 border-l-2 border-emerald-500/30 pl-4">
              <div className="flex-1 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                    Proyecto
                  </span>
                  {proyecto.diaLimite && (
                    <span className="text-[10px] text-zinc-500">
                      {proyecto.diaInicio} → {proyecto.diaLimite}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-medium text-zinc-200">
                  {proyecto.titulo}
                </h4>
              </div>
            </div>
          )}

          {/* 4. ENTREGABLE */}
          {entregable && (
            <div className="ml-12 flex items-start gap-3 border-l-2 border-emerald-500/40 pl-4">
              <div className="flex-1 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                    Entregable Clave
                  </span>
                  <Badge color="sky">
                    {entregable.recurrencia ? "Recurrente" : "Hito Único"}
                  </Badge>
                </div>
                <h4 className="text-sm font-medium text-zinc-200">
                  {entregable.titulo}
                </h4>
                {entregable.cantidadObjetivo !== undefined && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-zinc-900/60 p-2 text-zinc-400">
                      <span className="block text-[10px] text-zinc-500">
                        Meta Total
                      </span>
                      <span className="font-semibold text-zinc-200">
                        {entregable.progresoActual ?? 0} /{" "}
                        {entregable.cantidadObjetivo} {entregable.unidad || ""}
                      </span>
                    </div>
                    <div className="rounded-lg bg-zinc-900/60 p-2 text-zinc-400">
                      <span className="block text-[10px] text-zinc-500">
                        Piso Mínimo ({entregable.bandaAceptable ?? 70}%)
                      </span>
                      <span className="font-semibold text-amber-400">
                        {pisoMinimo ?? "—"} {entregable.unidad || ""}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. ACTIVIDAD DE HOY */}
          <div className="flex items-start gap-3 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 p-4">
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                  Actividad de Hoy ({actividad.diaTarea || "Sin día"})
                </span>
                <Badge
                  color={
                    actividad.estado === "completada" ? "emerald" : "amber"
                  }
                >
                  {actividad.estado === "completada"
                    ? "Completada"
                    : "Pendiente"}
                </Badge>
              </div>
              <h3 className="mt-1 text-base font-bold text-zinc-100">
                {actividad.descripcion}
              </h3>

              {actividad.cantidadObjetivo !== undefined && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-300">
                  <span>
                    Meta de hoy:{" "}
                    <strong>
                      {actividad.cantidadObjetivo} {actividad.unidad || ""}
                    </strong>
                  </span>
                  <span>
                    Avance:{" "}
                    <strong>
                      {actividad.progresoActual ?? 0} {actividad.unidad || ""}
                    </strong>
                  </span>
                </div>
              )}

              {jerarquia?.proyectoTrabajo && (
                <div className="mt-2 text-xs text-zinc-400">
                  Proyecto de desarrollo vinculado:{" "}
                  <span className="text-zinc-200">
                    {String(jerarquia.proyectoTrabajo.nombre)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
