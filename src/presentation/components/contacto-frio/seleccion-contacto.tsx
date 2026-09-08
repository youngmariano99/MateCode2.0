"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Badge } from "../badge";
import { PanelEnvioPitch } from "./panel-envio-pitch";
import { haceDiasTexto } from "../../helpers/formatters";

/**
 * Estación 3: elegir a quién contactar hoy. Orden por default: el que hace
 * más tiempo espera (o nunca fue contactado) primero — siempre atacando lo
 * que más conviene, no lo último que se cargó.
 */
export const SeleccionContacto: React.FC = () => {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);

  const prospectos = useLiveQuery(
    () =>
      db.potencial_cliente
        .where("estado")
        .anyOf(["Nuevo", "Contactado"])
        .toArray(),
    []
  );

  const lista = useMemo(() => {
    return (prospectos || [])
      .filter((p) => !p.esHistoricoLegacy)
      .sort(
        (a, b) => (a.fechaUltimoContacto || 0) - (b.fechaUltimoContacto || 0)
      );
  }, [prospectos]);

  const seleccionado = lista.find((p) => p.id === seleccionadoId);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-2 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-3">
        <h2 className="px-1 text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Prospectos ({lista.length})
        </h2>
        <div className="flex max-h-[65vh] flex-col gap-1 overflow-y-auto">
          {lista.map((p) => (
            <button
              key={p.id}
              onClick={() => setSeleccionadoId(p.id)}
              className={`flex flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left transition-all ${
                seleccionadoId === p.id
                  ? "bg-emerald-500/10"
                  : "hover:bg-[#232326]"
              }`}
            >
              <span className="text-sm font-semibold text-zinc-100">
                {p.nombre}
              </span>
              <span className="text-xs text-zinc-500">
                {p.fechaUltimoContacto
                  ? haceDiasTexto(p.fechaUltimoContacto)
                  : "Nunca contactado"}
              </span>
            </button>
          ))}
          {lista.length === 0 && (
            <span className="px-1 py-4 text-sm text-zinc-600">
              No hay prospectos pendientes.
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
        {!seleccionado ? (
          <span className="text-sm text-zinc-600">
            Elegí un prospecto de la lista.
          </span>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-zinc-100">
                {seleccionado.nombre}
              </h3>
              {seleccionado.rubro && (
                <Badge color="sky">{seleccionado.rubro}</Badge>
              )}
            </div>
            <PanelEnvioPitch
              prospecto={seleccionado}
              onEnviado={() => setSeleccionadoId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
