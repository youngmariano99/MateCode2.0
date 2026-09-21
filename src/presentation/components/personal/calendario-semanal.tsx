"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import {
  ETIQUETA_MOTIVO_DESVIO,
  MOTIVOS_DESVIO,
  type Actividad,
  type MotivoDesvio,
} from "../../../domain/entidades/actividad.entity";
import type { Entregable } from "../../../domain/entidades/entregable.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";
import { sumarDias as sumarDiasISO } from "../../../domain/entidades/personal.entity";
import { recurrentesDelDia } from "../../../domain/entidades/metas-periodo.entity";
import { PanelMetasPeriodo } from "./panel-metas-periodo";
import { BotonNuevaTarea } from "./tarea-rapida";
import {
  useColorPorObjetivo,
  useEntregablesRecurrentes,
  lunesDeLaSemana,
  sumarDias,
  NOMBRES_DIA,
  formatoDiaCorto,
} from "./calendario-utils";

const actividadesUseCase = new GestionarActividadesUseCase();
const SIN_ITEMS: never[] = [];

const ICONO_TIPO_ACTIVIDAD = {
  enfoque: Icono.Target,
  mantenimiento: Icono.ListTodo,
  backlog: Icono.Inbox,
} as const;

export const ChipActividad: React.FC<{
  actividad: Actividad;
  color: string;
}> = ({ actividad, color }) => {
  const { mostrarToast } = useToast();
  const IconoTipo = ICONO_TIPO_ACTIVIDAD[actividad.tipo];

  const completar = async () => {
    const res = await actividadesUseCase.completarActividad(actividad.id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  // Pasar a otro día o cancelar es un desvío: se pregunta el motivo (opcional,
  // un tap) y queda en el historial para el repaso semanal. Nunca se borra.
  const [pidiendoMotivo, setPidiendoMotivo] = useState<
    "migrar" | "cancelar" | null
  >(null);

  const resolverConMotivo = async (motivo?: MotivoDesvio) => {
    const accion = pidiendoMotivo;
    setPidiendoMotivo(null);
    const res =
      accion === "migrar"
        ? await actividadesUseCase.migrarActividad({
            id: actividad.id,
            nuevoDiaTarea: sumarDiasISO(
              actividad.diaTarea ?? obtenerDiaTareaHoy(),
              1
            ),
            motivo,
          })
        : await actividadesUseCase.cancelarActividad(actividad.id, motivo);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const resuelta = actividad.estado !== "pendiente";

  if (pidiendoMotivo) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2">
        <span className="text-xs text-zinc-300">
          {actividad.descripcion}{" "}
          <span className="text-zinc-600">
            —{" "}
            {pidiendoMotivo === "migrar"
              ? "pasa al día siguiente"
              : "se cancela (no se borra)"}
            . ¿Por qué?
          </span>
        </span>
        <div className="flex flex-wrap gap-1">
          {MOTIVOS_DESVIO.map((m) => (
            <button
              key={m}
              onClick={() => void resolverConMotivo(m)}
              className="rounded border border-[#2A2A2E] px-1.5 py-0.5 text-[10px] text-zinc-300 hover:border-zinc-500"
            >
              {ETIQUETA_MOTIVO_DESVIO[m]}
            </button>
          ))}
          <button
            onClick={() => void resolverConMotivo(undefined)}
            className="text-[10px] font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Sin motivo
          </button>
          <button
            onClick={() => setPidiendoMotivo(null)}
            className="text-[10px] font-bold text-zinc-600 uppercase hover:text-zinc-300"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-1.5 rounded-lg border-l-2 bg-[#0D0D0F] p-2 ${resuelta ? "opacity-50" : ""}`}
      style={{ borderLeftColor: color }}
    >
      <IconoTipo className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" />
      <span
        className={`flex-1 text-xs text-zinc-200 ${resuelta ? "line-through" : ""}`}
      >
        {actividad.descripcion}
      </span>
      {!resuelta && (
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => void completar()}
            title="Completar"
            className="rounded p-0.5 text-emerald-400 hover:bg-emerald-500/10"
          >
            <Icono.Check className="h-3 w-3" />
          </button>
          {actividad.tipo !== "backlog" && (
            <button
              onClick={() => setPidiendoMotivo("migrar")}
              title="Pasar al día siguiente"
              className="rounded p-0.5 text-zinc-600 hover:text-sky-400"
            >
              <Icono.ChevronRight className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => setPidiendoMotivo("cancelar")}
            title="Cancelar"
            className="rounded p-0.5 text-zinc-600 hover:text-red-400"
          >
            <Icono.Close className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export const ChipEntregable: React.FC<{
  entregable: Entregable;
  color: string;
}> = ({ entregable, color }) => (
  <div
    className="flex items-start gap-1.5 rounded-lg border-l-2 border-dashed bg-[#0D0D0F] p-2"
    style={{ borderLeftColor: color }}
  >
    <Icono.Package className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" />
    <div className="flex-1">
      <span className="block text-xs font-bold text-zinc-300">
        {entregable.titulo}
      </span>
      <span className="text-[10px] text-zinc-600">
        Entregable
        {entregable.cantidadObjetivo !== undefined &&
          ` — ${entregable.progresoActual}/${entregable.cantidadObjetivo} ${entregable.unidad || ""}`}
      </span>
    </div>
  </div>
);

/** Compromiso recurrente que toca ese día (proyectado: todavía no es una Actividad, se materializa el propio día). */
export const ChipRecurrente: React.FC<{
  entregable: Entregable;
  color: string;
}> = ({ entregable, color }) => (
  <div
    className="flex items-start gap-1.5 rounded-lg border-l-2 border-dotted bg-[#0D0D0F] p-2"
    style={{ borderLeftColor: color }}
  >
    <Icono.Repeat className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" />
    <div className="flex-1">
      <span className="block text-xs text-zinc-300">{entregable.titulo}</span>
      <span className="text-[10px] text-zinc-600">Recurrente</span>
    </div>
  </div>
);

/**
 * Calendario semanal — 7 columnas (Lun-Dom), Actividades en su `diaTarea` +
 * Entregables como hito en su `diaLimite`, coloreados por Área (vía
 * Objetivo→Área, ver calendario-utils.ts). Vista de solo-corroborar-y-
 * resolver-rápido: no reemplaza al navegador jerárquico para editar fechas o
 * cantidades, solo para ver de un vistazo si la semana quedó bien armada.
 */
export const CalendarioSemanal: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const [ancla, setAncla] = useState(lunesDeLaSemana(hoy));
  const colorPorObjetivo = useColorPorObjetivo();
  const recurrentes = useEntregablesRecurrentes();

  const diasSemana = Array.from({ length: 7 }, (_, i) => sumarDias(ancla, i));
  const fin = diasSemana[6];

  const actividades =
    useLiveQuery(
      () =>
        db.actividad
          .where("diaTarea")
          .between(ancla, fin, true, true)
          .and((a) => a.tipo !== "backlog")
          .toArray(),
      [ancla, fin]
    ) || SIN_ITEMS;

  const entregables =
    useLiveQuery(
      () =>
        db.entregable
          .where("diaLimite")
          .between(ancla, fin, true, true)
          .toArray(),
      [ancla, fin]
    ) || SIN_ITEMS;

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
          {formatoDiaCorto(ancla)} — {formatoDiaCorto(fin)}
        </span>
      </div>

      <PanelMetasPeriodo
        desde={ancla}
        hasta={fin}
        titulo="Metas de la semana"
      />

      <div className="grid grid-cols-1 gap-2 overflow-x-auto sm:grid-cols-7">
        {diasSemana.map((dia) => {
          const esHoy = dia === hoy;
          const itemsDelDia = [
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
                  {NOMBRES_DIA[new Date(`${dia}T00:00:00Z`).getUTCDay()].slice(
                    0,
                    3
                  )}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                  {formatoDiaCorto(dia)}
                  <BotonNuevaTarea dia={dia} compacto />
                </span>
              </div>
              {itemsDelDia.length === 0 && (
                <span className="text-[10px] text-zinc-700">Sin nada</span>
              )}
              {itemsDelDia.map((item) =>
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
          );
        })}
      </div>
    </div>
  );
};
