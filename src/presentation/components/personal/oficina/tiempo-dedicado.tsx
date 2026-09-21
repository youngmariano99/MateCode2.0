"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Icono } from "../../icons";
import {
  lunesDeLaSemana,
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../../domain/entidades/personal.entity";
import { segundosTrabajados } from "../../../../domain/entidades/sesion-trabajo.entity";
import { NOMBRES_DIA } from "../calendario-utils";

const ahoraMs = () => Date.now();

function formatoDuracion(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}

function topN(mapa: Map<string, number>, n: number): [string, number][] {
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

const FilaBarra: React.FC<{ etiqueta: string; seg: number; max: number }> = ({
  etiqueta,
  seg,
  max,
}) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="w-24 shrink-0 truncate text-zinc-500">{etiqueta}</span>
    <div className="h-2 flex-1 rounded-full bg-[#0D0D0F]">
      <div
        className="h-2 rounded-full bg-emerald-500/60"
        style={{ width: `${max > 0 ? Math.max(3, (seg / max) * 100) : 0}%` }}
      />
    </div>
    <span className="w-14 shrink-0 text-right text-zinc-400">
      {formatoDuracion(seg)}
    </span>
  </div>
);

/**
 * Tiempo dedicado — suma lo realmente trabajado (no lo planificado) por día,
 * por actividad/tarea suelta y por objetivo (vía Actividad→Objetivo), de la
 * semana en curso. Solo lee: los números salen de las sesiones ya guardadas.
 */
export const TiempoDedicado: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const lunes = lunesDeLaSemana(hoy);
  const domingo = sumarDias(lunes, 6);

  const datos = useLiveQuery(async () => {
    const sesiones = await db.sesion_trabajo
      .where("diaTarea")
      .between(lunes, domingo, true, true)
      .toArray();
    const actividades = new Map(
      (await db.actividad.toArray()).map((a) => [a.id, a])
    );
    const objetivos = new Map(
      (await db.objetivo_cuantificable.toArray()).map((o) => [o.id, o.titulo])
    );
    const ahora = ahoraMs();
    const porDia = new Map<string, number>();
    const porActividad = new Map<string, number>();
    const porObjetivo = new Map<string, number>();
    for (const s of sesiones) {
      const seg = segundosTrabajados(s, ahora);
      if (seg <= 0) continue;
      porDia.set(s.diaTarea, (porDia.get(s.diaTarea) ?? 0) + seg);
      const actividad = s.actividadId
        ? actividades.get(s.actividadId)
        : undefined;
      const nombre = actividad?.descripcion ?? s.descripcion ?? "Sin nombre";
      porActividad.set(nombre, (porActividad.get(nombre) ?? 0) + seg);
      const objetivo = actividad?.objetivoId
        ? objetivos.get(actividad.objetivoId)
        : undefined;
      const claveObjetivo = objetivo ?? "Sin objetivo";
      porObjetivo.set(
        claveObjetivo,
        (porObjetivo.get(claveObjetivo) ?? 0) + seg
      );
    }
    return { porDia, porActividad, porObjetivo };
  }, [lunes, domingo]);

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const totalSemana = datos
    ? [...datos.porDia.values()].reduce((s, v) => s + v, 0)
    : 0;
  const totalHoy = datos?.porDia.get(hoy) ?? 0;
  const maxDia = datos
    ? Math.max(0, ...dias.map((d) => datos.porDia.get(d) ?? 0))
    : 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icono.TrendingUp className="h-4 w-4 text-zinc-500" />
          <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Tiempo dedicado
          </h3>
        </div>
        <span className="text-xs text-zinc-500">
          Hoy {formatoDuracion(totalHoy)} · Semana{" "}
          {formatoDuracion(totalSemana)}
        </span>
      </div>

      {totalSemana === 0 ? (
        <p className="text-xs text-zinc-600">
          Todavía no hay sesiones esta semana — cada sesión que cierres suma acá
          lo que realmente trabajaste.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {dias.map((d) => (
              <FilaBarra
                key={d}
                etiqueta={NOMBRES_DIA[
                  new Date(`${d}T00:00:00Z`).getUTCDay()
                ].slice(0, 3)}
                seg={datos?.porDia.get(d) ?? 0}
                max={maxDia}
              />
            ))}
          </div>
          <div className="grid gap-3 border-t border-[#2A2A2E] pt-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                Por tarea
              </span>
              {topN(datos!.porActividad, 5).map(([nombre, seg]) => (
                <FilaBarra
                  key={nombre}
                  etiqueta={nombre}
                  seg={seg}
                  max={topN(datos!.porActividad, 1)[0][1]}
                />
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                Por objetivo
              </span>
              {topN(datos!.porObjetivo, 5).map(([nombre, seg]) => (
                <FilaBarra
                  key={nombre}
                  etiqueta={nombre}
                  seg={seg}
                  max={topN(datos!.porObjetivo, 1)[0][1]}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
