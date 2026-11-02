"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Icono } from "../../icons";
import { Badge } from "../../badge";
import { obtenerDiaTareaHoy } from "../../../../domain/entidades/personal.entity";
import { calcularEstadoHito } from "../../../../domain/entidades/recurso-oficina.entity";

interface BannerHitosOficinaProps {
  onAbrirBaul: () => void;
}

export const BannerHitosOficina: React.FC<BannerHitosOficinaProps> = ({
  onAbrirBaul,
}) => {
  const hoy = obtenerDiaTareaHoy();

  const hitos =
    useLiveQuery(
      () => db.recurso_oficina.where("tipo").equals("hito_fecha").toArray(),
      []
    ) ?? [];

  const alertasActivas = hitos
    .map((h) => {
      const alerta = calcularEstadoHito(h, hoy);
      return alerta && alerta.debeAvisar ? { hito: h, alerta } : null;
    })
    .filter(
      (
        item
      ): item is {
        hito: (typeof hitos)[number];
        alerta: NonNullable<ReturnType<typeof calcularEstadoHito>>;
      } => item !== null
    )
    .sort((a, b) => a.alerta.diasRestantes - b.alerta.diasRestantes);

  if (alertasActivas.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icono.Calendario className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-bold tracking-wide text-amber-300 uppercase">
            Fechas Clave & Recordatorios Próximos
          </span>
        </div>
        <button
          onClick={onAbrirBaul}
          className="text-xs font-semibold text-amber-400 hover:underline"
        >
          Gestionar en Baúl ↗
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {alertasActivas.map(({ hito, alerta }) => (
          <div
            key={hito.id}
            onClick={onAbrirBaul}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-amber-500/20 bg-zinc-950/60 px-3 py-1.5 transition-colors hover:border-amber-500/50"
          >
            <span className="text-xs font-semibold text-zinc-100">
              {hito.titulo}
            </span>
            <Badge color={alerta.estado === "hoy" ? "emerald" : "amber"}>
              {alerta.mensajeAlerta}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};
