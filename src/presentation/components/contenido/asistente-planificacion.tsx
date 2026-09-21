"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Textarea } from "../input";
import { BotonPrompt, Chips } from "../contacto-frio/piezas-cinta";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";
import { armarContextoContenido } from "../../../application/servicios/armar-contexto-contenido.service";
import {
  parsearGuionesIA,
  parsearIdeasIA,
  parsearPlanSemanaIA,
} from "../../../domain/entidades/contenido-ia.entity";
import {
  generarPromptGuiones,
  generarPromptIdeas,
  generarPromptPlan,
} from "../../../domain/prompts/generar-prompt-contenido";

const useCase = new GestionarContenidoUseCase();

type Etapa = "ideas" | "plan" | "guiones";

const ETAPAS: { valor: Etapa; etiqueta: string; ayuda: string }[] = [
  {
    valor: "ideas",
    etiqueta: "① Ideas",
    ayuda:
      "La IA revisa lo que pasó esta semana en tu trabajo (proyectos, clientes, lo que aprendiste hablando con comerciantes) y propone ideas. Se puede hacer un día aparte.",
  },
  {
    valor: "plan",
    etiqueta: "② Plan de la semana",
    ayuda:
      "Con las ideas ya cargadas, definís cuántas piezas de cada tipo, la ficha de cada una y el día de cada etapa. Esta etapa ya conoce las ideas de la etapa ①.",
  },
  {
    valor: "guiones",
    etiqueta: "③ Guiones",
    ayuda:
      "Con las piezas planificadas, la IA escribe los guiones con la plantilla del SOP. Esta etapa ya conoce el plan de la etapa ②.",
  },
];

/**
 * Planificación por etapas con IA (sin IA integrada): copiás el prompt de la
 * etapa, lo pegás en tu IA, y pegás acá el JSON que devuelve. Cada etapa se
 * puede hacer un día distinto: lo decidido queda guardado y entra solo en el
 * prompt de la siguiente.
 */
export const AsistentePlanificacion: React.FC<{ cicloId: string }> = ({
  cicloId,
}) => {
  const [etapa, setEtapa] = useState<Etapa>("ideas");
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const progreso = useLiveQuery(async () => {
    const ideas = await db.idea_contenido
      .where("cicloId")
      .equals(cicloId)
      .count();
    const piezas = await db.contenido
      .where("cicloId")
      .equals(cicloId)
      .toArray();
    const conGuion = piezas.filter((p) =>
      Object.values(p.guion ?? {}).some((v) => v?.trim())
    ).length;
    return { ideas, piezas: piezas.length, conGuion };
  }, [cicloId]);

  const generar = async (): Promise<string> => {
    const ctx = await armarContextoContenido(cicloId);
    return etapa === "ideas"
      ? generarPromptIdeas(ctx)
      : etapa === "plan"
        ? generarPromptPlan(ctx)
        : generarPromptGuiones(ctx);
  };

  // El armado del contexto es asíncrono (lee la base): se resuelve al tocar el botón.
  const [promptListo, setPromptListo] = useState("");
  const prepararPrompt = async () => {
    setPromptListo(await generar());
  };

  const importar = async () => {
    setError("");
    setMensaje("");
    setTrabajando(true);
    try {
      if (etapa === "ideas") {
        const r = parsearIdeasIA(json);
        if (!r.ok) return setError(r.error);
        const res = await useCase.importarIdeasIA(cicloId, r.data);
        if (!res.ok) return setError(res.error!.mensaje);
        setMensaje(
          `Se cargaron ${res.valor} idea(s) nueva(s). Ya podés pasar a la etapa ②.`
        );
      } else if (etapa === "plan") {
        const r = parsearPlanSemanaIA(json);
        if (!r.ok) return setError(r.error);
        const res = await useCase.importarPlanIA(cicloId, r.data);
        if (!res.ok) return setError(res.error!.mensaje);
        setMensaje(
          `Plan cargado: ${res.valor!.creadas} pieza(s) nueva(s) y ${res.valor!.actualizadas} actualizada(s). Ya podés pasar a la etapa ③.`
        );
      } else {
        const r = parsearGuionesIA(json);
        if (!r.ok) return setError(r.error);
        const res = await useCase.importarGuionesIA(cicloId, r.data);
        if (!res.ok) return setError(res.error!.mensaje);
        setMensaje(
          `Guiones cargados: ${res.valor!.actualizados} actualizado(s) y ${res.valor!.creados} nuevo(s). Revisalos en la pestaña Guion.`
        );
      }
      setJson("");
      setPromptListo("");
    } finally {
      setTrabajando(false);
    }
  };

  const actual = ETAPAS.find((e) => e.valor === etapa)!;

  return (
    <div className="flex flex-col gap-4">
      <Chips
        valor={etapa}
        onChange={(e) => {
          setEtapa(e);
          setJson("");
          setError("");
          setMensaje("");
          setPromptListo("");
        }}
        opciones={ETAPAS.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta }))}
      />
      {progreso && (
        <p className="text-xs text-zinc-500">
          Esta semana: {progreso.ideas} idea(s) · {progreso.piezas} pieza(s)
          planificada(s) · {progreso.conGuion} con guion.
        </p>
      )}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
        <p className="text-sm text-zinc-300">{actual.ayuda}</p>
        <Button
          variant="outline"
          onClick={prepararPrompt}
          className="self-start"
        >
          Armar el prompt de esta etapa
        </Button>
        {promptListo && (
          <BotonPrompt etiqueta="Copiar prompt" generar={() => promptListo} />
        )}
        <Textarea
          label="Pegá lo que devolvió la IA (JSON)"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={6}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {mensaje && <p className="text-xs text-emerald-400">{mensaje}</p>}
        <Button
          onClick={importar}
          cargando={trabajando}
          disabled={!json.trim()}
          className="self-start"
        >
          Importar
        </Button>
      </div>
    </div>
  );
};
