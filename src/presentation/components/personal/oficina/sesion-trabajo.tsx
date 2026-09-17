"use client";

import React, { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Button } from "../../button";
import { Icono } from "../../icons";
import { useToast } from "../../../hooks/useToast";
import { GestionarSesionTrabajoUseCase } from "../../../../application/use-cases/personal/gestionar-sesion-trabajo.use-case";
import { GestionarActividadesUseCase } from "../../../../application/use-cases/personal/gestionar-actividades.use-case";
import {
  MAX_TAREAS_ENFOQUE_POR_DIA,
  MAX_TAREAS_MANTENIMIENTO_POR_DIA,
  type Actividad,
} from "../../../../domain/entidades/actividad.entity";
import { obtenerDiaTareaHoy } from "../../../../domain/entidades/personal.entity";
import { PausaActivaRapida } from "./pausa-activa-rapida";

const sesionUseCase = new GestionarSesionTrabajoUseCase();
const actividadesUseCase = new GestionarActividadesUseCase();
const SIN_ACTIVIDADES: never[] = [];

function formatoHHMMSS(totalSeg: number): string {
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  const dosDigitos = (n: number) => n.toString().padStart(2, "0");
  return h > 0
    ? `${h}:${dosDigitos(m)}:${dosDigitos(s)}`
    : `${dosDigitos(m)}:${dosDigitos(s)}`;
}

const FilaComenzar: React.FC<{ actividad: Actividad }> = ({ actividad }) => {
  const { mostrarToast } = useToast();
  const [iniciando, setIniciando] = useState(false);

  const comenzar = async () => {
    setIniciando(true);
    const res = await sesionUseCase.iniciarSesion(actividad.id);
    setIniciando(false);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
      <span className="text-sm text-zinc-200">{actividad.descripcion}</span>
      <Button
        variant="outline"
        onClick={() => void comenzar()}
        cargando={iniciando}
        className="shrink-0 px-3 py-1.5 text-xs"
        icono={<Icono.Play className="h-3.5 w-3.5" />}
      >
        Comenzar
      </Button>
    </div>
  );
};

/**
 * Lista de tareas de hoy cuando no hay ninguna sesión en curso — agrupadas
 * 1 prioridad + hasta 3 mantenimiento + el resto como "extras" colapsables
 * (mismos MAX_TAREAS_* que ya usa bunker-del-dia.tsx como recomendación, acá
 * se usan para decidir qué se muestra de entrada vs. detrás de un toggle).
 */
const ListaParaComenzar: React.FC = () => {
  const [extrasAbiertos, setExtrasAbiertos] = useState(false);
  const diaTarea = obtenerDiaTareaHoy();

  const actividadesHoy =
    useLiveQuery(
      () =>
        db.actividad
          .where({ diaTarea })
          .and((a) => a.estado === "pendiente" && a.tipo !== "backlog")
          .toArray(),
      [diaTarea]
    ) || SIN_ACTIVIDADES;

  const enfoque = actividadesHoy.filter((a) => a.tipo === "enfoque");
  const mantenimiento = actividadesHoy.filter(
    (a) => a.tipo === "mantenimiento"
  );
  const prioridad = enfoque.slice(0, MAX_TAREAS_ENFOQUE_POR_DIA);
  const mantenimientoVisible = mantenimiento.slice(
    0,
    MAX_TAREAS_MANTENIMIENTO_POR_DIA
  );
  const extras = [
    ...enfoque.slice(MAX_TAREAS_ENFOQUE_POR_DIA),
    ...mantenimiento.slice(MAX_TAREAS_MANTENIMIENTO_POR_DIA),
  ];

  if (actividadesHoy.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        Sin tareas para hoy — armalas en Planificación.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {prioridad.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Prioridad
          </span>
          {prioridad.map((a) => (
            <FilaComenzar key={a.id} actividad={a} />
          ))}
        </div>
      )}
      {mantenimientoVisible.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Mantenimiento
          </span>
          {mantenimientoVisible.map((a) => (
            <FilaComenzar key={a.id} actividad={a} />
          ))}
        </div>
      )}
      {extras.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setExtrasAbiertos((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase hover:text-zinc-300"
          >
            {extrasAbiertos ? (
              <Icono.ChevronUp className="h-3 w-3" />
            ) : (
              <Icono.ChevronDown className="h-3 w-3" />
            )}
            Extras ({extras.length})
          </button>
          {extrasAbiertos &&
            extras.map((a) => <FilaComenzar key={a.id} actividad={a} />)}
        </div>
      )}
    </div>
  );
};

