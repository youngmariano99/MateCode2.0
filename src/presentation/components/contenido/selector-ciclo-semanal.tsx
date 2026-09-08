"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Input } from "../input";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";

const useCase = new GestionarContenidoUseCase();
const SIN_IDEAS: never[] = [];

interface SelectorCicloSemanalProps {
  onCicloCreado: (cicloId: string) => void;
}

/**
 * Arranca la semana: cuántos videos son el objetivo, y cuáles ideas del
 * backlog general entran esta semana — para que Guion/Producción solo
 * muestren esas y no distraigan con el resto del backlog.
 */
export const SelectorCicloSemanal: React.FC<SelectorCicloSemanalProps> = ({
  onCicloCreado,
}) => {
  const [objetivo, setObjetivo] = useState(6);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [creando, setCreando] = useState(false);

  const ideas =
    useLiveQuery(() =>
      db.idea_contenido.where("estado").equals("Backlog").toArray()
    ) || SIN_IDEAS;

  const toggle = (id: string) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const iniciar = async () => {
    setCreando(true);
    const res = await useCase.iniciarCiclo(objetivo, seleccionadas);
    setCreando(false);
    if (res.ok) onCicloCreado(res.valor);
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
      <h2 className="text-sm font-bold tracking-wider text-zinc-400 uppercase">
        Arrancar la semana
      </h2>
      <Input
        label="¿Cuántos videos/contenidos es el objetivo?"
        type="number"
        min={1}
        value={objetivo}
        onChange={(e) => setObjetivo(Math.max(1, Number(e.target.value) || 1))}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Elegí las ideas para esta semana ({seleccionadas.length} / {objetivo})
        </span>
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border border-[#2A2A2E] p-2">
          {ideas.map((idea) => (
            <Checkbox
              key={idea.id}
              label={idea.texto}
              descripcion={idea.dolorSemana}
              checked={seleccionadas.includes(idea.id)}
              onChange={() => toggle(idea.id)}
            />
          ))}
          {ideas.length === 0 && (
            <span className="p-2 text-sm text-zinc-600">
              No hay ideas en el backlog todavía — podés arrancar igual y
              cargarlas después.
            </span>
          )}
        </div>
      </div>

      <Button onClick={iniciar} cargando={creando} className="self-end">
        Empezar semana
      </Button>
    </div>
  );
};
