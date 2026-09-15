"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { Button } from "../button";
import { useToast } from "../../hooks/useToast";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import {
  obtenerDiaTareaHoy,
  lunesDeLaSemana,
} from "../../../domain/entidades/personal.entity";

const useCase = new GestionarActividadesUseCase();
const SIN_PENDIENTES: never[] = [];

/**
 * Ritual semanal: elegís qué pendientes del backlog general entran esta
 * semana — mismo patrón que "Arrancar la semana" del Planificador de
 * Contenido. Sin objetivo numérico (a diferencia de Contenido, acá alcanza
 * con el checklist) y sin entidad "ciclo" nueva: solo marca `semanaId` en
 * los pendientes elegidos.
 */
export const ArmarSemana: React.FC = () => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();
  const semanaActual = lunesDeLaSemana(hoy);

  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  const sinAsignar =
    useLiveQuery(
      () =>
        db.actividad
          .where("estado")
          .equals("pendiente")
          .and((a) => a.tipo === "backlog" && a.semanaId !== semanaActual)
          .toArray(),
      [semanaActual]
    ) || SIN_PENDIENTES;

  const toggle = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const confirmar = async () => {
    setGuardando(true);
    const res = await useCase.asignarASemanaActual(seleccionados);
    setGuardando(false);
    if (res.ok) {
      setSeleccionados([]);
      mostrarToast("Semana armada.", "exito");
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  if (sinAsignar.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
      <div className="flex items-center gap-2">
        <Icono.ListTodo className="h-4 w-4 text-sky-400" />
        <h3 className="text-xs font-bold tracking-wider text-sky-400 uppercase">
          Armar la semana
        </h3>
      </div>
      <p className="text-xs text-zinc-500">
        Elegí del backlog general qué entra esta semana — el resto queda
        disponible pero no distrae.
      </p>
      <div className="flex flex-col gap-1.5">
        {sinAsignar.map((p) => (
          <label
            key={p.id}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2 hover:border-zinc-700"
          >
            <input
              type="checkbox"
              checked={seleccionados.includes(p.id)}
              onChange={() => toggle(p.id)}
              className="accent-sky-500"
            />
            <span className="text-sm text-zinc-200">{p.descripcion}</span>
          </label>
        ))}
      </div>
      <Button
        onClick={confirmar}
        cargando={guardando}
        disabled={seleccionados.length === 0}
        className="self-end"
      >
        Empezar semana ({seleccionados.length})
      </Button>
    </div>
  );
};
