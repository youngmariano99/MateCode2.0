"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { GestionarHabitosUseCase } from "../../../application/use-cases/personal/gestionar-habitos.use-case";
import { SelectorEtiquetas } from "../contacto-frio/selector-etiquetas";
import {
  requiereMinimoObligatorio,
  idRegistroHabito,
  aplicaHoy,
  FRECUENCIAS_HABITO,
  type HabitoDefinicion,
  type FrecuenciaHabito,
} from "../../../domain/entidades/habitos.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

const useCase = new GestionarHabitosUseCase();
const SIN_HABITOS: never[] = [];

// Nivel seleccionable a mano en la tarjeta diaria — "NO_CUMPLIDO" no es un
// botón de este grid: se marca solo desde el panel de recuperación de
// desvíos, nunca como una elección del día a día.
const NIVELES_SELECCIONABLES = ["MIN", "MED", "MAX"] as const;
type NivelSeleccionable = (typeof NIVELES_SELECCIONABLES)[number];

const DESCRIPCION_NIVEL: Record<
  NivelSeleccionable,
  (h: HabitoDefinicion) => string
> = {
  MIN: (h) => h.descripcionMin,
  MED: (h) => h.descripcionMed,
  MAX: (h) => h.descripcionMax,
};

const ETIQUETA_FRECUENCIA: Record<FrecuenciaHabito, string> = {
  diaria: "Todos los días",
  dias_especificos: "Días específicos",
};

