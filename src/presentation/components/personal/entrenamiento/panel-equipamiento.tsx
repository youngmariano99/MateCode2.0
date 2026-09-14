"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Icono } from "../../icons";
import { Button } from "../../button";
import { GestionarCatalogoEtiquetasUseCase } from "../../../../application/use-cases/shared/gestionar-catalogo-etiquetas.use-case";

const useCase = new GestionarCatalogoEtiquetasUseCase();
const SIN_ITEMS: never[] = [];

/**
 * Equipamiento propio: mismo mecanismo de catalogo_etiquetas que área/motivo
 * de incumplimiento (categoria "equipamiento_propio") — se usa como contexto
 * en los prompts de rutinas/bloques para que la IA no sugiera ejercicios
 * imposibles de hacer. A diferencia de SelectorEtiquetas (que elige etiquetas
 * PARA otra entidad), acá la categoría entera ES el equipamiento propio, así
 * que agregar/quitar edita el catálogo directamente en vez de una selección.
 */
export const PanelEquipamiento: React.FC = () => {
  const propio =
    useLiveQuery(() =>
      db.catalogo_etiquetas
        .where("categoria")
        .equals("equipamiento_propio")
        .toArray()
    ) || SIN_ITEMS;
  const ejercicios =
    useLiveQuery(() => db.catalogo_ejercicio.toArray()) || SIN_ITEMS;

  const [nuevo, setNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const nombresPropios = new Set(propio.map((e) => e.etiqueta.toLowerCase()));
  const sugerencias = Array.from(
    new Set(ejercicios.flatMap((e) => e.equipamiento))
  ).filter((eq) => !nombresPropios.has(eq.toLowerCase()));

  const agregar = async (texto: string) => {
    const limpio = texto.trim();
    if (!limpio || nombresPropios.has(limpio.toLowerCase())) return;
    setGuardando(true);
    await useCase.crearEtiqueta(limpio, "equipamiento_propio");
    setGuardando(false);
    setNuevo("");
  };

  const quitar = async (id: string) => {
    await useCase.eliminarEtiqueta(id);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.Package className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Mi equipamiento
        </h3>
      </div>
      <p className="text-xs text-zinc-500">
        Lo que tenés disponible para entrenar — se le pasa como contexto a la IA
        al armar rutinas o bloques, para que no sugiera ejercicios que no podés
        hacer.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {propio.map((e) => (
          <span
            key={e.id}
            className="inline-flex items-center gap-1 rounded border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-0.5 text-xs font-bold text-zinc-300"
          >
            {e.etiqueta}
            <button
              type="button"
              onClick={() => void quitar(e.id)}
              className="text-zinc-500 hover:text-red-400"
            >
              <Icono.Close className="h-3 w-3" />
            </button>
          </span>
        ))}
        {propio.length === 0 && (
          <span className="text-xs text-zinc-600">
            Sin equipamiento cargado todavía.
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void agregar(nuevo);
          }}
          placeholder="Ej. Mancuernas, Banda elástica, Barra..."
          className="w-full rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        <Button
          variant="outline"
          onClick={() => void agregar(nuevo)}
          disabled={!nuevo.trim() || guardando}
          className="px-3 py-1.5 text-xs"
        >
          Agregar
        </Button>
      </div>

      {sugerencias.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Sugerencias rápidas (del catálogo de ejercicios)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sugerencias.map((eq) => (
              <button
                key={eq}
                type="button"
                onClick={() => void agregar(eq)}
                className="rounded-full border border-[#2A2A2E] px-2.5 py-1 text-[11px] font-bold text-zinc-400 transition-all hover:border-emerald-500/40 hover:text-emerald-400"
              >
                + {eq}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
