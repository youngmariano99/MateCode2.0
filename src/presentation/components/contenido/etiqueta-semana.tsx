"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import {
  estadoPlanificacion,
  etiquetaSemana,
  semanaDeCiclo,
} from "../../../domain/entidades/contenido-semana.entity";
import {
  lunesDeLaSemana,
  obtenerDiaTareaHoy,
} from "../../../domain/entidades/personal.entity";

/**
 * En qué semana estamos y si está planificada: verde "Planificado" o rojo
 * "No planificado" (con el motivo al lado). Se recalcula sola con cada cambio.
 */
export const EtiquetaSemana: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const lunes = lunesDeLaSemana(hoy);

  const datos = useLiveQuery(async () => {
    const ciclos = await db.ciclo_semanal.toArray();
    const deEstaSemana = ciclos
      .filter((c) => semanaDeCiclo(c) === lunes)
      .sort(
        (a, b) =>
          (a.estado === "activo" ? -1 : 0) - (b.estado === "activo" ? -1 : 0)
      )[0];
    const contenidos = await db.contenido.toArray();
    return estadoPlanificacion(deEstaSemana, contenidos, hoy);
  }, [lunes, hoy]);

  const planificado = datos?.estado === "planificado";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold text-zinc-200">
        {etiquetaSemana(lunes)}
      </span>
      {datos && (
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            planificado
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-red-500/15 text-red-400"
          }`}
        >
          {planificado ? "Planificado" : "No planificado"}
        </span>
      )}
      {datos && !planificado && datos.motivos.length > 0 && (
        <span className="text-xs text-zinc-500">{datos.motivos.join(" ")}</span>
      )}
    </div>
  );
};
