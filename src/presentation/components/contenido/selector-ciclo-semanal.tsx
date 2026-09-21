"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Input } from "../input";
import { Select } from "../select";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";
import {
  TIPOS_CONTENIDO,
  type MezclaSemanal,
  type TipoContenido,
} from "../../../domain/entidades/contenido.entity";
import {
  etiquetaSemana,
  totalMezcla,
} from "../../../domain/entidades/contenido-semana.entity";
import {
  lunesDeLaSemana,
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

const useCase = new GestionarContenidoUseCase();
const SIN_IDEAS: never[] = [];

interface SelectorCicloSemanalProps {
  onCicloCreado: (cicloId: string) => void;
}

/**
 * Arranca la semana: qué semana es, cuántas piezas de cada tipo (la mezcla
 * cambia de una semana a otra — arranca con la de la última semana como
 * punto de partida) y cuáles ideas del backlog entran.
 */
export const SelectorCicloSemanal: React.FC<SelectorCicloSemanalProps> = ({
  onCicloCreado,
}) => {
  const lunesActual = lunesDeLaSemana(obtenerDiaTareaHoy());
  const [semana, setSemana] = useState(lunesActual);
  const [editada, setEditada] = useState<MezclaSemanal | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [creando, setCreando] = useState(false);

  const ideas =
    useLiveQuery(() =>
      db.idea_contenido.where("estado").equals("Backlog").toArray()
    ) || SIN_IDEAS;
  const ultimaMezcla = useLiveQuery(async () => {
    const ciclos = await db.ciclo_semanal.toArray();
    return ciclos.sort((a, b) => b.creadoEn - a.creadoEn).find((c) => c.mezcla)
      ?.mezcla;
  });

  const mezcla: MezclaSemanal = editada ?? ultimaMezcla ?? {};
  const total = totalMezcla(mezcla);

  const toggle = (id: string) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const iniciar = async () => {
    setCreando(true);
    const res = await useCase.iniciarCiclo(mezcla.Video ?? 0, seleccionadas, {
      semanaInicio: semana,
      mezcla,
    });
    setCreando(false);
    if (res.ok) onCicloCreado(res.valor);
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
      <h2 className="text-sm font-bold tracking-wider text-zinc-400 uppercase">
        Arrancar la semana
      </h2>
      <Select
        label="Semana a planificar"
        value={semana}
        onChange={setSemana}
        options={[
          {
            value: lunesActual,
            label: `Esta semana — ${etiquetaSemana(lunesActual)}`,
          },
          {
            value: sumarDias(lunesActual, 7),
            label: `La que viene — ${etiquetaSemana(sumarDias(lunesActual, 7))}`,
          },
        ]}
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          ¿Cuántas piezas esta semana? (se puede cambiar después)
        </span>
        <div className="grid grid-cols-2 gap-3">
          {TIPOS_CONTENIDO.map((t: TipoContenido) => (
            <Input
              key={t}
              label={t}
              type="number"
              min={0}
              value={mezcla[t] ?? 0}
              onChange={(e) =>
                setEditada({
                  ...mezcla,
                  [t]: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Elegí las ideas para esta semana ({seleccionadas.length} / {total})
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
              cargarlas después (o pedirle ideas a la IA en «Planificar con
              IA»).
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
