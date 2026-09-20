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
        <h4 className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
          Fases
        </h4>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            onClick={() => setModalGenerarAbierto(true)}
            className="px-2.5 py-1 text-[11px]"
            icono={<Icono.Sparkles className="h-3 w-3" />}
          >
            Generar automáticamente
          </Button>
          <Button
            variant="outline"
            onClick={copiarPrompt}
            className="px-2.5 py-1 text-[11px]"
          >
            Prompt IA
          </Button>
          <Button
            variant="outline"
            onClick={() => setModalImportarAbierto(true)}
            className="px-2.5 py-1 text-[11px]"
          >
            Pegar plan
          </Button>
        </div>
      </div>
      {fases.length === 0 && (
        <p className="text-xs text-zinc-600">
          Sin fases todavía — armá checkpoints (semanales, mensuales) con su
          propia meta para poder revisar el avance por partes.
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        {fases.map((f) => {
          const nivel = calcularNivelLogro(
            f.cantidadObjetivo,
            f.progresoActual,
            f.bandaAceptable,
            f.bandaMejorable
          );
          const vencidaSinCerrar = f.estado === "abierta" && f.diaLimite < hoy;
          return (
            <div
              key={f.id}
              className={`flex flex-col gap-1 rounded-lg border p-2 ${
                f.estado === "cerrada"
                  ? "border-[#2A2A2E] opacity-60"
                  : vencidaSinCerrar
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-[#2A2A2E]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-200">
                  {f.titulo}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {f.diaInicio} → {f.diaLimite}
                </span>
              </div>
              {f.estado === "abierta" && f.progresoActual === 0 && (
                <span className="text-[10px] text-zinc-600">
                  El avance de esta fase se suma solo de las Actividades de este
                  entregable con fecha entre {f.diaInicio} y {f.diaLimite}. Si
                  el avance se carga en otro lado (objetivo, hábito), acá no se
                  ve.
                </span>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">
                  {f.progresoActual}/{f.cantidadObjetivo} {f.unidad}
                  {nivel && (
                    <span className={`ml-1.5 font-bold ${COLOR_NIVEL[nivel]}`}>
                      {nivel}
                    </span>
                  )}
                </span>
                {f.estado === "abierta" ? (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setFaseAAjustar(f)}
                      title="Cambiar meta o fecha sin cerrar la fase"
                      className="rounded border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
                    >
                      Ajustar
                    </button>
                    <button
                      onClick={() => setFaseACerrar(f)}
                      className="rounded border border-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-400 uppercase hover:border-zinc-600 hover:text-zinc-200"
                    >
                      Cerrar fase
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-zinc-600">
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
