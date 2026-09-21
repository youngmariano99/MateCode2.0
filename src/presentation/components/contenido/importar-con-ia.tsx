"use client";

import React, { useState } from "react";
import { Button } from "../button";
import { Textarea } from "../input";
import { BotonPrompt } from "../contacto-frio/piezas-cinta";
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

export type EtapaIA = "ideas" | "plan" | "guiones";

const TEXTOS: Record<EtapaIA, { aviso: string; boton: string }> = {
  ideas: {
    aviso:
      "La IA propone ideas a partir de lo que pasó en tu trabajo. Las ideas que ya cargaste no se repiten, y las que no uses esta semana quedan en el backlog para otras semanas.",
    boton: "Importar ideas",
  },
  plan: {
    aviso:
      "La IA arma las piezas con su ficha y el día de cada etapa. Si ya creaste piezas a mano («Video 1», «Post 2»…), el plan las COMPLETA en lugar de crear otras al lado: no se duplican.",
    boton: "Importar el plan",
  },
  guiones: {
    aviso:
      "La IA escribe los guiones de las piezas ya planificadas y los asocia por título. Si una pieza ya tiene guion, se completa con lo nuevo.",
    boton: "Importar guiones",
  },
};

/**
 * La forma "con IA" de UN paso de la planificación (sin IA integrada): se arma
 * el prompt con todo lo ya decidido, se copia a la IA de preferencia y se pega
 * acá el JSON que devuelve. Guarda en los MISMOS datos que la forma manual del
 * paso, así que nunca hay que hacer las dos cosas.
 */
export const ImportarConIA: React.FC<{
  cicloId: string;
  etapa: EtapaIA;
}> = ({ cicloId, etapa }) => {
  const [json, setJson] = useState("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const armar = async () => {
    const ctx = await armarContextoContenido(cicloId);
    setPrompt(
      etapa === "ideas"
        ? generarPromptIdeas(ctx)
        : etapa === "plan"
          ? generarPromptPlan(ctx)
          : generarPromptGuiones(ctx)
    );
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
          res.valor === 0
            ? "Esas ideas ya estaban cargadas: no se agregó nada."
            : `Se cargaron ${res.valor} idea(s) nueva(s).`
        );
      } else if (etapa === "plan") {
        const r = parsearPlanSemanaIA(json);
        if (!r.ok) return setError(r.error);
        const res = await useCase.importarPlanIA(cicloId, r.data);
        if (!res.ok) return setError(res.error!.mensaje);
        const v = res.valor!;
        setMensaje(
          `Plan cargado: ${v.creadas} pieza(s) nueva(s), ${v.completadas} completada(s) de las que ya tenías y ${v.actualizadas} actualizada(s).`
        );
      } else {
        const r = parsearGuionesIA(json);
        if (!r.ok) return setError(r.error);
        const res = await useCase.importarGuionesIA(cicloId, r.data);
        if (!res.ok) return setError(res.error!.mensaje);
        setMensaje(
          `Guiones cargados: ${res.valor!.actualizados} pieza(s) completada(s) y ${res.valor!.creados} nueva(s).`
        );
      }
      setJson("");
      setPrompt("");
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-5">
      <p className="text-sm text-zinc-300">{TEXTOS[etapa].aviso}</p>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-xs text-zinc-500">
        <li>Armá el prompt (lleva todo lo que ya decidiste).</li>
        <li>Copialo y pegalo en tu IA; conversá hasta confirmar.</li>
        <li>Pegá acá el JSON que te devuelve e importalo.</li>
      </ol>
      <Button variant="outline" onClick={armar} className="self-start">
        1 · Armar el prompt de este paso
      </Button>
      {prompt && (
        <BotonPrompt etiqueta="2 · Copiar prompt" generar={() => prompt} />
      )}
      <Textarea
        label="3 · Pegá lo que devolvió la IA (JSON)"
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
        {TEXTOS[etapa].boton}
      </Button>
    </div>
  );
};
