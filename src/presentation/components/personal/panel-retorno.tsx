"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";
import type { Actividad } from "../../../domain/entidades/actividad.entity";

const actividadesUseCase = new GestionarActividadesUseCase();
const SIN_ACTIVIDADES: never[] = [];

const FilaActividadVieja: React.FC<{ actividad: Actividad; hoy: string }> = ({
  actividad,
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
        {actividad.descripcion}{" "}
        <span className="text-zinc-600">({actividad.diaTarea})</span>
      </span>
      <div className="flex shrink-0 gap-1.5">
        <button
          onClick={() =>
            void accion(() =>
              actividadesUseCase.completarActividad(actividad.id)
            )
          }
          title="Completar"
          className="rounded border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-emerald-400 hover:bg-emerald-500/20"
        >
          <Icono.Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() =>
            void accion(() =>
              actividadesUseCase.migrarActividad({
                id: actividad.id,
                nuevoDiaTarea: hoy,
              })
            )
          }
          title="Pasar a hoy"
          className="rounded border border-sky-500/20 bg-sky-500/10 p-1.5 text-sky-400 hover:bg-sky-500/20"
        >
          <Icono.ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() =>
            void accion(() =>
              actividadesUseCase.cancelarActividad(actividad.id)
            )
          }
          title="Eliminar"
          className="rounded border border-zinc-800 p-1.5 text-zinc-500 hover:text-red-400"
        >
          <Icono.Close className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

/**
 * Panel de retorno: lo primero que se ve al volver después de un tiempo sin
 * entrar — qué actividad quedó sin resolver, reajustable ahí mismo. A
 * propósito NO muestra objetivos acá (ver Sprint 20 §7: la vista de Hoy es
 * solo actividades, el ritmo de los objetivos vive en la vista jerárquica,
 * tab "Mes", donde cada tarjeta ya explica el atraso con números). No se
 * muestra nada si no hay nada pendiente.
 */
export const PanelRetorno: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const [visible, setVisible] = useState(true);

  const actividadesViejas =
    useLiveQuery(
      () =>
        db.actividad
          .where("estado")
          .equals("pendiente")
          .and((a) => a.tipo !== "backlog" && !!a.diaTarea && a.diaTarea < hoy)
          .toArray(),
      [hoy]
    ) || SIN_ACTIVIDADES;

  if (!visible || actividadesViejas.length === 0) {
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

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
          Quedaron sin resolver ({actividadesViejas.length})
        </span>
        {actividadesViejas.map((a) => (
          <FilaActividadVieja key={a.id} actividad={a} hoy={hoy} />
        ))}
      </div>
    </div>
  );
};
