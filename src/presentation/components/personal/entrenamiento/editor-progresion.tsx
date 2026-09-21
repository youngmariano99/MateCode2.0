"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Dialog } from "../../dialog";
import { Button } from "../../button";
import { useToast } from "../../../hooks/useToast";
import { GestionarProgresionBloqueUseCase } from "../../../../application/use-cases/personal/gestionar-progresion-bloque.use-case";
import { reglaSirve } from "../../../../domain/entidades/progresion-entrenamiento.entity";
import {
  TIPOS_PROGRESION,
  type BloqueEntrenamiento,
  type Descarga,
  type EstructuraSeries,
  type EstructuraTiempo,
  type MinimoEjercicio,
  type ProgresionEjercicio,
  type ReglaProgresion,
  type TipoProgresion,
} from "../../../../domain/entidades/rutina.entity";

const useCase = new GestionarProgresionBloqueUseCase();

const ETIQUETA_TIPO: Record<TipoProgresion, string> = {
  reps: "Repeticiones",
  series: "Series",
  carga: "Peso (kg)",
  nivel: "Dificultad (nivel)",
  tiempo: "Tiempo (seg)",
  distancia: "Distancia (m)",
  rondas: "Rondas",
  tiempo_trabajo: "Tiempo de trabajo (seg)",
  tiempo_descanso: "Tiempo de descanso (seg)",
};
const TIPOS_TIEMPO: TipoProgresion[] = [
  "rondas",
  "tiempo_trabajo",
  "tiempo_descanso",
];

const inputCls =
  "w-16 rounded border border-[#2A2A2E] bg-[#0D0D0F] px-1.5 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500/40";

const num = (v: string): number | undefined =>
  v === "" ? undefined : Number(v);

/** Editor de UNA regla: qué sube, cuánto, cada cuántas semanas, desde cuándo y hasta dónde. */
const FilaRegla: React.FC<{
  regla: ReglaProgresion;
  tipos: TipoProgresion[];
  onChange: (r: ReglaProgresion) => void;
  onQuitar: () => void;
}> = ({ regla, tipos, onChange, onQuitar }) => (
  <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
    <select
      value={regla.tipo}
      onChange={(e) =>
        onChange({ ...regla, tipo: e.target.value as TipoProgresion })
      }
      className="rounded border border-[#2A2A2E] bg-[#0D0D0F] px-1.5 py-1 text-xs text-zinc-200"
    >
      {tipos.map((t) => (
        <option key={t} value={t}>
          {ETIQUETA_TIPO[t]}
        </option>
      ))}
    </select>
    <span>sube</span>
    <input
      type="number"
      step="any"
      value={regla.incremento}
      onChange={(e) =>
        onChange({ ...regla, incremento: Number(e.target.value) })
      }
      className={inputCls}
    />
    <span>cada</span>
    <input
      type="number"
      min={1}
      value={regla.cadaSemanas ?? 1}
      onChange={(e) => onChange({ ...regla, cadaSemanas: num(e.target.value) })}
      className={inputCls}
    />
    <span>sem. · desde el paso</span>
    <input
      type="number"
      min={1}
      value={regla.desdePaso ?? 2}
      onChange={(e) => onChange({ ...regla, desdePaso: num(e.target.value) })}
      className={inputCls}
    />
    <span>· tope</span>
    <input
      type="number"
      step="any"
      value={regla.tope ?? ""}
      placeholder="—"
      onChange={(e) => onChange({ ...regla, tope: num(e.target.value) })}
      className={inputCls}
    />
    <button
      onClick={onQuitar}
      className="px-1 font-bold text-zinc-600 hover:text-red-400"
      title="Quitar regla"
    >
      ✕
    </button>
  </div>
);

/**
 * Edita cómo progresa cada ejercicio de una rutina dentro de un bloque: una o
 * varias reglas por ejercicio (repeticiones, series, kg, dificultad…), su
 * mínimo, si NO debe progresar, una progresión general para el resto, la
 * progresión por tiempo en las rutinas de rondas y las semanas de descarga.
 * Solo se ofrecen las formas de progresar que le sirven a cada ejercicio (a
 * uno de peso corporal no se le ofrece "kg").
 */
