"use client";

import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { Badge } from "../badge";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import {
  ResetearPlanificacionUseCase,
  type ModoResetPlanificacion,
  type ConteoResetPlanificacion,
} from "../../../application/use-cases/personal/resetear-planificacion.use-case";

const useCase = new ResetearPlanificacionUseCase();

export interface ModalResetearPlanificacionProps {
  abierto: boolean;
  onClose: () => void;
  onCompletado?: () => void;
}

export const ModalResetearPlanificacion: React.FC<
  ModalResetearPlanificacionProps
> = ({ abierto, onClose, onCompletado }) => {
  const { mostrarToast } = useToast();

  const [modo, setModo] = useState<ModoResetPlanificacion>("desde_proyectos");
  const [areaId, setAreaId] = useState<string>(""); // "" = todas
  const [preservarCompletadas, setPreservarCompletadas] =
    useState<boolean>(true);
  const [eliminarProcedimientos, setEliminarProcedimientos] =
    useState<boolean>(false);
  const [confirmacionChecked, setConfirmacionChecked] =
    useState<boolean>(false);
  const [ejecutando, setEjecutando] = useState<boolean>(false);

  const [conteo, setConteo] = useState<ConteoResetPlanificacion>({
    areas: 0,
    objetivos: 0,
    proyectos: 0,
    entregables: 0,
    fases: 0,
    actividades: 0,
    procedimientos: 0,
  });

  const areas = useLiveQuery(() => db.area_personal.toArray(), []) ?? [];

  // Recalcular conteo en tiempo real cada vez que cambian las opciones
  useEffect(() => {
    if (!abierto) return;
    let activo = true;

    useCase
      .contar({
        modo,
        areaId: areaId || undefined,
        preservarCompletadas,
        eliminarProcedimientos,
      })
      .then((res) => {
        if (activo) setConteo(res);
      })
      .catch((err) =>
        console.error("Error al contar elementos a resetear:", err)
      );

    return () => {
      activo = false;
    };
  }, [abierto, modo, areaId, preservarCompletadas, eliminarProcedimientos]);

  const totalElementos =
    conteo.areas +
    conteo.objetivos +
    conteo.proyectos +
    conteo.entregables +
    conteo.fases +
    conteo.actividades +
    conteo.procedimientos;

  const handleEjecutarReset = async () => {
    if (!confirmacionChecked) return;

    setEjecutando(true);
    try {
      const res = await useCase.ejecutar({
        modo,
        areaId: areaId || undefined,
        preservarCompletadas,
        eliminarProcedimientos,
      });

      if (!res.ok) {
        mostrarToast(
          res.error?.mensaje ?? "Error al resetear la planificación.",
          "error"
        );
        return;
      }

      const total =
        res.valor.areas +
        res.valor.objetivos +
        res.valor.proyectos +
        res.valor.entregables +
        res.valor.actividades;

      mostrarToast(
        `Planificación reseteada con éxito (${total} elementos eliminados). Base de datos sincronizada.`,
        "exito"
      );

      setConfirmacionChecked(false);
      onCompletado?.();
      onClose();
    } catch (err) {
      console.error(err);
      mostrarToast("Ocurrió un error inesperado al resetear.", "error");
    } finally {
      setEjecutando(false);
    }
  };

  return (
    <Dialog
      abierto={abierto}
      onClose={onClose}
      titulo="Resetear Planificación (Purga Quirúrgica o Total)"
      maxWidth="2xl"
    >
      <div className="flex flex-col gap-4 text-xs text-zinc-300">
        {/* Banner Explicativo */}
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <Icono.Trash className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="flex flex-col gap-1">
            <span className="font-bold text-red-200">
              ¿Querés volver a planificar de cero o limpiar una sección
              específica?
            </span>
            <p className="text-[11px] leading-relaxed text-red-300/90">
              Elegí el nivel de profundidad que querés purgar. Los cambios se
              eliminarán de Dexie y se encolarán automáticamente para
              sincronizarse con Supabase.
            </p>
          </div>
        </div>

        {/* 1. Selector de Nivel de Profundidad */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-zinc-200">
            1. ¿Qué nivel de planificación querés reiniciar?
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* Opción 1: Todo el Sistema */}
            <button
              type="button"
              onClick={() => setModo("todo")}
              className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                modo === "todo"
                  ? "border-red-500 bg-red-500/15 text-white shadow-md"
                  : "border-[#2A2A2E] bg-[#141417] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-400">
                  🔴 Tabula Rasa Total
                </span>
                {modo === "todo" && <Badge color="red">Seleccionado</Badge>}
              </div>
              <p className="text-[11px] leading-relaxed">
                Borra absolutamente todo: Áreas, Objetivos, Proyectos,
                Entregables y Actividades.
              </p>
            </button>

            {/* Opción 2: Desde Objetivos */}
            <button
              type="button"
              onClick={() => setModo("desde_objetivos")}
              className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                modo === "desde_objetivos"
                  ? "border-orange-500 bg-orange-500/15 text-white shadow-md"
                  : "border-[#2A2A2E] bg-[#141417] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-400">
                  🟠 Desde Objetivos
                </span>
                {modo === "desde_objetivos" && (
                  <Badge color="amber">Seleccionado</Badge>
                )}
              </div>
              <p className="text-[11px] leading-relaxed">
                Conserva tus Áreas de Vida, pero elimina todos los Objetivos,
                Proyectos y Tareas.
              </p>
            </button>

            {/* Opción 3: Desde Proyectos */}
            <button
              type="button"
              onClick={() => setModo("desde_proyectos")}
              className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                modo === "desde_proyectos"
                  ? "border-amber-500 bg-amber-500/15 text-white shadow-md"
                  : "border-[#2A2A2E] bg-[#141417] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400">
                  🟡 Desde Proyectos
                </span>
                {modo === "desde_proyectos" && (
                  <Badge color="amber">Seleccionado</Badge>
                )}
              </div>
              <p className="text-[11px] leading-relaxed">
                Conserva Áreas y Objetivos estratégicos; elimina proyectos
                mensuales y agenda semanal.
              </p>
            </button>

            {/* Opción 4: Solo Actividades y Repartos */}
            <button
              type="button"
              onClick={() => setModo("solo_actividades")}
              className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                modo === "solo_actividades"
                  ? "border-sky-500 bg-sky-500/15 text-white shadow-md"
                  : "border-[#2A2A2E] bg-[#141417] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-400">
                  🔵 Solo Actividades y Agenda
                </span>
                {modo === "solo_actividades" && (
                  <Badge color="sky">Seleccionado</Badge>
                )}
              </div>
              <p className="text-[11px] leading-relaxed">
                Mantiene intacta la estructura de proyectos y entregables;
                limpia las tareas diarias para volver a repartir la semana.
              </p>
            </button>
          </div>
        </div>

        {/* 2. Filtro de Alcance (Área específica o Global) */}
        <div className="flex flex-col gap-1.5">
          <label className="font-bold text-zinc-200">
            2. Alcance (¿En todo el sistema o solo un Área?)
          </label>
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="rounded-xl border border-[#2A2A2E] bg-[#141417] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-red-500"
          >
            <option value="">🌐 Todo el Sistema (Todas las Áreas)</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                📍 Solo Área: {a.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Filtros Quirúrgicos Adicionales */}
        <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#141417] p-3">
          <span className="font-bold text-zinc-200">
            3. Opciones adicionales de seguridad
          </span>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={preservarCompletadas}
              onChange={(e) => setPreservarCompletadas(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
            />
            <span>
              <strong className="text-emerald-400">
                Preservar actividades ya completadas:
              </strong>{" "}
              No borrar el historial ni las estadísticas pasadas (solo borra
              pendientes y futuras).
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={eliminarProcedimientos}
              onChange={(e) => setEliminarProcedimientos(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-red-500 focus:ring-0"
            />
            <span>
              <strong className="text-red-400">
                Eliminar también Procedimientos / SOPs:
              </strong>{" "}
              Borrar los protocolos vinculados en lugar de conservarlos en el
              Baúl.
            </span>
          </label>
        </div>

        {/* 4. Resumen en Vivo de Elementos Afectados */}
        <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-[#0E0E10] p-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-200">
              Desglose de lo que se va a eliminar ({totalElementos} elementos):
            </span>
            <Badge color={totalElementos > 0 ? "red" : "zinc"}>
              {totalElementos} en total
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-4">
            <div className="rounded-lg border border-[#2A2A2E] bg-[#18181B] p-2 text-center">
              <span className="block text-zinc-500">Áreas</span>
              <strong className="text-sm text-zinc-200">{conteo.areas}</strong>
            </div>
            <div className="rounded-lg border border-[#2A2A2E] bg-[#18181B] p-2 text-center">
              <span className="block text-zinc-500">Objetivos</span>
              <strong className="text-sm text-zinc-200">
                {conteo.objetivos}
              </strong>
            </div>
            <div className="rounded-lg border border-[#2A2A2E] bg-[#18181B] p-2 text-center">
              <span className="block text-zinc-500">Proyectos</span>
              <strong className="text-sm text-zinc-200">
                {conteo.proyectos}
              </strong>
            </div>
            <div className="rounded-lg border border-[#2A2A2E] bg-[#18181B] p-2 text-center">
              <span className="block text-zinc-500">Entregables</span>
              <strong className="text-sm text-zinc-200">
                {conteo.entregables}
              </strong>
            </div>
            <div className="rounded-lg border border-[#2A2A2E] bg-[#18181B] p-2 text-center">
              <span className="block text-zinc-500">Fases</span>
              <strong className="text-sm text-zinc-200">{conteo.fases}</strong>
            </div>
            <div className="rounded-lg border border-[#2A2A2E] bg-[#18181B] p-2 text-center">
              <span className="block text-zinc-500">Actividades</span>
              <strong className="text-sm text-zinc-200">
                {conteo.actividades}
              </strong>
            </div>
            <div className="rounded-lg border border-[#2A2A2E] bg-[#18181B] p-2 text-center">
              <span className="block text-zinc-500">SOPs / Proc.</span>
              <strong className="text-sm text-zinc-200">
                {conteo.procedimientos}
              </strong>
            </div>
          </div>
        </div>

        {/* 5. Checkbox de Confirmación Final */}
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-950/20 p-3 text-xs">
          <input
            type="checkbox"
            checked={confirmacionChecked}
            onChange={(e) => setConfirmacionChecked(e.target.checked)}
            className="mt-0.5 rounded border-red-600 bg-zinc-900 text-red-600 focus:ring-0"
          />
          <span className="leading-relaxed font-semibold text-red-200">
            Confirmo que deseo eliminar estos elementos de mi planificación.
            Entiendo que los cambios se sincronizarán con la base de datos y no
            se pueden deshacer.
          </span>
        </label>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-2 border-t border-[#2A2A2E] pt-3">
          <Button variant="ghost" onClick={onClose} disabled={ejecutando}>
            Cancelar
          </Button>
          <Button
            onClick={handleEjecutarReset}
            disabled={
              !confirmacionChecked || ejecutando || totalElementos === 0
            }
            className="bg-red-600 font-bold text-white hover:bg-red-700 disabled:opacity-50"
            icono={<Icono.Trash className="h-4 w-4" />}
          >
            {ejecutando
              ? "Eliminando..."
              : "Confirmar y Resetear Planificación"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
