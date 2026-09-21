"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { EstacionResponder } from "./estacion-responder";
import { EstacionSeguir } from "./estacion-seguir";
import { EstacionAbrir } from "./estacion-abrir";
import { EstacionReponer } from "./estacion-reponer";
import { armarCinta } from "../../../domain/entidades/contacto-frio-cinta.entity";
import type {
  IntentoContacto,
  PotencialCliente,
} from "../../../domain/entidades/contacto-frio.entity";
import { ahoraMs } from "./utilidades-cinta";

type Numero = 1 | 2 | 3 | 4;

const SIN_PROSPECTOS: PotencialCliente[] = [];
const SIN_INTENTOS: IntentoContacto[] = [];

/**
 * La cinta de producción de contacto en frío: siempre las mismas 4 estaciones,
 * siempre en el mismo orden — ① Responder → ② Seguir → ③ Abrir → ④ Reponer.
 * Arranca sola en la primera que tenga trabajo; cada estación vacía ofrece
 * pasar a la siguiente. Todo se deriva de prospectos + intentos: no guarda
 * estado propio, así que sobrevive a un reload.
 */
export const CintaProduccion: React.FC = () => {
  const prospectos =
    useLiveQuery(() => db.potencial_cliente.toArray(), []) ?? SIN_PROSPECTOS;
  const intentos =
    useLiveQuery(() => db.intento_contacto.toArray(), []) ?? SIN_INTENTOS;
  const [elegida, setElegida] = useState<Numero | null>(null);

  const cinta = useMemo(
    () => armarCinta(prospectos, intentos, ahoraMs()),
    [prospectos, intentos]
  );

  const candidatos = useMemo(
    () =>
      prospectos.filter(
        (p) =>
          !p.esHistoricoLegacy &&
          p.estado !== "Rechazado" &&
          p.estado !== "Cliente Cerrado"
      ),
    [prospectos]
  );

  const conteos: Record<Numero, number> = {
    1: cinta.responder.length,
    2: cinta.seguir.length,
    3: cinta.abrir.length,
    4: 0,
  };
  const primeraConTrabajo: Numero =
    conteos[1] > 0 ? 1 : conteos[2] > 0 ? 2 : conteos[3] > 0 ? 3 : 4;
  const estacion = elegida ?? primeraConTrabajo;

  const ESTACIONES: { n: Numero; label: string }[] = [
    { n: 1, label: "① Responder" },
    { n: 2, label: "② Seguir" },
    { n: 3, label: "③ Abrir" },
    { n: 4, label: "④ Reponer" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-1 sm:grid-cols-4">
        {ESTACIONES.map((e) => (
          <button
            key={e.n}
            onClick={() => setElegida(e.n)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all ${
              estacion === e.n
                ? "bg-[#10B981] text-zinc-950"
                : "text-zinc-400 hover:bg-[#232326] hover:text-zinc-200"
            }`}
          >
            {e.label}
            {e.n !== 4 && conteos[e.n] > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  estacion === e.n
                    ? "bg-zinc-950/20"
                    : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                {conteos[e.n]}
              </span>
            )}
          </button>
        ))}
      </div>

      {estacion === 1 && (
        <EstacionResponder
          pendientes={cinta.responder}
          candidatos={candidatos}
          irA={setElegida}
        />
      )}
      {estacion === 2 && (
        <EstacionSeguir
          tocanHoy={cinta.seguir}
          esperando={cinta.esperando}
          irA={setElegida}
        />
      )}
      {estacion === 3 && (
        <EstacionAbrir nuevos={cinta.abrir} irA={setElegida} />
      )}
      {estacion === 4 && <EstacionReponer stock={cinta.abrir.length} />}
    </div>
  );
};
