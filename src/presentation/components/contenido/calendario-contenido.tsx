"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import {
  ETIQUETA_ETAPA,
  type Contenido,
  type EtapaCinta,
} from "../../../domain/entidades/contenido.entity";
import {
  diaISODeMs,
  tareasDelDia,
} from "../../../domain/entidades/contenido-semana.entity";
import {
  lunesDeLaSemana,
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

const NOMBRES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
const corto = (d: string) =>
  `${Number(d.split("-")[2])} ${MESES[Number(d.split("-")[1]) - 1]}`;

const COLOR_ETAPA: Record<EtapaCinta, string> = {
  guion: "border-violet-500/40 text-violet-300",
  grabacion: "border-red-500/40 text-red-300",
  edicion: "border-amber-500/40 text-amber-300",
  publicacion: "border-emerald-500/40 text-emerald-300",
};

const TarjetaTarea: React.FC<{ contenido: Contenido; etapa: EtapaCinta }> = ({
  contenido,
  etapa,
}) => (
  <div
    className={`rounded-lg border-l-2 bg-[#0D0D0F] p-2 ${COLOR_ETAPA[etapa]}`}
  >
    <span className="block text-[10px] font-bold uppercase">
      {ETIQUETA_ETAPA[etapa]}
    </span>
    <span className="block text-xs text-zinc-200">{contenido.titulo}</span>
    <span className="text-[10px] text-zinc-600">
      {contenido.tipoContenido}
      {contenido.ficha?.pilar ? ` · ${contenido.ficha.pilar}` : ""}
    </span>
  </div>
);

/**
 * Calendario del contenido: para cada día, lo que toca hacer (guion, grabar,
 * editar, publicar) de todas las piezas, más lo que ya se publicó ese día.
 * Cada etapa tiene su propio día, así que una pieza aparece varias veces.
 */
const CalendarioSemanalContenido: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const [ancla, setAncla] = useState(lunesDeLaSemana(hoy));
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(ancla, i));

  const contenidos = useLiveQuery(() => db.contenido.toArray()) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAncla(sumarDias(ancla, -7))}
            className="rounded-lg border border-[#2A2A2E] p-1.5 text-zinc-500 hover:text-zinc-300"
          >
            <Icono.ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAncla(lunesDeLaSemana(hoy))}
            className="rounded-lg border border-[#2A2A2E] px-2 py-1.5 text-[10px] font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Hoy
          </button>
          <button
            onClick={() => setAncla(sumarDias(ancla, 7))}
            className="rounded-lg border border-[#2A2A2E] p-1.5 text-zinc-500 hover:text-zinc-300"
          >
            <Icono.ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="text-xs text-zinc-500">
          {corto(ancla)} — {corto(sumarDias(ancla, 6))}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 overflow-x-auto sm:grid-cols-7">
        {dias.map((dia, i) => {
          const tareas = tareasDelDia(contenidos, dia);
          const publicadas = contenidos.filter(
            (c) =>
              c.estado === "Publicado" &&
              c.fechaPublicacion !== undefined &&
              diaISODeMs(c.fechaPublicacion) === dia
          );
          const esHoy = dia === hoy;
          return (
            <div
              key={dia}
              className={`flex min-w-[140px] flex-col gap-2 rounded-xl border p-2 ${
                esHoy
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-[#2A2A2E] bg-[#18181B]"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-[10px] font-bold uppercase ${esHoy ? "text-emerald-400" : "text-zinc-500"}`}
                >
                  {NOMBRES[i]}
                </span>
                <span className="text-[10px] text-zinc-600">{corto(dia)}</span>
              </div>
              {tareas.length === 0 && publicadas.length === 0 && (
                <span className="text-[10px] text-zinc-700">Sin nada</span>
              )}
              {tareas.map((t) => (
                <TarjetaTarea
                  key={`${t.contenido.id}-${t.etapa}`}
                  contenido={t.contenido}
                  etapa={t.etapa}
                />
              ))}
              {publicadas.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border-l-2 border-zinc-600 bg-[#0D0D0F] p-2 opacity-60"
                >
                  <span className="block text-[10px] font-bold text-zinc-500 uppercase">
                    Publicado
                  </span>
                  <span className="text-xs text-zinc-300 line-through">
                    {c.titulo}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
const PUNTO_ETAPA: Record<EtapaCinta, string> = {
  guion: "#A78BFA",
  grabacion: "#F87171",
  edicion: "#FBBF24",
  publicacion: "#34D399",
};

function mesSiguiente(anioMes: string, delta: number): string {
  const [a, m] = anioMes.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Primer día (lunes) de la grilla del mes — puede caer en el mes anterior. */
function primerDiaGrilla(anioMes: string): string {
  return lunesDeLaSemana(`${anioMes}-01`);
}

/**
 * Vista mensual: grilla de 6 semanas con un punto de color por etapa que toca
 * cada día (violeta guion, rojo grabar, ámbar editar, verde publicar). Al tocar
 * un día se abre el detalle debajo con las piezas y sus etapas.
 */
const CalendarioMensualContenido: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const [anioMes, setAnioMes] = useState(hoy.slice(0, 7));
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const contenidos = useLiveQuery(() => db.contenido.toArray()) ?? [];

  const inicio = primerDiaGrilla(anioMes);
  const dias = Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
  const publicadasDe = (dia: string) =>
    contenidos.filter(
      (c) =>
        c.estado === "Publicado" &&
        c.fechaPublicacion !== undefined &&
        diaISODeMs(c.fechaPublicacion) === dia
    );
  const detalle = seleccionado
    ? {
        tareas: tareasDelDia(contenidos, seleccionado),
        publicadas: publicadasDe(seleccionado),
      }
    : null;

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
              setAnioMes(hoy.slice(0, 7));
              setSeleccionado(null);
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

      <div className="flex flex-wrap gap-3 text-[10px] text-zinc-500">
        {(Object.keys(PUNTO_ETAPA) as EtapaCinta[]).map((e) => (
          <span key={e} className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: PUNTO_ETAPA[e] }}
            />
            {ETIQUETA_ETAPA[e]}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {NOMBRES.map((n) => (
          <span
            key={n}
            className="text-center text-[9px] font-bold text-zinc-600 uppercase"
          >
            {n}
          </span>
        ))}
        {dias.map((dia) => {
          const tareas = tareasDelDia(contenidos, dia);
          const publicadas = publicadasDe(dia).length;
          const etapas = Array.from(new Set(tareas.map((t) => t.etapa)));
          const esDelMes = dia.slice(0, 7) === anioMes;
          const esHoy = dia === hoy;
          return (
            <button
              key={dia}
              onClick={() => setSeleccionado(dia)}
              className={`flex min-h-14 flex-col items-center gap-1 rounded-lg border p-1.5 transition-all ${
                dia === seleccionado
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
                {etapas.map((e) => (
                  <span
                    key={e}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: PUNTO_ETAPA[e] }}
                  />
                ))}
                {publicadas > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                )}
              </div>
              {tareas.length + publicadas > 0 && (
                <span className="text-[9px] text-zinc-600">
                  {tareas.length + publicadas}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {seleccionado && detalle && (
        <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#18181B] p-3">
          <span className="text-xs font-bold text-zinc-300">
            {seleccionado}
          </span>
          {detalle.tareas.length === 0 && detalle.publicadas.length === 0 && (
            <span className="text-xs text-zinc-600">
              Nada planificado este día.
            </span>
          )}
          {detalle.tareas.map((t) => (
            <TarjetaTarea
              key={`${t.contenido.id}-${t.etapa}`}
              contenido={t.contenido}
              etapa={t.etapa}
            />
          ))}
          {detalle.publicadas.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border-l-2 border-zinc-600 bg-[#0D0D0F] p-2 opacity-60"
            >
              <span className="block text-[10px] font-bold text-zinc-500 uppercase">
                Publicado
              </span>
              <span className="text-xs text-zinc-300 line-through">
                {c.titulo}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Calendario del contenido, semanal o mensual. */
export const CalendarioContenido: React.FC = () => {
  const [vista, setVista] = useState<"semana" | "mes">("semana");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 self-start rounded-xl border border-[#2A2A2E] bg-[#18181B] p-1">
        {(["semana", "mes"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold uppercase ${
              vista === v
                ? "bg-[#10B981] text-zinc-950"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      {vista === "semana" ? (
        <CalendarioSemanalContenido />
      ) : (
        <CalendarioMensualContenido />
      )}
    </div>
  );
};
