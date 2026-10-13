"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Badge, type BadgeColor } from "../badge";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { ChipsMotivoDesvio } from "./chips-motivo-desvio";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import {
  etiquetaMotivoDesvio,
  repartirEnDias,
  type Actividad,
  type MotivoDesvio,
} from "../../../domain/entidades/actividad.entity";
import type { Entregable } from "../../../domain/entidades/entregable.entity";
import {
  lunesDeLaSemana,
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";
import { DIAS_CORTOS, formatoDiaCorto } from "./calendario-utils";

const actividadesUseCase = new GestionarActividadesUseCase();
const SIN_ACTIVIDADES: Actividad[] = [];
const SIN_ENTREGABLES: Entregable[] = [];

interface MetaSemanalResumen {
  clave: string;
  entregableId?: string;
  titulo: string;
  unidad: string;
  metaSemana: number;
  hechoSemana: number;
  faltanteSemana: number;
  metaTotalEntregable?: number;
  progresoTotalEntregable?: number;
  actividadesPendientesIds: string[];
}

function calcularRangoVideojuego(porcentaje: number): {
  nombre: string;
  color: BadgeColor;
  mensaje: string;
} {
  if (porcentaje >= 100) {
    return {
      nombre: "Rango Diamante",
      color: "emerald",
      mensaje: "Semana perfecta. Cumpliste el 100% de lo propuesto.",
    };
  }
  if (porcentaje >= 80) {
    return {
      nombre: "Rango Oro",
      color: "emerald",
      mensaje: "Gran semana. Ritmo sólido y consistente.",
    };
  }
  if (porcentaje >= 50) {
    return {
      nombre: "Rango Plata",
      color: "sky",
      mensaje: "Buen avance. Elegí abajo qué hacer con lo que faltó.",
    };
  }
  return {
    nombre: "Rango Bronce",
    color: "amber",
    mensaje:
      "Semana exigente. Calibrá la carga con 1 clic para no acumular deuda.",
  };
}

const TarjetaDecisionMetaSemanal: React.FC<{
  meta: MetaSemanalResumen;
  lunesProximaSemana: string;
}> = ({ meta, lunesProximaSemana }) => {
  const { mostrarToast } = useToast();
  const [opcionActiva, setOpcionActiva] = useState<
    "ninguna" | "dejar_asi" | "distribuir" | "ajustar_objetivo"
  >("ninguna");
  const [motivo, setMotivo] = useState<MotivoDesvio | undefined>(undefined);
  const [guardando, setGuardando] = useState(false);

  // Estado para Opción B: Distribuir entre Lun..Dom de la próxima semana
  const diasProximaSemana = useMemo(
    () => Array.from({ length: 7 }, (_, i) => sumarDias(lunesProximaSemana, i)),
    [lunesProximaSemana]
  );

  const [asignacionPorDia, setAsignacionPorDia] = useState<
    Record<string, number>
  >(() => {
    const porDefecto = repartirEnDias(meta.faltanteSemana, 5);
    const inicial: Record<string, number> = {};
    diasProximaSemana.forEach((dia, idx) => {
      inicial[dia] = idx < 5 ? (porDefecto[idx] ?? 0) : 0;
    });
    return inicial;
  });

  // Estado para Opción C: Ajustar objetivo total
  const metaTotalSugerida = Math.max(
    1,
    (meta.metaTotalEntregable ?? meta.metaSemana) - meta.faltanteSemana
  );
  const [nuevaMetaTotal, setNuevaMetaTotal] = useState(
    String(metaTotalSugerida)
  );

  const totalAsignadoDias = Object.values(asignacionPorDia).reduce(
    (s, c) => s + c,
    0
  );
  const quedaEnReserva = Math.max(0, meta.faltanteSemana - totalAsignadoDias);

  const cambiarCantidadDia = (dia: string, delta: number) => {
    setAsignacionPorDia((prev) => {
      const actual = prev[dia] ?? 0;
      const nuevo = Math.max(0, actual + delta);
      const sumaOtros = Object.entries(prev)
        .filter(([k]) => k !== dia)
        .reduce((s, [, v]) => s + v, 0);
      if (sumaOtros + nuevo > meta.faltanteSemana) return prev;
      return { ...prev, [dia]: nuevo };
    });
  };

  const repartirParejoLunVie = () => {
    const partes = repartirEnDias(meta.faltanteSemana, 5);
    const nuevo: Record<string, number> = {};
    diasProximaSemana.forEach((dia, idx) => {
      nuevo[dia] = idx < 5 ? (partes[idx] ?? 0) : 0;
    });
    setAsignacionPorDia(nuevo);
  };

  const mandarTodoAReserva = () => {
    const vacio: Record<string, number> = {};
    diasProximaSemana.forEach((dia) => {
      vacio[dia] = 0;
    });
    setAsignacionPorDia(vacio);
  };

  const ejecutarDecision = async (
    decision: "dejar_asi" | "distribuir" | "ajustar_objetivo"
  ) => {
    setGuardando(true);
    const reparto =
      decision === "distribuir"
        ? Object.entries(asignacionPorDia)
            .filter(([, cant]) => cant > 0)
            .map(([dia, cantidad]) => ({ dia, cantidad }))
        : undefined;

    const res = await actividadesUseCase.resolverFaltanteSemanal({
      actividadesPendientesIds: meta.actividadesPendientesIds,
      entregableId: meta.entregableId,
      decision,
      reparto,
      guardarEnReserva: decision === "distribuir" ? quedaEnReserva : undefined,
      nuevaMetaEntregable:
        decision === "ajustar_objetivo" ? Number(nuevaMetaTotal) : undefined,
      motivo,
    });
    setGuardando(false);
    if (!res.ok) {
      mostrarToast(res.error!.mensaje, "error");
      return;
    }
    mostrarToast(
      decision === "dejar_asi"
        ? "Semana cerrada sin arrastrar carga extra."
        : decision === "distribuir"
          ? `Faltante distribuido (${totalAsignadoDias} agendados${quedaEnReserva > 0 ? `, ${quedaEnReserva} en Reserva` : ""}).`
          : `Objetivo ajustado a ${nuevaMetaTotal} ${meta.unidad}.`,
      "exito"
    );
    setOpcionActiva("ninguna");
  };

  const pct =
    meta.metaSemana > 0
      ? Math.min(100, Math.round((meta.hechoSemana / meta.metaSemana) * 100))
      : 100;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-zinc-100">
              {meta.titulo}
            </span>
            <Badge
              color={
                meta.faltanteSemana === 0
                  ? "emerald"
                  : pct >= 60
                    ? "sky"
                    : "amber"
              }
            >
              Esta semana: {meta.hechoSemana} de {meta.metaSemana} {meta.unidad}{" "}
              ({pct}%)
            </Badge>
          </div>
          {meta.metaTotalEntregable !== undefined && (
            <p className="mt-0.5 text-xs text-zinc-500">
              Acumulado del objetivo: {meta.progresoTotalEntregable ?? 0} /{" "}
              {meta.metaTotalEntregable} {meta.unidad}
              {meta.faltanteSemana > 0 && (
                <span className="ml-2 font-semibold text-amber-400">
                  · Faltan {meta.faltanteSemana} {meta.unidad} de esta semana
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Barra estilo XP */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-900">
        <div
          className={`h-full rounded-full transition-all ${
            meta.faltanteSemana === 0
              ? "bg-emerald-500"
              : pct >= 60
                ? "bg-sky-500"
                : "bg-amber-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {meta.faltanteSemana > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-[#2A2A2E] pt-2.5">
          <span className="text-xs font-bold text-zinc-300">
            ¿Qué querés hacer con los {meta.faltanteSemana} {meta.unidad} que
            faltaron?
          </span>

          {/* Las 3 opciones exactas pedidas por el usuario */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() =>
                setOpcionActiva(
                  opcionActiva === "dejar_asi" ? "ninguna" : "dejar_asi"
                )
              }
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                opcionActiva === "dejar_asi"
                  ? "border-amber-500/50 bg-amber-500/10"
                  : "border-[#2A2A2E] bg-[#18181B] hover:border-zinc-700"
              }`}
            >
              <span className="text-xs font-bold text-zinc-100">
                a) Dejarlo así
              </span>
              <span className="text-xs text-zinc-500">
                No recargar la próxima semana (posiblemente quedes{" "}
                {meta.faltanteSemana} abajo de la meta).
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setOpcionActiva(
                  opcionActiva === "distribuir" ? "ninguna" : "distribuir"
                )
              }
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                opcionActiva === "distribuir"
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-[#2A2A2E] bg-[#18181B] hover:border-zinc-700"
              }`}
            >
              <span className="text-xs font-bold text-emerald-400">
                b) Distribuir los {meta.faltanteSemana} (o a Reserva)
              </span>
              <span className="text-xs text-zinc-500">
                Elegí qué días de la próxima semana sumarlos o guardalos en tu
                Reserva para otra semana.
              </span>
            </button>

            {meta.metaTotalEntregable !== undefined && (
              <button
                type="button"
                onClick={() =>
                  setOpcionActiva(
                    opcionActiva === "ajustar_objetivo"
                      ? "ninguna"
                      : "ajustar_objetivo"
                  )
                }
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                  opcionActiva === "ajustar_objetivo"
                    ? "border-sky-500/50 bg-sky-500/10"
                    : "border-[#2A2A2E] bg-[#18181B] hover:border-zinc-700"
                }`}
              >
                <span className="text-xs font-bold text-sky-400">
                  c) Ajustar objetivo ({meta.metaTotalEntregable} →{" "}
                  {metaTotalSugerida})
                </span>
                <span className="text-xs text-zinc-500">
                  Bajar la meta total en {meta.faltanteSemana} para sincerar el
                  plan y seguir al día.
                </span>
              </button>
            )}
          </div>

          {/* Panel expandido según la opción elegida */}
          {opcionActiva !== "ninguna" && (
            <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3">
              {opcionActiva === "dejar_asi" && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-zinc-400">
                    Se cerrarán las tareas pendientes de esta semana con los{" "}
                    <strong className="text-zinc-200">
                      {meta.hechoSemana} {meta.unidad}
                    </strong>{" "}
                    logrados, sin agregar carga extra a la próxima semana.
                  </p>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500">
                      Etiqueta de por qué no se completó (opcional, 1 clic):
                    </span>
                    <ChipsMotivoDesvio onElegir={(m) => setMotivo(m)} />
                    {motivo && (
                      <span className="text-xs font-bold text-emerald-400">
                        Motivo seleccionado: {etiquetaMotivoDesvio(motivo)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      cargando={guardando}
                      onClick={() => void ejecutarDecision("dejar_asi")}
                    >
                      Confirmar y dejar así
                    </Button>
                  </div>
                </div>
              )}

              {opcionActiva === "distribuir" && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-zinc-300">
                      Elegí cuántos sumar cada día de la próxima semana:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={repartirParejoLunVie}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
                      >
                        Repartir Lun–Vie parejo
                      </button>
                      <button
                        type="button"
                        onClick={mandarTodoAReserva}
                        className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2.5 py-1 text-xs font-bold text-zinc-300 hover:border-zinc-700"
                      >
                        Guardar los {meta.faltanteSemana} en Reserva
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                    {diasProximaSemana.map((dia, idx) => {
                      const cant = asignacionPorDia[dia] ?? 0;
                      return (
                        <div
                          key={dia}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 ${
                            cant > 0
                              ? "border-emerald-500/40 bg-emerald-500/5"
                              : "border-[#2A2A2E] bg-[#0D0D0F]"
                          }`}
                        >
                          <span className="text-xs font-bold text-zinc-300">
                            {DIAS_CORTOS[idx]}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {formatoDiaCorto(dia)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => cambiarCantidadDia(dia, -1)}
                              disabled={cant <= 0}
                              className="flex h-6 w-6 items-center justify-center rounded border border-[#2A2A2E] bg-[#18181B] text-xs font-bold text-zinc-300 hover:border-zinc-600 disabled:opacity-30"
                            >
                              -
                            </button>
                            <span className="min-w-[24px] text-center font-mono text-xs font-bold text-emerald-400">
                              +{cant}
                            </span>
                            <button
                              type="button"
                              onClick={() => cambiarCantidadDia(dia, 1)}
                              disabled={
                                totalAsignadoDias >= meta.faltanteSemana
                              }
                              className="flex h-6 w-6 items-center justify-center rounded border border-[#2A2A2E] bg-[#18181B] text-xs font-bold text-zinc-300 hover:border-zinc-600 disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-2 text-xs">
                    <span className="text-zinc-300">
                      Agendados próxima semana:{" "}
                      <strong className="text-emerald-400">
                        {totalAsignadoDias} {meta.unidad}
                      </strong>
                    </span>
                    <span className="text-zinc-400">
                      Quedan en Reserva (para más adelante):{" "}
                      <strong className="text-amber-400">
                        {quedaEnReserva} {meta.unidad}
                      </strong>
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500">
                      Etiqueta de por qué quedó pendiente esta semana
                      (opcional):
                    </span>
                    <ChipsMotivoDesvio onElegir={(m) => setMotivo(m)} />
                    {motivo && (
                      <span className="text-xs font-bold text-emerald-400">
                        Motivo seleccionado: {etiquetaMotivoDesvio(motivo)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      cargando={guardando}
                      onClick={() => void ejecutarDecision("distribuir")}
                    >
                      Aplicar distribución
                    </Button>
                  </div>
                </div>
              )}

              {opcionActiva === "ajustar_objetivo" && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                    <span>Nueva meta total del entregable:</span>
                    <input
                      type="number"
                      min={1}
                      value={nuevaMetaTotal}
                      onChange={(e) => setNuevaMetaTotal(e.target.value)}
                      className="w-24 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2.5 py-1.5 font-mono text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
                    />
                    <span className="text-zinc-500">
                      {meta.unidad} (antes: {meta.metaTotalEntregable})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      cargando={guardando}
                      onClick={() => void ejecutarDecision("ajustar_objetivo")}
                    >
                      Confirmar ajuste de objetivo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Panel Checkpoint Semanal (estilo Videojuego):
 * - Muestra las stats de la semana (Rango, XP, hechas vs desviadas y motivos).
 * - Para cada meta cuantificable de la semana con faltante, ofrece las 3 decisiones en 1 clic:
 *   a) Dejarlo así
 *   b) Distribuir en los días de la próxima semana o guardar en Reserva
 *   c) Ajustar objetivo total
 */
export const PanelCheckpointSemanal: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const lunes = lunesDeLaSemana(hoy);
  const domingo = sumarDias(lunes, 6);
  const lunesProximaSemana = sumarDias(lunes, 7);
  const desdeMs = new Date(`${lunes}T00:00:00`).getTime();

  const actividadesSemana =
    useLiveQuery(
      () =>
        db.actividad
          .where("diaTarea")
          .between(lunes, domingo, true, true)
          .and((a) => a.tipo !== "backlog")
          .toArray(),
      [lunes, domingo]
    ) || SIN_ACTIVIDADES;

  const entregables =
    useLiveQuery(() => db.entregable.toArray(), []) || SIN_ENTREGABLES;

  const conteoMotivos =
    useLiveQuery(async () => {
      const filas = await db.personal_historial
        .filter((h) => h.entidadTipo === "actividad" && h.creadoEn >= desdeMs)
        .toArray();
      const conteo: Partial<Record<MotivoDesvio, number>> = {};
      for (const h of filas) {
        const m = (h.campoNuevo as { motivo?: MotivoDesvio } | undefined)
          ?.motivo;
        if (m) conteo[m] = (conteo[m] ?? 0) + 1;
      }
      return conteo;
    }, [desdeMs]) || {};

  const entregablesMap = useMemo(
    () => new Map(entregables.map((e) => [e.id, e])),
    [entregables]
  );

  // Agrupar actividades cuantificables de la semana por entregableId (o descripción si es suelta)
  const metasSemanales = useMemo<MetaSemanalResumen[]>(() => {
    const grupos = new Map<string, MetaSemanalResumen>();
    for (const act of actividadesSemana) {
      if (act.cantidadObjetivo === undefined || act.estado === "cancelada") {
        continue;
      }
      const clave = act.entregableId
        ? `ent_${act.entregableId}`
        : `desc_${act.descripcion}`;
      const ent = act.entregableId
        ? entregablesMap.get(act.entregableId)
        : undefined;
      const actual = grupos.get(clave) ?? {
        clave,
        entregableId: act.entregableId,
        titulo: ent?.titulo ?? act.descripcion,
        unidad: act.unidad ?? ent?.unidad ?? "unidades",
        metaSemana: 0,
        hechoSemana: 0,
        faltanteSemana: 0,
        metaTotalEntregable: ent?.cantidadObjetivo,
        progresoTotalEntregable: ent?.progresoActual,
        actividadesPendientesIds: [],
      };
      actual.metaSemana += act.cantidadObjetivo;
      const hechoAct =
        act.estado === "completada"
          ? (act.progresoActual ?? act.cantidadObjetivo)
          : (act.progresoActual ?? 0);
      actual.hechoSemana += hechoAct;
      if (act.estado === "pendiente") {
        actual.actividadesPendientesIds.push(act.id);
      }
      grupos.set(clave, actual);
    }
    return Array.from(grupos.values()).map((g) => ({
      ...g,
      faltanteSemana: Math.max(0, g.metaSemana - g.hechoSemana),
    }));
  }, [actividadesSemana, entregablesMap]);

  const totalUnidadesSemana = metasSemanales.reduce(
    (s, m) => s + m.metaSemana,
    0
  );
  const hechasUnidadesSemana = metasSemanales.reduce(
    (s, m) => s + m.hechoSemana,
    0
  );
  const tareasSimples = actividadesSemana.filter(
    (a) => a.cantidadObjetivo === undefined && a.estado !== "cancelada"
  );
  const simplesHechas = tareasSimples.filter(
    (a) => a.estado === "completada"
  ).length;

  const pctGlobal = useMemo(() => {
    if (totalUnidadesSemana > 0) {
      return Math.min(
        100,
        Math.round((hechasUnidadesSemana / totalUnidadesSemana) * 100)
      );
    }
    if (tareasSimples.length > 0) {
      return Math.round((simplesHechas / tareasSimples.length) * 100);
    }
    return 0;
  }, [
    totalUnidadesSemana,
    hechasUnidadesSemana,
    tareasSimples.length,
    simplesHechas,
  ]);

  const rango = calcularRangoVideojuego(pctGlobal);
  const motivosPresentes = Object.keys(conteoMotivos).filter(
    (m) => conteoMotivos[m]
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Icono.Trophy className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100">
                Checkpoint Semanal ({formatoDiaCorto(lunes)} →{" "}
                {formatoDiaCorto(domingo)})
              </h3>
              <Badge color={rango.color}>{rango.nombre}</Badge>
            </div>
            <p className="text-xs text-zinc-400">{rango.mensaje}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block font-mono text-xl font-extrabold text-zinc-100">
              {pctGlobal}%
            </span>
            <span className="text-[10px] tracking-wider text-zinc-500 uppercase">
              Score Semanal
            </span>
          </div>
        </div>
      </div>

      {/* Resumen de tareas y motivos de desvío */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge color="emerald">
          {actividadesSemana.filter((a) => a.estado === "completada").length}{" "}
          tareas completadas
        </Badge>
        <Badge color="amber">
          {actividadesSemana.filter((a) => a.estado === "pendiente").length}{" "}
          pendientes en la semana
        </Badge>
        {motivosPresentes.map((m) => (
          <Badge key={m} color="zinc">
            No hechas por {etiquetaMotivoDesvio(m).toLowerCase()}:{" "}
            {conteoMotivos[m]}
          </Badge>
        ))}
      </div>

      {/* Tarjetas de decisión por cada meta cuantificable de la semana */}
      {metasSemanales.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {metasSemanales.map((meta) => (
            <TarjetaDecisionMetaSemanal
              key={meta.clave}
              meta={meta}
              lunesProximaSemana={lunesProximaSemana}
            />
          ))}
        </div>
      )}
    </div>
  );
};
