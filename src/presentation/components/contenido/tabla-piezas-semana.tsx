"use client";

import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { CampoFecha } from "./ficha-plan-pieza";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";
import {
  ETAPAS_CINTA,
  ETIQUETA_ETAPA,
} from "../../../domain/entidades/contenido.entity";

const useCase = new GestionarContenidoUseCase();

/**
 * Las piezas de la semana con el día de cada etapa. Es la misma tabla se haya
 * armado el plan a mano o con IA: acá se ve lo que hay y se ajusta cada día.
 */
export const TablaPiezasSemana: React.FC<{ cicloId: string }> = ({
  cicloId,
}) => {
  const piezas =
    useLiveQuery(
      () => db.contenido.where("cicloId").equals(cicloId).toArray(),
      [cicloId]
    ) ?? [];

  if (piezas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#2A2A2E] p-4 text-sm text-zinc-600">
        Todavía no hay piezas en esta semana.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-5">
      <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
        Piezas de la semana ({piezas.length}) — el día de cada etapa
      </span>
      {piezas.map((p) => (
        <div
          key={p.id}
          className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3"
        >
          <span className="text-sm font-bold text-zinc-200">
            {p.titulo}{" "}
            <span className="text-xs font-normal text-zinc-500">
              · {p.tipoContenido} · {p.estado}
              {p.ficha?.pilar ? ` · ${p.ficha.pilar}` : ""}
              {Object.values(p.guion ?? {}).some((v) => v?.trim())
                ? " · con guion"
                : " · sin guion"}
            </span>
          </span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ETAPAS_CINTA.map((etapa) => (
              <CampoFecha
                key={etapa}
                label={ETIQUETA_ETAPA[etapa]}
                value={
                  etapa === "publicacion"
                    ? (p.plan?.publicacion ?? p.diaEstimado)
                    : p.plan?.[etapa]
                }
                onChange={(v) => void useCase.asignarPlan(p.id, { [etapa]: v })}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
