"use client";

import React, { useState } from "react";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { useToast } from "../../hooks/useToast";
import { db } from "../../../offline/dexie/db";
import { AplicarAjustesIAUseCase } from "../../../application/use-cases/personal/aplicar-ajustes-ia.use-case";
import { generarPromptAjusteIA } from "../../../domain/prompts/generar-prompt-jerarquia-personal";
import { obtenerDiaTareaHoy } from "../../../domain/entidades/personal.entity";
import { ModalImportarJson } from "../contenido/modal-importar-json";
import { resumenAjustesIA } from "./resumen-import-jerarquia";
import type { ObjetivoCuantificable } from "../../../domain/entidades/objetivo-cuantificable.entity";

const aplicarUseCase = new AplicarAjustesIAUseCase();

interface AjustarConIAModalProps {
  abierto: boolean;
  onCerrar: () => void;
  objetivo: ObjetivoCuantificable;
}

async function armarContexto(objetivo: ObjetivoCuantificable): Promise<string> {
  const hoy = obtenerDiaTareaHoy();
  const lineas: string[] = [
    `Objetivo: "${objetivo.titulo}" — ${objetivo.progresoActual}/${objetivo.cantidadObjetivo} ${objetivo.unidad}, vence ${objetivo.diaLimite} (hoy es ${hoy}).`,
  ];

  const proyectos = await db.proyecto_personal
    .where("objetivoId")
    .equals(objetivo.id)
    .and((p) => p.estado !== "archivado")
    .toArray();

  for (const p of proyectos) {
    const metaProyecto =
      p.cantidadObjetivo !== undefined
        ? `${p.progresoActual}/${p.cantidadObjetivo} ${p.unidad}`
        : "sin meta propia";
    lineas.push(
      `  Proyecto: "${p.titulo}" — ${metaProyecto}, vence ${p.diaLimite}.`
    );

    const entregables = await db.entregable
      .where("proyectoId")
      .equals(p.id)
      .and((e) => e.estado !== "archivado")
      .toArray();

    for (const e of entregables) {
      const metaEntregable =
        e.cantidadObjetivo !== undefined
          ? `${e.progresoActual}/${e.cantidadObjetivo} ${e.unidad}`
          : "sin meta propia";
      lineas.push(
        `    Entregable: "${e.titulo}" — ${metaEntregable}, vence ${e.diaLimite}${e.recurrencia ? " (recurrente)" : ""}.`
      );

      const fases = await db.fase_personal
        .where("entregableId")
        .equals(e.id)
        .sortBy("orden");
      for (const f of fases) {
        const faltante = Math.max(0, f.cantidadObjetivo - f.progresoActual);
        lineas.push(
          `      Fase: "${f.titulo}" (${f.estado}) — ${f.progresoActual}/${f.cantidadObjetivo} ${f.unidad}, faltante ${faltante}, ${f.diaInicio} → ${f.diaLimite}.`
        );
      }
    }
  }

  return lineas.join("\n");
}

/**
 * "Ajustar con IA" — arma todo el contexto del Objetivo (Proyectos →
 * Entregables → Fases, con logrado/meta/faltante) para pegarlo en una IA
 * externa y pedirle ajustes concretos. Mismo patrón copiar-prompt/pegar-
 * JSON que el resto del módulo (ver Decisión E, Sprint 21).
 */
export const AjustarConIAModal: React.FC<AjustarConIAModalProps> = ({
  abierto,
  onCerrar,
  objetivo,
}) => {
  const { mostrarToast } = useToast();
  const [copiado, setCopiado] = useState(false);
  const [modalImportarAbierto, setModalImportarAbierto] = useState(false);

  const copiarPrompt = async () => {
    const contexto = await armarContexto(objetivo);
    const prompt = generarPromptAjusteIA(contexto);
    await navigator.clipboard.writeText(prompt);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const importar = async (items: unknown[]) => {
    const res = await aplicarUseCase.aplicar(objetivo.id, items);
    if (!res.ok) throw new Error(res.error!.mensaje);
    mostrarToast(res.valor, "exito");
  };

  return (
    <>
      <Dialog
        abierto={abierto}
        onClose={onCerrar}
        titulo={`Ajustar "${objetivo.titulo}" con IA`}
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs text-zinc-500">
            Copiá el prompt (ya incluye todo el árbol de este objetivo con su
            progreso real) y pegáselo a tu IA. Cuando te devuelva el JSON con
            los ajustes, pegalo acá abajo — vas a poder revisar cada cambio
            antes de aplicarlo.
          </p>
          <Button variant="outline" onClick={copiarPrompt} className="text-xs">
            {copiado ? "Copiado" : "Copiar prompt para IA"}
          </Button>
          <Button
            onClick={() => setModalImportarAbierto(true)}
            className="text-xs"
          >
            Pegar ajustes generados
          </Button>
        </div>
      </Dialog>
      <ModalImportarJson
        abierto={modalImportarAbierto}
        onCerrar={() => setModalImportarAbierto(false)}
        titulo="Aplicar ajustes desde JSON"
        renderResumen={resumenAjustesIA}
        plantillaEjemplo={JSON.stringify(
          {
            ajustes: [
              {
                nivel: "entregable",
                titulo: "...",
                cantidadObjetivo: 120,
                motivo: "...",
              },
            ],
          },
          null,
          2
        )}
        onImportar={importar}
      />
    </>
  );
};
