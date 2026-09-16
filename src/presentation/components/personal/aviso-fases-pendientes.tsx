"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { GestionarFasesUseCase } from "../../../application/use-cases/personal/gestionar-fases.use-case";
import type { FasePersonal } from "../../../domain/entidades/fase-personal.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";
import { CerrarFaseModal } from "./cerrar-fase-modal";

const fasesUseCase = new GestionarFasesUseCase();
const SIN_FASES: FasePersonal[] = [];

/**
 * Aviso de Fases vencidas sin cerrar — mismo patrón que PanelRetorno (banner
 * síncrono al cargar la página, sin jobs en segundo plano). Nunca cierra
 * nada sola: cerrar una Fase exige elegir qué hacer con el faltante.
 */
export const AvisoFasesPendientes: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const [visible, setVisible] = useState(true);
  const [faseACerrar, setFaseACerrar] = useState<FasePersonal | null>(null);

  const entregablesPorId = useLiveQuery(async () => {
    const todos = await db.entregable.toArray();
    return new Map(todos.map((e) => [e.id, e.titulo]));
  });

  const pendientes =
    useLiveQuery(
      () => fasesUseCase.detectarFasesPendientesDeCierre(hoy),
      [hoy]
    ) || SIN_FASES;

  if (!visible || pendientes.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icono.Alert className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
            Fases vencidas sin cerrar
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
        {pendientes.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3"
          >
            <span className="text-sm text-zinc-200">
              {f.titulo}{" "}
              <span className="text-zinc-600">
                ({entregablesPorId?.get(f.entregableId) ?? "…"})
              </span>{" "}
              — {f.progresoActual}/{f.cantidadObjetivo} {f.unidad}
            </span>
            <button
              onClick={() => setFaseACerrar(f)}
              className="shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-400 uppercase hover:bg-amber-500/20"
            >
              Resolver
            </button>
          </div>
        ))}
      </div>
      {faseACerrar && (
        <CerrarFaseModal
          abierto
          fase={faseACerrar}
          onCerrar={() => setFaseACerrar(null)}
          onCerrado={() => setFaseACerrar(null)}
        />
      )}
    </div>
  );
};
