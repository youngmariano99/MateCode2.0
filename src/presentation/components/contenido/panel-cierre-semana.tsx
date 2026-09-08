"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Dialog } from "../dialog";
import { Input } from "../input";
import { Button } from "../button";
import { Badge } from "../badge";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";

const useCase = new GestionarContenidoUseCase();

type Accion = "completar" | "siguiente" | "eliminar";
type Decision = { tipo: "idea" | "contenido"; id: string; accion: Accion };

const SIN_IDEAS: never[] = [];
const SIN_CONTENIDOS: never[] = [];

interface PanelCierreSemanaProps {
  cicloId: string;
  objetivoAnterior: number;
  onCerrado: (nuevoCicloId: string) => void;
  onCancelar: () => void;
}

/** Lo que quedó sin publicar de la semana: Completado / Pasar a la siguiente / Eliminar. */
export const PanelCierreSemana: React.FC<PanelCierreSemanaProps> = ({
  cicloId,
  objetivoAnterior,
  onCerrado,
  onCancelar,
}) => {
  const ideas =
    useLiveQuery(
      () =>
        db.idea_contenido.where({ cicloId, estado: "Seleccionada" }).toArray(),
      [cicloId]
    ) || SIN_IDEAS;
  const contenidosTodos =
    useLiveQuery(
      () => db.contenido.where("cicloId").equals(cicloId).toArray(),
      [cicloId]
    ) || SIN_CONTENIDOS;
  const contenidos = useMemo(
    () => contenidosTodos.filter((c) => c.estado !== "Publicado"),
    [contenidosTodos]
  );

  const [decisiones, setDecisiones] = useState<Record<string, Accion>>({});
  const [objetivoNuevo, setObjetivoNuevo] = useState(objetivoAnterior);
  const [cerrando, setCerrando] = useState(false);

  const elegir = (id: string, accion: Accion) => {
    setDecisiones((prev) => ({ ...prev, [id]: accion }));
  };

  const cerrar = async () => {
    setCerrando(true);
    const lista: Decision[] = [
      ...ideas.map((i) => ({
        tipo: "idea" as const,
        id: i.id,
        accion: decisiones[i.id] || "siguiente",
      })),
      ...contenidos.map((c) => ({
        tipo: "contenido" as const,
        id: c.id,
        accion: decisiones[c.id] || "siguiente",
      })),
    ];
    const res = await useCase.cerrarSemanaYcrearNueva(
      cicloId,
      objetivoNuevo,
      lista
    );
    setCerrando(false);
    if (res.ok) onCerrado(res.valor);
  };

  const pendientes = [...ideas, ...contenidos];

  return (
    <Dialog
      abierto
      onClose={onCancelar}
      titulo="Cerrar la semana"
      maxWidth="lg"
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Objetivo de videos para la semana que arranca"
          type="number"
          min={1}
          value={objetivoNuevo}
          onChange={(e) =>
            setObjetivoNuevo(Math.max(1, Number(e.target.value) || 1))
          }
        />

        {pendientes.length === 0 ? (
          <span className="text-sm text-zinc-500">
            No quedó nada pendiente — todo publicado.
          </span>
        ) : (
          <div className="flex flex-col gap-2">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[#2A2A2E] p-3"
              >
                <div className="flex items-center gap-2">
                  <Badge color="zinc">Idea</Badge>
                  <span className="text-sm text-zinc-200">{idea.texto}</span>
                </div>
                <AccionesPendiente
                  idId={idea.id}
                  valor={decisiones[idea.id]}
                  onElegir={elegir}
                />
              </div>
            ))}
            {contenidos.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[#2A2A2E] p-3"
              >
                <div className="flex items-center gap-2">
                  <Badge color="sky">{c.estado}</Badge>
                  <span className="text-sm text-zinc-200">{c.titulo}</span>
                </div>
                <AccionesPendiente
                  idId={c.id}
                  valor={decisiones[c.id]}
                  onElegir={elegir}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[#2A2A2E] pt-4">
          <Button variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button onClick={cerrar} cargando={cerrando}>
            Cerrar semana y empezar la nueva
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

const AccionesPendiente: React.FC<{
  idId: string;
  valor?: Accion;
  onElegir: (id: string, accion: Accion) => void;
}> = ({ idId, valor, onElegir }) => (
  <div className="flex gap-1">
    <button
      onClick={() => onElegir(idId, "completar")}
      className={`rounded border px-2 py-1 text-[10px] font-bold uppercase ${valor === "completar" ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" : "border-zinc-800 text-zinc-400"}`}
    >
      Completado
    </button>
    <button
      onClick={() => onElegir(idId, "siguiente")}
      className={`rounded border px-2 py-1 text-[10px] font-bold uppercase ${!valor || valor === "siguiente" ? "border-sky-500 bg-sky-500/20 text-sky-400" : "border-zinc-800 text-zinc-400"}`}
    >
      Siguiente semana
    </button>
    <button
      onClick={() => onElegir(idId, "eliminar")}
      className={`rounded border px-2 py-1 text-[10px] font-bold uppercase ${valor === "eliminar" ? "border-red-500 bg-red-500/20 text-red-400" : "border-zinc-800 text-zinc-400"}`}
    >
      Eliminar
    </button>
  </div>
);
