"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Icono } from "../../icons";
import { Button } from "../../button";
import { useToast } from "../../../hooks/useToast";
import {
  GestionarProgresionBloqueUseCase,
  type AlcanceAjuste,
} from "../../../../application/use-cases/personal/gestionar-progresion-bloque.use-case";
import { GestionarRegistroActividadUseCase } from "../../../../application/use-cases/personal/gestionar-registro-actividad.use-case";
import { planesDelBloque } from "../../../../application/servicios/armar-contexto-entrenamiento.service";
import {
  cantidadSemanasBloque,
  indiceSemanaDe,
  pasosDelBloque,
} from "../../../../domain/entidades/progresion-entrenamiento.entity";
import { obtenerDiaTareaHoy } from "../../../../domain/entidades/personal.entity";
import { EditorProgresion } from "./editor-progresion";
import { ModalReestructurar } from "./modal-reestructurar";

const progresion = new GestionarProgresionBloqueUseCase();
const registro = new GestionarRegistroActividadUseCase();

const fecha = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Resumen de la semana del bloque y decisiones sobre lo que sigue: qué tocaba,
 * qué se hizo y qué no, y qué hago — repetir la semana (y extender el bloque),
 * avanzar porque con lo hecho alcanza, adelantar o frenar la progresión de lo
 * que falta (en este bloque o también en los siguientes), acortar o alargar
 * el bloque, editar la progresión de una rutina o reestructurar todo con IA.
 * Todo queda registrado con su nota, aunque después el bloque cambie.
 */
