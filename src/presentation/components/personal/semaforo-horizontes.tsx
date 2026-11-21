"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { Badge } from "../badge";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";
import { evaluarEstadoHorizontes } from "../../../domain/servicios/auditoria-progresion.service";
import { ModalPlanificarSemana } from "./modal-planificar-semana";
import { ModalPlanificarMes } from "./modal-planificar-mes";

interface SemaforoHorizontesProps {
  onAbrirWizardGeneral?: () => void;
}

export const SemaforoHorizontes: React.FC<SemaforoHorizontesProps> = ({
  onAbrirWizardGeneral,
}) => {
  const hoy = obtenerDiaTareaHoy();
  const [modalSemanaAbierto, setModalSemanaAbierto] = useState(false);
  const [modalMesAbierto, setModalMesAbierto] = useState(false);

  const areas = useLiveQuery(() => db.area_personal.toArray()) ?? [];
  const objetivos =
    useLiveQuery(() => db.objetivo_cuantificable.toArray()) ?? [];
  const proyectos = useLiveQuery(() => db.proyecto_personal.toArray()) ?? [];
  const entregables = useLiveQuery(() => db.entregable.toArray()) ?? [];
  const actividades = useLiveQuery(() => db.actividad.toArray()) ?? [];

  const estado = evaluarEstadoHorizontes({
    hoy,
    areas,
    objetivos,
    proyectos,
    entregables,
    actividades,
  });

  const { mes, proximaSemana, progresion } = estado;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#141417] p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2A2E] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Icono.Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white">
              Centro de Mando de Planificación (Horizontes Temporales)
            </h2>
            <p className="text-[11px] text-zinc-400">
              Estado en tiempo real de tu Mes en curso, la Próxima Semana y la
              Regla del 80%.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onAbrirWizardGeneral && (
            <button
              type="button"
              onClick={onAbrirWizardGeneral}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2.5 py-1 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
            >
              <Icono.Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Setup General (1ª Vez)
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* 1. HORIZONTE MENSUAL (30 días) */}
        <div
          className={`flex flex-col justify-between gap-3 rounded-xl border p-3 transition-all ${
            mes.estado === "planificado"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : mes.estado === "sobrecargado"
                ? "border-red-500/30 bg-red-500/5"
                : "border-amber-500/30 bg-amber-500/5"
          }`}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                <Icono.Target className="h-3.5 w-3.5 text-amber-400" />
                Mes en Curso (Sprint 30d)
              </span>
              <Badge
                color={
                  mes.estado === "planificado"
                    ? "emerald"
                    : mes.estado === "sobrecargado"
                      ? "red"
                      : "amber"
                }
              >
                {mes.estado === "planificado"
                  ? "Planificado"
                  : mes.estado === "sobrecargado"
                    ? "Sobrecargado"
                    : "Pendiente"}
              </Badge>
            </div>

            <p className="text-xs text-zinc-300">{mes.mensaje}</p>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2">
            <span className="font-mono text-[11px] text-zinc-500">
              Quedan {mes.diasRestantes} días
            </span>
            <button
              type="button"
              onClick={() => setModalMesAbierto(true)}
              className="text-xs font-bold text-amber-400 hover:text-amber-300"
            >
              {mes.estado === "planificado"
                ? "Revisar Mes →"
                : "Planificar Mes →"}
            </button>
          </div>
        </div>

        {/* 2. HORIZONTE SEMANAL (7 días) */}
        <div
          className={`flex flex-col justify-between gap-3 rounded-xl border p-3 transition-all ${
            proximaSemana.estado === "planificado"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/40 bg-amber-500/5 shadow-inner"
          }`}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                <Icono.Calendario className="h-3.5 w-3.5 text-sky-400" />
                Próxima Semana (7 días)
              </span>
              <Badge
                color={
                  proximaSemana.estado === "planificado" ? "emerald" : "amber"
                }
              >
                {proximaSemana.estado === "planificado"
                  ? "Cubierta"
                  : "Por planificar"}
              </Badge>
            </div>

            <p className="text-xs text-zinc-300">{proximaSemana.mensaje}</p>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2">
            <span className="font-mono text-[11px] text-zinc-500">
              Tope estricto: 7 días
            </span>
            <button
              type="button"
              onClick={() => setModalSemanaAbierto(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 hover:text-sky-300"
            >
              <span>⚡ Planificar Semana →</span>
            </button>
          </div>
        </div>

        {/* 3. REGLA DEL 80% & PROGRESIÓN BASADA EN EVIDENCIA */}
        <div
          className={`flex flex-col justify-between gap-3 rounded-xl border p-3 transition-all ${
            progresion.puedeProgresar
              ? "border-emerald-500/40 bg-emerald-500/5"
              : progresion.debeEstabilizar
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-sky-500/30 bg-sky-500/5"
          }`}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                <Icono.TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                Evidencia & Regla del 80%
              </span>
              <Badge
                color={
                  progresion.puedeProgresar
                    ? "emerald"
                    : progresion.debeEstabilizar
                      ? "amber"
                      : "sky"
                }
              >
                {progresion.cumplimientoSemanaActual}% Cumplido
              </Badge>
            </div>

            <span className="text-xs font-semibold text-zinc-200">
              {progresion.titulo}
            </span>
            <p className="text-[11px] leading-relaxed text-zinc-400">
              {progresion.recomendacion}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2">
            <span className="font-mono text-[10px] text-zinc-500">
              {progresion.semanasConsecutivas80}/4 semanas al 80%
            </span>
            <span
              className={`text-[11px] font-bold ${
                progresion.puedeProgresar ? "text-emerald-400" : "text-zinc-400"
              }`}
            >
              {progresion.puedeProgresar
                ? "Carga: +15% permitida"
                : "Carga: Congelada"}
            </span>
          </div>
        </div>
      </div>

      {/* Modales de Planificación por Horizonte */}
      <ModalPlanificarSemana
        abierto={modalSemanaAbierto}
        onCerrar={() => setModalSemanaAbierto(false)}
      />

      <ModalPlanificarMes
        abierto={modalMesAbierto}
        onCerrar={() => setModalMesAbierto(false)}
      />
    </div>
  );
};
