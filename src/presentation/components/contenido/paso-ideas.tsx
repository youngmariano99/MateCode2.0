"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Input } from "../input";
import { Button } from "../button";
import { Chips } from "../contacto-frio/piezas-cinta";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";

const useCase = new GestionarContenidoUseCase();
type Filtro = "semana" | "backlog" | "descartadas" | "todas";

/**
 * Paso 1 de la planificación: TODAS las ideas en un solo lugar, con su estado.
 * Las de esta semana, las del backlog (sirven para cualquier otra semana) y
 * las descartadas. Nada queda escondido: una idea elegida por IA aparece acá
 * igual que una cargada a mano.
 */
export const PasoIdeas: React.FC<{ cicloId: string }> = ({ cicloId }) => {
  const [filtro, setFiltro] = useState<Filtro>("semana");
  const [texto, setTexto] = useState("");
  const [dolor, setDolor] = useState("");
  const [usarYa, setUsarYa] = useState(true);

  const ideas = useLiveQuery(() => db.idea_contenido.toArray()) ?? [];
  const piezas =
    useLiveQuery(
      () => db.contenido.where("cicloId").equals(cicloId).toArray(),
      [cicloId]
    ) ?? [];
  const tituloDePieza = new Map(
    piezas.filter((p) => p.ideaId).map((p) => [p.ideaId!, p.titulo])
  );

  const deLaSemana = ideas.filter(
    (i) => i.estado === "Seleccionada" && i.cicloId === cicloId
  );
  const backlog = ideas.filter((i) => i.estado === "Backlog");
  const descartadas = ideas.filter((i) => i.estado === "Descartada");
  const visibles =
    filtro === "semana"
      ? deLaSemana
      : filtro === "backlog"
        ? backlog
        : filtro === "descartadas"
          ? descartadas
          : ideas;

  const agregar = async () => {
    if (!texto.trim()) return;
    const res = await useCase.crearIdea({ texto, dolorSemana: dolor });
    if (res.ok) {
      if (usarYa) await useCase.usarIdeaEstaSemana(res.valor!, cicloId);
      setTexto("");
      setDolor("");
      setFiltro(usarYa ? "semana" : "backlog");
    }
  };

  const accion = "text-[11px] font-bold uppercase hover:underline";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-5">
        <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
          Cargar una idea a mano
        </span>
        <div className="flex flex-wrap gap-2">
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Idea de contenido..."
            className="min-w-56 flex-1"
          />
          <Input
            value={dolor}
            onChange={(e) => setDolor(e.target.value)}
            placeholder="Dolor que resuelve (opcional)"
            className="w-64"
          />
          <Button onClick={agregar} disabled={!texto.trim()}>
            Agregar
          </Button>
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={usarYa}
            onChange={(e) => setUsarYa(e.target.checked)}
          />
          Usarla en esta semana (si no, queda en el backlog para otra semana)
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-5">
        <Chips
          valor={filtro}
          onChange={setFiltro}
          opciones={[
            { valor: "semana", etiqueta: `Esta semana (${deLaSemana.length})` },
            { valor: "backlog", etiqueta: `Backlog (${backlog.length})` },
            {
              valor: "descartadas",
              etiqueta: `Descartadas (${descartadas.length})`,
            },
            { valor: "todas", etiqueta: `Todas (${ideas.length})` },
          ]}
        />
        {visibles.length === 0 && (
          <p className="text-sm text-zinc-600">
            {filtro === "semana"
              ? "Todavía no elegiste ideas para esta semana. Elegí algunas del backlog, cargá nuevas o pedilas con IA."
              : "No hay ideas en esta lista."}
          </p>
        )}
        {visibles.map((i) => {
          const usadaEn = tituloDePieza.get(i.id);
          const esDeEstaSemana =
            i.estado === "Seleccionada" && i.cicloId === cicloId;
          return (
            <div
              key={i.id}
              className="flex flex-col gap-1 rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-zinc-200">{i.texto}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    esDeEstaSemana
                      ? "bg-emerald-500/15 text-emerald-400"
                      : i.estado === "Seleccionada"
                        ? "bg-sky-500/15 text-sky-400"
                        : i.estado === "Backlog"
                          ? "bg-zinc-500/15 text-zinc-400"
                          : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {esDeEstaSemana
                    ? "Esta semana"
                    : i.estado === "Seleccionada"
                      ? "Otra semana"
                      : i.estado}
                </span>
                {esDeEstaSemana && (
                  <span
                    className={`text-[10px] ${usadaEn ? "text-emerald-400" : "text-amber-400"}`}
                  >
                    {usadaEn ? `Usada en «${usadaEn}»` : "Sin usar todavía"}
                  </span>
                )}
              </div>
              {i.dolorSemana && (
                <span className="text-xs text-zinc-500">
                  Dolor: {i.dolorSemana}
                </span>
              )}
              <div className="flex flex-wrap gap-3">
                {(i.estado === "Backlog" || i.estado === "Descartada") && (
                  <button
                    onClick={() =>
                      void useCase.usarIdeaEstaSemana(i.id, cicloId)
                    }
                    className={`${accion} text-emerald-400`}
                  >
                    Usar esta semana
                  </button>
                )}
                {i.estado === "Seleccionada" && (
                  <button
                    onClick={() => void useCase.devolverIdeaAlBacklog(i.id)}
                    className={`${accion} text-sky-400`}
                  >
                    Devolver al backlog
                  </button>
                )}
                {i.estado !== "Descartada" && (
                  <button
                    onClick={() => void useCase.descartarIdea(i.id)}
                    className={`${accion} text-zinc-500`}
                  >
                    Descartar
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm("¿Eliminar esta idea para siempre?"))
                      void useCase.eliminarIdea(i.id);
                  }}
                  className={`${accion} text-zinc-600 hover:text-red-400`}
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
