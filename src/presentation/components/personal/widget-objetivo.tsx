"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Icono } from "../icons";
import { Badge, type BadgeColor } from "../badge";
import { useToast } from "../../hooks/useToast";
import { GestionarObjetivosUseCase } from "../../../application/use-cases/personal/gestionar-objetivos.use-case";
import {
  calcularRitmoObjetivo,
  type AreaObjetivo,
  type EstadoRitmoObjetivo,
} from "../../../domain/entidades/objetivo-cuantificable.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

const useCase = new GestionarObjetivosUseCase();

const ETIQUETA_RITMO: Record<EstadoRitmoObjetivo, string> = {
  cumplido: "Cumplido",
  vencido: "Vencido",
  al_dia: "Al día",
  atrasado: "Atrasado",
  adelantado: "Adelantado",
};

const COLOR_RITMO: Record<EstadoRitmoObjetivo, BadgeColor> = {
  cumplido: "emerald",
  vencido: "red",
  al_dia: "sky",
  atrasado: "amber",
  adelantado: "emerald",
};

interface WidgetObjetivoProps {
  /** Identifica de qué módulo es este objetivo (ej. "contacto_frio"). */
  origenModulo: string;
  area: AreaObjetivo;
  tituloSugerido: string;
  unidadSugerida: string;
}

/**
 * Objetivo cuantitativo enganchado a un módulo existente — se puede dropear
 * en cualquier pantalla (hoy: Contacto en Frío) sin que ese módulo tenga
 * que saber nada de cómo se calcula el ritmo. Todo objetivo cuantitativo
 * fuerza cantidad + fecha límite, nunca una meta vaga.
 */
export const WidgetObjetivo: React.FC<WidgetObjetivoProps> = ({
  origenModulo,
  area,
  tituloSugerido,
  unidadSugerida,
}) => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();

  const objetivo = useLiveQuery(
    () =>
      db.objetivo_cuantificable
        .where("origenModulo")
        .equals(origenModulo)
        .and((o) => o.estado === "activo" || o.estado === "vencido")
        .first(),
    [origenModulo]
  );

  // Formulario de creación (solo se muestra si todavía no hay objetivo).
  const [cantidad, setCantidad] = useState("");
  const [diaLimite, setDiaLimite] = useState(sumarDias(hoy, 30));
  const [creando, setCreando] = useState(false);

  // Avance rápido + ajuste (solo si ya hay objetivo).
  const [avanceRapido, setAvanceRapido] = useState("");
  const [editando, setEditando] = useState(false);
  const [nuevaCantidad, setNuevaCantidad] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");

  const crear = async () => {
    const cantidadNum = Number(cantidad);
    if (!cantidadNum || cantidadNum <= 0) return;
    setCreando(true);
    const res = await useCase.crearObjetivo({
      titulo: tituloSugerido,
      unidad: unidadSugerida,
      cantidadObjetivo: cantidadNum,
      diaInicio: hoy,
      diaLimite,
      area,
      origenModulo,
    });
    setCreando(false);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const registrarAvance = async () => {
    if (!objetivo) return;
    const n = Number(avanceRapido);
    if (!n) return;
    const res = await useCase.registrarAvance(objetivo.id, n);
    if (res.ok) setAvanceRapido("");
    else mostrarToast(res.error!.mensaje, "error");
  };

  const guardarAjuste = async () => {
    if (!objetivo) return;
    const res = await useCase.ajustarObjetivo({
      id: objetivo.id,
      cantidadObjetivo: nuevaCantidad ? Number(nuevaCantidad) : undefined,
      diaLimite: nuevaFecha || undefined,
    });
    if (res.ok) {
      setEditando(false);
      setNuevaCantidad("");
      setNuevaFecha("");
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  if (!objetivo) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[#2A2A2E] bg-[#0D0D0F] p-3">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-500 uppercase">
          <Icono.Target className="h-3.5 w-3.5" />
          Sin objetivo cuantitativo — definí uno
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder={`Cantidad (${unidadSugerida})`}
            className="w-40 rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
          <input
            type="date"
            value={diaLimite}
            onChange={(e) => setDiaLimite(e.target.value)}
            className="rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
          <Button
            onClick={crear}
            cargando={creando}
            disabled={!cantidad}
            variant="outline"
          >
            Definir
          </Button>
        </div>
      </div>
    );
  }

  const ritmo = calcularRitmoObjetivo(objetivo, hoy);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icono.Target className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-sm font-bold text-zinc-200">
            {objetivo.progresoActual}/{objetivo.cantidadObjetivo}{" "}
            {objetivo.unidad}
          </span>
          <Badge color={COLOR_RITMO[ritmo.estado]}>
            {ETIQUETA_RITMO[ritmo.estado]}
          </Badge>
        </div>
        <button
          onClick={() => setEditando(!editando)}
          className="text-[10px] font-bold text-zinc-500 uppercase hover:text-zinc-300"
        >
          Ajustar
        </button>
      </div>

      {ritmo.estado !== "cumplido" && (
        <p className="text-xs text-zinc-500">
          Faltan {ritmo.restante} {objetivo.unidad} —{" "}
          {ritmo.diasRestantes > 0
            ? `${ritmo.porDiaNecesario.toFixed(1)} por día para llegar`
            : "la fecha límite ya pasó"}
          . Al ritmo actual, vas a terminar con {ritmo.proyeccionAlRitmoActual}{" "}
          {objetivo.unidad}.
        </p>
      )}

      {!editando && ritmo.estado !== "cumplido" && (
        <div className="flex gap-2">
          <input
            type="number"
            value={avanceRapido}
            onChange={(e) => setAvanceRapido(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void registrarAvance();
            }}
            placeholder={`+ ${objetivo.unidad} de hoy`}
            className="w-32 rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
          <Button
            onClick={registrarAvance}
            variant="outline"
            disabled={!avanceRapido}
          >
            Sumar
          </Button>
        </div>
      )}

      {editando && (
        <div className="flex flex-wrap items-end gap-2 border-t border-[#2A2A2E] pt-2">
          <input
            type="number"
            value={nuevaCantidad}
            onChange={(e) => setNuevaCantidad(e.target.value)}
            placeholder={`Nueva cantidad (hoy: ${objetivo.cantidadObjetivo})`}
            className="w-44 rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
          <input
            type="date"
            value={nuevaFecha}
            onChange={(e) => setNuevaFecha(e.target.value)}
            className="rounded-lg border border-[#2A2A2E] bg-[#111113] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
          <Button onClick={guardarAjuste} variant="outline">
            Guardar
          </Button>
        </div>
      )}
    </div>
  );
};
