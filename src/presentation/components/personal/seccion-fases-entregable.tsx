"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { Icono } from "../icons";
import { Button } from "../button";
import { useToast } from "../../hooks/useToast";
import { GestionarFasesUseCase } from "../../../application/use-cases/personal/gestionar-fases.use-case";
import { ImportarArbolPersonalUseCase } from "../../../application/use-cases/personal/importar-arbol-personal.use-case";
import { calcularNivelLogro } from "../../../domain/entidades/objetivo-cuantificable.entity";
import type { Entregable } from "../../../domain/entidades/entregable.entity";
import type { FasePersonal } from "../../../domain/entidades/fase-personal.entity";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";
import { generarPromptFases } from "../../../domain/prompts/generar-prompt-jerarquia-personal";
import { GenerarFasesModal } from "./generar-fases-modal";
import { CerrarFaseModal } from "./cerrar-fase-modal";
import { AjustarFaseModal } from "./ajustar-fase-modal";
import { RepartirEnDiasModal } from "./asistente-distribuir";
import { ModalImportarJson } from "../contenido/modal-importar-json";
import { resumenFasesBajoEntregable } from "./resumen-import-jerarquia";

const fasesUseCase = new GestionarFasesUseCase();
const importarUseCase = new ImportarArbolPersonalUseCase();
const SIN_FASES: FasePersonal[] = [];

const COLOR_NIVEL: Record<string, string> = {
  ideal: "text-emerald-400",
  aceptable: "text-sky-400",
  mejorable: "text-amber-400",
  bajo: "text-red-400",
};

const FormularioNuevaFase: React.FC<{
  entregableId: string;
  ordenSugerido: number;
  unidad: string;
}> = ({ entregableId, ordenSugerido, unidad }) => {
  const { mostrarToast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [diaInicio, setDiaInicio] = useState(obtenerDiaTareaHoy());
  const [diaLimite, setDiaLimite] = useState(obtenerDiaTareaHoy());
  const [cantidad, setCantidad] = useState("");
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    if (!titulo.trim() || !cantidad) return;
    setGuardando(true);
    const res = await fasesUseCase.crearFase({
      entregableId,
      titulo,
      orden: ordenSugerido,
      diaInicio,
      diaLimite,
      cantidadObjetivo: Number(cantidad),
      unidad,
    });
    setGuardando(false);
    if (res.ok) {
      setTitulo("");
      setCantidad("");
      setAbierto(false);
    } else {
      mostrarToast(res.error!.mensaje, "error");
    }
  };

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#2A2A2E] p-2 text-[11px] font-bold text-zinc-500 uppercase hover:border-zinc-700 hover:text-zinc-300"
      >
        <Icono.Plus className="h-3 w-3" />
        Nueva fase
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[#2A2A2E] bg-[#0D0D0F] p-2.5">
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título (ej. Semana 1)"
        className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
      />
      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          value={diaInicio}
          onChange={(e) => setDiaInicio(e.target.value)}
          className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        <input
          type="date"
          value={diaLimite}
          onChange={(e) => setDiaLimite(e.target.value)}
          className="rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
        <input
          type="number"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder={`Meta (${unidad})`}
          className="w-28 rounded-lg border border-[#2A2A2E] bg-[#18181B] px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/40"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setAbierto(false)}
          className="text-xs font-bold text-zinc-500 uppercase hover:text-zinc-300"
        >
          Cancelar
        </button>
        <Button
          onClick={crear}
          cargando={guardando}
          disabled={!titulo.trim() || !cantidad}
          className="px-3 py-1.5 text-xs"
        >
          Crear
        </Button>
      </div>
    </div>
  );
};

/**
 * Sección "Fases" dentro del detalle de un Entregable — checkpoints
 * periódicos con meta propia (ver Sprint 21). Vive acá y no como pantalla
 * aparte porque una Fase no tiene sentido sin su Entregable padre.
 */