/**
 * Cronómetro de la sesión en curso — tick cada 1s (mismo patrón que
 * PasosEnVivo en ejecucion-ia-control.tsx, adaptado de "refrescar una
 * etiqueta relativa" a "sumar segundos corridos").
 */
const Cronometro: React.FC<{
  actividad?: Actividad;
  iniciadoEn: number;
  segundosAcumulados: number;
  onPausar: () => void;
  onCompletar: () => void;
  pausando: boolean;
  completando: boolean;
}> = ({
  actividad,
  iniciadoEn,
  segundosAcumulados,
  onPausar,
  onCompletar,
  pausando,
  completando,
}) => {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedSeg =
    segundosAcumulados + Math.max(0, Math.floor((ahora - iniciadoEn) / 1000));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <span className="text-sm text-zinc-300">
        {actividad?.descripcion || "Cargando..."}
      </span>
      <span className="font-mono text-3xl font-bold text-emerald-400">
        {formatoHHMMSS(elapsedSeg)}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onPausar}
          cargando={pausando}
          className="px-3 py-1.5 text-xs"
          icono={<Icono.Coffee className="h-3.5 w-3.5" />}
        >
          Pausa activa
        </Button>
        <Button
          onClick={onCompletar}
          cargando={completando}
          className="px-3 py-1.5 text-xs"
          icono={<Icono.Check className="h-3.5 w-3.5" />}
        >
          Completar
        </Button>
      </div>
    </div>
  );
};

export const SesionTrabajo: React.FC = () => {
  const { mostrarToast } = useToast();
  const [pausando, setPausando] = useState(false);
  const [completando, setCompletando] = useState(false);

  const sesion = useLiveQuery(() =>
    db.sesion_trabajo.where("estado").anyOf(["activa", "pausada"]).first()
  );
  const actividad = useLiveQuery(
    () => (sesion ? db.actividad.get(sesion.actividadId) : undefined),
    [sesion?.actividadId]
  );

  const pausar = async () => {
    if (!sesion) return;
    setPausando(true);
    const res = await sesionUseCase.pausarParaDescanso(sesion.id);
    setPausando(false);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const completar = async () => {
    if (!sesion) return;
    setCompletando(true);
    const resFinalizar = await sesionUseCase.finalizarSesion(sesion.id);
    if (!resFinalizar.ok) {
      setCompletando(false);
      mostrarToast(resFinalizar.error!.mensaje, "error");
      return;
    }
    const resCompletar = await actividadesUseCase.completarActividad(
      sesion.actividadId
    );
    setCompletando(false);
    if (!resCompletar.ok) mostrarToast(resCompletar.error!.mensaje, "error");
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.Clock className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Sesión de trabajo
        </h3>
      </div>

      {!sesion && <ListaParaComenzar />}

      {sesion && sesion.estado === "activa" && (
        <Cronometro
          actividad={actividad}
          iniciadoEn={sesion.iniciadoEn}
          segundosAcumulados={sesion.segundosAcumulados}
          onPausar={() => void pausar()}
          onCompletar={() => void completar()}
          pausando={pausando}
          completando={completando}
        />
      )}

      {sesion && sesion.estado === "pausada" && (
        <PausaActivaRapida sesionId={sesion.id} />
      )}
    </div>
  );
};
