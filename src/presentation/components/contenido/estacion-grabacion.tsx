"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Badge } from "../badge";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";
import {
  estaGrabado,
  ordenarPorEtapa,
  pendienteDeGrabar,
} from "../../../domain/entidades/contenido-semana.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";

const useCase = new GestionarContenidoUseCase();
const SIN_CONTENIDOS: never[] = [];

/** Consejos de la sesión de grabación del SOP (sección 4, bloque 2). */
const PASOS_SET = [
  "Fondo limpio con el isotipo de Nodexa visible de forma sutil, luz de frente, celular en trípode vertical (9:16).",
  "Grabá todo el lote de un tirón. Cambiate de remera cada dos videos para romper la continuidad.",
  "Empezá a hablar en el mismo instante en que apretás grabar (corte de sílaba): sin silencio inicial.",
];

const ORDEN_SECCIONES = [
  "gancho",
  "desarrollo",
  "cierre_cta",
  "bucle",
  "gancho_visual",
  "seo_audio",
  "texto_pantalla",
];
const ETIQUETA_LECTURA: Record<string, string> = {
  gancho: "Gancho",
  desarrollo: "Desarrollo",
  cierre_cta: "Cierre con CTA",
  bucle: "Bucle",
  gancho_visual: "Visual",
  seo_audio: "SEO de audio",
  texto_pantalla: "Texto en pantalla",
};

/**
 * Sesión de grabación en lote: las piezas que faltan grabar, en orden del día
 * que se agendó para grabar (las de hoy primero), con el guion a la vista para
 * leerlo y un botón para marcar cada una como grabada. Las ya grabadas pasan
 * solas a «Editar».
 */
export const EstacionGrabacion: React.FC<{ cicloId: string }> = ({
  cicloId,
}) => {
  const hoy = obtenerDiaTareaHoy();
  const [soloHoy, setSoloHoy] = useState(true);

  const piezas =
    useLiveQuery(
      () => db.contenido.where("cicloId").equals(cicloId).toArray(),
      [cicloId]
    ) ?? SIN_CONTENIDOS;

  const paraGrabar = ordenarPorEtapa(
    piezas.filter(pendienteDeGrabar),
    "grabacion"
  );
  const deHoy = paraGrabar.filter((c) => (c.plan?.grabacion ?? "9999") <= hoy);
  const hayHoy = deHoy.length > 0;
  const visibles = soloHoy && hayHoy ? deHoy : paraGrabar;
  const grabadas = piezas.filter((c) => estaGrabado(c)).length;
  const total = grabadas + paraGrabar.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] px-4 py-3">
        <span className="text-sm font-bold text-zinc-200">
          Grabadas {grabadas} / {total}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {hayHoy && (
            <Button
              variant="ghost"
              onClick={() => setSoloHoy((v) => !v)}
              className="text-xs"
            >
              {soloHoy
                ? `Ver todas (${paraGrabar.length})`
                : "Ver solo las de hoy"}
            </Button>
          )}
          {visibles.length > 1 && (
            <Button
              variant="outline"
              onClick={() =>
                void useCase.marcarGrabadoLote(visibles.map((c) => c.id))
              }
            >
              Marcar todo el lote como grabado
            </Button>
          )}
        </div>
      </div>

      <details
        className="rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4"
        open
      >
        <summary className="cursor-pointer text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Preparación del set
        </summary>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-zinc-400">
          {PASOS_SET.map((p) => (
            <li key={p}>• {p}</li>
          ))}
        </ul>
      </details>

      {visibles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#2A2A2E] p-8 text-center text-sm text-zinc-500">
          No hay nada para grabar. Las piezas grabadas pasan a «Editar».
        </div>
      )}

      {visibles.map((c, i) => (
        <div
          key={c.id}
          className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-zinc-500">#{i + 1}</span>
              <h3 className="text-base font-bold text-zinc-100">{c.titulo}</h3>
              <Badge color="sky">{c.tipoContenido}</Badge>
              {c.plan?.grabacion && (
                <span className="text-xs text-zinc-500">
                  {c.plan.grabacion < hoy
                    ? `atrasada (${c.plan.grabacion})`
                    : c.plan.grabacion === hoy
                      ? "hoy"
                      : c.plan.grabacion}
                </span>
              )}
            </div>
            <Button onClick={() => void useCase.marcarGrabado(c.id)}>
              Grabé este
            </Button>
          </div>
          {(i + 1) % 2 === 1 && i > 0 && (
            <p className="text-xs text-amber-400">
              Cambiate de remera antes de este.
            </p>
          )}
          {Object.keys(c.guion ?? {}).some((k) => c.guion[k]?.trim()) ? (
            <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-4">
              {ORDEN_SECCIONES.filter((k) => c.guion[k]?.trim()).map((k) => (
                <p key={k} className="text-sm text-zinc-300">
                  <span className="font-bold text-zinc-400">
                    {ETIQUETA_LECTURA[k]}:
                  </span>{" "}
                  {c.guion[k]}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-red-400">
              Esta pieza todavía no tiene guion. Escribilo (o pedilo con IA)
              antes de grabar.
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