export const SeccionFasesEntregable: React.FC<{ entregable: Entregable }> = ({
  entregable,
}) => {
  const { mostrarToast } = useToast();
  const [modalGenerarAbierto, setModalGenerarAbierto] = useState(false);
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false);
  const [faseACerrar, setFaseACerrar] = useState<FasePersonal | null>(null);
  const [faseAAjustar, setFaseAAjustar] = useState<FasePersonal | null>(null);
  const [faseARepartir, setFaseARepartir] = useState<FasePersonal | null>(null);
  const hoy = obtenerDiaTareaHoy();

  const copiarPrompt = () => {
    const restante =
      entregable.cantidadObjetivo !== undefined
        ? `vence ${entregable.diaLimite}, restan ${Math.max(0, entregable.cantidadObjetivo - entregable.progresoActual)} de ${entregable.cantidadObjetivo} ${entregable.unidad}`
        : `vence ${entregable.diaLimite}`;
    const prompt = generarPromptFases(entregable.titulo, restante);
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt copiado al portapapeles.", "exito");
  };

  const importar = async (items: unknown[]) => {
    const res = await importarUseCase.importarFases(items);
    if (!res.ok) throw new Error(res.error!.mensaje);
    mostrarToast(res.valor, "exito");
  };

  const fases =
    useLiveQuery(
      () =>
        db.fase_personal
          .where("entregableId")
          .equals(entregable.id)
          .sortBy("orden"),
      [entregable.id]
    ) || SIN_FASES;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-[#18181B] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold tracking-wider text-zinc-300 uppercase">
            Recorrido Proyectado en Fases
          </h4>
          {fases.length > 0 && (
            <span className="rounded-full border border-[#2A2A2E] bg-[#0D0D0F] px-2 py-0.5 text-[10px] font-bold text-zinc-400">
              {fases.filter((f) => f.estado === "cerrada").length}/
              {fases.length} escalones
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setModalGenerarAbierto(true)}
            icono={<Icono.Sparkles className="h-3 w-3" />}
          >
            Armar progresión (ej. 2/día → 4/día)
          </Button>
          <Button variant="outline" size="xs" onClick={copiarPrompt}>
            Prompt IA
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setModalImportarAbierto(true)}
          >
            Pegar plan
          </Button>
        </div>
      </div>
      {fases.length === 0 && (
        <p className="text-xs text-zinc-500">
          Sin escalones todavía — usá &quot;Armar progresión&quot; para dejar
          proyectado tu recorrido mes a mes o semana a semana (ej. empezar con 2
          por día e ir aumentando).
        </p>
      )}
      <div className="flex flex-col gap-2">
        {fases.map((f, idx) => {
          const nivel = calcularNivelLogro(
            f.cantidadObjetivo,
            f.progresoActual,
            f.bandaAceptable,
            f.bandaMejorable
          );
          const vencidaSinCerrar = f.estado === "abierta" && f.diaLimite < hoy;
          const esActivaHoy =
            f.estado === "abierta" && f.diaInicio <= hoy && f.diaLimite >= hoy;
          const esProyectadaFutura =
            f.estado === "abierta" && f.diaInicio > hoy;
          const faseAnterior = idx > 0 ? fases[idx - 1] : undefined;
          const pct =
            f.cantidadObjetivo > 0
              ? Math.min(
                  100,
                  Math.round((f.progresoActual / f.cantidadObjetivo) * 100)
                )
              : 0;

          const ajustarRapidoCantidad = async (nuevaCantidad: number) => {
            if (nuevaCantidad <= 0) return;
            const res = await fasesUseCase.ajustarFase({
              id: f.id,
              cantidadObjetivo: nuevaCantidad,
            });
            if (!res.ok) mostrarToast(res.error!.mensaje, "error");
            else
              mostrarToast(
                `Meta de "${f.titulo}" ajustada a ${nuevaCantidad} ${f.unidad}.`,
                "exito"
              );
          };

          return (
            <div
              key={f.id}
              className={`flex flex-col gap-2 rounded-xl border p-3 transition-all ${
                f.estado === "cerrada"
                  ? "border-[#2A2A2E] bg-[#0D0D0F]/50 opacity-65"
                  : vencidaSinCerrar
                    ? "border-amber-500/40 bg-amber-500/5"
                    : esActivaHoy
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-dashed border-[#2A2A2E] bg-[#0D0D0F]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-[#2A2A2E] bg-[#18181B] px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-400">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-bold text-zinc-100">
                    {f.titulo}
                  </span>
                  {esActivaHoy && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase">
                      En juego ahora
                    </span>
                  )}
                  {esProyectadaFutura && (
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400 uppercase">
                      Proyectada (Futuro)
                    </span>
                  )}
                  {vencidaSinCerrar && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase">
                      Terminó · Elegir cómo seguir
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-zinc-500">
                  {f.diaInicio} → {f.diaLimite}
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
                <div
                  className={`h-full rounded-full transition-all ${
                    esProyectadaFutura
                      ? "bg-sky-500/50"
                      : vencidaSinCerrar
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-300">
                    {f.progresoActual} / {f.cantidadObjetivo} {f.unidad} ({pct}
                    %)
                    {nivel && (
                      <span
                        className={`ml-1.5 font-bold ${COLOR_NIVEL[nivel]}`}
                      >
                        · {nivel}
                      </span>
                    )}
                  </span>

                  {/* Controles rápidos de 1 clic para ajustar cantidad sin abrir modal */}
                  {f.estado === "abierta" && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          void ajustarRapidoCantidad(
                            Math.max(1, f.cantidadObjetivo - 1)
                          )
                        }
                        title="Restar 1 a la meta de esta fase"
                        className="rounded border border-[#2A2A2E] bg-[#18181B] px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void ajustarRapidoCantidad(f.cantidadObjetivo + 1)
                        }
                        title="Sumar 1 a la meta de esta fase"
                        className="rounded border border-[#2A2A2E] bg-[#18181B] px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      >
                        +1
                      </button>
                      {faseAnterior &&
                        faseAnterior.cantidadObjetivo !==
                          f.cantidadObjetivo && (
                          <button
                            type="button"
                            onClick={() =>
                              void ajustarRapidoCantidad(
                                faseAnterior.cantidadObjetivo
                              )
                            }
                            title="Mantener el mismo ritmo que el escalón anterior en vez de cambiar"
                            className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 hover:bg-amber-500/20"
                          >
                            Mantener ritmo anterior (
                            {faseAnterior.cantidadObjetivo} {f.unidad})
                          </button>
                        )}
                    </div>
                  )}
                </div>

                {f.estado === "abierta" ? (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setFaseARepartir(f)}
                      title="Bajar actividades diarias al calendario para esta fase"
                      className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
                    >
                      Bajar a calendario
                    </button>
                    <button
                      onClick={() => setFaseAAjustar(f)}
                      title="Cambiar meta o fechas"
                      className="rounded border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
                    >
                      Editar meta / fecha
                    </button>
                    <button
                      onClick={() => setFaseACerrar(f)}
                      className="rounded border border-zinc-800 px-2.5 py-1 text-[10px] font-bold text-zinc-400 uppercase hover:border-zinc-600 hover:text-zinc-200"
                    >
                      Cerrar escalón
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-zinc-500">
                    Cerrada — {f.cierre?.decision}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <FormularioNuevaFase
        entregableId={entregable.id}
        ordenSugerido={fases.length}
        unidad={entregable.unidad || "unidades"}
      />

      <GenerarFasesModal
        abierto={modalGenerarAbierto}
        onCerrar={() => setModalGenerarAbierto(false)}
        entregableId={entregable.id}
        tituloEntregable={entregable.titulo}
        unidad={entregable.unidad || "unidades"}
        diaInicioSugerido={entregable.diaInicio}
        diaLimiteSugerido={entregable.diaLimite}
        cantidadSugerida={entregable.cantidadObjetivo ?? 0}
        onGenerado={() => {}}
      />
      {faseARepartir && (
        <RepartirEnDiasModal
          abierto
          onCerrar={() => setFaseARepartir(null)}
          entregable={entregable}
          fase={faseARepartir}
        />
      )}
      {faseAAjustar && (
        <AjustarFaseModal
          key={faseAAjustar.id}
          abierto
          fase={faseAAjustar}
          onCerrar={() => setFaseAAjustar(null)}
        />
      )}
      {faseACerrar && (
        <CerrarFaseModal
          abierto
          fase={faseACerrar}
          onCerrar={() => setFaseACerrar(null)}
          onCerrado={() => setFaseACerrar(null)}
        />
      )}
      <ModalImportarJson
        abierto={modalImportarAbierto}
        onCerrar={() => setModalImportarAbierto(false)}
        titulo="Importar fase(s) desde JSON"
        renderResumen={resumenFasesBajoEntregable}
        plantillaEjemplo={JSON.stringify(
          {
            entregableTitulo: entregable.titulo,
            fasesNuevas: [
              {
                titulo: "...",
                orden: 0,
                diaInicio: "YYYY-MM-DD",
                diaLimite: "YYYY-MM-DD",
                cantidadObjetivo: 10,
                unidad: entregable.unidad || "unidades",
              },
            ],
          },
          null,
          2
        )}
        onImportar={importar}
      />
    </div>
  );
};
