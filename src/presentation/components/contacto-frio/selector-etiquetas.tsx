"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { FieldWrapper } from "../input";
import { Icono } from "../icons";
import { Button } from "../button";
import { GestionarContactoFrioUseCase } from "../../../application/use-cases/crm/gestionar-contacto-frio.use-case";
import type { CategoriaEtiqueta } from "../../../domain/entidades/contacto-frio.entity";

const useCase = new GestionarContactoFrioUseCase();

interface SelectorEtiquetasProps {
  label: string;
  categoria: CategoriaEtiqueta;
  value: string[];
  onChange: (value: string[]) => void;
}

/**
 * Combobox de etiquetas con creación inline: si escribís algo que no existe
 * en el catálogo, aparece la opción de crearla y queda guardada para el
 * próximo prospecto — evita repetir texto libre parecido en cada registro.
 */
export const SelectorEtiquetas: React.FC<SelectorEtiquetasProps> = ({
  label,
  categoria,
  value,
  onChange,
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState(false);

  const etiquetas = useLiveQuery(
    () => db.catalogo_etiquetas.where("categoria").equals(categoria).toArray(),
    [categoria]
  );

  const opciones = (etiquetas || []).filter((e) =>
    e.etiqueta.toLowerCase().includes(busqueda.toLowerCase())
  );

  const yaExiste = (etiquetas || []).some(
    (e) => e.etiqueta.toLowerCase() === busqueda.trim().toLowerCase()
  );

  const toggle = (etiqueta: string) => {
    if (value.includes(etiqueta)) {
      onChange(value.filter((v) => v !== etiqueta));
    } else {
      onChange([...value, etiqueta]);
    }
  };

  const crearYAgregar = async () => {
    const texto = busqueda.trim();
    if (!texto || creando) return;
    setCreando(true);
    const res = await useCase.crearEtiqueta(texto, categoria);
    setCreando(false);
    if (res.ok) {
      onChange([...value, texto]);
      setBusqueda("");
    }
  };

  return (
    <FieldWrapper label={label}>
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded border border-[#2A2A2E] bg-[#18181B] px-2 py-0.5 text-xs font-bold text-zinc-300"
          >
            {v}
            <button
              type="button"
              onClick={() => toggle(v)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <Icono.Close className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <div className="relative w-full">
          <Icono.Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar o escribir una etiqueta nueva..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pr-4 pl-9 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#10B981] focus:outline-none"
          />
        </div>
      </div>
      {busqueda && (
        <div className="mt-1.5 flex max-h-40 flex-col gap-0.5 overflow-y-auto rounded-xl border border-[#2A2A2E] bg-zinc-950 p-1.5">
          {opciones.map((op) => (
            <div
              key={op.id}
              onClick={() => {
                toggle(op.etiqueta);
                setBusqueda("");
              }}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm ${
                value.includes(op.etiqueta)
                  ? "bg-emerald-500/10 font-bold text-emerald-400"
                  : "text-zinc-300 hover:bg-[#18181B]"
              }`}
            >
              {op.etiqueta}
            </div>
          ))}
          {!yaExiste && (
            <Button
              variant="ghost"
              className="justify-start px-3 py-1.5 text-xs"
              icono={<Icono.Plus className="h-3.5 w-3.5" />}
              onClick={crearYAgregar}
              disabled={creando}
            >
              Crear &quot;{busqueda.trim()}&quot;
            </Button>
          )}
        </div>
      )}
    </FieldWrapper>
  );
};
