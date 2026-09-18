"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Icono } from "../../icons";
import { Button } from "../../button";
import { useToast } from "../../../hooks/useToast";
import { GestionarRegistroActividadUseCase } from "../../../../application/use-cases/personal/gestionar-registro-actividad.use-case";
import { obtenerDiaTareaHoy } from "../../../../domain/entidades/personal.entity";
import { aplicaHoyRutina } from "../../../../domain/entidades/rutina.entity";
import {
  lunesDeLaSemana,
  sumarDias,
  NOMBRES_DIA,
  formatoDiaCorto,
} from "../calendario-utils";

const registroUseCase = new GestionarRegistroActividadUseCase();
const SIN_ITEMS: never[] = [];

/**
 * Calendario semanal de Entrenamiento — por cada día, qué Rutinas tocan
 * (según `rutinasProgramadas` del Bloque activo, vía `aplicaHoyRutina`) y si
 * ya hay un `RegistroActividad` para ese día/rutina (hecha) o no. Registrar
 * desde acá usa "como planificado" — para editar con excepción, se sigue
 * usando el flujo de EjecucionSesion.
 */
export const CalendarioEntrenamiento: React.FC = () => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();
  const [ancla, setAncla] = useState(lunesDeLaSemana(hoy));
  const [registrando, setRegistrando] = useState<string | null>(null);

  const diasSemana = Array.from({ length: 7 }, (_, i) => sumarDias(ancla, i));
  const fin = diasSemana[6];

  const bloqueActivo = useLiveQuery(
    () =>
      db.bloque_entrenamiento
        .where("estado")
        .equals("activo")
        .and((b) => !b.eliminado)
        .first(),
    []
  );

  const plantillas =
    useLiveQuery(() => db.plantilla_rutina.toArray(), []) || SIN_ITEMS;
  const nombrePorId = new Map(plantillas.map((p) => [p.id, p.nombre]));

  const registros =
    useLiveQuery(
      () =>
        db.registro_actividad
          .where("diaTarea")
          .between(ancla, fin, true, true)
          .toArray(),
      [ancla, fin]
    ) || SIN_ITEMS;

  const marcarHecha = async (plantillaId: string, dia: string) => {
    const clave = `${plantillaId}_${dia}`;
    setRegistrando(clave);
    const res = await registroUseCase.registrarComoPlanificado(
      plantillaId,
      dia,
      bloqueActivo?.id
    );
    setRegistrando(null);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
    else mostrarToast("Sesión registrada.", "exito");
  };

  if (!bloqueActivo) {
    return (
      <div className="rounded-2xl border border-dashed border-[#2A2A2E] p-4 text-center text-sm text-zinc-600">
        No hay un bloque activo con rutinas programadas todavía.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAncla(sumarDias(ancla, -7))}
            className="rounded-lg border border-[#2A2A2E] p-1.5 text-zinc-500 hover:text-zinc-300"
          >
            <Icono.ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAncla(lunesDeLaSemana(hoy))}
            className="rounded-lg border border-[#2A2A2E] px-2 py-1.5 text-[10px] font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Hoy
          </button>
          <button
            onClick={() => setAncla(sumarDias(ancla, 7))}
            className="rounded-lg border border-[#2A2A2E] p-1.5 text-zinc-500 hover:text-zinc-300"
          >
            <Icono.ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="text-xs text-zinc-500">
          {formatoDiaCorto(ancla)} — {formatoDiaCorto(fin)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 overflow-x-auto sm:grid-cols-7">
        {diasSemana.map((dia) => {
          const esHoy = dia === hoy;
          // El Bloque solo aplica dentro de su propia ventana — un día antes
          // de diaInicio (o después de diaFin) nunca muestra sus rutinas,
          // aunque el patrón semanal (diasSemana) matchee ese día de la semana.
          const dentroDelBloque =
            dia >= bloqueActivo.diaInicio && dia <= bloqueActivo.diaFin;
          const rutinasDelDia = dentroDelBloque
            ? (bloqueActivo.rutinasProgramadas || []).filter((r) =>
                aplicaHoyRutina(r.diasSemana, dia)
              )
            : [];
          return (
            <div
              key={dia}
              className={`flex min-w-[140px] flex-col gap-2 rounded-xl border p-2 ${
                esHoy
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-[#2A2A2E] bg-[#18181B]"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-[10px] font-bold uppercase ${esHoy ? "text-emerald-400" : "text-zinc-500"}`}
                >
                  {NOMBRES_DIA[new Date(`${dia}T00:00:00Z`).getUTCDay()].slice(
                    0,
                    3
                  )}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {formatoDiaCorto(dia)}
                </span>
              </div>
              {rutinasDelDia.length === 0 && (
                <span className="text-[10px] text-zinc-700">
                  Sin rutina planificada
                </span>
              )}
              {rutinasDelDia.map((r) => {
                const hecha = registros.some(
                  (reg) =>
                    reg.plantillaId === r.plantillaId && reg.diaTarea === dia
                );
                const clave = `${r.plantillaId}_${dia}`;
                return (
                  <div
                    key={r.plantillaId}
                    className={`flex flex-col gap-1.5 rounded-lg border-l-2 bg-[#0D0D0F] p-2 ${
                      hecha
                        ? "border-emerald-500/60 opacity-60"
                        : "border-zinc-600"
                    }`}
                  >
                    <span
                      className={`text-xs text-zinc-200 ${hecha ? "line-through" : ""}`}
                    >
                      {nombrePorId.get(r.plantillaId) || r.plantillaId}
                    </span>
                    {!hecha && (
                      <Button
                        variant="outline"
                        onClick={() => void marcarHecha(r.plantillaId, dia)}
                        cargando={registrando === clave}
                        className="px-2 py-1 text-[10px]"
                      >
                        Marcar hecha
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
