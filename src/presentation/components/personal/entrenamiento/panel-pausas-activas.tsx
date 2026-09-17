"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";
import { Button } from "../../button";
import { Icono } from "../../icons";
import { ModalImportarJson } from "../../contenido/modal-importar-json";
import { useToast } from "../../../hooks/useToast";
import { ImportarBloqueEntrenamientoUseCase } from "../../../../application/use-cases/personal/importar-bloque-entrenamiento.use-case";
import { GestionarRegistroActividadUseCase } from "../../../../application/use-cases/personal/gestionar-registro-actividad.use-case";
import { generarPromptPausasActivas } from "../../../../domain/prompts/generar-prompt-entrenamiento";
import { resumenPausasActivas } from "./resumen-import-entrenamiento";
import type { PlantillaRutina } from "../../../../domain/entidades/rutina.entity";
import {
  obtenerDiaTareaHoy,
  sumarDias,
} from "../../../../domain/entidades/personal.entity";
import { formatoDiaCorto } from "../calendario-utils";

const importarUseCase = new ImportarBloqueEntrenamientoUseCase();
const registroUseCase = new GestionarRegistroActividadUseCase();
const SIN_ITEMS: never[] = [];
const SIN_RUTINAS: PlantillaRutina[] = [];
const DIAS_HISTORIAL = 7;

/**
 * Pausas activas: biblioteca de micro-rutinas listas para usar en cualquier
 * momento del día — confirmado con el usuario que NO llevan Bloque ni
 * fechas (a diferencia del entrenamiento normal), se arma de a poco con IA
 * sin duplicar lo que ya existe (ver Sprint 22, Decisión G).
 */
export const PanelPausasActivas: React.FC = () => {
  const { mostrarToast } = useToast();
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false);
  const [marcando, setMarcando] = useState<string | null>(null);
  const hoy = obtenerDiaTareaHoy();
  const desde = sumarDias(hoy, -(DIAS_HISTORIAL - 1));

  const catalogoEjercicios =
    useLiveQuery(() => db.catalogo_ejercicio.toArray()) || SIN_ITEMS;
  const equipamientoPropio =
    useLiveQuery(() =>
      db.catalogo_etiquetas
        .where("categoria")
        .equals("equipamiento_propio")
        .toArray()
    ) || SIN_ITEMS;
  const rutinasPausaActiva =
    useLiveQuery(() =>
      db.plantilla_rutina
        .filter((p) => !p.eliminado && p.formato === "pausa_activa")
        .toArray()
    ) || SIN_RUTINAS;
  const idsPausaActiva = new Set(rutinasPausaActiva.map((r) => r.id));

  const historial =
    useLiveQuery(
      () =>
        db.registro_actividad
          .where("diaTarea")
          .between(desde, hoy, true, true)
          .and((r) => r.bloqueId === undefined)
          .reverse()
          .sortBy("diaTarea"),
      [desde, hoy]
    ) || SIN_ITEMS;
  const historialPausas = historial.filter((r) =>
    idsPausaActiva.has(r.plantillaId)
  );
  const nombrePorId = new Map(rutinasPausaActiva.map((r) => [r.id, r.nombre]));

  const marcarHecha = async (plantillaId: string) => {
    setMarcando(plantillaId);
    const res = await registroUseCase.registrarComoPlanificado(
      plantillaId,
      hoy
    );
    setMarcando(null);
    if (!res.ok) mostrarToast(res.error!.mensaje, "error");
    else mostrarToast("Pausa activa registrada.", "exito");
  };

  const copiarPrompt = () => {
    const prompt = generarPromptPausasActivas(
      catalogoEjercicios,
      equipamientoPropio.map((e) => e.etiqueta),
      rutinasPausaActiva
    );
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt copiado al portapapeles.", "exito");
  };

  const importar = async (items: unknown[]) => {
    const res = await importarUseCase.importarPausasActivas(items);
    if (!res.ok) throw new Error(res.error!.mensaje);
    mostrarToast(res.valor, "exito");
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icono.Dumbbell className="h-4 w-4 text-zinc-500" />
          <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Pausas activas
          </h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={copiarPrompt}
            className="px-3 py-1.5 text-xs"
            icono={<Icono.Copy className="h-3.5 w-3.5" />}
          >
            Copiar prompt para IA
          </Button>
          <Button
            variant="outline"
            onClick={() => setModalImportarAbierto(true)}
            className="px-3 py-1.5 text-xs"
          >
            Pegar plan generado
          </Button>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Micro-rutinas de 2-5 minutos para cortar el sedentarismo — sin fecha ni
        bloque, una biblioteca que se arma de a poco.
      </p>

      {rutinasPausaActiva.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Sin pausas activas todavía — usá el prompt de IA para armar las
          primeras.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {rutinasPausaActiva.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-1.5 rounded-full border border-[#2A2A2E] bg-[#0D0D0F] py-1 pr-1 pl-2.5 text-xs text-zinc-300"
            >
              {r.nombre}
              <button
                onClick={() => void marcarHecha(r.id)}
                disabled={marcando === r.id}
                title="Marcar hecha hoy"
                className="rounded-full border border-emerald-500/20 bg-emerald-500/10 p-1 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40"
              >
                <Icono.Check className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {historialPausas.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-[#2A2A2E] pt-3">
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Hechas esta semana
          </span>
          {historialPausas.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-xs">
              <span className="text-zinc-600">
                {formatoDiaCorto(r.diaTarea)}
              </span>
              <span className="text-zinc-300">
                {nombrePorId.get(r.plantillaId) || r.plantillaId}
              </span>
            </div>
          ))}
        </div>
      )}

      <ModalImportarJson
        abierto={modalImportarAbierto}
        onCerrar={() => setModalImportarAbierto(false)}
        titulo="Importar pausas activas desde JSON"
        renderResumen={resumenPausasActivas}
        plantillaEjemplo={JSON.stringify(
          {
            rutinasNuevas: [
              {
                nombre: "Pausa hombros",
                formato: "pausa_activa",
                ejercicios: [
                  catalogoEjercicios.find((e) => e.esPausaActiva)?.nombre ||
                    "Círculos de hombro",
                ],
              },
            ],
            ejerciciosNuevos: [],
          },
          null,
          2
        )}
        onImportar={importar}
      />
    </div>
  );
};
