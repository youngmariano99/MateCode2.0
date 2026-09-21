"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import {
  repartirEnDias,
  type Actividad,
} from "../../../domain/entidades/actividad.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";
import { formatoDiaCorto } from "./calendario-utils";

const useCase = new GestionarActividadesUseCase();
const SIN_FONDOS: Actividad[] = [];

const FilaFondo: React.FC<{ fondo: Actividad }> = ({ fondo }) => {
  const { mostrarToast } = useToast();
  const total = fondo.cantidadObjetivo ?? 0;
  const [dias, setDias] = useState("1");
  const [desde, setDesde] = useState(sumarDias(obtenerDiaTareaHoy(), 1));
  const [guardando, setGuardando] = useState(false);

  const cantidadesPorDia = repartirEnDias(total, Number(dias) || 1);
  const reparto = cantidadesPorDia.map((cantidad, i) => ({
    dia: sumarDias(desde, i),
    cantidad,
  }));

  const repartir = async () => {
    setGuardando(true);
    const res = await useCase.repartirFondo({ fondoId: fondo.id, reparto });
    setGuardando(false);
    if (res.ok) mostrarToast("Faltante repartido.", "exito");
    else mostrarToast(res.error!.mensaje, "error");
  };

  const descartar = async () => {
    const res = await useCase.descartarActividad(fondo.id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-zinc-200">
          {fondo.descripcion}{" "}
          <span className="font-bold text-amber-400">
            — {total} {fondo.unidad || ""} sin hacer
          </span>
        </span>
        <button
          onClick={() => void descartar()}
          title="Descartar este faltante (no se borra, queda en el historial)"
          className="text-[10px] font-bold text-zinc-600 uppercase hover:text-red-400"
        >
          Descartar
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        Repartir en
        <input
          type="number"
          min={1}
          max={total}
          value={dias}
          onChange={(e) => setDias(e.target.value)}
          className="w-14 rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1 text-center text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        día(s) desde
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {reparto.map((r) => (
          <span
            key={r.dia}
            className="rounded-full border border-[#2A2A2E] px-2 py-0.5 text-[11px] text-zinc-300"
          >
            {formatoDiaCorto(r.dia)}: +{r.cantidad}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-zinc-600">
        Si ese día ya tenés esta tarea, se le suma; si no, se crea.
      </p>
      <Button
        onClick={() => void repartir()}
        cargando={guardando}
        disabled={reparto.length === 0 || !desde}
        className="self-start px-3 py-1.5 text-xs"
      >
        Repartir
      </Button>
    </div>
  );
};

/**
 * Fondo de faltantes: lo que se dejó sin hacer de tareas cuantificables (ej.
 * 5 contactos), acumulado por tarea, listo para volver a la agenda en uno o
 * varios días. Solo aparece si hay algo acumulado.
 */
export const PanelFondoFaltantes: React.FC = () => {
  const fondos =
    useLiveQuery(() =>
      db.actividad
        .filter(
          (a) =>
            a.esFaltante === true &&
            a.estado === "pendiente" &&
            (a.cantidadObjetivo ?? 0) > 0
        )
        .toArray()
    ) || SIN_FONDOS;

  if (fondos.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2">
        <Icono.Inbox className="h-4 w-4 text-amber-400" />
        <h3 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
          Fondo de faltantes
        </h3>
      </div>
      {fondos.map((f) => (
        <FilaFondo key={f.id} fondo={f} />
      ))}
    </div>
  );
};
