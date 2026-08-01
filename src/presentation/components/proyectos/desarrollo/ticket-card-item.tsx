/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../../offline/dexie/db";

interface TicketCardItemProps {
  ticket: any;
  proyecto: any;
  contexto: any;
  ds: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDeleteTicket: () => void;
  mostrarToast: (msg: string, tipo: "exito" | "error" | "info") => void;
}

export const TicketCardItem: React.FC<TicketCardItemProps> = ({
  ticket,
  proyecto,
  contexto,
  ds,
  isExpanded,
  onToggleExpand,
  onDeleteTicket,
  mostrarToast,
}) => {
  // Load steps for this specific ticket
  const stepStates = (useLiveQuery(
    () => db.task_step_states.where("executionId").equals(ticket.id).toArray(),
    [ticket.id]
  ) || []) as any[];

  // Local form states
  const [refinamientoInput, setRefinamientoInput] = useState("");
  const [checklistJsonInput, setChecklistJsonInput] = useState("");
  const [aiSummaryInput, setAiSummaryInput] = useState(
    ticket.metadata?.aiSummary || ""
  );

  const toggleStepCompleted = async (stepStateId: string, current: boolean) => {
    try {
      await db.task_step_states.update(stepStateId, { completado: !current });
    } catch (err: any) {
      mostrarToast(`Error al actualizar paso: ${err.message}`, "error");
    }
  };

  // Compile ultra-structured clean prompt matching requested template format
  const compileTicketPrompt = () => {
    const stackList: string[] = [];
    if (proyecto?.stack) {
      Object.entries(proyecto.stack).forEach(([layer, techs]) => {
        if (Array.isArray(techs) && techs.length > 0) {
          stackList.push(`${layer}: ${(techs as string[]).join(", ")}`);
        }
      });
    }
    const stackText =
      stackList.length > 0
        ? stackList.join(", ")
        : "Next.js (App Router), Tailwind CSS, React, TypeScript";

    let estBlocks = "";
    if (proyecto?.estandares && Object.keys(proyecto.estandares).length > 0) {
      Object.entries(proyecto.estandares).forEach(([cat, techs]) => {
        if (Array.isArray(techs) && techs.length > 0) {
          estBlocks += `- ${cat}:\n  * ${techs.join("\n  * ")}\n`;
        } else if (typeof techs === "string" && techs.trim()) {
          estBlocks += `- ${cat}:\n  * ${techs.trim()}\n`;
        }
      });
    }
    if (!estBlocks) {
      estBlocks =
        "- General:\n  * NO neones, NO degradados, NO sombras pesadas, NO íconos 3D, NO rounded-full en botones (máximo rounded-md).\n";
    }

    const arquetipo =
      ds?.arquetipo ||
      "Enterprise B2B, Swiss Design, ultra-minimalist, brutalist clean";
    const paleta =
      ds?.reglaColor ||
      "Background (#FFFFFF), Text (#1F2937), Sapphire Blue (#0A192F), Emerald Green (#10B981)";

    const rawSecName =
      ticket.metadata?.seccionNombre || ticket.titulo || "Componente";
    const cleanName = rawSecName
      .replace(/^SECCIÓN:\s*/i, "")
      .replace(/[^a-zA-Z0-9]/g, "");
    const componentFileName =
      cleanName.endsWith(".tsx") || cleanName.endsWith(".jsx")
        ? cleanName
        : `${cleanName || "Componente"}.tsx`;

    let prompt = `ROL: ${
      ticket.metadata?.rol ||
      "Senior Frontend Developer (Next.js + Tailwind CSS + TypeScript)"
    }.\n\n`;

    prompt += `DS / UI DESIGN SYSTEM:\n`;
    prompt += `- Estilo: ${arquetipo}\n`;
    prompt += `- Paleta: ${paleta}\n\n`;

    prompt += `RESTRICCIONES/CONSIDERACIONES:\n`;
    prompt += `${estBlocks}\n`;

    prompt += `STACK DE ESTE COMPONENTE:\n`;
    prompt += `- ${stackText}\n\n`;

    prompt += `TAREA / TICKET:\n`;
    prompt += `- Componente: ${componentFileName}\n`;
    prompt += `- Tipo: ${ticket.titulo}\n\n`;

    prompt += `REQUISITOS Y COPY DEL COMPONENTE:\n`;
    if (ticket.metadata?.seccionDescripcion) {
      prompt += `${ticket.metadata.seccionDescripcion}\n`;
    }
    if (
      Array.isArray(contexto?.linksInspiracion) &&
      contexto.linksInspiracion.length > 0
    ) {
      prompt += `\nReferencias de Inspiración Visual:\n${contexto.linksInspiracion.join(
        "\n"
      )}\n`;
    }
    if (ticket.metadata?.extraContext) {
      prompt += `\nInstrucciones Extra:\n${ticket.metadata.extraContext}\n`;
    }
    if (ticket.metadata?.criterioAceptacion) {
      prompt += `\nCriterios de Aceptación:\n${ticket.metadata.criterioAceptacion}\n`;
    }
    if (ticket.metadata?.logs) {
      prompt += `\nLogs del Error:\n${ticket.metadata.logs}\n`;
    }

    prompt += `\nINSTRUCCIONES DE RESPUESTA:\n`;
    prompt += `1. Analiza los requisitos y el sistema de diseño.\n`;
    prompt += `2. Escribe el código completo del componente con alta calidad y rendimiento según el stack y estándares especificados.\n`;
    prompt += `3. Al finalizar tu respuesta, incluye obligatoriamente este JSON para sincronizar el checklist:\n`;
    prompt += `{\n  "resumen_ia": "Breve descripción técnica de lo implementado",\n  "checklist": [\n    { "paso": 1, "completado": true },\n    { "paso": 2, "completado": true }\n  ]\n}`;

    return prompt;
  };

  const copiarPromptTicket = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = compileTicketPrompt();
    navigator.clipboard.writeText(prompt);
    mostrarToast(
      `Prompt de '${ticket.titulo}' copiado al portapapeles.`,
      "exito"
    );
  };

  const registrarIteracionRefinamiento = async () => {
    if (!refinamientoInput.trim()) {
      mostrarToast(
        "Escribe las consideraciones de refinamiento primero.",
        "error"
      );
      return;
    }

    try {
      const currentMeta = ticket.metadata || {};
      const prevIterations = Array.isArray(currentMeta.iterations)
        ? currentMeta.iterations
        : [];
      const newIteration = {
        fecha: new Date().toLocaleTimeString(),
        consideraciones: refinamientoInput.trim(),
      };

      await db.task_executions.update(ticket.id, {
        metadata: {
          ...currentMeta,
          iterations: [...prevIterations, newIteration],
        },
      });

      setRefinamientoInput("");
      mostrarToast("Iteración registrada en el historial del ticket.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al registrar iteración: ${err.message}`, "error");
    }
  };

  const copiarPromptRefinamiento = () => {
    if (!refinamientoInput.trim()) {
      mostrarToast("Escribe tus ajustes primero.", "error");
      return;
    }

    let prompt = `ROL: ${
      ticket.metadata?.rol || "Senior Frontend Developer"
    }.\n\n`;
    prompt += `TICKET BASE: ${ticket.titulo}\n`;
    prompt += `AJUSTES Y REFINAMIENTO SOLICITADO:\n${refinamientoInput.trim()}\n\n`;
    prompt += `Instrucción: Aplica los ajustes indicados arriba manteniendo la consideracion de consistencia con el componente actual.\n`;
    prompt += `Al finalizar, incluye el JSON obligatorio de respuesta:\n`;
    prompt += `{\n  "resumen_ia": "Descripción de los ajustes",\n  "checklist": [{ "paso": 1, "completado": true }]\n}`;

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de refinamiento copiado al portapapeles.", "exito");
  };

  const importarChecklistIA = async () => {
    if (!checklistJsonInput.trim()) {
      mostrarToast("Pega el JSON devuelto por la IA primero.", "error");
      return;
    }

    try {
      const parsed = JSON.parse(checklistJsonInput);
      if (Array.isArray(parsed.checklist)) {
        for (const item of parsed.checklist) {
          const stepObj = stepStates[item.paso - 1];
          if (stepObj) {
            await db.task_step_states.update(stepObj.id, {
              completado: !!item.completado,
            });
          }
        }
      }

      if (parsed.resumen_ia) {
        setAiSummaryInput(parsed.resumen_ia);
        const currentMeta = ticket.metadata || {};
        await db.task_executions.update(ticket.id, {
          metadata: {
            ...currentMeta,
            aiSummary: parsed.resumen_ia,
          },
        });
      }

      setChecklistJsonInput("");
      mostrarToast("Checklist e historial sincronizados desde la IA.", "exito");
    } catch (err: any) {
      mostrarToast(
        `JSON no válido: ${err.message}. Asegúrate de pegar el objeto JSON devuelto por la IA.`,
        "error"
      );
    }
  };

  const finalizarTicket = async () => {
    try {
      await db.transaction("rw", [db.task_executions, db.tareas], async () => {
        const metadata = ticket.metadata || {};
        await db.task_executions.update(ticket.id, {
          estado: "COMPLETED",
          fechaFin: Date.now(),
          metadata: {
            ...metadata,
            aiSummary: aiSummaryInput,
          },
        });

        if (metadata.actividadId) {
          await db.tareas.update(metadata.actividadId, { estado: "done" });
        }
      });

      mostrarToast(
        "Ticket cerrado con éxito. Registro de auditoría completado.",
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al cerrar ticket: ${err.message}`, "error");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#2A2A2E] bg-zinc-950/80 shadow-md transition-all">
      {/* Header Bar */}
      <div
        onClick={onToggleExpand}
        className="flex cursor-pointer items-center justify-between border-b border-zinc-900 bg-zinc-900/60 p-3 hover:bg-zinc-900"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] font-bold text-zinc-400">
            {isExpanded ? "▲" : "▼"}
          </span>
          <span
            className={`rounded px-2 py-0.5 font-mono text-[8px] font-bold ${
              ticket.estado === "COMPLETED"
                ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : (ticket.titulo || "").startsWith("BUG") ||
                    (ticket.titulo || "").startsWith("HOTFIX")
                  ? "border border-red-500/20 bg-red-500/10 text-red-400"
                  : "border border-amber-500/20 bg-amber-500/10 text-amber-400"
            }`}
          >
            {ticket.estado}
          </span>
          <h4 className="font-mono text-[11px] font-bold text-zinc-200 uppercase">
            {ticket.titulo}
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[8px] text-zinc-500 sm:inline">
            Encargado: {ticket.usuarioAsignadoId}
          </span>
          <button
            type="button"
            onClick={copiarPromptTicket}
            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[8px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
          >
            📋 Prompt Base
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTicket();
            }}
            className="px-1 font-mono text-[10px] text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      </div>

      {/* Expanded Content Body */}
      {isExpanded && (
        <div className="flex flex-col gap-3 p-3">
          {/* Steps Checklist */}
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
            <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              📋 Pasos de Implementación
            </span>
            <div className="mt-1 flex flex-col gap-2">
              {stepStates.map((st, idx) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between border-b border-zinc-900/60 pb-1.5 last:border-none"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={st.completado}
                      disabled={ticket.estado === "COMPLETED"}
                      onChange={() => toggleStepCompleted(st.id, st.completado)}
                      className="h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:ring-offset-0 focus:outline-none"
                    />
                    <span
                      className={`font-mono text-[10px] ${
                        st.completado
                          ? "text-zinc-500 line-through"
                          : "text-zinc-300"
                      }`}
                    >
                      Paso {idx + 1}: {st.titulo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {ticket.estado === "IN_PROGRESS" && (
            <>
              {/* Prompt Compiler box */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
                <div>
                  <span className="block font-mono text-[9px] font-bold text-zinc-400 uppercase">
                    🚀 1. Prompt Base para la IA
                  </span>
                  <span className="mt-0.5 block text-[8px] text-zinc-500">
                    Plantilla limpia estructurada con DS, Estándares y
                    Requisitos de esta sección
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copiarPromptTicket}
                  className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
                >
                  Copiar Prompt Base
                </button>
              </div>

              {/* Refinement Console */}
              <div className="flex flex-col gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
                <span className="font-mono text-[9px] font-bold text-sky-400 uppercase">
                  🔄 2. Refinamiento & Ajustes Iterativos
                </span>
                <textarea
                  value={refinamientoInput}
                  onChange={(e) => setRefinamientoInput(e.target.value)}
                  placeholder="Escribe las correcciones sobre lo que hizo la IA (ej: 'Cambia el botón a verde y ajusta el padding')..."
                  rows={2}
                  className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[9px] text-zinc-200 outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={registrarIteracionRefinamiento}
                    className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-[9px] font-bold text-zinc-300 uppercase transition-all hover:bg-zinc-800"
                  >
                    + Guardar Iteración
                  </button>
                  <button
                    type="button"
                    onClick={copiarPromptRefinamiento}
                    className="rounded bg-sky-500 px-3 py-1 font-mono text-[9px] font-bold text-zinc-950 uppercase shadow transition-all hover:bg-sky-400"
                  >
                    Copiar Prompt Refinamiento
                  </button>
                </div>

                {/* Iterations History */}
                {Array.isArray(ticket.metadata?.iterations) &&
                  ticket.metadata.iterations.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1 border-t border-sky-500/20 pt-2">
                      <span className="font-mono text-[8px] font-bold text-zinc-400 uppercase">
                        Historial de Ajustes (
                        {ticket.metadata.iterations.length}):
                      </span>
                      <div className="flex max-h-[90px] flex-col gap-1 overflow-y-auto">
                        {ticket.metadata.iterations.map(
                          (it: any, idx: number) => (
                            <div
                              key={idx}
                              className="border-zinc-850 rounded border bg-zinc-950/60 p-1.5 font-mono text-[8px] text-zinc-300"
                            >
                              <span className="font-bold text-sky-400">
                                [{it.fecha}]
                              </span>{" "}
                              {it.consideraciones}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* JSON Checklist Auto Sync */}
              <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950/20 p-3">
                <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                  📥 Sincronizar Checklist desde la IA (JSON)
                </span>
                <textarea
                  value={checklistJsonInput}
                  onChange={(e) => setChecklistJsonInput(e.target.value)}
                  placeholder='Pega el JSON devuelto por la IA para auto-tildar los pasos... (ej: {"checklist": [{"paso": 1, "completado": true}], "resumen_ia": "..."})'
                  rows={2}
                  className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[9px] text-zinc-300 outline-none"
                />
                <button
                  type="button"
                  onClick={importarChecklistIA}
                  className="self-end rounded border border-zinc-800 bg-zinc-900 px-3 py-1 font-mono text-[9px] font-bold text-zinc-300 uppercase transition-all hover:bg-zinc-800"
                >
                  Sincronizar
                </button>
              </div>

              {/* Post-Mortem and Finalize */}
              <div className="flex flex-col gap-2 border-t border-zinc-900 pt-3">
                <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                  Post-Mortem / Resumen Técnico (Para auditoría futura)
                </label>
                <textarea
                  value={aiSummaryInput}
                  onChange={(e) => setAiSummaryInput(e.target.value)}
                  placeholder="Resume qué archivos cambiaste y qué lógica agregaste..."
                  rows={2}
                  className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-300 outline-none"
                />
                <button
                  type="button"
                  onClick={finalizarTicket}
                  className="w-full rounded bg-emerald-500 py-2 text-[10px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-600"
                >
                  Finalizar Ticket y Registrar
                </button>
              </div>
            </>
          )}

          {ticket.metadata?.aiSummary && (
            <div className="mt-1 rounded-xl border border-zinc-900 bg-zinc-950 p-3">
              <span className="mb-1 block font-mono text-[9px] font-bold text-zinc-500 uppercase">
                💾 Resumen Técnico Guardado:
              </span>
              <p className="font-mono text-[10px] leading-relaxed text-zinc-300">
                {ticket.metadata.aiSummary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