export const PanelResumenSemanal: React.FC = () => {
  const { mostrarToast } = useToast();
  const hoy = obtenerDiaTareaHoy();

  const bloques = (useLiveQuery(() => db.bloque_entrenamiento.toArray()) ?? [])
    .filter((b) => !b.eliminado && b.estado !== "cerrado")
    .sort((a, b) => a.diaInicio.localeCompare(b.diaInicio));
  const nombreRutina = new Map(
    (useLiveQuery(() => db.plantilla_rutina.toArray()) ?? []).map((p) => [
      p.id,
      p.nombre,
    ])
  );
  const nRegistros = useLiveQuery(() => db.registro_actividad.count());

  const [bloqueElegido, setBloqueElegido] = useState<string | null>(null);
  const [indiceElegido, setIndiceElegido] = useState<number | null>(null);
  const [nota, setNota] = useState("");
  const [alcance, setAlcance] = useState<AlcanceAjuste>("bloque");
  const [editandoRutina, setEditandoRutina] = useState<string | null>(null);
  const [reestructurando, setReestructurando] = useState(false);
  const [moviendo, setMoviendo] = useState<string | null>(null);

  const bloque =
    bloques.find((b) => b.id === bloqueElegido) ??
    bloques.find((b) => b.estado === "activo") ??
    bloques[0];
  const n = bloque ? cantidadSemanasBloque(bloque) : 0;
  const indiceHoy = bloque
    ? hoy < bloque.diaInicio
      ? 0
      : hoy > bloque.diaFin
        ? n - 1
        : indiceSemanaDe(bloque, hoy)
    : 0;
  const indice = Math.min(indiceElegido ?? indiceHoy, Math.max(n - 1, 0));

  const resumen = useLiveQuery(async () => {
    if (!bloque) return undefined;
    void nRegistros;
    const r = await progresion.resumenSemana(bloque.id, indice);
    return r.ok ? r.valor : undefined;
  }, [bloque?.id, bloque?.actualizadoEn, indice, nRegistros]);

  const decisiones = useLiveQuery(
    async () => (bloque ? progresion.decisiones(bloque.id) : []),
    [bloque?.id, bloque?.actualizadoEn]
  );
  const planes = useLiveQuery(
    async () => (bloque ? planesDelBloque(bloque) : []),
    [bloque?.id, bloque?.actualizadoEn]
  );

  if (bloques.length === 0 || !bloque) {
    return (
      <div className="rounded-2xl border border-dashed border-[#2A2A2E] p-4 text-center text-sm text-zinc-600">
        Todavía no hay bloques vigentes: cuando armes uno, acá vas a ver el
        resumen de cada semana y decidir qué sigue.
      </div>
    );
  }

  const ejecutar = async (
    accion: () => Promise<{ ok: boolean; error: { mensaje: string } | null }>,
    ok: string
  ) => {
    const res = await accion();
    if (!res.ok) return mostrarToast(res.error!.mensaje, "error");
    mostrarToast(ok, "exito");
    setNota("");
    setIndiceElegido(null);
  };

  const semanaPasada = resumen ? resumen.hasta < hoy : false;
  const pasos = pasosDelBloque(bloque);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icono.TrendingUp className="h-4 w-4 text-zinc-500" />
          <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Resumen semanal y decisiones
          </h3>
        </div>
        <Button
          variant="outline"
          onClick={() => setReestructurando(true)}
          icono={<Icono.Sparkles className="h-4 w-4" />}
        >
          Reestructurar con IA
        </Button>
      </div>

      {bloques.length > 1 && (
        <select
          value={bloque.id}
          onChange={(e) => {
            setBloqueElegido(e.target.value);
            setIndiceElegido(null);
          }}
          className="self-start rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-xs text-zinc-200"
        >
          {bloques.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre} ({b.estado})
            </option>
          ))}
        </select>
      )}

      {/* Navegación por semana */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIndiceElegido(Math.max(indice - 1, 0))}
          className="rounded-lg border border-[#2A2A2E] p-1.5 text-zinc-500 hover:text-zinc-300"
        >
          <Icono.ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold text-zinc-200">
          Semana {indice + 1} de {n} · paso {pasos[indice]}
        </span>
        <button
          onClick={() => setIndiceElegido(Math.min(indice + 1, n - 1))}
          className="rounded-lg border border-[#2A2A2E] p-1.5 text-zinc-500 hover:text-zinc-300"
        >
          <Icono.ChevronRight className="h-4 w-4" />
        </button>
        {resumen && (
          <span className="text-xs text-zinc-500">
            {resumen.desde} → {resumen.hasta}
            {indice === indiceHoy &&
              hoy >= bloque.diaInicio &&
              hoy <= bloque.diaFin &&
              " · esta semana"}
          </span>
        )}
      </div>

      {resumen && (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="flex min-w-24 flex-1 flex-col rounded-xl bg-[#0D0D0F] p-3">
              <span
                className={`text-2xl font-extrabold ${resumen.cumplimiento >= 75 ? "text-emerald-400" : resumen.cumplimiento >= 40 ? "text-amber-400" : "text-red-400"}`}
              >
                {resumen.hechas}/{resumen.planificadas}
              </span>
              <span className="text-[11px] text-zinc-500">
                sesiones hechas ({resumen.cumplimiento}%)
              </span>
            </div>
            {resumen.logro !== undefined && (
              <div className="flex min-w-24 flex-1 flex-col rounded-xl bg-[#0D0D0F] p-3">
                <span className="text-2xl font-extrabold text-zinc-100">
                  {resumen.logro}%
                </span>
                <span className="text-[11px] text-zinc-500">
                  de lo planificado dentro de las sesiones hechas
                </span>
              </div>
            )}
            {resumen.extras > 0 && (
              <div className="flex min-w-24 flex-1 flex-col rounded-xl bg-[#0D0D0F] p-3">
                <span className="text-2xl font-extrabold text-sky-400">
                  +{resumen.extras}
                </span>
                <span className="text-[11px] text-zinc-500">
                  sesiones extra (otras rutinas)
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            {resumen.filas.map((f) => (
              <div
                key={f.plantillaId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#0D0D0F] p-3"
              >
                <span className="text-sm text-zinc-200">
                  {nombreRutina.get(f.plantillaId) ?? f.plantillaId}{" "}
                  <span className="text-xs text-zinc-500">
                    {f.hechas}/{f.planificadas}
                  </span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {f.pendientes.map((d) => (
                    <span
                      key={d}
                      className="flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/5 px-1.5 py-0.5 text-[10px] text-amber-300"
                    >
                      falta {d}
                      <button
                        onClick={() =>
                          void ejecutar(
                            () =>
                              registro.registrarComoPlanificado(
                                f.plantillaId,
                                hoy,
                                bloque.id
                              ),
                            "Sesión registrada hoy."
                          )
                        }
                        className="font-bold text-emerald-400 hover:underline"
                        title="La hice hoy"
                      >
                        hecha hoy
                      </button>
                      <button
                        onClick={() =>
                          setMoviendo(
                            moviendo === `${f.plantillaId}_${d}`
                              ? null
                              : `${f.plantillaId}_${d}`
                          )
                        }
                        className="font-bold text-sky-400 hover:underline"
                      >
                        mover
                      </button>
                      {moviendo === `${f.plantillaId}_${d}` && (
                        <input
                          type="date"
                          onChange={(e) => {
                            if (!e.target.value) return;
                            setMoviendo(null);
                            void ejecutar(
                              () =>
                                progresion.moverRutina(
                                  bloque.id,
                                  f.plantillaId,
                                  d,
                                  e.target.value
                                ),
                              `Movida al ${e.target.value}.`
                            );
                          }}
                          className="rounded border border-[#2A2A2E] bg-[#111113] px-1 text-[10px] text-zinc-200"
                        />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {resumen.planificadas === 0 && (
              <span className="text-xs text-zinc-600">
                No había rutinas planificadas esta semana.
              </span>
            )}
          </div>

          {/* Decisiones */}
          <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2E] p-3">
            <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
              ¿Qué hago con esta semana
              {semanaPasada ? "" : " (todavía no terminó)"}?
            </span>
            {resumen.nadaHecho && semanaPasada && (
              <p className="text-xs text-amber-300">
                No se hizo ninguna sesión: si no la repetís, la progresión
                seguiría como si la hubieras hecho.
              </p>
            )}
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              placeholder="Por qué (opcional): queda registrado en el historial"
              className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant={
                  resumen.nadaHecho && semanaPasada ? "primary" : "outline"
                }
                onClick={() =>
                  void ejecutar(
                    () =>
                      progresion.repetirSemana(
                        bloque.id,
                        indice,
                        nota || undefined
                      ),
                    "Semana repetida: el bloque se extendió una semana."
                  )
                }
              >
                Repetir esta semana (+1 semana al bloque)
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void ejecutar(
                    () =>
                      progresion.avanzarSemana(
                        bloque.id,
                        indice,
                        nota || undefined
                      ),
                    "Seguimos a la semana siguiente."
                  )
                }
              >
                Con lo hecho alcanza: avanzar
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (
                    window.confirm(
                      "¿Sacar la última semana del bloque? Los bloques siguientes se corren una semana hacia atrás."
                    )
                  ) {
                    void ejecutar(
                      () =>
                        progresion.eliminarUltimaSemana(
                          bloque.id,
                          nota || undefined
                        ),
                      "Última semana eliminada."
                    );
                  }
                }}
              >
                Eliminar la última semana
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  void ejecutar(
                    () =>
                      progresion.extenderBloque(bloque.id, nota || undefined),
                    "Se agregó una semana al bloque."
                  )
                }
              >
                Agregar una semana
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[#2A2A2E] pt-3">
              <span className="text-xs text-zinc-500">
                Desde la semana siguiente:
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  void ejecutar(
                    () =>
                      progresion.ajustarRitmo(
                        bloque.id,
                        indice + 1,
                        1,
                        alcance,
                        nota || undefined
                      ),
                    "Progresión adelantada."
                  )
                }
              >
                Fue muy fácil: progresar más rápido
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void ejecutar(
                    () =>
                      progresion.ajustarRitmo(
                        bloque.id,
                        indice + 1,
                        -1,
                        alcance,
                        nota || undefined
                      ),
                    "Progresión frenada."
                  )
                }
              >
                Fue mucho: progresar más lento
              </Button>
              <select
                value={alcance}
                onChange={(e) => setAlcance(e.target.value as AlcanceAjuste)}
                className="rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-1.5 text-xs text-zinc-300"
              >
                <option value="bloque">Solo este bloque</option>
                <option value="este_y_siguientes">
                  Este y los bloques siguientes
                </option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* Plan semana a semana */}
      {planes && planes.length > 0 && (
        <details className="rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
          <summary className="cursor-pointer text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            Plan y progresión de cada rutina
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            {planes.map((p) => (
              <div key={p.plantillaId} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-zinc-200">
                    {p.nombre}
                  </span>
                  <button
                    onClick={() => setEditandoRutina(p.plantillaId)}
                    className="text-[11px] font-bold text-emerald-400 uppercase hover:underline"
                  >
                    Editar progresión
                  </button>
                </div>
                {p.filas.map((f) => (
                  <span key={f.paso} className="text-xs text-zinc-400">
                    <span className="text-zinc-600">
                      Paso {f.paso}
                      {f.esDescarga ? " (descarga)" : ""}:
                    </span>{" "}
                    {f.texto}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Historial de decisiones */}
      {decisiones && decisiones.length > 0 && (
        <details className="rounded-xl border border-[#2A2A2E] bg-[#0D0D0F] p-3">
          <summary className="cursor-pointer text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            Decisiones registradas ({decisiones.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {decisiones.map((d) => (
              <li key={d.id} className="text-xs text-zinc-400">
                <span className="text-zinc-600">{fecha(d.creadoEn)}</span>{" "}
                {d.descripcion ?? d.accion}
                {d.nota && <span className="text-zinc-500"> — “{d.nota}”</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {editandoRutina && (
        <EditorProgresion
          bloque={bloque}
          plantillaId={editandoRutina}
          abierto
          onCerrar={() => setEditandoRutina(null)}
        />
      )}
      <ModalReestructurar
        abierto={reestructurando}
        onCerrar={() => setReestructurando(false)}
      />
    </div>
  );
};
