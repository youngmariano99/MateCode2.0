"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Button } from "../../button";
import { Select } from "../../select";
import { Badge } from "../../badge";
import { Icono } from "../../icons";
import { useToast } from "../../../hooks/useToast";
import { GestionarBloquesUseCase } from "../../../../application/use-cases/personal/gestionar-bloques.use-case";
import {
  EJES_PROGRESION,
  type EjeProgresion,
} from "../../../../domain/entidades/ejercicio.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../../domain/entidades/personal.entity";

const useCase = new GestionarBloquesUseCase();
const SIN_BLOQUES: never[] = [];

const ETIQUETA_EJE: Record<EjeProgresion, string> = {
  carga: "Carga (kg)",
  volumen: "Volumen (reps/series)",
  progresion: "Progresión (nivel)",
};

interface PanelBloquesProps {
  /** Salta a la estación "Rutinas" — se ofrece apenas se crea el primer bloque. */
  onIrARutinas?: () => void;
}

/**
 * Bloques (mesociclos): declarás UN eje de progresión por defecto para todo
 * el período — cada ejercicio cae solo al eje disponible más cercano si el
 * suyo no aplica (ver ejeEfectivo). Un solo bloque activo a la vez.
 */
export const PanelBloques: React.FC<PanelBloquesProps> = ({ onIrARutinas }) => {
  const { mostrarToast } = useToast();
  const [nombre, setNombre] = useState("");
  const [diaFin, setDiaFin] = useState(sumarDias(obtenerDiaTareaHoy(), 28));
  const [eje, setEje] = useState<EjeProgresion>("volumen");
  const [guardando, setGuardando] = useState(false);
  const [recienCreado, setRecienCreado] = useState(false);

  const bloques =
    useLiveQuery(() => db.bloque_entrenamiento.toArray()) || SIN_BLOQUES;
  const activo = bloques.find((b) => b.estado === "activo");
  const esPrimerBloque = bloques.length === 0;

  const crear = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    const res = await useCase.crearBloque({
      nombre,
      diaInicio: obtenerDiaTareaHoy(),
      diaFin,
      ejeProgresionDefault: eje,
    });
    setGuardando(false);
    if (res.ok) {
      setNombre("");
      if (esPrimerBloque) setRecienCreado(true);
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  const cerrar = async (id: string) => {
    const res = await useCase.cerrarBloque(id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.Flame className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Bloque de entrenamiento
        </h3>
      </div>

      {!activo && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[#2A2A2E] p-3">
          {esPrimerBloque && (
            <p className="text-xs text-zinc-500">
              Un bloque es un período de entrenamiento (2-6 semanas). Elegís un
              solo eje para medir tu progreso en todo el bloque — si un
              ejercicio no aplica a ese eje, el sistema usa automáticamente el
              más cercano para ese ejercicio en particular.
            </p>
          )}
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del bloque (ej. Bloque 1 — Volumen)"
            className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
          />
          <div className="flex flex-wrap items-end gap-2">
            <Select
              label="Eje de progresión"
              value={eje}
              onChange={(v) => setEje(v as EjeProgresion)}
              options={EJES_PROGRESION.map((e) => ({
                value: e,
                label: ETIQUETA_EJE[e],
              }))}
            />
            <input
              type="date"
              value={diaFin}
              onChange={(e) => setDiaFin(e.target.value)}
              className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
            <Button
              onClick={crear}
              cargando={guardando}
              disabled={!nombre.trim()}
            >
              Iniciar bloque
            </Button>
          </div>
        </div>
      )}

      {activo && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div>
            <span className="text-sm font-bold text-zinc-200">
              {activo.nombre}
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge color="emerald">Activo</Badge>
              <Badge color="sky">
                {ETIQUETA_EJE[activo.ejeProgresionDefault]}
              </Badge>
              <span className="text-xs text-zinc-500">
                {activo.diaInicio} → {activo.diaFin}
              </span>
            </div>
          </div>
          <button
            onClick={() => void cerrar(activo.id)}
            className="rounded border border-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase hover:text-red-400"
          >
            Cerrar bloque
          </button>
        </div>
      )}

      {activo && recienCreado && onIrARutinas && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
          <span className="text-xs text-zinc-300">
            Bloque listo. Ahora armá tu primera rutina para poder registrar
            sesiones.
          </span>
          <Button
            variant="outline"
            onClick={() => {
              setRecienCreado(false);
              onIrARutinas();
            }}
            icono={<Icono.ArrowRight className="h-4 w-4" />}
          >
            Crear rutina
          </Button>
        </div>
      )}
    </div>
  );
};