export const EditorProgresion: React.FC<{
  bloque: BloqueEntrenamiento;
  plantillaId: string;
  abierto: boolean;
  onCerrar: () => void;
}> = ({ bloque, plantillaId, abierto, onCerrar }) => {
  const { mostrarToast } = useToast();
  const plantilla = useLiveQuery(
    () => db.plantilla_rutina.get(plantillaId),
    [plantillaId]
  );
  const catalogo = useLiveQuery(() => db.catalogo_ejercicio.toArray()) ?? [];
  const programada = bloque.rutinasProgramadas.find(
    (r) => r.plantillaId === plantillaId
  );

  const [progresiones, setProgresiones] = useState<
    ProgresionEjercicio[] | null
  >(null);
  const [general, setGeneral] = useState<ReglaProgresion[] | null>(null);
  const [tiempo, setTiempo] = useState<ReglaProgresion[] | null>(null);
  const [descargas, setDescargas] = useState<Descarga[] | null>(null);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (!plantilla || !programada) return null;
  const estructura = programada.estructuraBase ?? plantilla.estructura;
  const info = new Map(catalogo.map((e) => [e.id, e]));
  const nombre = (id: string) => info.get(id)?.nombre ?? id;

  const P = progresiones ?? programada.progresiones ?? [];
  const G = general ?? programada.progresionGeneral ?? [];
  const T = tiempo ?? programada.progresionTiempo ?? [];
  const D = descargas ?? bloque.descargas ?? [];

  const propia = (id: string): ProgresionEjercicio =>
    P.find((p) => p.ejercicioId === id) ?? { ejercicioId: id, reglas: [] };
  const guardarPropia = (p: ProgresionEjercicio) =>
    setProgresiones([...P.filter((x) => x.ejercicioId !== p.ejercicioId), p]);

  const ejerciciosIds =
    plantilla.tipoEstructura === "series"
      ? (estructura as EstructuraSeries).bloques.map((b) => b.ejercicioId)
      : (estructura as EstructuraTiempo).ejercicioIds;
  const setsDe = (id: string) =>
    plantilla.tipoEstructura === "series"
      ? ((estructura as EstructuraSeries).bloques.find(
          (b) => b.ejercicioId === id
        )?.sets ?? [])
      : [];

  const tiposPara = (id: string): TipoProgresion[] =>
    TIPOS_PROGRESION.filter(
      (t) =>
        !TIPOS_TIEMPO.includes(t) &&
        reglaSirve({ tipo: t, incremento: 1 }, setsDe(id), info.get(id))
    );

  const guardar = async () => {
    setGuardando(true);
    const limpias = P.filter(
      (p) =>
        p.reglas.length > 0 ||
        p.sinProgresion ||
        p.minimo ||
        p.nivelBase !== undefined
    );
    const res = await useCase.editarProgresion(
      bloque.id,
      plantillaId,
      { progresiones: limpias, progresionGeneral: G, progresionTiempo: T },
      D,
      nota || undefined
    );
    setGuardando(false);
    if (!res.ok) return mostrarToast(res.error!.mensaje, "error");
    mostrarToast("Progresión guardada.", "exito");
    onCerrar();
  };

  const minimoInput = (
    id: string,
    campo: keyof MinimoEjercicio,
    etiqueta: string
  ) => (
    <label
      key={campo}
      className="flex items-center gap-1 text-[11px] text-zinc-500"
    >
      {etiqueta}
      <input
        type="number"
        step="any"
        value={propia(id).minimo?.[campo] ?? ""}
        placeholder="—"
        onChange={(e) => {
          const p = propia(id);
          guardarPropia({
            ...p,
            minimo: { ...(p.minimo ?? {}), [campo]: num(e.target.value) },
          });
        }}
        className={inputCls}
      />
    </label>
  );

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo={`Progresión — ${plantilla.nombre}`}
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-zinc-500">
          El paso 1 son los números base de la rutina. Desde el paso 2 se
          aplican las reglas. Cada ejercicio puede progresar distinto; el mínimo
          es el piso que el plan nunca baja (ni en descarga).
        </p>

        {ejerciciosIds.map((id) => {
          const p = propia(id);
          const tipos = tiposPara(id);
          return (
            <div
              key={id}
              className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-zinc-200">
                  {nombre(id)}
                </span>
                <label className="flex items-center gap-1 text-[11px] text-zinc-500">
                  <input
                    type="checkbox"
                    checked={!!p.sinProgresion}
                    onChange={(e) =>
                      guardarPropia({
                        ...p,
                        sinProgresion: e.target.checked || undefined,
                      })
                    }
                  />
                  No progresa
                </label>
              </div>
              {!p.sinProgresion && (
                <>
                  {p.reglas.map((r, i) => (
                    <FilaRegla
                      key={i}
                      regla={r}
                      tipos={tipos}
                      onChange={(n) =>
                        guardarPropia({
                          ...p,
                          reglas: p.reglas.map((x, j) => (j === i ? n : x)),
                        })
                      }
                      onQuitar={() =>
                        guardarPropia({
                          ...p,
                          reglas: p.reglas.filter((_, j) => j !== i),
                        })
                      }
                    />
                  ))}
                  <button
                    onClick={() =>
                      guardarPropia({
                        ...p,
                        reglas: [
                          ...p.reglas,
                          {
                            tipo: tipos[0] ?? "reps",
                            incremento: 1,
                            cadaSemanas: 1,
                          },
                        ],
                      })
                    }
                    disabled={tipos.length === 0}
                    className="self-start text-[11px] font-bold text-emerald-400 uppercase hover:underline disabled:text-zinc-700"
                  >
                    + Agregar forma de progresar
                  </button>
                  {p.reglas.length === 0 && G.length > 0 && (
                    <span className="text-[11px] text-zinc-600">
                      Sin regla propia: usa la progresión general de la rutina.
                    </span>
                  )}
                </>
              )}
              <div className="flex flex-wrap items-center gap-3 border-t border-[#2A2A2E] pt-2">
                <span className="text-[11px] font-bold text-sky-400 uppercase">
                  Mínimo
                </span>
                {minimoInput(id, "series", "series")}
                {tipos.includes("reps") && minimoInput(id, "reps", "reps")}
                {tipos.includes("carga") && minimoInput(id, "pesoKg", "kg")}
                {tipos.includes("nivel") && minimoInput(id, "nivel", "nivel")}
                {tipos.includes("tiempo") &&
                  minimoInput(id, "tiempoSeg", "seg")}
              </div>
            </div>
          );
        })}

        {plantilla.tipoEstructura === "series" && (
          <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
            <span className="text-sm font-bold text-zinc-200">
              Progresión general de la rutina
            </span>
            <span className="text-[11px] text-zinc-600">
              Se aplica a los ejercicios sin regla propia, solo a los que les
              sirve (kg a los que llevan carga, dificultad a los que tienen
              niveles).
            </span>
            {G.map((r, i) => (
              <FilaRegla
                key={i}
                regla={r}
                tipos={TIPOS_PROGRESION.filter(
                  (t) => !TIPOS_TIEMPO.includes(t)
                )}
                onChange={(n) => setGeneral(G.map((x, j) => (j === i ? n : x)))}
                onQuitar={() => setGeneral(G.filter((_, j) => j !== i))}
              />
            ))}
            <button
              onClick={() =>
                setGeneral([
                  ...G,
                  { tipo: "reps", incremento: 1, cadaSemanas: 1 },
                ])
              }
              className="self-start text-[11px] font-bold text-emerald-400 uppercase hover:underline"
            >
              + Agregar regla general
            </button>
          </div>
        )}

        {plantilla.tipoEstructura === "tiempo" && (
          <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
            <span className="text-sm font-bold text-zinc-200">
              Progresión de la rutina por tiempo
            </span>
            {T.map((r, i) => (
              <FilaRegla
                key={i}
                regla={r}
                tipos={TIPOS_TIEMPO}
                onChange={(n) => setTiempo(T.map((x, j) => (j === i ? n : x)))}
                onQuitar={() => setTiempo(T.filter((_, j) => j !== i))}
              />
            ))}
            <button
              onClick={() =>
                setTiempo([
                  ...T,
                  { tipo: "rondas", incremento: 1, cadaSemanas: 2 },
                ])
              }
              className="self-start text-[11px] font-bold text-emerald-400 uppercase hover:underline"
            >
              + Agregar regla de rondas / tiempos
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
          <span className="text-sm font-bold text-zinc-200">
            Semanas de descarga del bloque
          </span>
          {D.map((d, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-xs text-zinc-400"
            >
              <span>En el paso</span>
              <input
                type="number"
                min={1}
                value={d.paso}
                onChange={(e) =>
                  setDescargas(
                    D.map((x, j) =>
                      j === i ? { ...x, paso: Number(e.target.value) } : x
                    )
                  )
                }
                className={inputCls}
              />
              <span>se entrena al</span>
              <input
                type="number"
                min={10}
                max={100}
                step={5}
                value={Math.round(d.factor * 100)}
                onChange={(e) =>
                  setDescargas(
                    D.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            factor: Math.min(1, Number(e.target.value) / 100),
                          }
                        : x
                    )
                  )
                }
                className={inputCls}
              />
              <span>%</span>
              <button
                onClick={() => setDescargas(D.filter((_, j) => j !== i))}
                className="px-1 font-bold text-zinc-600 hover:text-red-400"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => setDescargas([...D, { paso: 4, factor: 0.7 }])}
            className="self-start text-[11px] font-bold text-emerald-400 uppercase hover:underline"
          >
            + Agregar semana de descarga
          </button>
        </div>

        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={2}
          placeholder="Por qué lo cambio (opcional, queda en el historial)"
          className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCerrar}
            className="text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Cancelar
          </button>
          <Button onClick={guardar} cargando={guardando}>
            Guardar progresión
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
