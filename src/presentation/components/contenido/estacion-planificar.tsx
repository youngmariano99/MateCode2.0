"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Button } from "../button";
import { Dialog } from "../dialog";
import { Chips } from "../contacto-frio/piezas-cinta";
import { PasoIdeas } from "./paso-ideas";
import { PanelSemanaContenido } from "./panel-semana-contenido";
import { TablaPiezasSemana } from "./tabla-piezas-semana";
import { ImportarConIA } from "./importar-con-ia";
import { GestionarContenidoUseCase } from "../../../application/use-cases/contenido/gestionar-contenido.use-case";
import {
  estadoPasosPlanificacion,
  type EstadoPaso,
} from "../../../domain/entidades/contenido-semana.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";

const useCase = new GestionarContenidoUseCase();
type Paso = "ideas" | "piezas" | "guiones";
type Modo = "manual" | "ia";

const MARCA: Record<EstadoPaso, { icono: string; color: string }> = {
  hecho: {
    icono: "✓",
    color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  },
  en_curso: {
    icono: "●",
    color: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  },
  pendiente: {
    icono: "○",
    color: "border-[#2A2A2E] bg-[#18181B] text-zinc-500",
  },
};

/**
 * Estación ① PLANIFICAR: el ÚNICO lugar donde se arma la semana, en 3 pasos
 * en orden — ideas, piezas y días, guiones. Cada paso se puede hacer A MANO o
 * CON IA, pero las dos formas guardan en los mismos datos: se elige una (o se
 * combinan) y nunca se duplica. Arriba se ve siempre qué se hizo y qué falta.
 */
