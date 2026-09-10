"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Button } from "../../button";
import { Select, MultiSelect } from "../../select";
import { Icono } from "../../icons";
import { useToast } from "../../../hooks/useToast";
import { GestionarPlantillasRutinaUseCase } from "../../../../application/use-cases/personal/gestionar-plantillas-rutina.use-case";
import {
  FORMATOS_RUTINA,
  type FormatoRutina,
  type TipoEstructura,
} from "../../../../domain/entidades/rutina.entity";

const useCase = new GestionarPlantillasRutinaUseCase();
const SIN_EJERCICIOS: never[] = [];

const ETIQUETA_FORMATO: Record<FormatoRutina, string> = {
  tradicional: "Tradicional (series x reps)",
  piramide: "Pirámide",
  superserie: "Superserie",
  circuito: "Circuito",
  tabata: "Tabata (20s trabajo / 10s descanso)",
  emom: "EMOM (cada minuto)",
  amrap: "AMRAP (rondas en tiempo límite)",
  for_time: "For Time (contrarreloj)",
  liss: "Aeróbico continuo (LISS)",
  pausa_activa: "Pausa activa",
};

const FORMATOS_TIEMPO = new Set<FormatoRutina>([
  "circuito",
  "tabata",
  "emom",
  "amrap",
  "for_time",
  "liss",
  "pausa_activa",
]);

function tipoEstructuraDe(formato: FormatoRutina): TipoEstructura {
  return FORMATOS_TIEMPO.has(formato) ? "tiempo" : "series";
}

interface BloqueSerieForm {
  ejercicioId: string;
  numeroSets: number;
  reps: number;
  pesoKg?: number;
}

/**
 * Alta de rutina: el formato elegido determina si se arma "por series"
 * (tradicional/pirámide/superserie — una lista de ejercicios con sets
 * uniformes; la variación real de una pirámide se termina reflejando al
 * ejecutar, no hace falta planificar set por set) o "por tiempo"
 * (Tabata/EMOM/AMRAP/For Time/circuito — un bloque de config con rondas y
 * tiempos, cada formato usa los campos que le corresponden).
 */
