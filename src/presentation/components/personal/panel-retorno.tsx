"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { Badge, type BadgeColor } from "../badge";
import { useToast } from "../../hooks/useToast";
import { GestionarBunkerUseCase } from "../../../application/use-cases/personal/gestionar-bunker.use-case";
import { GestionarObjetivosUseCase } from "../../../application/use-cases/personal/gestionar-objetivos.use-case";
import {
  calcularRitmoObjetivo,
  type ObjetivoCuantificable,
  type EstadoRitmoObjetivo,
} from "../../../domain/entidades/objetivo-cuantificable.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
  type TareaDiaria,
} from "../../../domain/entidades/personal.entity";

const bunker = new GestionarBunkerUseCase();
const objetivosUseCase = new GestionarObjetivosUseCase();
const SIN_TAREAS: never[] = [];
const SIN_OBJETIVOS: never[] = [];

const COLOR_RITMO: Record<EstadoRitmoObjetivo, BadgeColor> = {
  cumplido: "emerald",
  vencido: "red",
  al_dia: "sky",
  atrasado: "amber",
  adelantado: "emerald",
};

const FilaTareaVieja: React.FC<{ tarea: TareaDiaria; hoy: string }> = ({
  tarea,
  hoy,
}) => {
  const { mostrarToast } = useToast();

  const accion = async (
    fn: () => Promise<{ ok: boolean; error?: { mensaje: string } | null }>
  ) => {
    const res = await fn();
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2.5">
      <span className="text-sm text-zinc-200">
        {tarea.descripcion}{" "}
        <span className="text-zinc-600">({tarea.diaTarea})</span>
      </span>
      <div className="flex shrink-0 gap-1.5">
        <button
          onClick={() => void accion(() => bunker.completarTarea(tarea.id))}
          title="Completar"
          className="rounded border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-emerald-400 hover:bg-emerald-500/20"
        >
          <Icono.Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() =>
            void accion(() =>
              bunker.migrarTarea({ id: tarea.id, nuevoDiaTarea: hoy })
            )
          }
          title="Pasar a hoy"
          className="rounded border border-sky-500/20 bg-sky-500/10 p-1.5 text-sky-400 hover:bg-sky-500/20"
        >
          <Icono.ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => void accion(() => bunker.cancelarTarea(tarea.id))}
          title="Eliminar"
          className="rounded border border-zinc-800 p-1.5 text-zinc-500 hover:text-red-400"
        >
          <Icono.Close className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

const FilaObjetivoAtrasado: React.FC<{
  objetivo: ObjetivoCuantificable;
  hoy: string;
}> = ({ objetivo, hoy }) => {
  const { mostrarToast } = useToast();
  const ritmo = calcularRitmoObjetivo(objetivo, hoy);

  const estirarSieteDias = async () => {
    const res = await objetivosUseCase.ajustarObjetivo({
      id: objetivo.id,
      diaLimite: sumarDias(objetivo.diaLimite, 7),
    });
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const bajarAlProyectado = async () => {
    const res = await objetivosUseCase.ajustarObjetivo({
      id: objetivo.id,
      cantidadObjetivo: Math.max(
        objetivo.progresoActual + 1,
        ritmo.proyeccionAlRitmoActual
      ),
    });
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-zinc-200">
          {objetivo.titulo}
        </span>
        <Badge color={COLOR_RITMO[ritmo.estado]}>
          {ritmo.estado === "vencido" ? "Vencido" : "Atrasado"}
        </Badge>
      </div>
      <p className="text-xs text-zinc-500">
        {objetivo.progresoActual}/{objetivo.cantidadObjetivo} {objetivo.unidad}{" "}
        — al ritmo actual vas a terminar con {ritmo.proyeccionAlRitmoActual}.
      </p>
      <div className="flex gap-1.5">
        <button
          onClick={() => void estirarSieteDias()}
          className="rounded border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
        >
          Estirar 7 días
        </button>
        <button
          onClick={() => void bajarAlProyectado()}
          className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-400 uppercase hover:bg-amber-500/20"
        >
          Ajustar meta al ritmo real
        </button>
      </div>
    </div>
  );
};

/**
 * Panel de retorno: lo primero que se ve al volver después de un tiempo sin
 * entrar — qué quedó sin resolver y qué objetivo se está atrasando, todo
 * reajustable ahí mismo, sin tener que reconstruir la planificación a mano.
 * No se muestra nada si no hay nada pendiente (no agrega ruido cuando todo
 * está al día).
 */
export const PanelRetorno: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const [visible, setVisible] = useState(true);

  const tareasViejas =
    useLiveQuery(
      () =>
        db.tarea_diaria
          .where("estado")
          .equals("pendiente")
          .and((t) => t.diaTarea < hoy)
          .toArray(),
      [hoy]
    ) || SIN_TAREAS;

  const objetivosActivos =
    useLiveQuery(() =>
      db.objetivo_cuantificable
        .where("estado")
        .anyOf(["activo", "vencido"])
        .toArray()
    ) || SIN_OBJETIVOS;
  const objetivosAtrasados = objetivosActivos.filter((o) => {
    const estado = calcularRitmoObjetivo(o, hoy).estado;
    return estado === "atrasado" || estado === "vencido";
  });

  if (
    !visible ||
    (tareasViejas.length === 0 && objetivosAtrasados.length === 0)
  ) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icono.Alert className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
            Mientras no estuviste
          </h3>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-zinc-600 hover:text-zinc-400"
          title="Ocultar por ahora"
        >
          <Icono.Close className="h-3.5 w-3.5" />
        </button>
      </div>

      {tareasViejas.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Quedaron sin resolver ({tareasViejas.length})
          </span>
          {tareasViejas.map((t) => (
            <FilaTareaVieja key={t.id} tarea={t} hoy={hoy} />
          ))}
        </div>
      )}

      {objetivosAtrasados.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-amber-500/10 pt-3">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Objetivos que se están quedando atrás
          </span>
          {objetivosAtrasados.map((o) => (
            <FilaObjetivoAtrasado key={o.id} objetivo={o} hoy={hoy} />
          ))}
        </div>
      )}
    </div>
  );
};
