"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { Badge, type BadgeColor } from "../badge";
import {
  diagnosticarPlanificacion,
  type AlertaFaltantePlanificacion,
  type EstadoPasoProcedimiento,
  type HorizontePlanificacion,
} from "../../../domain/entidades/diagnostico-planificacion.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";
import {
  ModalCrearElementoPersonal,
  type TipoElementoCrear,
} from "./modal-crear-elemento-personal";

const COLOR_PASO: Record<EstadoPasoProcedimiento, BadgeColor> = {
  completado: "emerald",
  atencion: "amber",
  pendiente: "zinc",
};

const ETIQUETA_PASO: Record<EstadoPasoProcedimiento, string> = {
  completado: "Listo",
  atencion: "Falta ajustar",
  pendiente: "Por definir",
};

export interface GuiaProcedimientoPlanificacionProps {
  horizonte: HorizontePlanificacion;
  onAbrirWizard?: () => void;
}

export const GuiaProcedimientoPlanificacion: React.FC<
  GuiaProcedimientoPlanificacionProps
> = ({ horizonte, onAbrirWizard }) => {
  const router = useRouter();
  const hoy = obtenerDiaTareaHoy();
  const [expandido, setExpandido] = useState(true);
  const [modalCrear, setModalCrear] = useState<{
    tipo: TipoElementoCrear;
    padreId?: string;
  } | null>(null);

  const areas = useLiveQuery(() => db.area_personal.toArray()) ?? [];
  const objetivos =
    useLiveQuery(() => db.objetivo_cuantificable.toArray()) ?? [];
  const proyectos = useLiveQuery(() => db.proyecto_personal.toArray()) ?? [];
  const entregables = useLiveQuery(() => db.entregable.toArray()) ?? [];
  const fases = useLiveQuery(() => db.fase_personal.toArray()) ?? [];
  const actividades = useLiveQuery(() => db.actividad.toArray()) ?? [];
  const inbox = useLiveQuery(() => db.inbox_item.toArray()) ?? [];

  const diag = diagnosticarPlanificacion(horizonte, {
    hoy,
    areas,
    objetivos,
    proyectos,
    entregables,
    fases,
    actividades,
    inbox,
  });

  const ejecutarAccion = (alerta: AlertaFaltantePlanificacion) => {
    switch (alerta.accion) {
      case "crear_area":
        setModalCrear({ tipo: "area" });
        break;
      case "crear_objetivo":
        setModalCrear({
          tipo: "objetivo",
          padreId: alerta.contextoPadreId,
        });
        break;
      case "crear_proyecto":
        setModalCrear({
          tipo: "proyecto",
          padreId: alerta.contextoPadreId,
        });
        break;
      case "crear_entregable":
        setModalCrear({
          tipo: "entregable",
          padreId: alerta.contextoPadreId,
        });
        break;
      case "crear_fase":
        setModalCrear({
          tipo: "fase",
          padreId: alerta.contextoPadreId,
        });
        break;
      case "crear_tarea":
        setModalCrear({
          tipo: "tarea",
          padreId: alerta.contextoPadreId,
        });
        break;
      case "abrir_wizard":
        onAbrirWizard?.();
        break;
      case "ir_oficina":
        router.push("/dashboard/personal/oficina");
        break;
    }
  };

  const todoListo = diag.pasosCompletados === diag.totalPasos;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold ${
              todoListo
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                : "border-amber-500/40 bg-amber-500/15 text-amber-400"
            }`}
          >
            {diag.pasosCompletados}/{diag.totalPasos}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-100">
                {diag.tituloProcedimiento}
              </h2>
              <span className="text-xs text-zinc-500">
                · {diag.resumenGlobal}
              </span>
            </div>
            <p className="text-xs text-zinc-500">{diag.subtitulo}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="flex min-h-9 items-center gap-1 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2.5 py-1 text-xs font-bold text-zinc-400 hover:text-zinc-200"
        >
          {expandido ? "Ocultar pasos" : "Ver pasos del procedimiento"}
          <Icono.ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${
              expandido ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {expandido && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {diag.pasos.map((paso) => (
            <div
              key={paso.id}
              className={`flex flex-col justify-between gap-2.5 rounded-xl border p-3 ${
                paso.estado === "completado"
                  ? "border-emerald-500/20 bg-[#0D0D0F]"
                  : paso.estado === "atencion"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-[#2A2A2E] bg-[#0D0D0F]"
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-200">
                    {paso.titulo}
                  </span>
                  <Badge color={COLOR_PASO[paso.estado]}>
                    {ETIQUETA_PASO[paso.estado]}
                  </Badge>
                </div>
                <p className="text-[11px] text-zinc-500">{paso.descripcion}</p>
                <div className="mt-1 rounded-lg border border-[#232326] bg-[#141417] px-2.5 py-1.5 text-xs font-medium text-zinc-300">
                  {paso.resumen}
                </div>
              </div>

              {paso.faltantes.length > 0 && (
                <div className="flex flex-col gap-1.5 border-t border-[#232326] pt-2">
                  {paso.faltantes.slice(0, 3).map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="text-zinc-400">• {f.texto}</span>
                      {f.accion && f.etiquetaAccion && (
                        <button
                          type="button"
                          onClick={() => ejecutarAccion(f)}
                          className="shrink-0 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
                        >
                          {f.etiquetaAccion}
                        </button>
                      )}
                    </div>
                  ))}
                  {paso.faltantes.length > 3 && (
                    <span className="text-[10px] text-zinc-500">
                      + {paso.faltantes.length - 3} punto(s) más por revisar
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalCrear && (
        <ModalCrearElementoPersonal
          abierto
          onCerrar={() => setModalCrear(null)}
          tipoInicial={modalCrear.tipo}
          padreInicialId={modalCrear.padreId}
        />
      )}
    </div>
  );
};
