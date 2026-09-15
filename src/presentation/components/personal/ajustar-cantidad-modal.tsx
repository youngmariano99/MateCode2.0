"use client";

import React, { useState } from "react";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { useToast } from "../../hooks/useToast";
import { GestionarObjetivosUseCase } from "../../../application/use-cases/personal/gestionar-objetivos.use-case";
import { GestionarProyectosPersonalUseCase } from "../../../application/use-cases/personal/gestionar-proyectos-personal.use-case";
import { GestionarEntregablesUseCase } from "../../../application/use-cases/personal/gestionar-entregables.use-case";

const objetivosUseCase = new GestionarObjetivosUseCase();
const proyectosUseCase = new GestionarProyectosPersonalUseCase();
const entregablesUseCase = new GestionarEntregablesUseCase();

export type NivelConCantidad = "objetivo" | "proyecto" | "entregable";

interface AjustarCantidadModalProps {
  abierto: boolean;
  onCerrar: () => void;
  nivel: NivelConCantidad;
  id: string;
  titulo: string;
  cantidadActual: number;
  unidad?: string;
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
  onAjustado,
}) => {
  const { mostrarToast } = useToast();
  const [nuevaCantidad, setNuevaCantidad] = useState(String(cantidadActual));
  const [guardando, setGuardando] = useState(false);

  const confirmar = async () => {
    const valor = Number(nuevaCantidad);
    if (!valor || valor <= 0) return;
    setGuardando(true);
    const res =
      nivel === "objetivo"
        ? await objetivosUseCase.ajustarObjetivo({
            id,
            cantidadObjetivo: valor,
          })
        : nivel === "proyecto"
          ? await proyectosUseCase.ajustarProyecto({
              id,
              cantidadObjetivo: valor,
            })
          : await entregablesUseCase.ajustarEntregable({
              id,
              cantidadObjetivo: valor,
            });
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
      </div>
    </Dialog>
  );
};
