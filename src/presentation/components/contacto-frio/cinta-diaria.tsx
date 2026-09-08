"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Input } from "../input";
import { Icono } from "../icons";
import { RegistroProspecto } from "./registro-prospecto";
import { PanelEnvioPitch } from "./panel-envio-pitch";
import { useConfiguracionStore } from "../../stores/configuracion.store";
import { Button } from "../button";
import type { PotencialCliente } from "../../../domain/entidades/contacto-frio.entity";

const SIN_INTENTOS: never[] = [];

function inicioDeHoy(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Estación "Hoy": objetivo diario de contactos como una cola — se marca uno
 * como enviado y desaparece, hasta completar el objetivo. Al completarlo se
 * ofrece seguir con más. Nada de esto persiste estado propio: se deriva en
 * vivo de potencial_cliente/intento_contacto, así que sobrevive a un reload.
 */
export const CintaDiaria: React.FC = () => {
  const objetivo = useConfiguracionStore((s) => s.objetivoDiarioContactos);
  const setObjetivo = useConfiguracionStore(
    (s) => s.setObjetivoDiarioContactos
  );

  const [verMas, setVerMas] = useState(false);
  const [activoId, setActivoId] = useState<string | null>(null);

  const pool = useLiveQuery(
    () =>
      db.potencial_cliente.where("estado").equals("Nuevo").sortBy("creadoEn"),
    []
  );
  const intentos =
    useLiveQuery(() => db.intento_contacto.toArray(), []) || SIN_INTENTOS;

  const enviadosHoy = useMemo(() => {
    const inicio = inicioDeHoy();
    return intentos.filter((i) => i.fecha >= inicio && i.mensajeEnviado).length;
  }, [intentos]);

  const poolLista = pool || [];
  const restanteHoy = Math.max(objetivo - enviadosHoy, 0);
  const visibles = verMas ? poolLista : poolLista.slice(0, restanteHoy);
  const activo = poolLista.find((p) => p.id === activoId);

  const abrir = (p: PotencialCliente) => setActivoId(p.id);

  if (poolLista.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[#2A2A2E] p-10 text-center">
        <span className="text-sm text-zinc-500">
          No tenés prospectos nuevos cargados todavía.
        </span>
        <RegistroProspecto />
      </div>
    );
  }

  if (visibles.length === 0 && !verMas) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-10 text-center">
        <Icono.Check className="h-8 w-8 text-emerald-400" />
        <span className="font-bold text-zinc-100">
          Ya hiciste los {objetivo} de hoy.
        </span>
        <Button variant="outline" onClick={() => setVerMas(true)}>
          ¿Querés seguir con más?
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl border border-[#2A2A2E] bg-[#18181B] px-4 py-3">
        <span className="text-sm font-bold text-zinc-200">
          {enviadosHoy} / {objetivo} de hoy
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Objetivo diario:</span>
          <Input
            type="number"
            min={1}
            value={objetivo}
            onChange={(e) =>
              setObjetivo(Math.max(1, Number(e.target.value) || 1))
            }
            className="w-16 py-1.5 text-center"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-1">
          {visibles.map((p) => (
            <button
              key={p.id}
              onClick={() => abrir(p)}
              className={`rounded-xl px-3 py-2 text-left text-sm transition-all ${
                activoId === p.id
                  ? "bg-emerald-500/10 font-bold text-emerald-400"
                  : "text-zinc-300 hover:bg-[#18181B]"
              }`}
            >
              {p.nombre}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
          {!activo ? (
            <span className="text-sm text-zinc-600">
              Elegí uno de la lista para contactarlo.
            </span>
          ) : (
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-zinc-100">
                {activo.nombre}
              </h3>
              <PanelEnvioPitch
                prospecto={activo}
                onEnviado={() => setActivoId(null)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
