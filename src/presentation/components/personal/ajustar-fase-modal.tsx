"use client";

import React, { useState } from "react";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { useToast } from "../../hooks/useToast";
import { GestionarFasesUseCase } from "../../../application/use-cases/personal/gestionar-fases.use-case";
import type { FasePersonal } from "../../../domain/entidades/fase-personal.entity";

const fasesUseCase = new GestionarFasesUseCase();

interface AjustarFaseModalProps {
  abierto: boolean;
  onCerrar: () => void;
  fase: FasePersonal;
}

/**
 * Ajuste a mitad de camino de una Fase abierta — cambiar meta o fecha límite
 * sin pasar por el cierre completo (que exige decidir qué hacer con el
 * faltante). Queda registrado en el historial con el valor anterior.
 */
export const AjustarFaseModal: React.FC<AjustarFaseModalProps> = ({
  abierto,
  onCerrar,
  fase,
}) => {
  const { mostrarToast } = useToast();
  const [cantidad, setCantidad] = useState(String(fase.cantidadObjetivo));
  const [diaLimite, setDiaLimite] = useState(fase.diaLimite);
  const [guardando, setGuardando] = useState(false);

  const cambioCantidad = Number(cantidad) !== fase.cantidadObjetivo;
  const cambioFecha = diaLimite !== fase.diaLimite;

  const guardar = async () => {
    setGuardando(true);
    const res = await fasesUseCase.ajustarFase({
      id: fase.id,
      cantidadObjetivo: cambioCantidad ? Number(cantidad) : undefined,
      diaLimite: cambioFecha ? diaLimite : undefined,
    });
    setGuardando(false);
    if (res.ok) {
      mostrarToast("Fase ajustada.", "exito");
      onCerrar();
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  return (
    <Dialog
      abierto={abierto}
      onClose={onCerrar}
      titulo={`Ajustar "${fase.titulo}"`}
      footer={
        <>
          <button
            onClick={onCerrar}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Cancelar
          </button>
          <Button
            onClick={guardar}
            cargando={guardando}
            disabled={(!cambioCantidad && !cambioFecha) || !Number(cantidad)}
          >
            Guardar ajuste
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-zinc-500">
          Llevás {fase.progresoActual}/{fase.cantidadObjetivo} {fase.unidad}{" "}
          (del {fase.diaInicio} al {fase.diaLimite}). Cambiá la meta o la fecha
          si el plan cambió a mitad de camino — no hace falta cerrar la fase, y
          el cambio queda en el historial.
        </p>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Meta ({fase.unidad})
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Fecha límite
          <input
            type="date"
            min={fase.diaInicio}
            value={diaLimite}
            onChange={(e) => setDiaLimite(e.target.value)}
            className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
        </label>
      </div>
    </Dialog>
  );
};
