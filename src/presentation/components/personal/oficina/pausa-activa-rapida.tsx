"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Button } from "../../button";
import { Icono } from "../../icons";
import { useToast } from "../../../hooks/useToast";
import { GestionarSesionTrabajoUseCase } from "../../../../application/use-cases/personal/gestionar-sesion-trabajo.use-case";
import { GestionarRegistroActividadUseCase } from "../../../../application/use-cases/personal/gestionar-registro-actividad.use-case";
import { obtenerDiaTareaHoy } from "../../../../domain/entidades/personal.entity";
import type { PlantillaRutina } from "../../../../domain/entidades/rutina.entity";

const sesionUseCase = new GestionarSesionTrabajoUseCase();
const registroUseCase = new GestionarRegistroActividadUseCase();
const SIN_RUTINAS: PlantillaRutina[] = [];

/**
 * Se muestra mientras la sesión de trabajo está pausada — elegir una pausa
 * activa (o al azar) la registra y retoma la sesión; "Volver sin pausa
 * activa" retoma sin registrar nada, porque hacer una es opcional.
 */
export const PausaActivaRapida: React.FC<{ sesionId: string }> = ({
  sesionId,
}) => {
  const { mostrarToast } = useToast();
  const [procesando, setProcesando] = useState(false);

  const rutinasPausaActiva =
    useLiveQuery(() =>
      db.plantilla_rutina
        .filter((p) => !p.eliminado && p.formato === "pausa_activa")
        .toArray()
    ) || SIN_RUTINAS;

  const hacerYVolver = async (plantillaId: string) => {
    setProcesando(true);
    const resRegistro = await registroUseCase.registrarComoPlanificado(
      plantillaId,
      obtenerDiaTareaHoy()
    );
    if (!resRegistro.ok) {
      setProcesando(false);
      mostrarToast(resRegistro.error!.mensaje, "error");
      return;
    }
    const resReanudar = await sesionUseCase.reanudarSesion(sesionId);
    setProcesando(false);
    if (!resReanudar.ok) mostrarToast(resReanudar.error!.mensaje, "error");
  };

  const alAzar = () => {
    if (rutinasPausaActiva.length === 0) return;
    const elegida =
      rutinasPausaActiva[Math.floor(Math.random() * rutinasPausaActiva.length)];
    void hacerYVolver(elegida.id);
  };

  const volverSinPausa = async () => {
    setProcesando(true);
    const res = await sesionUseCase.reanudarSesion(sesionId);
    setProcesando(false);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-3">
      <span className="text-xs font-bold text-amber-400">
        Pausa activa — elegí una o probá con &ldquo;Al azar&rdquo;
      </span>
      {rutinasPausaActiva.length === 0 ? (
        <span className="text-xs text-zinc-600">
          Sin pausas activas armadas todavía.
        </span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {rutinasPausaActiva.map((r) => (
            <button
              key={r.id}
              onClick={() => void hacerYVolver(r.id)}
              disabled={procesando}
              className="rounded-full border border-[#2A2A2E] bg-[#0D0D0F] px-2.5 py-1 text-xs text-zinc-300 hover:border-amber-500/40 disabled:opacity-40"
            >
              {r.nombre}
            </button>
          ))}
          <button
            onClick={alAzar}
            disabled={procesando}
            className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400 hover:bg-amber-500/20 disabled:opacity-40"
          >
            <Icono.Sparkles className="h-3 w-3" />
            Al azar
          </button>
        </div>
      )}
      <Button
        variant="outline"
        onClick={() => void volverSinPausa()}
        cargando={procesando}
        className="px-3 py-1.5 text-xs"
        icono={<Icono.Play className="h-3.5 w-3.5" />}
      >
        Volver sin pausa activa
      </Button>
    </div>
  );
};