export const CrearPlantilla: React.FC = () => {
  const { mostrarToast } = useToast();
  const ejercicios =
    useLiveQuery(() => db.catalogo_ejercicio.toArray()) || SIN_EJERCICIOS;
  const opcionesEjercicio = ejercicios.map((e) => ({
    value: e.id,
    label: e.nombre,
  }));

  const [nombre, setNombre] = useState("");
  const [formato, setFormato] = useState<FormatoRutina>("tradicional");
  const tipoEstructura = tipoEstructuraDe(formato);

  const [bloquesSeries, setBloquesSeries] = useState<BloqueSerieForm[]>([]);
  const [ejercicioNuevo, setEjercicioNuevo] = useState("");

  const [ejerciciosTiempo, setEjerciciosTiempo] = useState<string[]>([]);
  const [numeroRondas, setNumeroRondas] = useState("");
  const [tiempoTrabajoSeg, setTiempoTrabajoSeg] = useState("");
  const [tiempoDescansoSeg, setTiempoDescansoSeg] = useState("");
  const [tiempoLimiteMin, setTiempoLimiteMin] = useState("");

  const [guardando, setGuardando] = useState(false);

  const agregarEjercicioSerie = () => {
    if (!ejercicioNuevo) return;
    setBloquesSeries([
      ...bloquesSeries,
      { ejercicioId: ejercicioNuevo, numeroSets: 3, reps: 10 },
    ]);
    setEjercicioNuevo("");
  };

  const actualizarBloqueSerie = (
    idx: number,
    cambios: Partial<BloqueSerieForm>
  ) => {
    setBloquesSeries(
      bloquesSeries.map((b, i) => (i === idx ? { ...b, ...cambios } : b))
    );
  };

  const limpiar = () => {
    setNombre("");
    setBloquesSeries([]);
    setEjerciciosTiempo([]);
    setNumeroRondas("");
    setTiempoTrabajoSeg("");
    setTiempoDescansoSeg("");
    setTiempoLimiteMin("");
  };

  const guardar = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    const estructura =
      tipoEstructura === "series"
        ? {
            bloques: bloquesSeries.map((b) => ({
              ejercicioId: b.ejercicioId,
              sets: Array.from({ length: b.numeroSets }, () => ({
                reps: b.reps,
                pesoKg: b.pesoKg,
              })),
            })),
          }
        : {
            ejercicioIds: ejerciciosTiempo,
            numeroRondas: numeroRondas ? Number(numeroRondas) : undefined,
            tiempoTrabajoSeg: tiempoTrabajoSeg
              ? Number(tiempoTrabajoSeg)
              : undefined,
            tiempoDescansoSeg: tiempoDescansoSeg
              ? Number(tiempoDescansoSeg)
              : undefined,
            tiempoLimiteMin: tiempoLimiteMin
              ? Number(tiempoLimiteMin)
              : undefined,
          };
    const res = await useCase.crearPlantilla({
      nombre,
      formato,
      tipoEstructura,
      estructura,
    });
    setGuardando(false);
    if (res.ok) {
      limpiar();
      mostrarToast("Rutina creada.", "exito");
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.Plus className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Nueva rutina
        </h3>
      </div>

      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre de la rutina (ej. Full Body A)"
        className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
      />
      <Select
        label="Formato"
        value={formato}
        onChange={(v) => setFormato(v as FormatoRutina)}
        options={FORMATOS_RUTINA.map((f) => ({
          value: f,
          label: ETIQUETA_FORMATO[f],
        }))}
      />

      {tipoEstructura === "series" ? (
        <div className="flex flex-col gap-2 border-t border-[#2A2A2E] pt-3">
          <div className="flex gap-2">
            <Select
              value={ejercicioNuevo}
              onChange={setEjercicioNuevo}
              options={[
                { value: "", label: "Elegí un ejercicio" },
                ...opcionesEjercicio,
              ]}
            />
            <Button
              variant="outline"
              onClick={agregarEjercicioSerie}
              disabled={!ejercicioNuevo}
            >
              Agregar
            </Button>
          </div>
          {bloquesSeries.map((b, idx) => {
            const ej = ejercicios.find((e) => e.id === b.ejercicioId);
            return (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2"
              >
                <span className="min-w-[140px] text-sm text-zinc-200">
                  {ej?.nombre || b.ejercicioId}
                </span>
                <input
                  type="number"
                  min={1}
                  value={b.numeroSets}
                  onChange={(e) =>
                    actualizarBloqueSerie(idx, {
                      numeroSets: Number(e.target.value) || 1,
                    })
                  }
                  title="Series"
                  className="w-14 rounded border border-[#2A2A2E] bg-[#111113] px-1.5 py-1 text-xs text-zinc-200"
                />
                <span className="text-xs text-zinc-600">series x</span>
                <input
                  type="number"
                  min={1}
                  value={b.reps}
                  onChange={(e) =>
                    actualizarBloqueSerie(idx, {
                      reps: Number(e.target.value) || 1,
                    })
                  }
                  title={
                    ej?.tipoConteo === "tiempo" ? "Segundos" : "Repeticiones"
                  }
                  className="w-14 rounded border border-[#2A2A2E] bg-[#111113] px-1.5 py-1 text-xs text-zinc-200"
                />
                <span className="text-xs text-zinc-600">
                  {ej?.tipoConteo === "tiempo" ? "seg" : "reps"}
                </span>
                {ej?.permiteCarga && (
                  <input
                    type="number"
                    placeholder="kg"
                    value={b.pesoKg ?? ""}
                    onChange={(e) =>
                      actualizarBloqueSerie(idx, {
                        pesoKg: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-16 rounded border border-[#2A2A2E] bg-[#111113] px-1.5 py-1 text-xs text-zinc-200"
                  />
                )}
                <button
                  onClick={() =>
                    setBloquesSeries(bloquesSeries.filter((_, i) => i !== idx))
                  }
                  className="ml-auto text-zinc-600 hover:text-red-400"
                >
                  <Icono.Close className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2 border-t border-[#2A2A2E] pt-3">
          <MultiSelect
            label="Ejercicios"
            value={ejerciciosTiempo}
            onChange={setEjerciciosTiempo}
            options={opcionesEjercicio}
            placeholder="Ejercicios de esta rutina"
          />
          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              placeholder="Rondas"
              value={numeroRondas}
              onChange={(e) => setNumeroRondas(e.target.value)}
              className="w-24 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
            <input
              type="number"
              placeholder="Trabajo (seg)"
              value={tiempoTrabajoSeg}
              onChange={(e) => setTiempoTrabajoSeg(e.target.value)}
              className="w-28 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
            <input
              type="number"
              placeholder="Descanso (seg)"
              value={tiempoDescansoSeg}
              onChange={(e) => setTiempoDescansoSeg(e.target.value)}
              className="w-28 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
            <input
              type="number"
              placeholder="Tiempo límite (min)"
              value={tiempoLimiteMin}
              onChange={(e) => setTiempoLimiteMin(e.target.value)}
              className="w-32 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
          </div>
        </div>
      )}

      <Button
        onClick={guardar}
        cargando={guardando}
        disabled={!nombre.trim()}
        className="self-end"
      >
        Guardar rutina
      </Button>
    </div>
  );
};
