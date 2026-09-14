"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Button } from "../../button";
import { Select } from "../../select";
import { Badge } from "../../badge";
import { Icono } from "../../icons";
import { ModalImportarJson } from "../../contenido/modal-importar-json";
import { useToast } from "../../../hooks/useToast";
import { GestionarBloquesUseCase } from "../../../../application/use-cases/personal/gestionar-bloques.use-case";
import { generarPromptSecuenciaBloques } from "../../../../domain/prompts/generar-prompt-entrenamiento";
import {
  EJES_PROGRESION,
  type EjeProgresion,
} from "../../../../domain/entidades/ejercicio.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../../domain/entidades/personal.entity";

const PLANTILLA_SECUENCIA = JSON.stringify(
  [
    {
      nombre: "Bloque 1 — Volumen",
      duracionSemanas: 4,
      ejeProgresionDefault: "volumen",
    },
    {
      nombre: "Bloque 2 — Fuerza",
      duracionSemanas: 4,
      ejeProgresionDefault: "carga",
    },
  ],
  null,
  2
);

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

  const [modalSecuenciaAbierto, setModalSecuenciaAbierto] = useState(false);

  const bloques =
    useLiveQuery(() => db.bloque_entrenamiento.toArray()) || SIN_BLOQUES;
  const activo = bloques.find((b) => b.estado === "activo");
  const planificados = bloques
    .filter((b) => b.estado === "planificado")
    .sort((a, b) => (a.diaInicio < b.diaInicio ? -1 : 1));
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

  const handleCopiarPromptSecuencia = () => {
    const prompt = generarPromptSecuenciaBloques(activo || null);
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt copiado al portapapeles.", "exito");
  };

  const importarSecuencia = async (items: unknown[]) => {
    const res = await useCase.importarSecuencia(
      items as {
        nombre: string;
        duracionSemanas?: number;
        ejeProgresionDefault: EjeProgresion;
      }[]
    );
    if (!res.ok) {
      throw new Error(res.error!.mensaje);
    }
    mostrarToast(`${res.valor} bloque(s) creado(s) en secuencia.`, "exito");
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icono.Flame className="h-4 w-4 text-zinc-500" />
          <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Bloque de entrenamiento
          </h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCopiarPromptSecuencia}
            className="px-3 py-1.5 text-xs"
            icono={<Icono.Copy className="h-3.5 w-3.5" />}
          >
            Copiar prompt para IA
          </Button>
          <Button
            variant="outline"
            onClick={() => setModalSecuenciaAbierto(true)}
            className="px-3 py-1.5 text-xs"
          >
            Importar secuencia
          </Button>
        </div>
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

      {planificados.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-dashed border-[#2A2A2E] p-3">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            En cola
          </span>
          {planificados.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-2 text-xs text-zinc-400"
            >
              <Badge color="sky">{ETIQUETA_EJE[b.ejeProgresionDefault]}</Badge>
              <span className="font-bold text-zinc-300">{b.nombre}</span>
              <span className="text-zinc-600">
                {b.diaInicio} → {b.diaFin}
              </span>
            </div>
          ))}
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

      <ModalImportarJson
        abierto={modalSecuenciaAbierto}
        onCerrar={() => setModalSecuenciaAbierto(false)}
        titulo="Importar secuencia de bloques desde JSON"
        plantillaEjemplo={PLANTILLA_SECUENCIA}
        onImportar={importarSecuencia}
      />
    </div>
  );
};
