"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Button } from "../../button";
import { Icono } from "../../icons";
import { useToast } from "../../../hooks/useToast";
import { GestionarSesionTrabajoUseCase } from "../../../../application/use-cases/personal/gestionar-sesion-trabajo.use-case";
import { GestionarRegistroActividadUseCase } from "../../../../application/use-cases/personal/gestionar-registro-actividad.use-case";
import { GestionarConfiguracionOficinaUseCase } from "../../../../application/use-cases/personal/gestionar-configuracion-oficina.use-case";
import { obtenerDiaTareaHoy } from "../../../../domain/entidades/personal.entity";
import { ID_CONFIGURACION_OFICINA } from "../../../../domain/entidades/configuracion-oficina.entity";
import type { PlantillaRutina } from "../../../../domain/entidades/rutina.entity";

const sesionUseCase = new GestionarSesionTrabajoUseCase();
const registroUseCase = new GestionarRegistroActividadUseCase();
const configUseCase = new GestionarConfiguracionOficinaUseCase();
const SIN_RUTINAS: PlantillaRutina[] = [];

interface PausaActivaRapidaProps {
  /** Si hay una sesión pausada esperando, al terminar (hacer o saltear) se reanuda sola. */
  sesionId?: string;
  onListo?: () => void;
  titulo?: string;
}

/**
 * Oferta de pausa activa: elegir una rutina, "Al azar", o saltearla — hacer
 * una es opcional. Hecha o salteada, el contador de "desde la última pausa"
 * vuelve a cero (si no, insistiría en cada tick). Si la configuración tiene
 * "al azar", ya se propone una rutina sorteada, con opción de elegir otra.
 */
export const PausaActivaRapida: React.FC<PausaActivaRapidaProps> = ({
  sesionId,
  onListo,
  titulo = "Toca una pausa activa",
}) => {
  const { mostrarToast } = useToast();
  const [procesando, setProcesando] = useState(false);
  const [eligiendo, setEligiendo] = useState(false);
  const [semilla] = useState(() => Math.random());

  const rutinasPausaActiva =
    useLiveQuery(() =>
      db.plantilla_rutina
        .filter((p) => !p.eliminado && p.formato === "pausa_activa")
        .toArray()
    ) || SIN_RUTINAS;
  const config = useLiveQuery(() =>
    db.configuracion_oficina.get(ID_CONFIGURACION_OFICINA)
  );

  const sugerida =
    config?.pausaAlAzar && rutinasPausaActiva.length > 0
      ? rutinasPausaActiva[Math.floor(semilla * rutinasPausaActiva.length)]
      : undefined;

  const terminar = async () => {
    await configUseCase.reiniciarContadorPausa();
    if (sesionId) {
      const res = await sesionUseCase.reanudarSesion(sesionId);
      if (!res.ok) mostrarToast(res.error!.mensaje, "error");
    }
    onListo?.();
  };

  const hacer = async (plantillaId: string) => {
    setProcesando(true);
    const res = await registroUseCase.registrarComoPlanificado(
      plantillaId,
      obtenerDiaTareaHoy()
    );
    if (!res.ok) {
      setProcesando(false);
      mostrarToast(res.error!.mensaje, "error");
      return;
    }
    await terminar();
    setProcesando(false);
  };

  const alAzar = () => {
    if (rutinasPausaActiva.length === 0) return;
    const elegida =
      rutinasPausaActiva[Math.floor(Math.random() * rutinasPausaActiva.length)];
    void hacer(elegida.id);
  };

  const saltear = async () => {
    setProcesando(true);
    await terminar();
    setProcesando(false);
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-3">
      <span className="text-xs font-bold text-amber-400">{titulo}</span>

      {rutinasPausaActiva.length === 0 ? (
        <span className="text-xs text-zinc-600">
          Sin pausas activas armadas todavía (se arman en Entrenamiento →
          Rutinas).
        </span>
      ) : sugerida && !eligiendo ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-zinc-200">
            Te toca: <strong>{sugerida.nombre}</strong>
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Button
              onClick={() => void hacer(sugerida.id)}
              cargando={procesando}
              className="px-3 py-1.5 text-xs"
              icono={<Icono.Check className="h-3.5 w-3.5" />}
            >
              La hice
            </Button>
            <Button
              variant="outline"
              onClick={() => setEligiendo(true)}
              className="px-3 py-1.5 text-xs"
            >
              Elegir otra
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {rutinasPausaActiva.map((r) => (
            <button
              key={r.id}
              onClick={() => void hacer(r.id)}
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
        onClick={() => void saltear()}
        cargando={procesando}
        className="self-start px-3 py-1.5 text-xs"
        icono={<Icono.Play className="h-3.5 w-3.5" />}
      >
        {sesionId ? "Volver sin pausa activa" : "Ahora no"}
      </Button>
    </div>
  );
};
