"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { calcularRiesgosMinimos } from "../../../application/servicios/minimos-personal.service";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";

/**
 * Avisa a tiempo cuando el mínimo de un tramo o del total está en riesgo:
 * aunque se cumpla el mínimo de cada día, el total no llegaría a su mínimo
 * (o los mínimos de los tramos ya no alcanzan para el del total). Si nada
 * está en riesgo, no ocupa lugar.
 */
export const AvisoMinimos: React.FC = () => {
  const [abierto, setAbierto] = useState(false);
  const hoy = obtenerDiaTareaHoy();

  // Se recalcula ante cualquier cambio en las tablas que influyen.
  const riesgos = useLiveQuery(async () => {
    await Promise.all([
      db.actividad.count(),
      db.fase_personal.count(),
      db.entregable.count(),
    ]);
    return calcularRiesgosMinimos(hoy);
  }, [hoy]);

  if (!riesgos || riesgos.length === 0) return null;
  const perdidos = riesgos.filter((r) => r.evaluacion.estado === "perdido");

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-4 ${
        perdidos.length > 0
          ? "border-red-500/30 bg-red-500/5"
          : "border-amber-500/30 bg-amber-500/5"
      }`}
    >
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center justify-between text-left"
      >
        <span
          className={`text-sm font-bold ${
            perdidos.length > 0 ? "text-red-300" : "text-amber-300"
          }`}
        >
          {riesgos.length === 1
            ? "1 mínimo en riesgo"
            : `${riesgos.length} mínimos en riesgo`}
          {perdidos.length > 0 && ` (${perdidos.length} ya no se alcanza)`}
        </span>
        <span className="text-xs text-zinc-500">
          {abierto ? "Ocultar" : "Ver"}
        </span>
      </button>
      {abierto && (
        <ul className="flex flex-col gap-2">
          {riesgos.slice(0, 8).map((r) => (
            <li key={`${r.tipo}-${r.id}`} className="text-xs text-zinc-300">
              {r.mensaje}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
