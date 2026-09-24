"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { GestionarCatalogoEtiquetasUseCase } from "../../../application/use-cases/shared/gestionar-catalogo-etiquetas.use-case";
import {
  MOTIVOS_DESVIO,
  etiquetaMotivoDesvio,
} from "../../../domain/entidades/actividad.entity";

const catalogoUseCase = new GestionarCatalogoEtiquetasUseCase();
const SIN_ETIQUETAS: { id: string; etiqueta: string }[] = [];

const chipClase =
  "flex min-h-11 items-center rounded border border-[#2A2A2E] px-3 text-[10px] font-bold text-zinc-300 uppercase hover:border-emerald-500/40";

/**
 * Chips de motivo (por qué se cancela o se pasa una tarea): los 5 sugeridos
 * de siempre, más los que el usuario fue agregando — guardados en el
 * catálogo de etiquetas ("motivo_desvio_actividad"), así quedan disponibles
 * la próxima vez sin volver a escribirlos.
 */
export const ChipsMotivoDesvio: React.FC<{
  onElegir: (motivo: string) => void;
}> = ({ onElegir }) => {
  const [agregando, setAgregando] = useState(false);
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);

  const personalizados =
    useLiveQuery(() =>
      db.catalogo_etiquetas
        .where("categoria")
        .equals("motivo_desvio_actividad")
        .toArray()
    ) ?? SIN_ETIQUETAS;

  const agregar = async () => {
    const limpio = texto.trim();
    if (!limpio || guardando) return;
    setGuardando(true);
    const yaExiste =
      MOTIVOS_DESVIO.some(
        (m) => etiquetaMotivoDesvio(m).toLowerCase() === limpio.toLowerCase()
      ) ||
      personalizados.some(
        (p) => p.etiqueta.toLowerCase() === limpio.toLowerCase()
      );
    if (!yaExiste) {
      await catalogoUseCase.crearEtiqueta(limpio, "motivo_desvio_actividad");
    }
    setGuardando(false);
    setTexto("");
    setAgregando(false);
    onElegir(limpio);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {MOTIVOS_DESVIO.map((m) => (
        <button key={m} onClick={() => onElegir(m)} className={chipClase}>
          {etiquetaMotivoDesvio(m)}
        </button>
      ))}
      {personalizados.map((p) => (
        <button
          key={p.id}
          onClick={() => onElegir(p.etiqueta)}
          className={chipClase}
        >
          {p.etiqueta}
        </button>
      ))}
      {agregando ? (
        <span className="flex min-h-11 items-center gap-1">
          <input
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void agregar();
              if (e.key === "Escape") setAgregando(false);
            }}
            placeholder="Nuevo motivo..."
            className="rounded border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-[10px] text-zinc-200 outline-none focus:border-emerald-500/40"
          />
          <button
            onClick={() => void agregar()}
            disabled={!texto.trim() || guardando}
            className="text-[10px] font-bold text-emerald-400 uppercase hover:underline disabled:opacity-40"
          >
            Agregar
          </button>
        </span>
      ) : (
        <button
          onClick={() => setAgregando(true)}
          title="Agregar un motivo nuevo (queda guardado para la próxima)"
          className="flex min-h-11 items-center gap-1 rounded border border-dashed border-[#2A2A2E] px-3 text-[10px] font-bold text-zinc-500 uppercase hover:border-emerald-500/40 hover:text-emerald-400"
        >
          <Icono.Plus className="h-3 w-3" />
          Nuevo
        </button>
      )}
    </div>
  );
};
