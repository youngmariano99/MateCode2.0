"use client";

import React, { useMemo, useState } from "react";
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
  lunesDeLaSemana,
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";
import { DIAS_CORTOS, formatoDiaCorto } from "./calendario-utils";

const useCase = new GestionarActividadesUseCase();
const SIN_FONDOS: Actividad[] = [];

const FilaFondo: React.FC<{ fondo: Actividad }> = ({ fondo }) => {
  const { mostrarToast } = useToast();
  const total = fondo.cantidadObjetivo ?? 0;
  const hoy = obtenerDiaTareaHoy();
  const [semanaDestino, setSemanaDestino] = useState<"actual" | "proxima">(
    "actual"
  );
  const [guardando, setGuardando] = useState(false);

  const lunesBase = useMemo(() => {
    const lun = lunesDeLaSemana(hoy);
    return semanaDestino === "actual" ? lun : sumarDias(lun, 7);
  }, [hoy, semanaDestino]);

  const diasSemana = useMemo(
    () => Array.from({ length: 7 }, (_, i) => sumarDias(lunesBase, i)),
    [lunesBase]
  );

  const [asignacion, setAsignacion] = useState<Record<string, number>>({});

  const totalAsignado = diasSemana.reduce(
    (s, d) => s + (asignacion[d] ?? 0),
    0
  );
  const quedaEnReserva = Math.max(0, total - totalAsignado);

  const cambiarDia = (dia: string, delta: number) => {
    setAsignacion((prev) => {
      const actual = prev[dia] ?? 0;
      const nuevo = Math.max(0, actual + delta);
      const otros = diasSemana
        .filter((d) => d !== dia)
        .reduce((s, d) => s + (prev[d] ?? 0), 0);
      if (otros + nuevo > total) return prev;
      return { ...prev, [dia]: nuevo };
    });
  };

  const repartirLunVie = () => {
    const habiles = diasSemana.slice(0, 5).filter((d) => d >= hoy);
    const destinoDias = habiles.length > 0 ? habiles : diasSemana.slice(0, 5);
    const partes = repartirEnDias(total, destinoDias.length);
    const nuevo: Record<string, number> = {};
    destinoDias.forEach((d, idx) => {
      nuevo[d] = partes[idx] ?? 0;
    });
    setAsignacion(nuevo);
  };

  const repartir = async () => {
    const reparto = diasSemana
      .filter((d) => (asignacion[d] ?? 0) > 0)
      .map((dia) => ({ dia, cantidad: asignacion[dia] }));
    if (reparto.length === 0) return;
    setGuardando(true);
    const res = await useCase.repartirFondo({ fondoId: fondo.id, reparto });
    setGuardando(false);
    if (res.ok) {
      setAsignacion({});
      mostrarToast("Sumado a los días elegidos.", "exito");
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  const descartar = async () => {
    const res = await useCase.descartarActividad(fondo.id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-bold text-zinc-100">
            {fondo.descripcion}
          </span>
          <span className="ml-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400">
            {total} {fondo.unidad || "unid."} en reserva
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={repartirLunVie}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
          >
            Repartir parejo Lun–Vie
          </button>
          <button
            type="button"
            onClick={() => void descartar()}
            title="Descartar esta reserva (queda registrada en historial)"
            className="text-xs font-bold text-zinc-500 uppercase hover:text-red-400"
          >
            Descartar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500">Elegí en qué semana sumarlos:</span>
        <button
          type="button"
          onClick={() => {
            setSemanaDestino("actual");
            setAsignacion({});
          }}
          className={`rounded-lg border px-2.5 py-1 font-bold ${
            semanaDestino === "actual"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-[#2A2A2E] text-zinc-400"
          }`}
        >
          Esta semana
        </button>
        <button
          type="button"
          onClick={() => {
            setSemanaDestino("proxima");
            setAsignacion({});
          }}
          className={`rounded-lg border px-2.5 py-1 font-bold ${
            semanaDestino === "proxima"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-[#2A2A2E] text-zinc-400"
          }`}
        >
          Próxima semana
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
        {diasSemana.map((dia, idx) => {
          const cant = asignacion[dia] ?? 0;
          return (
            <div
              key={dia}
              className={`flex flex-col items-center gap-1 rounded-xl border p-2 ${
                cant > 0
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-[#2A2A2E] bg-[#141417]"
              }`}
            >
              <span className="text-xs font-bold text-zinc-300">
                {DIAS_CORTOS[idx]}
              </span>
              <span className="text-[10px] text-zinc-500">
                {formatoDiaCorto(dia)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => cambiarDia(dia, -1)}
                  disabled={cant <= 0}
                  className="flex h-6 w-6 items-center justify-center rounded border border-[#2A2A2E] bg-[#18181B] text-xs font-bold text-zinc-300 disabled:opacity-30"
                >
                  -
                </button>
                <span className="min-w-[22px] text-center font-mono text-xs font-bold text-emerald-400">
                  +{cant}
                </span>
                <button
                  type="button"
                  onClick={() => cambiarDia(dia, 1)}
                  disabled={totalAsignado >= total}
                  className="flex h-6 w-6 items-center justify-center rounded border border-[#2A2A2E] bg-[#18181B] text-xs font-bold text-zinc-300 disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="text-xs text-zinc-400">
          Para agendar:{" "}
          <strong className="text-emerald-400">{totalAsignado}</strong> · Siguen
          en reserva:{" "}
          <strong className="text-amber-400">{quedaEnReserva}</strong>
        </span>
        <Button
          size="sm"
          onClick={() => void repartir()}
          cargando={guardando}
          disabled={totalAsignado === 0}
        >
          Sumar {totalAsignado > 0 ? `${totalAsignado} ` : ""}a los días
          elegidos
        </Button>
      </div>
    </div>
  );
};

/**
 * Reserva / Mochila de Pendientes: lo que se dejó sin hacer de tareas
 * cuantificables y no se canceló, listo para sumarse en cualquier día de
 * esta semana o la próxima con 1 clic.
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icono.Inbox className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
            Reserva de Pendientes (Sin fecha · Para sumar cuando quieras)
          </h3>
        </div>
        <span className="text-xs text-zinc-400">
          Podés repartir todo o solo una parte y dejar el resto guardado
        </span>
      </div>
      {fondos.map((f) => (
        <FilaFondo key={f.id} fondo={f} />
      ))}
    </div>
  );
};
