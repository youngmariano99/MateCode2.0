"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { Badge, type BadgeColor } from "../badge";
import { Button } from "../button";
import { Dialog } from "../dialog";
import { SeccionFasesEntregable } from "./seccion-fases-entregable";
import {
  DistribuirProyectoModal,
  RepartirEnDiasModal,
} from "./asistente-distribuir";
import { AjustarConIAModal } from "./ajustar-con-ia-modal";
import { ConfirmarEliminacionNodo } from "./confirmar-eliminacion-nodo";
import { AjustarFechaModal } from "./ajustar-fecha-modal";
import {
  AjustarCantidadModal,
  type NivelConCantidad,
} from "./ajustar-cantidad-modal";
import { PanelHistorialPersonal } from "./panel-historial-personal";
import {
  ModalCrearElementoPersonal,
  type TipoElementoCrear,
} from "./modal-crear-elemento-personal";
import { NavegadorJerarquico } from "./navegador-jerarquico";
import type { NivelJerarquiaPersonal } from "../../../application/use-cases/personal/eliminar-nodo-personal.use-case";
import type { NivelConHijosFecha } from "../../../application/use-cases/personal/ajustar-fecha-personal.use-case";
import type { TipoEntidadHistorial } from "../../../domain/entidades/personal-historial.entity";
import {
  calcularRitmoObjetivo,
  type EstadoRitmoObjetivo,
  type ObjetivoCuantificable,
} from "../../../domain/entidades/objetivo-cuantificable.entity";
import {
  colorDeAreaEfectivo,
  type AreaPersonal,
} from "../../../domain/entidades/area-personal.entity";
import type { ProyectoPersonal } from "../../../domain/entidades/proyecto-personal.entity";
import type { Entregable } from "../../../domain/entidades/entregable.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";

const COLOR_RITMO: Record<EstadoRitmoObjetivo, BadgeColor> = {
  cumplido: "emerald",
  vencido: "red",
  al_dia: "sky",
  atrasado: "amber",
  adelantado: "emerald",
};

const ETIQUETA_RITMO: Record<EstadoRitmoObjetivo, string> = {
  cumplido: "Cumplido",
  vencido: "Vencido",
  al_dia: "Al día",
  atrasado: "Atrasado",
  adelantado: "Adelantado",
};