const DIAS_SEMANA_LABEL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const FilaHabito: React.FC<{
  habito: HabitoDefinicion;
  hoy: string;
  ayer: string;
}> = ({ habito, hoy, ayer }) => {
  const { mostrarToast } = useToast();

  const registroHoy = useLiveQuery(
    () => db.habito_registro.get(idRegistroHabito(habito.id, hoy)),
    [habito.id, hoy]
  );
  const registroAyer = useLiveQuery(
    () => db.habito_registro.get(idRegistroHabito(habito.id, ayer)),
    [habito.id, ayer]
  );

  const bloqueado =
    !registroHoy && requiereMinimoObligatorio(habito, registroAyer, ayer);

  const registrar = async (nivel: NivelSeleccionable) => {
    const res = await useCase.registrarNivel({
      habitoId: habito.id,
      diaTarea: hoy,
      nivelEjecutado: nivel,
    });
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border bg-[#0D0D0F] p-3 ${
        bloqueado ? "border-red-500/40" : "border-[#2A2A2E]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-zinc-200">{habito.nombre}</span>
        {bloqueado && (
          <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-400 uppercase">
            No fallar dos veces
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {NIVELES_SELECCIONABLES.map((nivel) => {
          const activo = registroHoy?.nivelEjecutado === nivel;
          const esMinBloqueado = bloqueado && nivel === "MIN";
          return (
            <button
              key={nivel}
              onClick={() => void registrar(nivel)}
              title={DESCRIPCION_NIVEL[nivel](habito)}
              className={`min-h-[44px] rounded-lg border font-mono text-xs font-bold uppercase transition-all ${
                activo
                  ? "border-emerald-500/40 bg-emerald-500 text-zinc-950"
                  : esMinBloqueado
                    ? "animate-pulse border-red-500/50 bg-red-500/10 text-red-400"
                    : "border-[#2A2A2E] text-zinc-400 hover:bg-[#18181B]"
              }`}
            >
              {nivel}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const FormularioNuevoHabito: React.FC = () => {
  const { mostrarToast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcionMin, setDescripcionMin] = useState("");
  const [descripcionMed, setDescripcionMed] = useState("");
  const [descripcionMax, setDescripcionMax] = useState("");
  const [frecuencia, setFrecuencia] = useState<FrecuenciaHabito>("diaria");
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);
  const [etiquetasArea, setEtiquetasArea] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const toggleDia = (dia: number) => {
    setDiasSemana((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  const crear = async () => {
    setGuardando(true);
    const res = await useCase.crearHabito({
      nombre,
      descripcionMin,
      descripcionMed,
      descripcionMax,
      area: "ambas",
      frecuencia,
      diasSemana: frecuencia === "dias_especificos" ? diasSemana : undefined,
      etiquetaArea: etiquetasArea[0],
    });
    setGuardando(false);
    if (res.ok) {
      setNombre("");
      setDescripcionMin("");
      setDescripcionMed("");
      setDescripcionMax("");
      setFrecuencia("diaria");
      setDiasSemana([1, 2, 3, 4, 5]);
      setEtiquetasArea([]);
      setAbierto(false);
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#2A2A2E] p-3 text-xs font-bold text-zinc-500 uppercase hover:border-zinc-700 hover:text-zinc-300"
      >
        <Icono.Plus className="h-3.5 w-3.5" />
        Nuevo hábito
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre del hábito (ej. Código, Salud, Adquisición)"
        className="rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
      />
      <input
        value={descripcionMin}
        onChange={(e) => setDescripcionMin(e.target.value)}
        placeholder="Nivel MIN — la versión mínima, siempre alcanzable"
        className="rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
      />
      <input
        value={descripcionMed}
        onChange={(e) => setDescripcionMed(e.target.value)}
        placeholder="Nivel MED"
        className="rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
      />
      <input
        value={descripcionMax}
        onChange={(e) => setDescripcionMax(e.target.value)}
        placeholder="Nivel MAX"
        className="rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
      />

      <div className="flex flex-col gap-1.5 border-t border-[#2A2A2E] pt-2">
        <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
          Frecuencia
        </span>
        <div className="flex gap-1.5">
          {FRECUENCIAS_HABITO.map((f) => (
            <button
              key={f}
              onClick={() => setFrecuencia(f)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold uppercase transition-all ${
                frecuencia === f
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-[#2A2A2E] text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {ETIQUETA_FRECUENCIA[f]}
            </button>
          ))}
        </div>
        {frecuencia === "dias_especificos" && (
          <div className="flex gap-1">
            {DIAS_SEMANA_LABEL.map((label, dia) => (
              <button
                key={dia}
                onClick={() => toggleDia(dia)}
                className={`min-h-[36px] flex-1 rounded-lg border text-[11px] font-bold uppercase transition-all ${
                  diasSemana.includes(dia)
                    ? "border-emerald-500/40 bg-emerald-500 text-zinc-950"
                    : "border-[#2A2A2E] text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <SelectorEtiquetas
        label="Área (opcional)"
        categoria="area_personal"
        value={etiquetasArea}
        onChange={(v) => setEtiquetasArea(v.slice(-1))}
      />

      <div className="flex justify-end gap-2">
        <button
          onClick={() => setAbierto(false)}
          className="rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
        >
          Cancelar
        </button>
        <Button
          onClick={crear}
          cargando={guardando}
          disabled={
            !nombre || !descripcionMin || !descripcionMed || !descripcionMax
          }
        >
          Crear hábito
        </Button>
      </div>
    </div>
  );
};

/**
 * El Acordeón: hábitos nucleares del día en 3 niveles. Nunca penaliza
 * cumplir solo MIN — la regla "No Fallar Dos Veces" resalta en rojo el
 * hábito que quedó en cero ayer, para no perder la racha dos días seguidos.
 */
export const TarjetaHabitos: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const ayer = sumarDias(hoy, -1);

  const todos =
    useLiveQuery(() => db.habito_definicion.toArray()) || SIN_HABITOS;
  const habitos = todos.filter((h) => h.activo && aplicaHoy(h, hoy));

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.Activity className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          El Acordeón — Hábitos de hoy
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {habitos.map((h) => (
          <FilaHabito key={h.id} habito={h} hoy={hoy} ayer={ayer} />
        ))}
        <FormularioNuevoHabito />
      </div>
    </div>
  );
};
