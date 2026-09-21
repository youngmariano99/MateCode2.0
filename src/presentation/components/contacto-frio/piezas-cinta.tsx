"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Textarea } from "../input";
import { Icono } from "../icons";
import { enlacesRedes } from "./utilidades-cinta";
import type { IntentoContacto } from "../../../domain/entidades/contacto-frio.entity";

/** Copia el prompt (armado recién, con lo último cargado) al portapapeles. Si el navegador no deja, lo muestra para copiarlo a mano. */
export const BotonPrompt: React.FC<{
  etiqueta: string;
  generar: () => string;
  deshabilitado?: boolean;
}> = ({ etiqueta, generar, deshabilitado }) => {
  const [copiado, setCopiado] = useState(false);
  const [manual, setManual] = useState("");

  const copiar = async () => {
    const texto = generar();
    try {
      await navigator.clipboard.writeText(texto);
      setManual("");
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setManual(texto);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        icono={
          copiado ? (
            <Icono.Check className="h-4 w-4" />
          ) : (
            <Icono.Sparkles className="h-4 w-4" />
          )
        }
        onClick={copiar}
        disabled={deshabilitado}
        className="self-start"
      >
        {copiado ? "¡Copiado! Pegalo en tu IA" : etiqueta}
      </Button>
      {manual && (
        <Textarea
          value={manual}
          readOnly
          rows={6}
          descripcion="No pude copiar solo — seleccioná todo y copialo."
        />
      )}
    </div>
  );
};

/** Botones para abrir el perfil/chat del prospecto. */
export const EnlacesProspecto: React.FC<{ prospectoId: string }> = ({
  prospectoId,
}) => {
  const ficha = useLiveQuery(
    () => db.ficha_digital.get(prospectoId),
    [prospectoId]
  );
  const links = enlacesRedes(ficha);
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-400 hover:bg-sky-500 hover:text-black"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
};

const fechaCorta = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Últimos mensajes de la conversación, para tener el hilo a la vista sin salir de la estación. */
export const HistorialCompacto: React.FC<{ intentos: IntentoContacto[] }> = ({
  intentos,
}) => {
  const con = intentos.filter(
    (i) => i.mensajeEnviado?.trim() || i.respuestaTexto?.trim()
  );
  if (con.length === 0) {
    return <p className="text-xs text-zinc-600">Todavía sin mensajes.</p>;
  }
  return (
    <details className="rounded-xl border border-[#2A2A2E] bg-[#111113] p-3">
      <summary className="cursor-pointer text-xs font-bold text-zinc-400">
        Ver la conversación ({con.length})
      </summary>
      <div className="mt-2 flex max-h-64 flex-col gap-2 overflow-y-auto">
        {[...con]
          .sort((a, b) => a.fecha - b.fecha)
          .map((i) => (
            <div key={i.id} className="flex flex-col gap-1 text-xs">
              {i.mensajeEnviado?.trim() && (
                <p className="rounded-lg bg-emerald-500/10 px-2 py-1 text-emerald-200">
                  <span className="font-bold">
                    Yo · {fechaCorta(i.fecha)}
                    {i.tipoEnvio ? ` · ${i.tipoEnvio}` : ""}:
                  </span>{" "}
                  {i.mensajeEnviado}
                </p>
              )}
              {i.respuestaTexto?.trim() && (
                <p className="rounded-lg bg-zinc-800 px-2 py-1 text-zinc-200">
                  <span className="font-bold">
                    Ellos · {fechaCorta(i.fecha)}:
                  </span>{" "}
                  {i.respuestaTexto}
                </p>
              )}
            </div>
          ))}
      </div>
    </details>
  );
};

/** Estación sin trabajo: lo dice y ofrece pasar a la siguiente. */
export const EstacionVacia: React.FC<{
  mensaje: string;
  siguiente?: { etiqueta: string; ir: () => void };
}> = ({ mensaje, siguiente }) => (
  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#2A2A2E] p-10 text-center">
    <Icono.Check className="h-7 w-7 text-emerald-400" />
    <span className="text-sm font-bold text-zinc-200">{mensaje}</span>
    {siguiente && (
      <Button variant="primary" onClick={siguiente.ir}>
        {siguiente.etiqueta}
      </Button>
    )}
  </div>
);

/** Botonera de una sola opción (más rápida que un select para 3-5 opciones). */
export function Chips<T extends string | number>({
  opciones,
  valor,
  onChange,
}: {
  opciones: { valor: T; etiqueta: string }[];
  valor: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button
          key={String(o.valor)}
          type="button"
          onClick={() => onChange(o.valor)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
            valor === o.valor
              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
              : "border-[#2A2A2E] text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

export const OPCIONES_DIAS = [
  { valor: 0, etiqueta: "Hoy" },
  { valor: 1, etiqueta: "Mañana" },
  { valor: 2, etiqueta: "2 días" },
  { valor: 7, etiqueta: "7 días" },
  { valor: 14, etiqueta: "14 días" },
  { valor: 30, etiqueta: "30 días" },
];
