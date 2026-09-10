"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { GestionarHabitosUseCase } from "../../../application/use-cases/personal/gestionar-habitos.use-case";
import {
  requiereMinimoObligatorio,
  idRegistroHabito,
  NIVELES_HABITO,
  type HabitoDefinicion,
  type NivelHabito,
} from "../../../domain/entidades/habitos.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

const useCase = new GestionarHabitosUseCase();
const SIN_HABITOS: never[] = [];

const DESCRIPCION_NIVEL: Record<NivelHabito, (h: HabitoDefinicion) => string> =
  {
    MIN: (h) => h.descripcionMin,
    MED: (h) => h.descripcionMed,
    MAX: (h) => h.descripcionMax,
  };

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

  const registrar = async (nivel: NivelHabito) => {
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
        {NIVELES_HABITO.map((nivel) => {
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
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    setGuardando(true);
    const res = await useCase.crearHabito({
      nombre,
      descripcionMin,
      descripcionMed,
      descripcionMax,
      area: "ambas",
    });
    setGuardando(false);
    if (res.ok) {
      setNombre("");
      setDescripcionMin("");
      setDescripcionMed("");
      setDescripcionMax("");
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
  const habitos = todos.filter((h) => h.activo);

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