export const ArbolJerarquicoPersonal: React.FC<{
  onAbrirWizard?: () => void;
}> = ({ onAbrirWizard }) => {
  const hoy = obtenerDiaTareaHoy();
  const [modoVista, setModoVista] = useState<"arbol" | "tarjetas">("arbol");
  const [filtroAreaId, setFiltroAreaId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  // Nodos colapsados (por defecto todo expandido para ver el mapa completo)
  const [colapsados, setColapsados] = useState<Record<string, boolean>>({});
  const [fasesAbiertasEntId, setFasesAbiertasEntId] = useState<
    Record<string, boolean>
  >({});

  // Modales de acción
  const [crearTarget, setCrearTarget] = useState<{
    tipo: TipoElementoCrear;
    padreId?: string;
  } | null>(null);
  const [eliminarTarget, setEliminarTarget] = useState<{
    nivel: NivelJerarquiaPersonal;
    id: string;
    titulo: string;
  } | null>(null);
  const [ajustarFechaTarget, setAjustarFechaTarget] = useState<{
    nivel: NivelConHijosFecha;
    id: string;
    titulo: string;
    fechaActual: string;
  } | null>(null);
  const [ajustarCantidadTarget, setAjustarCantidadTarget] = useState<{
    nivel: NivelConCantidad;
    id: string;
    titulo: string;
    cantidadActual: number;
    unidad: string;
    bandaAceptable?: number;
    bandaMejorable?: number;
  } | null>(null);
  const [historialTarget, setHistorialTarget] = useState<{
    tipo: TipoEntidadHistorial;
    id: string;
    titulo: string;
  } | null>(null);
  const [ajustarIAObjetivo, setAjustarIAObjetivo] =
    useState<ObjetivoCuantificable | null>(null);
  const [distribuirProyecto, setDistribuirProyecto] =
    useState<ProyectoPersonal | null>(null);
  const [repartirEntregable, setRepartirEntregable] =
    useState<Entregable | null>(null);

  const areas =
    useLiveQuery(() => db.area_personal.filter((a) => a.activa).toArray()) ??
    [];
  const objetivos =
    useLiveQuery(() =>
      db.objetivo_cuantificable
        .where("estado")
        .anyOf(["activo", "vencido", "cumplido"])
        .toArray()
    ) ?? [];
  const proyectos =
    useLiveQuery(() =>
      db.proyecto_personal
        .where("estado")
        .anyOf(["activo", "vencido", "cumplido"])
        .toArray()
    ) ?? [];
  const entregables =
    useLiveQuery(() =>
      db.entregable
        .where("estado")
        .anyOf(["activo", "vencido", "cumplido"])
        .toArray()
    ) ?? [];
  const fases = useLiveQuery(() => db.fase_personal.toArray()) ?? [];

  const toggleNodo = (id: string) =>
    setColapsados((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleFasesEntregable = (id: string) =>
    setFasesAbiertasEntId((prev) => ({ ...prev, [id]: !prev[id] }));

  const textoFiltro = busqueda.trim().toLowerCase();
  const areasMostradas: AreaPersonal[] = (
    filtroAreaId ? areas.filter((a) => a.id === filtroAreaId) : areas
  ).filter((a) => {
    if (!textoFiltro) return true;
    if (a.nombre.toLowerCase().includes(textoFiltro)) return true;
    const objs = objetivos.filter((o) => o.areaId === a.id);
    return objs.some(
      (o) =>
        o.titulo.toLowerCase().includes(textoFiltro) ||
        proyectos
          .filter((p) => p.objetivoId === o.id)
          .some(
            (p) =>
              p.titulo.toLowerCase().includes(textoFiltro) ||
              entregables
                .filter((e) => e.proyectoId === p.id)
                .some((e) => e.titulo.toLowerCase().includes(textoFiltro))
          )
    );
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de controles del Mapa Jerárquico */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltroAreaId(null)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-all ${
              !filtroAreaId
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-[#2A2A2E] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Todas las áreas ({areas.length})
          </button>
          {areas.map((a) => {
            const color = colorDeAreaEfectivo(a);
            const activa = filtroAreaId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setFiltroAreaId(activa ? null : a.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all ${
                  activa
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-[#2A2A2E] text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {a.nombre}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCrearTarget({ tipo: "area" })}
            className="rounded-lg border border-dashed border-zinc-700 px-2.5 py-1 text-xs font-bold text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-400"
          >
            + Nueva Área
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar objetivo, proyecto, entregable…"
            className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/40"
          />
          <div className="flex rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-0.5">
            <button
              type="button"
              onClick={() => setModoVista("arbol")}
              className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                modoVista === "arbol"
                  ? "bg-emerald-500 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Árbol completo
            </button>
            <button
              type="button"
              onClick={() => setModoVista("tarjetas")}
              className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                modoVista === "tarjetas"
                  ? "bg-emerald-500 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Por nivel
            </button>
          </div>
        </div>
      </div>

      {modoVista === "tarjetas" ? (
        <NavegadorJerarquico />
      ) : areasMostradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-8 text-center">
          <p className="text-sm font-bold text-zinc-200">
            Todavía no hay Áreas u Objetivos para mostrar en el árbol
          </p>
          <p className="max-w-md text-xs text-zinc-500">
            Podés usar el Asistente Paso a Paso para armar tu planificación
            grande guiada, o crear tu primera Área manualmente.
          </p>
          <div className="flex flex-wrap gap-2">
            {onAbrirWizard && (
              <Button onClick={onAbrirWizard}>
                Armar planificación paso a paso
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setCrearTarget({ tipo: "area" })}
            >
              + Crear primera Área
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {areasMostradas.map((area) => {
            const color = colorDeAreaEfectivo(area);
            const areaColapsada = !!colapsados[area.id];
            const objsArea = objetivos.filter((o) => o.areaId === area.id);

            return (
              <div
                key={area.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#18181B]"
              >
                {/* Cabecera de ÁREA */}
                <div
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2A2E] bg-[#141417] px-4 py-3"
                  style={{ borderLeftWidth: 4, borderLeftColor: color }}
                >
                  <button
                    type="button"
                    onClick={() => toggleNodo(area.id)}
                    className="flex items-center gap-2 text-left"
                  >
                    <Icono.ChevronRight
                      className={`h-4 w-4 text-zinc-400 transition-transform ${
                        !areaColapsada ? "rotate-90" : ""
                      }`}
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-base font-extrabold text-zinc-100">
                      {area.nombre}
                    </span>
                    <span className="text-xs text-zinc-500">
                      ({objsArea.length} objetivo
                      {objsArea.length === 1 ? "" : "s"})
                    </span>
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setCrearTarget({ tipo: "objetivo", padreId: area.id })
                      }
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
                    >
                      + Objetivo
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setHistorialTarget({
                          tipo: "area",
                          id: area.id,
                          titulo: area.nombre,
                        })
                      }
                      title="Historial del área"
                      className="rounded border border-zinc-800 p-1.5 text-zinc-500 hover:text-sky-400"
                    >
                      <Icono.History className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEliminarTarget({
                          nivel: "area",
                          id: area.id,
                          titulo: area.nombre,
                        })
                      }
                      title="Eliminar área"
                      className="rounded border border-zinc-800 p-1.5 text-zinc-500 hover:text-red-400"
                    >
                      <Icono.Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Hijos: OBJETIVOS */}
                {!areaColapsada && (
                  <div className="flex flex-col gap-3 p-4">
                    {objsArea.length === 0 ? (
                      <div className="flex items-center justify-between rounded-xl border border-dashed border-[#2A2A2E] p-3 text-xs text-zinc-500">
                        <span>Esta área no tiene objetivos todavía.</span>
                        <button
                          type="button"
                          onClick={() =>
                            setCrearTarget({
                              tipo: "objetivo",
                              padreId: area.id,
                            })
                          }
                          className="font-bold text-emerald-400 hover:underline"
                        >
                          + Crear primer Objetivo
                        </button>
                      </div>
                    ) : (
                      objsArea.map((obj) => {
                        const ritmo = calcularRitmoObjetivo(obj, hoy);
                        const pctObj = Math.min(
                          100,
                          Math.round(
                            (obj.progresoActual /
                              Math.max(1, obj.cantidadObjetivo)) *
                              100
                          )
                        );
                        const objColapsado = !!colapsados[obj.id];
                        const proysObj = proyectos.filter(
                          (p) => p.objetivoId === obj.id
                        );

                        return (
                          <div
                            key={obj.id}
                            className="flex flex-col rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3.5"
                          >
                            {/* Fila OBJETIVO */}
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => toggleNodo(obj.id)}
                                className="flex items-start gap-2 text-left"
                              >
                                <Icono.ChevronRight
                                  className={`mt-1 h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
                                    !objColapsado ? "rotate-90" : ""
                                  }`}
                                />
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 uppercase">
                                      Objetivo
                                    </span>
                                    <span className="text-sm font-bold text-zinc-100">
                                      {obj.titulo}
                                    </span>
                                    <Badge color={COLOR_RITMO[ritmo.estado]}>
                                      {ETIQUETA_RITMO[ritmo.estado]}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                                    <span className="font-semibold text-zinc-200">
                                      {obj.progresoActual}/
                                      {obj.cantidadObjetivo} {obj.unidad} (
                                      {pctObj}%)
                                    </span>
                                    <span>
                                      · esperado hoy:{" "}
                                      {Math.round(ritmo.ritmoEsperadoHastaHoy)}{" "}
                                      {obj.unidad}
                                    </span>
                                    <span>· vence {obj.diaLimite}</span>
                                  </div>
                                </div>
                              </button>

                              <div className="flex flex-wrap items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCrearTarget({
                                      tipo: "proyecto",
                                      padreId: obj.id,
                                    })
                                  }
                                  className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20"
                                >
                                  + Proyecto
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAjustarIAObjetivo(obj)}
                                  title="Ajustar o replantear con IA"
                                  className="rounded border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:text-emerald-400"
                                >
                                  IA
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAjustarCantidadTarget({
                                      nivel: "objetivo",
                                      id: obj.id,
                                      titulo: obj.titulo,
                                      cantidadActual: obj.cantidadObjetivo,
                                      unidad: obj.unidad,
                                      bandaAceptable: obj.bandaAceptable,
                                      bandaMejorable: obj.bandaMejorable,
                                    })
                                  }
                                  title="Ajustar meta"
                                  className="rounded border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:text-amber-400"
                                >
                                  Meta
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAjustarFechaTarget({
                                      nivel: "objetivo",
                                      id: obj.id,
                                      titulo: obj.titulo,
                                      fechaActual: obj.diaLimite,
                                    })
                                  }
                                  title="Ajustar fecha límite"
                                  className="rounded border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:text-amber-400"
                                >
                                  Fecha
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEliminarTarget({
                                      nivel: "objetivo",
                                      id: obj.id,
                                      titulo: obj.titulo,
                                    })
                                  }
                                  title="Eliminar objetivo"
                                  className="rounded border border-zinc-800 p-1 text-zinc-500 hover:text-red-400"
                                >
                                  <Icono.Trash className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Barra progreso Objetivo */}
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pctObj}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>

                            {/* Hijos: PROYECTOS */}
                            {!objColapsado && (
                              <div className="mt-3 flex flex-col gap-2.5 border-l-2 border-[#232326] pl-4">
                                {proysObj.length === 0 ? (
                                  <div className="flex items-center justify-between rounded-lg border border-dashed border-zinc-800 px-3 py-2 text-xs text-zinc-500">
                                    <span>
                                      Sin proyectos bajo este objetivo.
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCrearTarget({
                                          tipo: "proyecto",
                                          padreId: obj.id,
                                        })
                                      }
                                      className="font-bold text-emerald-400 hover:underline"
                                    >
                                      + Agregar Proyecto
                                    </button>
                                  </div>
                                ) : (
                                  proysObj.map((proy) => {
                                    const proyColapsado = !!colapsados[proy.id];
                                    const entsProy = entregables.filter(
                                      (e) => e.proyectoId === proy.id
                                    );

                                    return (
                                      <div
                                        key={proy.id}
                                        className="flex flex-col rounded-xl border border-[#232326] bg-[#141417] p-3"
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <button
                                            type="button"
                                            onClick={() => toggleNodo(proy.id)}
                                            className="flex items-center gap-2 text-left"
                                          >
                                            <Icono.ChevronRight
                                              className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${
                                                !proyColapsado
                                                  ? "rotate-90"
                                                  : ""
                                              }`}
                                            />
                                            <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold text-sky-400 uppercase">
                                              Proyecto
                                            </span>
                                            <span className="text-xs font-bold text-zinc-200">
                                              {proy.titulo}
                                            </span>
                                            {proy.cantidadObjetivo !==
                                              undefined && (
                                              <span className="text-xs text-zinc-400">
                                                · {proy.progresoActual}/
                                                {proy.cantidadObjetivo}{" "}
                                                {proy.unidad}
                                              </span>
                                            )}
                                            <span className="text-[11px] text-zinc-500">
                                              · hasta {proy.diaLimite}
                                            </span>
                                          </button>

                                          <div className="flex flex-wrap items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setCrearTarget({
                                                  tipo: "entregable",
                                                  padreId: proy.id,
                                                })
                                              }
                                              className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20"
                                            >
                                              + Entregable
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setDistribuirProyecto(proy)
                                              }
                                              className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400 hover:bg-sky-500/20"
                                            >
                                              Dividir en semanas
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setAjustarFechaTarget({
                                                  nivel: "proyecto",
                                                  id: proy.id,
                                                  titulo: proy.titulo,
                                                  fechaActual: proy.diaLimite,
                                                })
                                              }
                                              className="rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-amber-400"
                                            >
                                              Fecha
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setEliminarTarget({
                                                  nivel: "proyecto",
                                                  id: proy.id,
                                                  titulo: proy.titulo,
                                                })
                                              }
                                              className="rounded border border-zinc-800 p-1 text-zinc-500 hover:text-red-400"
                                            >
                                              <Icono.Trash className="h-3 w-3" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Hijos: ENTREGABLES */}
                                        {!proyColapsado && (
                                          <div className="mt-2.5 flex flex-col gap-2 border-l-2 border-zinc-800 pl-3.5">
                                            {entsProy.length === 0 ? (
                                              <span className="text-[11px] text-zinc-500">
                                                Sin entregables todavía. Usá
                                                &quot;+ Entregable&quot; o
                                                &quot;Dividir en semanas&quot;.
                                              </span>
                                            ) : (
                                              entsProy.map((ent) => {
                                                const fasesEnt = fases.filter(
                                                  (f) =>
                                                    f.entregableId === ent.id
                                                );
                                                const verFases =
                                                  !!fasesAbiertasEntId[ent.id];

                                                return (
                                                  <div
                                                    key={ent.id}
                                                    className="flex flex-col gap-2 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2.5"
                                                  >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                      <div className="flex flex-wrap items-center gap-2">
                                                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 uppercase">
                                                          Entregable
                                                        </span>
                                                        <span className="text-xs font-bold text-zinc-200">
                                                          {ent.titulo}
                                                        </span>
                                                        {ent.cantidadObjetivo !==
                                                          undefined && (
                                                          <span className="text-xs font-semibold text-emerald-400">
                                                            {ent.progresoActual}
                                                            /
                                                            {
                                                              ent.cantidadObjetivo
                                                            }{" "}
                                                            {ent.unidad}
                                                          </span>
                                                        )}
                                                        {ent.recurrencia && (
                                                          <Badge color="sky">
                                                            Recurrente
                                                          </Badge>
                                                        )}
                                                      </div>

                                                      <div className="flex flex-wrap items-center gap-1">
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            toggleFasesEntregable(
                                                              ent.id
                                                            )
                                                          }
                                                          className="rounded border border-zinc-700 bg-[#18181B] px-2 py-0.5 text-[10px] font-bold text-zinc-300 hover:border-emerald-500/40"
                                                        >
                                                          {verFases
                                                            ? "Ocultar Fases"
                                                            : `Fases (${fasesEnt.length})`}
                                                        </button>
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            setRepartirEntregable(
                                                              ent
                                                            )
                                                          }
                                                          className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20"
                                                        >
                                                          Repartir en días
                                                        </button>
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            setCrearTarget({
                                                              tipo: "tarea",
                                                              padreId: ent.id,
                                                            })
                                                          }
                                                          className="rounded border border-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-400 hover:text-zinc-200"
                                                        >
                                                          + Tarea
                                                        </button>
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            setEliminarTarget({
                                                              nivel:
                                                                "entregable",
                                                              id: ent.id,
                                                              titulo:
                                                                ent.titulo,
                                                            })
                                                          }
                                                          className="rounded border border-zinc-800 p-1 text-zinc-500 hover:text-red-400"
                                                        >
                                                          <Icono.Trash className="h-3 w-3" />
                                                        </button>
                                                      </div>
                                                    </div>

                                                    {verFases && (
                                                      <div className="mt-1 border-t border-[#232326] pt-2">
                                                        <SeccionFasesEntregable
                                                          entregable={ent}
                                                        />
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modales compartidos */}
      {crearTarget && (
        <ModalCrearElementoPersonal
          abierto
          onCerrar={() => setCrearTarget(null)}
          tipoInicial={crearTarget.tipo}
          padreInicialId={crearTarget.padreId}
        />
      )}

      {eliminarTarget && (
        <ConfirmarEliminacionNodo
          abierto
          nivel={eliminarTarget.nivel}
          id={eliminarTarget.id}
          titulo={eliminarTarget.titulo}
          onCerrar={() => setEliminarTarget(null)}
          onEliminado={() => setEliminarTarget(null)}
        />
      )}

      {ajustarFechaTarget && (
        <AjustarFechaModal
          abierto
          nivel={ajustarFechaTarget.nivel}
          id={ajustarFechaTarget.id}
          titulo={ajustarFechaTarget.titulo}
          fechaActual={ajustarFechaTarget.fechaActual}
          onCerrar={() => setAjustarFechaTarget(null)}
          onAjustado={() => setAjustarFechaTarget(null)}
        />
      )}

      {ajustarCantidadTarget && (
        <AjustarCantidadModal
          abierto
          nivel={ajustarCantidadTarget.nivel}
          id={ajustarCantidadTarget.id}
          titulo={ajustarCantidadTarget.titulo}
          cantidadActual={ajustarCantidadTarget.cantidadActual}
          unidad={ajustarCantidadTarget.unidad}
          bandaAceptableActual={ajustarCantidadTarget.bandaAceptable}
          bandaMejorableActual={ajustarCantidadTarget.bandaMejorable}
          onCerrar={() => setAjustarCantidadTarget(null)}
          onAjustado={() => setAjustarCantidadTarget(null)}
        />
      )}

      {historialTarget && (
        <Dialog
          abierto
          onClose={() => setHistorialTarget(null)}
          titulo={`Historial de "${historialTarget.titulo}"`}
          maxWidth="lg"
        >
          <PanelHistorialPersonal
            entidadTipo={historialTarget.tipo}
            entidadId={historialTarget.id}
          />
        </Dialog>
      )}

      {ajustarIAObjetivo && (
        <AjustarConIAModal
          abierto
          objetivo={ajustarIAObjetivo}
          onCerrar={() => setAjustarIAObjetivo(null)}
        />
      )}

      {distribuirProyecto && (
        <DistribuirProyectoModal
          abierto
          proyecto={distribuirProyecto}
          onCerrar={() => setDistribuirProyecto(null)}
        />
      )}

      {repartirEntregable && (
        <RepartirEnDiasModal
          abierto
          entregable={repartirEntregable}
          onCerrar={() => setRepartirEntregable(null)}
        />
      )}
    </div>
  );
};
