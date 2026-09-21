"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Button } from "../../button";
import { Icono } from "../../icons";
import { useToast } from "../../../hooks/useToast";
import { GestionarConfiguracionOficinaUseCase } from "../../../../application/use-cases/personal/gestionar-configuracion-oficina.use-case";
import {
  CONFIGURACION_OFICINA_DEFAULT,
  ID_CONFIGURACION_OFICINA,
  type ConfiguracionOficina,
} from "../../../../domain/entidades/configuracion-oficina.entity";

const useCase = new GestionarConfiguracionOficinaUseCase();
const PRESETS = [30, 45, 60, 90];

const Formulario: React.FC<{ inicial: ConfiguracionOficina }> = ({
  inicial,
}) => {
  const { mostrarToast } = useToast();
  const [intervalo, setIntervalo] = useState(String(inicial.intervaloPausaMin));
  const [alAzar, setAlAzar] = useState(inicial.pausaAlAzar);
  const [guardando, setGuardando] = useState(false);

  const cambio =
    Number(intervalo) !== inicial.intervaloPausaMin ||
    alAzar !== inicial.pausaAlAzar;

  const guardar = async () => {
    setGuardando(true);
    const res = await useCase.guardar({
      intervaloPausaMin: Number(intervalo) || 0,
      pausaAlAzar: alAzar,
    });
    setGuardando(false);
    if (res.ok) mostrarToast("Configuración guardada.", "exito");
    else mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500">
        Cada cuántos minutos de trabajo (sumando todas tus sesiones) te ofrece
        una pausa activa. Te la ofrece cuando se cumple, o al cerrar la sesión.
        0 = desactivado.
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setIntervalo(String(p))}
            className={`rounded-md border px-2 py-1 text-[11px] font-bold ${
              intervalo === String(p)
                ? "border-emerald-500/40 text-emerald-400"
                : "border-[#2A2A2E] text-zinc-500"
            }`}
          >
            {p}
          </button>
        ))}
        <input
          type="number"
          min={0}
          value={intervalo}
          onChange={(e) => setIntervalo(e.target.value)}
          className="w-16 rounded-md border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1 text-xs text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        <span className="text-[11px] text-zinc-500">min</span>
      </div>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={alAzar}
          onChange={(e) => setAlAzar(e.target.checked)}
        />
        Proponerme una rutina al azar (igual puedo elegir otra o saltearla)
      </label>
      <Button
        onClick={() => void guardar()}
        cargando={guardando}
        disabled={!cambio}
        className="self-start px-3 py-1.5 text-xs"
      >
        Guardar
      </Button>
    </div>
  );
};

/** Configuración de la pausa activa automática de Oficina. */
export const ConfigPausas: React.FC = () => {
  const [abierto, setAbierto] = useState(false);
  const config = useLiveQuery(() =>
    db.configuracion_oficina.get(ID_CONFIGURACION_OFICINA)
  );
  const inicial: ConfiguracionOficina = config ?? {
    ...CONFIGURACION_OFICINA_DEFAULT,
    actualizadoEn: 0,
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2">
          <Icono.Coffee className="h-4 w-4 text-zinc-500" />
          <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Pausa activa automática
          </span>
        </span>
        <span className="text-[11px] text-zinc-500">
          {inicial.intervaloPausaMin > 0
            ? `cada ${inicial.intervaloPausaMin} min`
            : "desactivada"}
        </span>
      </button>
      {abierto && (
        <Formulario
          key={`${inicial.intervaloPausaMin}-${inicial.pausaAlAzar}`}
          inicial={inicial}
        />
      )}
    </div>
  );
};
