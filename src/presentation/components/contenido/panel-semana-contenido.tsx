"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Input } from "../input";
import { Select } from "../select";
import { TablaPiezasSemana } from "./tabla-piezas-semana";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";
import {
  ETIQUETA_ETAPA,
  TIPOS_CONTENIDO,
  type DiasCinta,
  type MezclaSemanal,
  type TipoContenido,
} from "../../../domain/entidades/contenido.entity";
import { DIAS_CINTA_DEFAULT } from "../../../domain/entidades/contenido.entity";
import {
  etiquetaSemana,
  semanaDeCiclo,
  sugerirMezcla,
  totalMezcla,
} from "../../../domain/entidades/contenido-semana.entity";
import { metasDelPeriodo } from "../../../domain/entidades/metas-periodo.entity";
import { sumarDias } from "../../../domain/entidades/personal.entity";

const useCase = new GestionarContenidoUseCase();
const NOMBRE_DIA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const OPCIONES_DIA = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
  value: String(d),
  label: NOMBRE_DIA[d],
}));
const CHIPS_DIA = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
  valor: d,
  etiqueta: NOMBRE_DIA[d].slice(0, 3),
}));

/**
 * Armado de la semana, sin nada fijo: cuántas piezas de cada tipo (cambia
 * cada semana), en qué día se hace cada etapa por defecto, y el día de cada
 * etapa de cada pieza — pudiendo juntar varias piezas o varias etapas el
 * mismo día.
 */
export const PanelSemanaContenido: React.FC<{ cicloId: string }> = ({
  cicloId,
}) => {
  const ciclo = useLiveQuery(() => db.ciclo_semanal.get(cicloId), [cicloId]);
  const piezas =
    useLiveQuery(
      () => db.contenido.where("cicloId").equals(cicloId).toArray(),
      [cicloId]
    ) ?? [];
  const [mensaje, setMensaje] = useState("");
  const [diasPub, setDiasPub] = useState<
    Partial<Record<TipoContenido, number[]>>
  >({});

  if (!ciclo) return null;
  const lunes = semanaDeCiclo(ciclo);
  const mezcla: MezclaSemanal = ciclo.mezcla ?? {};
  const diasCinta: DiasCinta = {
    ...DIAS_CINTA_DEFAULT,
    ...(ciclo.diasCinta ?? {}),
  };

  const cambiarMezcla = (tipo: TipoContenido, n: number) =>
    useCase.actualizarSemana(cicloId, {
      mezcla: { ...mezcla, [tipo]: Math.max(0, n) },
    });

  const sugerir = async () => {
    const [entregables, fases] = await Promise.all([
      db.entregable.toArray(),
      db.fase_personal.toArray(),
    ]);
    const metas = metasDelPeriodo(
      entregables,
      fases,
      [],
      lunes,
      sumarDias(lunes, 6)
    );
    const sugerida = sugerirMezcla(metas);
    if (totalMezcla(sugerida) === 0) {
      setMensaje(
        "No encontré metas de videos/posts/historias en tu plan para esta semana."
      );
      return;
    }
    await useCase.actualizarSemana(cicloId, { mezcla: sugerida });
    setMensaje(
      "Mezcla tomada de las metas de tu plan. Editala si esta semana es distinta."
    );
  };

  const crear = async () => {
    const r = await useCase.crearPiezasFaltantes(cicloId);
    setMensaje(
      r.ok
        ? r.valor === 0
          ? "Ya están todas las piezas."
          : `Se crearon ${r.valor} pieza(s).`
        : r.error!.mensaje
    );
  };

  const distribuir = async () => {
    const r = await useCase.distribuirPublicaciones(cicloId, diasPub);
    setMensaje(
      r.ok
        ? r.valor === 0
          ? "Elegí al menos un día de publicación para algún tipo."
          : `Se repartió la publicación de ${r.valor} pieza(s). Podés ajustar cada una abajo.`
        : r.error!.mensaje
    );
  };

  const tiposConPiezas = TIPOS_CONTENIDO.filter((t) => (mezcla[t] ?? 0) > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold tracking-wider text-zinc-400 uppercase">
            {etiquetaSemana(lunes)}
          </h3>
          <Button variant="ghost" onClick={sugerir} className="text-xs">
            Tomar la mezcla de mi plan
          </Button>
        </div>
        <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
          ¿Cuántas piezas esta semana?
        </span>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TIPOS_CONTENIDO.map((t) => (
            <Input
              key={t}
              label={t}
              type="number"
              min={0}
              value={mezcla[t] ?? 0}
              onChange={(e) =>
                void cambiarMezcla(t, Number(e.target.value) || 0)
              }
            />
          ))}
        </div>

        <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
          Día por defecto de cada etapa (para las piezas nuevas — después se
          ajusta pieza por pieza)
        </span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(["guion", "grabacion", "edicion"] as const).map((e) => (
            <Select
              key={e}
              label={ETIQUETA_ETAPA[e]}
              value={String(diasCinta[e] ?? "")}
              onChange={(v) =>
                void useCase.actualizarSemana(cicloId, {
                  diasCinta: { ...diasCinta, [e]: Number(v) },
                })
              }
              options={OPCIONES_DIA}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={crear} disabled={totalMezcla(mezcla) === 0}>
            Crear las piezas que faltan (como «Video 1», «Post 2»…)
          </Button>
        </div>
      </div>

      {piezas.length > 0 && tiposConPiezas.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-6">
          <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Repartir la publicación (elegí los días de cada tipo)
          </span>
          {tiposConPiezas.map((t) => (
            <div key={t} className="flex flex-wrap items-center gap-3">
              <span className="w-20 text-sm text-zinc-300">{t}</span>
              <MultiDias
                valor={diasPub[t] ?? []}
                onChange={(v) => setDiasPub({ ...diasPub, [t]: v })}
              />
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={distribuir}
            className="self-start"
          >
            Repartir automáticamente
          </Button>
        </div>
      )}

      <TablaPiezasSemana cicloId={cicloId} />
      {mensaje && <p className="text-xs text-emerald-400">{mensaje}</p>}
    </div>
  );
};

/** Selección de varios días de la semana (chips que se prenden y apagan). */
const MultiDias: React.FC<{
  valor: number[];
  onChange: (v: number[]) => void;
}> = ({ valor, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {CHIPS_DIA.map((d) => {
      const activo = valor.includes(d.valor);
      return (
        <button
          key={d.valor}
          type="button"
          onClick={() =>
            onChange(
              activo ? valor.filter((x) => x !== d.valor) : [...valor, d.valor]
            )
          }
          className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
            activo
              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
              : "border-[#2A2A2E] text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {d.etiqueta}
        </button>
      );
    })}
  </div>
);
