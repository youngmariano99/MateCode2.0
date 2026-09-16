"use client";

import React, { useState } from "react";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { useToast } from "../../hooks/useToast";
import { GestionarObjetivosUseCase } from "../../../application/use-cases/personal/gestionar-objetivos.use-case";
import { GestionarProyectosPersonalUseCase } from "../../../application/use-cases/personal/gestionar-proyectos-personal.use-case";
import { GestionarEntregablesUseCase } from "../../../application/use-cases/personal/gestionar-entregables.use-case";
import { GestionarFasesUseCase } from "../../../application/use-cases/personal/gestionar-fases.use-case";

const objetivosUseCase = new GestionarObjetivosUseCase();
const proyectosUseCase = new GestionarProyectosPersonalUseCase();
const entregablesUseCase = new GestionarEntregablesUseCase();
const fasesUseCase = new GestionarFasesUseCase();

export type NivelConCantidad = "objetivo" | "proyecto" | "entregable" | "fase";

interface AjustarCantidadModalProps {
  abierto: boolean;
  onCerrar: () => void;
  nivel: NivelConCantidad;
  id: string;
  titulo: string;
  cantidadActual: number;
  unidad?: string;
  bandaAceptableActual?: number;
  bandaMejorableActual?: number;
  onAjustado: () => void;
}

/**
 * Ajuste de cantidad — a diferencia de la fecha, no necesita preview en
 * cascada: la meta de un Proyecto/Entregable es un valor propio, no
 * derivado de sus hijos (el progreso sí se recalcula solo, la meta no —
 * ver Decisión C / recomputar-progreso-personal.service.ts), así que
 * cambiarla no afecta a nadie más. Escritura directa, sin confirmación
 * extra.
 */
export const AjustarCantidadModal: React.FC<AjustarCantidadModalProps> = ({
  abierto,
  onCerrar,
  nivel,
  id,
  titulo,
  cantidadActual,
  unidad,
  bandaAceptableActual,
  bandaMejorableActual,
  onAjustado,
}) => {
  const { mostrarToast } = useToast();
  const [nuevaCantidad, setNuevaCantidad] = useState(String(cantidadActual));
  const [bandaAceptable, setBandaAceptable] = useState(
    bandaAceptableActual !== undefined ? String(bandaAceptableActual) : ""
  );
  const [bandaMejorable, setBandaMejorable] = useState(
    bandaMejorableActual !== undefined ? String(bandaMejorableActual) : ""
  );
  const [guardando, setGuardando] = useState(false);

  const confirmar = async () => {
    const valor = Number(nuevaCantidad);
    if (!valor || valor <= 0) return;
    setGuardando(true);
    const input = {
      id,
      cantidadObjetivo: valor,
      bandaAceptable: bandaAceptable ? Number(bandaAceptable) : undefined,
      bandaMejorable: bandaMejorable ? Number(bandaMejorable) : undefined,
    };
    const res =
      nivel === "objetivo"
        ? await objetivosUseCase.ajustarObjetivo(input)
        : nivel === "proyecto"
          ? await proyectosUseCase.ajustarProyecto(input)
          : nivel === "entregable"
            ? await entregablesUseCase.ajustarEntregable(input)
            : await fasesUseCase.ajustarFase(input);
    setGuardando(false);
    if (res.ok) {
      mostrarToast("Cantidad ajustada.", "exito");
      onAjustado();
      onCerrar();
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo={`Ajustar cantidad de "${titulo}"`}
      footer={
        <>
          <button
            onClick={onCerrar}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Cancelar
          </button>
          <Button
            onClick={confirmar}
            cargando={guardando}
            disabled={!nuevaCantidad || Number(nuevaCantidad) <= 0}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <span className="text-xs text-zinc-500">
          Cantidad actual: {cantidadActual} {unidad}
        </span>
        <input
          type="number"
          min={1}
          value={nuevaCantidad}
          onChange={(e) => setNuevaCantidad(e.target.value)}
          autoFocus
          className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        <span className="mt-2 text-xs text-zinc-500">
          Bandas de aceptación (opcional) — % de la meta que ya considerás un
          resultado aceptable / mejorable, aunque no sea el 100%.
        </span>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            max={100}
            value={bandaAceptable}
            onChange={(e) => setBandaAceptable(e.target.value)}
            placeholder="% aceptable"
            className="w-28 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={bandaMejorable}
            onChange={(e) => setBandaMejorable(e.target.value)}
            placeholder="% mejorable"
            className="w-28 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
        </div>
      </div>
    </Dialog>
  );
};
