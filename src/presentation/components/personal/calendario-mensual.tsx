"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";
import {
  ChipActividad,
  ChipEntregable,
  ChipRecurrente,
} from "./calendario-semanal";
import { recurrentesDelDia } from "../../../domain/entidades/metas-periodo.entity";
import { BotonNuevaTarea } from "./tarea-rapida";
import {
  useColorPorObjetivo,
  useEntregablesRecurrentes,
  sumarDias,
} from "./calendario-utils";

const SIN_ITEMS: never[] = [];

const NOMBRES_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** "YYYY-MM" del mes que contiene `diaISO`. */
function mesDe(diaISO: string): string {
  return diaISO.slice(0, 7);
}

/** Primer día (lunes) de la grilla — puede caer en el mes anterior. */
function primerDiaGrilla(anioMes: string): string {
  const primero = `${anioMes}-01`;
  const [anio, mes, dia] = primero.split("-").map(Number);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  const offset = diaSemana === 0 ? -6 : 1 - diaSemana;
  return sumarDias(primero, offset);
}

function mesSiguiente(anioMes: string, delta: number): string {
  const [anio, mes] = anioMes.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1 + delta, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Calendario mensual — grilla de 6 semanas (siempre completa, con días de
 * los meses linderos atenuados), un punto de color por Área presente ese
 * día. Click en un día abre el detalle debajo de la grilla (reusa los chips
 * del calendario semanal) en vez de amontonar texto dentro de la celda.
 */
export const CalendarioMensual: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const [anioMes, setAnioMes] = useState(mesDe(hoy));
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const colorPorObjetivo = useColorPorObjetivo();
  const recurrentes = useEntregablesRecurrentes();

  const inicioGrilla = primerDiaGrilla(anioMes);
  const finGrilla = sumarDias(inicioGrilla, 41); // 6 semanas x 7 días - 1
  const diasGrilla = Array.from({ length: 42 }, (_, i) =>
    sumarDias(inicioGrilla, i)
  );

  const actividades =
    useLiveQuery(
      () =>
        db.actividad
          .where("diaTarea")
          .between(inicioGrilla, finGrilla, true, true)
          .and((a) => a.tipo !== "backlog")
          .toArray(),
      [inicioGrilla, finGrilla]
    ) || SIN_ITEMS;

  const entregables =
    useLiveQuery(
      () =>
        db.entregable
          .where("diaLimite")
          .between(inicioGrilla, finGrilla, true, true)
          .toArray(),
      [inicioGrilla, finGrilla]
    ) || SIN_ITEMS;

  const itemsPorDia = (dia: string) => [
    ...actividades
      .filter((a) => a.diaTarea === dia)
      .map((a) => ({
        tipo: "actividad" as const,
        clave: a.id,
        color: colorPorObjetivo(a.objetivoId),
        actividad: a,
      })),
    ...recurrentesDelDia(
      recurrentes,
      actividades.filter((a) => a.diaTarea === dia),
      dia
    ).map((e) => ({
      tipo: "recurrente" as const,
      clave: `rec_${e.id}`,
      color: colorPorObjetivo(e.objetivoId),
      entregable: e,
    })),
    ...entregables
      .filter((e) => e.diaLimite === dia)
      .map((e) => ({
        tipo: "entregable" as const,
        clave: e.id,
        color: colorPorObjetivo(e.objetivoId),
        entregable: e,
      })),
  ];

  const itemsDelSeleccionado = diaSeleccionado
    ? itemsPorDia(diaSeleccionado)
    : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAnioMes((m) => mesSiguiente(m, -1))}
            className="rounded-lg border border-[#2A2A2E] p-1.5 text-zinc-500 hover:text-zinc-300"
          >
            <Icono.ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setAnioMes(mesDe(hoy));
              setDiaSeleccionado(null);
            }}
            className="rounded-lg border border-[#2A2A2E] px-2 py-1.5 text-[10px] font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Hoy
          </button>
          <button
            onClick={() => setAnioMes((m) => mesSiguiente(m, 1))}
            className="rounded-lg border border-[#2A2A2E] p-1.5 text-zinc-500 hover:text-zinc-300"
          >
            <Icono.ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="text-xs font-bold text-zinc-300">
          {NOMBRES_MES[Number(anioMes.split("-")[1]) - 1]}{" "}
          {anioMes.split("-")[0]}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((n) => (
          <span
            key={n}
            className="text-center text-[9px] font-bold text-zinc-600 uppercase"
          >
            {n}
          </span>
        ))}
        {diasGrilla.map((dia) => {
          const items = itemsPorDia(dia);
          const coloresUnicos = Array.from(new Set(items.map((i) => i.color)));
          const esDelMes = mesDe(dia) === anioMes;
          const esHoy = dia === hoy;
          const seleccionado = dia === diaSeleccionado;
          return (
            <button
              key={dia}
              onClick={() => setDiaSeleccionado(dia)}
              className={`flex min-h-14 flex-col items-center gap-1 rounded-lg border p-1.5 transition-all ${
                seleccionado
                  ? "border-zinc-400"
                  : esHoy
                    ? "border-emerald-500/40"
                    : "border-[#2A2A2E] hover:border-zinc-700"
              } ${esDelMes ? "bg-[#18181B]" : "bg-[#0D0D0F] opacity-40"}`}
            >
              <span
                className={`text-[11px] ${esHoy ? "font-bold text-emerald-400" : "text-zinc-400"}`}
              >
                {Number(dia.split("-")[2])}
              </span>
              <div className="flex flex-wrap justify-center gap-0.5">
                {coloresUnicos.slice(0, 5).map((c, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: c }}
                  />
                ))}
                {items.length > 5 && (
                  <span className="text-[8px] text-zinc-600">
                    +{items.length - 5}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {diaSeleccionado && (
        <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#18181B] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-300">
              {diaSeleccionado}
            </span>
            <BotonNuevaTarea
              dia={diaSeleccionado}
              etiqueta="Agregar tarea a este día"
            />
          </div>
          {itemsDelSeleccionado.length === 0 && (
            <span className="text-xs text-zinc-600">
              Nada planificado este día.
            </span>
          )}
          {itemsDelSeleccionado.map((item) =>
            item.tipo === "actividad" ? (
              <ChipActividad
                key={item.clave}
                actividad={item.actividad}
                color={item.color}
              />
            ) : item.tipo === "recurrente" ? (
              <ChipRecurrente
                key={item.clave}
                entregable={item.entregable}
                color={item.color}
              />
            ) : (
              <ChipEntregable
                key={item.clave}
                entregable={item.entregable}
                color={item.color}
              />
            )
          )}
        </div>
      )}
    </div>
  );
};
