"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { GestionarActividadesUseCase } from "../../../application/use-cases/personal/gestionar-actividades.use-case";
import type { Actividad } from "../../../domain/entidades/actividad.entity";

const useCase = new GestionarActividadesUseCase();

/** Proyectos del módulo Proyectos en los que tiene sentido trabajar (no los cerrados ni cancelados). */
export function useProyectosDeTrabajo() {
  return (
    useLiveQuery(async () => {
      const todos = await db.proyectos.toArray();
      return todos
        .map((p) => ({
          id: p.id as string,
          nombre:
            (typeof p.nombre === "string" && p.nombre) || "Proyecto sin nombre",
          estado: typeof p.estado === "string" ? p.estado.toLowerCase() : "",
        }))
        .filter(
          (p) => !p.estado.includes("complet") && !p.estado.includes("cancel")
        );
    }, []) ?? []
  );
}

type Entrada = { proyectoId: string; nota: string };

const selectClase =
  "rounded border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/40";
const textareaClase =
  "rounded border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/40";

/**
 * Detalle de una actividad genérica (ej. "Desarrollo"): qué voy a hacer / qué
 * hice, y en qué proyecto(s). Se ve debajo del título y se edita con un
 * toque, antes de hacerla, al completarla o después. Una actividad puede
 * tocar más de un proyecto en el día (ej. "Desarrollo de Proyectos" con dos
 * clientes) — cada uno con su propia nota, sin tener que abrir una Actividad
 * por cada uno. Lo que se anota queda ligado a cada proyecto en Tiempo por
 * proyecto.
 */
export const DetalleActividad: React.FC<{ actividad: Actividad }> = ({
  actividad,
}) => {
  const { mostrarToast } = useToast();
  const proyectos = useProyectosDeTrabajo();
  const [editando, setEditando] = useState(false);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [guardando, setGuardando] = useState(false);

  const todasLasEntradas: { proyectoId?: string; nota?: string }[] = [
    { proyectoId: actividad.proyectoTrabajoId, nota: actividad.nota },
    ...(actividad.otrosProyectos ?? []),
  ];
  const proyectosLigados = todasLasEntradas
    .filter((e) => e.proyectoId)
    .map((e) => ({
      nombre:
        proyectos.find((p) => p.id === e.proyectoId)?.nombre ?? "Proyecto",
      nota: e.nota,
    }));

  const abrir = () => {
    const base: Entrada[] = [
      {
        proyectoId: actividad.proyectoTrabajoId ?? "",
        nota: actividad.nota ?? "",
      },
      ...(actividad.otrosProyectos ?? []).map((o) => ({
        proyectoId: o.proyectoId,
        nota: o.nota ?? "",
      })),
    ];
    setEntradas(base);
    setEditando(true);
  };

  const agregarProyecto = () =>
    setEntradas((e) => [...e, { proyectoId: "", nota: "" }]);

  const quitarProyecto = (i: number) =>
    setEntradas((e) => e.filter((_, idx) => idx !== i));

  const cambiarEntrada = (i: number, cambio: Partial<Entrada>) =>
    setEntradas((e) =>
      e.map((entrada, idx) => (idx === i ? { ...entrada, ...cambio } : entrada))
    );

  const guardar = async () => {
    setGuardando(true);
    const [principal, ...resto] = entradas;
    const res = await useCase.editarDetalle(actividad.id, {
      nota: principal?.nota || null,
      proyectoTrabajoId: principal?.proyectoId || null,
      otrosProyectos: resto
        .filter((e) => e.proyectoId)
        .map((e) => ({ proyectoId: e.proyectoId, nota: e.nota || undefined })),
    });
    setGuardando(false);
    if (res.ok) setEditando(false);
    else mostrarToast(res.error!.mensaje, "error");
  };

  if (editando) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-[#2A2A2E] bg-[#111113] p-2">
        {entradas.map((entrada, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            {i > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-600 uppercase">
                  Otro proyecto
                </span>
                <button
                  onClick={() => quitarProyecto(i)}
                  title="Quitar este proyecto"
                  className="rounded p-0.5 text-zinc-600 hover:text-red-400"
                >
                  <Icono.Close className="h-3 w-3" />
                </button>
              </div>
            )}
            <select
              value={entrada.proyectoId}
              onChange={(e) =>
                cambiarEntrada(i, { proyectoId: e.target.value })
              }
              className={selectClase}
            >
              <option value="">Sin proyecto</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <textarea
              value={entrada.nota}
              onChange={(e) => cambiarEntrada(i, { nota: e.target.value })}
              rows={2}
              placeholder="Qué voy a hacer / qué hice en este proyecto"
              className={textareaClase}
            />
          </div>
        ))}
        <button
          onClick={agregarProyecto}
          className="self-start text-[10px] font-bold text-emerald-400 uppercase hover:underline"
        >
          + Agregar otro proyecto
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => void guardar()}
            disabled={guardando}
            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20 disabled:opacity-40"
          >
            Guardar
          </button>
          <button
            onClick={() => setEditando(false)}
            className="px-2 text-[10px] font-bold text-zinc-500 uppercase hover:text-zinc-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {proyectosLigados.map((p, i) => (
        <span
          key={i}
          className="rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold text-violet-300"
        >
          {p.nombre}
        </span>
      ))}
      {actividad.nota && (
        <span className="text-xs text-zinc-400 italic">{actividad.nota}</span>
      )}
      {actividad.otrosProyectos?.map((o, i) =>
        o.nota ? (
          <span key={i} className="text-xs text-zinc-500 italic">
            {o.nota}
          </span>
        ) : null
      )}
      <button
        onClick={abrir}
        className="text-[10px] font-bold text-zinc-600 uppercase hover:text-zinc-300"
      >
        {actividad.nota ||
        actividad.proyectoTrabajoId ||
        (actividad.otrosProyectos?.length ?? 0) > 0
          ? "Editar detalle"
          : "+ Detalle"}
      </button>
    </div>
  );
};
