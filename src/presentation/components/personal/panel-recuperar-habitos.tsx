"use client";

import React, { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { Button } from "../button";
import { useToast } from "../../hooks/useToast";
import { GestionarHabitosUseCase } from "../../../application/use-cases/personal/gestionar-habitos.use-case";
import { SelectorEtiquetas } from "../contacto-frio/selector-etiquetas";
import type { HabitoDefinicion } from "../../../domain/entidades/habitos.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

const useCase = new GestionarHabitosUseCase();

function diaISODeEpoch(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

// A partir de acá se deja de listar día por día (evita el listado
// interminable de un hábito abandonado hace meses) — solo quedan los 3
// botones rápidos de bulto.
const MAX_DIAS_PARA_CORREGIR_UNO_A_UNO = 7;

const FilaRecuperacion: React.FC<{
  habito: HabitoDefinicion;
  diasFaltantes: string[];
}> = ({ habito, diasFaltantes }) => {
  const { mostrarToast } = useToast();
  const [diasHechos, setDiasHechos] = useState<Set<string>>(new Set());
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);
  const [motivos, setMotivos] = useState<string[]>([]);
  const [procesando, setProcesando] = useState(false);

  const toggleDia = (dia: string) => {
    setDiasHechos((prev) => {
      const next = new Set(prev);
      if (next.has(dia)) next.delete(dia);
      else next.add(dia);
      return next;
    });
  };

  const guardarCorreccionManual = async () => {
    setProcesando(true);
    for (const dia of diasFaltantes) {
      await useCase.registrarNivel({
        habitoId: habito.id,
        diaTarea: dia,
        nivelEjecutado: diasHechos.has(dia) ? "MED" : "NO_CUMPLIDO",
      });
    }
    setProcesando(false);
    mostrarToast("Días corregidos.", "exito");
  };

  const hiceTodos = async () => {
    setProcesando(true);
    for (const dia of diasFaltantes) {
      await useCase.registrarNivel({
        habitoId: habito.id,
        diaTarea: dia,
        nivelEjecutado: "MED",
      });
    }
    setProcesando(false);
    mostrarToast("Marcado como cumplido todos esos días.", "exito");
  };

  const noHiceNinguno = async () => {
    if (!pidiendoMotivo) {
      setPidiendoMotivo(true);
      return;
    }
    setProcesando(true);
    for (const dia of diasFaltantes) {
      await useCase.registrarNivel({
        habitoId: habito.id,
        diaTarea: dia,
        nivelEjecutado: "NO_CUMPLIDO",
        motivoIncumplimiento: motivos[0],
      });
    }
    setProcesando(false);
    setPidiendoMotivo(false);
    mostrarToast("Registrado como no cumplido.", "exito");
  };

  const noLoHagoMas = async () => {
    const res = await useCase.desactivarHabito(habito.id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const mostrarCorreccionManual =
    diasFaltantes.length <= MAX_DIAS_PARA_CORREGIR_UNO_A_UNO;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-500/20 bg-[#0D0D0F] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-zinc-200">{habito.nombre}</span>
        <span className="text-[10px] text-amber-400">
          sin registrar hace {diasFaltantes.length} día
          {diasFaltantes.length === 1 ? "" : "s"}
        </span>
      </div>

      {mostrarCorreccionManual && (
        <div className="flex flex-wrap gap-1.5">
          {diasFaltantes.map((dia) => (
            <button
              key={dia}
              onClick={() => toggleDia(dia)}
              title={dia}
              className={`rounded-lg border px-2 py-1 text-[10px] font-bold transition-all ${
                diasHechos.has(dia)
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-[#2A2A2E] text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {dia.slice(5)}
            </button>
          ))}
        </div>
      )}

      {pidiendoMotivo && (
        <SelectorEtiquetas
          label="Motivo"
          categoria="motivo_incumplimiento"
          value={motivos}
          onChange={(v) => setMotivos(v.slice(-1))}
        />
      )}

      <div className="flex flex-wrap gap-1.5">
        {mostrarCorreccionManual && diasHechos.size > 0 && (
          <Button
            onClick={guardarCorreccionManual}
            variant="outline"
            cargando={procesando}
          >
            Guardar corrección
          </Button>
        )}
        <button
          onClick={() => void hiceTodos()}
          disabled={procesando}
          className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5 text-[10px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
        >
          Hice todos
        </button>
        <button
          onClick={() => void noHiceNinguno()}
          disabled={procesando}
          className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-[10px] font-bold text-amber-400 uppercase hover:bg-amber-500/20"
        >
          {pidiendoMotivo ? "Confirmar" : "No hice ninguno"}
        </button>
        <button
          onClick={() => void noLoHagoMas()}
          className="rounded border border-zinc-800 px-2 py-1.5 text-[10px] font-bold text-zinc-500 uppercase hover:text-red-400"
        >
          No lo hago más
        </button>
      </div>
    </div>
  );
};

/**
 * Recuperación de compromisos/hábitos tras un desvío: si volviste después de
 * no registrar (un día o varias semanas), acá aparece qué quedó suelto y
 * botones rápidos para resolverlo — sin listar día por día cuando el hueco
 * es demasiado grande. Mismo criterio que PanelRetorno: no se muestra nada
 * si no hace falta.
 */
export const PanelRecuperarHabitos: React.FC = () => {
  const hoy = obtenerDiaTareaHoy();
  const ayer = sumarDias(hoy, -1);

  const todos = useLiveQuery(() => db.habito_definicion.toArray());
  const habitosActivos = (todos || []).filter((h) => h.activo);

  const [pendientesPorHabito, setPendientesPorHabito] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const resultado: Record<string, string[]> = {};
      for (const h of habitosActivos) {
        const desdeISO = sumarDias(
          h.creadoEn ? diaISODeEpoch(h.creadoEn) : hoy,
          -1
        );
        const faltantes = await useCase.buscarDiasSinRegistrar(
          h.id,
          desdeISO,
          ayer
        );
        if (faltantes.length > 0) resultado[h.id] = faltantes;
      }
      if (!cancelado) setPendientesPorHabito(resultado);
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitosActivos.map((h) => h.id).join(","), hoy]);

  const entradas = Object.entries(pendientesPorHabito);
  if (entradas.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2">
        <Icono.Alert className="h-4 w-4 text-amber-400" />
        <h3 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
          Compromisos sin registrar
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {entradas.map(([habitoId, dias]) => {
          const habito = habitosActivos.find((h) => h.id === habitoId);
          if (!habito) return null;
          return (
            <FilaRecuperacion
              key={habitoId}
              habito={habito}
              diasFaltantes={dias}
            />
          );
        })}
      </div>
    </div>
  );
};
