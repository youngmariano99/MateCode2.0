"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Badge } from "../../badge";
import { Icono } from "../../icons";
import { ejeEfectivo } from "../../../../domain/entidades/ejercicio.entity";
import {
  calcularMejoraEjercicio,
  type RegistroActividad,
} from "../../../../domain/entidades/registro-actividad.entity";

const SIN_REGISTROS: RegistroActividad[] = [];
const SIN_EJERCICIOS: never[] = [];

/**
 * Progreso del bloque activo, por ejercicio, siempre en el eje que le tocó
 * a ese ejercicio (nunca mezcla kg con repeticiones con nivel).
 */
export const PanelEstadisticas: React.FC = () => {
  const bloqueActivo = useLiveQuery(() =>
    db.bloque_entrenamiento.where("estado").equals("activo").first()
  );
  const ejercicios =
    useLiveQuery(() => db.catalogo_ejercicio.toArray()) || SIN_EJERCICIOS;
  const registros =
    useLiveQuery(
      () =>
        bloqueActivo
          ? db.registro_actividad
              .where("bloqueId")
              .equals(bloqueActivo.id)
              .toArray()
          : Promise.resolve(SIN_REGISTROS),
      [bloqueActivo?.id]
    ) || SIN_REGISTROS;

  if (!bloqueActivo) {
    return (
      <div className="rounded-2xl border border-dashed border-[#2A2A2E] bg-[#18181B] p-4 text-sm text-zinc-600">
        Iniciá un bloque para ver tu progreso acá.
      </div>
    );
  }

  const ordenados = [...registros].sort((a, b) =>
    a.diaTarea.localeCompare(b.diaTarea)
  );
  const ejerciciosDelBloque = Array.from(
    new Set(
      ordenados.flatMap((r) => r.resultados.map((res) => res.ejercicioId))
    )
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.TrendingUp className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Progreso — {bloqueActivo.nombre}
        </h3>
      </div>
      {ejerciciosDelBloque.length === 0 && (
        <span className="text-sm text-zinc-600">
          Todavía no hay sesiones registradas en este bloque.
        </span>
      )}
      {ejerciciosDelBloque.map((ejercicioId) => {
        const ej = ejercicios.find((e) => e.id === ejercicioId);
        if (!ej) return null;
        const eje = ejeEfectivo(bloqueActivo.ejeProgresionDefault, ej);
        const resumen = calcularMejoraEjercicio(ordenados, ejercicioId, eje);
        if (!resumen) return null;
        return (
          <div
            key={ejercicioId}
            className="flex items-center justify-between gap-2 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2.5"
          >
            <div>
              <span className="block text-sm font-bold text-zinc-200">
                {ej.nombre}
              </span>
              <span className="text-xs text-zinc-500">
                {resumen.eje === "carga" &&
                  `${resumen.valorInicial}kg → ${resumen.valorFinal}kg`}
                {resumen.eje === "volumen" &&
                  `${resumen.valorInicial} → ${resumen.valorFinal} (volumen)`}
                {resumen.eje === "progresion" &&
                  `nivel ${resumen.valorInicial} → nivel ${resumen.valorFinal}`}{" "}
                · {resumen.sesiones} sesión{resumen.sesiones === 1 ? "" : "es"}
              </span>
            </div>
            <Badge color={resumen.mejoro ? "emerald" : "zinc"}>
              {resumen.mejoro ? "Mejoró" : "Igual"}
            </Badge>
          </div>
        );
      })}
    </div>
  );
};
