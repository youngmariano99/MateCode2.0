"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { tiempoPorProyecto } from "../../../application/servicios/tiempo-por-proyecto.service";
import { formatoDiaCorto } from "./calendario-utils";

function horas(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/** Tiempo y notas por proyecto de trabajo en el período (ej. la semana): qué se le dedicó y qué se hizo. Si no hay nada ligado a un proyecto, no ocupa lugar. */
export const PanelTiempoProyectos: React.FC<{
  desde: string;
  hasta: string;
  titulo?: string;
}> = ({ desde, hasta, titulo = "Tiempo por proyecto" }) => {
  const resumen = useLiveQuery(async () => {
    await Promise.all([db.actividad.count(), db.sesion_trabajo.count()]);
    return tiempoPorProyecto(desde, hasta);
  }, [desde, hasta]);

  if (!resumen || resumen.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
        {titulo}
      </h3>
      {resumen.map((p) => (
        <details key={p.proyectoId} className="rounded-xl bg-[#0D0D0F] p-3">
          <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-bold text-zinc-200">{p.nombre}</span>
            <span className="text-xs text-zinc-500">
              {horas(p.segundos)} · {p.dias} día(s)
            </span>
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {p.registros.length === 0 && (
              <li className="text-xs text-zinc-600">Sin notas anotadas.</li>
            )}
            {p.registros.map((r, i) => (
              <li key={i} className="text-xs text-zinc-400">
                <span className="text-zinc-600">
                  {r.dia ? formatoDiaCorto(r.dia) : ""}
                </span>{" "}
                {r.texto}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
};
