"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Icono } from "../icons";
import { useToast } from "../../hooks/useToast";
import { GestionarBandejaEntradaUseCase } from "../../../application/use-cases/personal/gestionar-bandeja-entrada.use-case";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";

const useCase = new GestionarBandejaEntradaUseCase();
const SIN_ITEMS: never[] = [];

/**
 * Bandeja de entrada: captura libre sin fricción (un campo, sin categoría ni
 * prioridad al momento de anotar) — eso se decide después, acá mismo, con
 * un click por acción.
 */
export const CapturaInbox: React.FC = () => {
  const { mostrarToast } = useToast();
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);

  const items =
    useLiveQuery(() =>
      db.inbox_item.where("estado").equals("pendiente").toArray()
    ) || SIN_ITEMS;
  const ordenados = [...items].sort((a, b) => a.creadoEn - b.creadoEn);

  const guardar = async () => {
    if (!texto.trim()) return;
    setGuardando(true);
    const res = await useCase.crearItem({ texto });
    setGuardando(false);
    if (res.ok) {
      setTexto("");
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  const promoverATarea = async (
    id: string,
    tipo: "enfoque" | "mantenimiento"
  ) => {
    const res = await useCase.promoverATareaDiaria(
      id,
      obtenerDiaTareaHoy(),
      tipo
    );
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const promoverAPendiente = async (id: string) => {
    const res = await useCase.promoverAPendiente(id, "importante", "ambas");
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  const descartar = async (id: string) => {
    const res = await useCase.descartarItem(id);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center gap-2">
        <Icono.Inbox className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
          Bandeja de entrada
        </h3>
      </div>

      <div className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void guardar();
          }}
          placeholder="Anotá lo que se te ocurra, sin pensarlo..."
          className="flex-1 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/40"
        />
        <Button
          onClick={guardar}
          cargando={guardando}
          disabled={!texto.trim()}
          icono={<Icono.Plus className="h-4 w-4" />}
        >
          Guardar
        </Button>
      </div>

      {ordenados.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[#2A2A2E] pt-3">
          {ordenados.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm text-zinc-200">{item.texto}</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => void promoverATarea(item.id, "enfoque")}
                  title="Promover a tarea de enfoque de hoy"
                  className="flex min-h-11 items-center justify-center rounded border border-emerald-500/20 bg-emerald-500/10 px-3 text-[10px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
                >
                  → Enfoque
                </button>
                <button
                  onClick={() => void promoverATarea(item.id, "mantenimiento")}
                  title="Promover a tarea de mantenimiento de hoy"
                  className="flex min-h-11 items-center justify-center rounded border border-sky-500/20 bg-sky-500/10 px-3 text-[10px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
                >
                  → Mantenimiento
                </button>
                <button
                  onClick={() => void promoverAPendiente(item.id)}
                  title="Promover a Pendientes (prioridad Importante, se puede ajustar ahí)"
                  className="flex min-h-11 items-center justify-center rounded border border-amber-500/20 bg-amber-500/10 px-3 text-[10px] font-bold text-amber-400 uppercase hover:bg-amber-500/20"
                >
                  → Pendiente
                </button>
                <button
                  onClick={() => void descartar(item.id)}
                  title="Descartar"
                  className="flex min-h-11 items-center justify-center rounded border border-zinc-800 px-3 text-[10px] font-bold text-zinc-500 uppercase hover:text-red-400"
                >
                  Descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