export const EstacionPlanificar: React.FC<{
  cicloId: string;
  irAGuion: () => void;
}> = ({ cicloId, irAGuion }) => {
  const hoy = obtenerDiaTareaHoy();
  const [paso, setPaso] = useState<Paso>("ideas");
  const [modo, setModo] = useState<Modo>("manual");
  const [limpiando, setLimpiando] = useState<"todo" | "devolver_ideas" | null>(
    null
  );
  const [mensaje, setMensaje] = useState("");

  const ciclo = useLiveQuery(() => db.ciclo_semanal.get(cicloId), [cicloId]);
  const ideas = useLiveQuery(() => db.idea_contenido.toArray()) ?? [];
  const contenidos = useLiveQuery(() => db.contenido.toArray()) ?? [];
  const estado = estadoPasosPlanificacion(ciclo, ideas, contenidos, hoy);
  const preview = useLiveQuery(
    () => (limpiando ? useCase.previsualizarLimpieza(cicloId) : undefined),
    [limpiando, cicloId]
  );

  const confirmarLimpieza = async () => {
    if (!limpiando) return;
    const res = await useCase.limpiarPlanificacion(cicloId, limpiando);
    setLimpiando(null);
    if (res.ok) {
      setMensaje(
        `Listo: se borraron ${res.valor!.piezas} pieza(s) y ${
          limpiando === "todo"
            ? `se eliminaron ${res.valor!.ideas} idea(s)`
            : `${res.valor!.ideas} idea(s) volvieron al backlog`
        }. Ya podés volver a planificar sin duplicados.`
      );
      setPaso("ideas");
    } else {
      setMensaje(res.error!.mensaje);
    }
  };

  const cambiarPaso = (p: Paso) => {
    setPaso(p);
    setModo("manual");
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Qué se hizo y qué falta */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-5">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {estado.pasos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => cambiarPaso(p.id)}
              className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all ${
                paso === p.id ? "ring-2 ring-emerald-500/50" : ""
              } ${MARCA[p.estado].color}`}
            >
              <span className="text-xs font-bold uppercase">
                {MARCA[p.estado].icono} Paso {i + 1} · {p.titulo}
              </span>
              <span className="text-xs text-zinc-300">{p.hecho}</span>
              {p.falta && (
                <span className="text-[11px] text-amber-300">
                  Falta: {p.falta}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-sm font-bold text-zinc-200">➔ {estado.siguiente}</p>
        <p className="text-xs text-zinc-500">
          En cada paso elegís <strong>a mano</strong> o <strong>con IA</strong>:
          las dos guardan en el mismo lugar, así que no hace falta hacer las
          dos. Si mezclás, la IA completa lo que ya existe en vez de duplicarlo.
        </p>
      </div>

      {/* Modo del paso */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
          Paso {["ideas", "piezas", "guiones"].indexOf(paso) + 1}:
        </span>
        {paso !== "guiones" && (
          <Chips
            valor={modo}
            onChange={setModo}
            opciones={[
              { valor: "manual", etiqueta: "A mano" },
              { valor: "ia", etiqueta: "Con IA" },
            ]}
          />
        )}
      </div>

      {paso === "ideas" && (
        <>
          <p className="text-xs text-zinc-500">
            Las ideas no usadas esta semana quedan en el backlog y las podés
            usar en otra semana.
          </p>
          {modo === "ia" && <ImportarConIA cicloId={cicloId} etapa="ideas" />}
          <PasoIdeas cicloId={cicloId} />
        </>
      )}

      {paso === "piezas" && (
        <>
          {estado.piezas > 0 && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
              Ya hay {estado.piezas} pieza(s) en esta semana. No hace falta
              crearlas de nuevo: ajustá las que hay, o importá el plan con IA
              (las completa, no las duplica). Si querés empezar de cero, usá
              «Limpiar» abajo.
            </p>
          )}
          {modo === "manual" ? (
            <PanelSemanaContenido cicloId={cicloId} />
          ) : (
            <>
              <ImportarConIA cicloId={cicloId} etapa="plan" />
              <TablaPiezasSemana cicloId={cicloId} />
            </>
          )}
        </>
      )}

      {paso === "guiones" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-5">
            <span className="text-sm font-bold text-zinc-200">
              {estado.piezasConGuion} de {estado.piezas} piezas con guion
            </span>
            <p className="text-xs text-zinc-500">
              Podés escribirlos uno por uno en la estación Guion (a mano), o
              pedirle a la IA los que falten y pegarlos acá.
            </p>
            <Button variant="outline" onClick={irAGuion} className="self-start">
              Ir a la estación Guion (escribir a mano)
            </Button>
          </div>
          <ImportarConIA cicloId={cicloId} etapa="guiones" />
          <TablaPiezasSemana cicloId={cicloId} />
        </div>
      )}

      {/* Limpieza */}
      <div className="flex flex-col gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
        <span className="text-xs font-bold tracking-wider text-red-300 uppercase">
          Empezar de nuevo esta semana
        </span>
        <p className="text-xs text-zinc-500">
          Borra las piezas de esta semana (lo ya publicado nunca se toca) para
          volver a planificar sin duplicados.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setLimpiando("devolver_ideas")}
          >
            Limpiar y devolver las ideas al backlog
          </Button>
          <Button variant="destructive" onClick={() => setLimpiando("todo")}>
            Limpiar todo (piezas e ideas)
          </Button>
        </div>
        {mensaje && <p className="text-xs text-emerald-400">{mensaje}</p>}
      </div>

      <Dialog
        abierto={!!limpiando}
        onClose={() => setLimpiando(null)}
        titulo={
          limpiando === "todo"
            ? "Limpiar todo"
            : "Limpiar y devolver las ideas al backlog"
        }
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4">
          {preview ? (
            <ul className="flex flex-col gap-1 text-sm text-zinc-300">
              <li>
                • Se borran <strong>{preview.piezasABorrar}</strong> pieza(s) de
                esta semana.
              </li>
              <li>
                •{" "}
                {limpiando === "todo" ? (
                  <>
                    Se <strong>eliminan</strong>{" "}
                    <strong>{preview.ideasDeLaSemana}</strong> idea(s) elegidas
                    para esta semana.
                  </>
                ) : (
                  <>
                    <strong>{preview.ideasDeLaSemana}</strong> idea(s) de esta
                    semana vuelven al backlog para usarlas en otra.
                  </>
                )}
              </li>
              {preview.publicadas > 0 && (
                <li className="text-emerald-400">
                  • Las {preview.publicadas} pieza(s) ya publicada(s) no se
                  tocan
                  {preview.ideasUsadasEnPublicadas > 0
                    ? ` (ni sus ${preview.ideasUsadasEnPublicadas} idea(s))`
                    : ""}
                  .
                </li>
              )}
              <li className="text-xs text-zinc-500">
                Esto no se puede deshacer.
              </li>
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Calculando…</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setLimpiando(null)}
              className="text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
            >
              Cancelar
            </button>
            <Button
              variant={limpiando === "todo" ? "destructive" : "primary"}
              onClick={confirmarLimpieza}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
