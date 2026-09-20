"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { Badge } from "../badge";
import {
  ETIQUETA_MOTIVO_DESVIO,
  MOTIVOS_DESVIO,
  type Actividad,
  type MotivoDesvio,
} from "../../../domain/entidades/actividad.entity";
import { calcularRitmoObjetivo } from "../../../domain/entidades/objetivo-cuantificable.entity";
import {
  lunesDeLaSemana,
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

const SIN_ACTIVIDADES: Actividad[] = [];

/**
 * Repaso de la semana — una sola vista con lo que hace falta para saber
 * "cómo voy" y qué ajustar: qué se hizo, qué se cortó y por qué, y qué
 * objetivos/fases están atrasados. No cambia nada, solo junta lo que ya
 * existe repartido en otras pantallas.
 */
export const PanelRepasoSemanal: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const lunes = lunesDeLaSemana(hoy);
  const domingo = sumarDias(lunes, 6);
  const desdeMs = new Date(`${lunes}T00:00:00`).getTime();

  const actividades =
    useLiveQuery(
      () =>
        db.actividad
          .where("diaTarea")
          .between(lunes, domingo, true, true)
          .and((a) => a.tipo !== "backlog")
          .toArray(),
      [lunes, domingo]
    ) || SIN_ACTIVIDADES;

  const conteoMotivos =
    useLiveQuery(async () => {
      const filas = await db.personal_historial
        .filter((h) => h.entidadTipo === "actividad" && h.creadoEn >= desdeMs)
        .toArray();
      const conteo: Partial<Record<MotivoDesvio, number>> = {};
      for (const h of filas) {
        const motivo = (h.campoNuevo as { motivo?: MotivoDesvio } | undefined)
          ?.motivo;
        if (motivo) conteo[motivo] = (conteo[motivo] ?? 0) + 1;
      }
      return conteo;
    }, [desdeMs]) || {};

  const objetivosAtrasados =
    useLiveQuery(async () => {
      const activos = await db.objetivo_cuantificable
        .filter((o) => o.estado === "activo" || o.estado === "vencido")
        .toArray();
      return activos
        .map((o) => ({ o, ritmo: calcularRitmoObjetivo(o, hoy) }))
        .filter(
          ({ ritmo }) =>
            ritmo.estado === "atrasado" || ritmo.estado === "vencido"
        );
    }, [hoy]) || [];

  const fasesAtrasadas =
    useLiveQuery(async () => {
      const abiertas = await db.fase_personal
        .where("estado")
        .equals("abierta")
        .toArray();
      const entregables = new Map(
        (await db.entregable.toArray()).map((e) => [e.id, e])
      );
      return abiertas
        .filter((f) => {
          const e = entregables.get(f.entregableId);
          return (
            e?.estado === "activo" && f.diaInicio <= hoy && f.diaLimite >= hoy
          );
        })
        .map((f) => ({ f, ritmo: calcularRitmoObjetivo(f, hoy) }))
        .filter(({ ritmo }) => ritmo.estado === "atrasado");
    }, [hoy]) || [];

  const hechas = actividades.filter((a) => a.estado === "completada").length;
  const canceladas = actividades.filter((a) => a.estado === "cancelada").length;
  const migradas = actividades.filter((a) => a.estado === "migrada").length;
  const vencidasSinResolver = actividades.filter(
    (a) => a.estado === "pendiente" && (a.diaTarea ?? hoy) < hoy
  ).length;
  const motivosPresentes = MOTIVOS_DESVIO.filter((m) => conteoMotivos[m]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.History className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Repaso de la semana ({lunes} → {domingo})
        </h3>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge color="emerald">{hechas} hechas</Badge>
        <Badge color="sky">{migradas} pasadas a otro día</Badge>
        <Badge color="zinc">{canceladas} canceladas</Badge>
        {vencidasSinResolver > 0 && (
          <Badge color="amber">
            {vencidasSinResolver} vencidas sin resolver
          </Badge>
        )}
      </div>

      {motivosPresentes.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Por qué se desviaron
          </span>
          <div className="flex flex-wrap gap-1.5">
            {motivosPresentes.map((m) => (
              <Badge key={m} color="amber">
                {ETIQUETA_MOTIVO_DESVIO[m]}: {conteoMotivos[m]}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1 border-t border-[#2A2A2E] pt-3">
        <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
          Para ajustar
        </span>
        {objetivosAtrasados.length === 0 && fasesAtrasadas.length === 0 && (
          <p className="text-xs text-zinc-600">
            Nada atrasado ahora — ningún objetivo ni fase vigente por debajo del
            ritmo.
          </p>
        )}
        {objetivosAtrasados.map(({ o, ritmo }) => (
          <p key={o.id} className="text-xs text-zinc-400">
            <span className="font-bold text-amber-400">Objetivo</span>{" "}
            {o.titulo}: {o.progresoActual}/{o.cantidadObjetivo} {o.unidad}
            {ritmo.estado === "vencido"
              ? " — venció, ajustá fecha/meta"
              : ` — necesitás ${ritmo.porDiaNecesario.toFixed(1)}/día`}
          </p>
        ))}
        {fasesAtrasadas.map(({ f, ritmo }) => (
          <p key={f.id} className="text-xs text-zinc-400">
            <span className="font-bold text-amber-400">Fase</span> {f.titulo}:{" "}
            {f.progresoActual}/{f.cantidadObjetivo} {f.unidad} — necesitás{" "}
            {ritmo.porDiaNecesario.toFixed(1)}/día
          </p>
        ))}
        {(objetivosAtrasados.length > 0 || fasesAtrasadas.length > 0) && (
          <p className="text-[11px] text-zinc-600">
            En &quot;Mes&quot; podés usar Ajustar o Replantear con IA en el
            objetivo, y Ajustar en cada fase.
          </p>
        )}
      </div>
    </div>
  );
};
