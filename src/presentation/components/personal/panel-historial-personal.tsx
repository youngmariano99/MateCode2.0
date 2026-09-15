"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import type {
  TipoEntidadHistorial,
  AccionHistorial,
} from "../../../domain/entidades/personal-historial.entity";

const SIN_HISTORIAL: never[] = [];

const ETIQUETA_ACCION: Record<AccionHistorial, string> = {
  crear: "Creado",
  editar: "Editado",
  eliminar: "Eliminado",
  ajustar_fecha: "Fecha ajustada",
  ajustar_cantidad: "Cantidad ajustada",
  registrar_avance: "Avance registrado",
};

const COLOR_ACCION: Record<AccionHistorial, string> = {
  crear: "text-emerald-400",
  editar: "text-sky-400",
  eliminar: "text-red-400",
  ajustar_fecha: "text-amber-400",
  ajustar_cantidad: "text-amber-400",
  registrar_avance: "text-emerald-400",
};

function formatearFecha(ts: number): string {
  return new Date(ts).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Timeline de auditoría de un elemento puntual — mismo patrón de query/
 * render que seccion-historial-intentos.tsx (lista cronológica inversa vía
 * useLiveQuery), leyendo de personal_historial (append-only, nunca se
 * borra — ver registrar-historial-personal.service.ts).
 */
export const PanelHistorialPersonal: React.FC<{
  entidadTipo: TipoEntidadHistorial;
  entidadId: string;
}> = ({ entidadTipo, entidadId }) => {
  const historial =
    useLiveQuery(
      () =>
        db.personal_historial
          .where("entidadId")
          .equals(entidadId)
          .reverse()
          .sortBy("creadoEn"),
      [entidadId]
    ) || SIN_HISTORIAL;

  if (historial.length === 0) {
    return (
      <p className="text-xs text-zinc-600">
        Todavía no hay historial para este {entidadTipo}.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {historial.map((h) => (
        <div
          key={h.id}
          className="flex flex-col gap-1 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-bold uppercase ${COLOR_ACCION[h.accion]}`}
            >
              {ETIQUETA_ACCION[h.accion]}
            </span>
            <span className="text-[10px] text-zinc-600">
              {formatearFecha(h.creadoEn)}
            </span>
          </div>
          {h.descripcion && (
            <span className="text-xs text-zinc-400">{h.descripcion}</span>
          )}
          {h.campoAnterior && h.campoNuevo && (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <span className="rounded bg-zinc-900 px-1.5 py-0.5">
                {JSON.stringify(h.campoAnterior)}
              </span>
              <Icono.ArrowRight className="h-3 w-3 shrink-0" />
              <span className="rounded bg-zinc-900 px-1.5 py-0.5">
                {JSON.stringify(h.campoNuevo)}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
