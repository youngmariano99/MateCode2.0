"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { useToast } from "../../hooks/useToast";

interface RelevamientoWorkspaceProps {
  proyectoId: string;
  tipoProyecto: string;
  onSave?: (notasBrutas: string, markdown: string) => void | Promise<void>;
}

const PROMPT_SISTEMAS = `Eres un Product Owner y Analista de Negocios Senior. Te proporciono notas brutas, transcripciones o apuntes de reuniones con el cliente.
Tu objetivo es estructurar esta información de manera limpia, legible y profesional en formato Markdown para nuestro equipo de desarrollo.

DOCUMENTO DE ESTRUCTURA REQUERIDA (Sistemas):
1. **Perfil del Cliente & Resumen Ejecutivo**: Quién es el cliente, qué hace y cuál es el objetivo principal del software.
2. **Dolores del Cliente**: Qué problemas específicos tiene actualmente (lentitud, errores, falta de automatización).
3. **Reglas de Negocio Clave**: Restricciones de operación, lógica de negocio indispensable, cálculos o permisos especiales.
4. **Funcionalidades e Historias Críticas**: Qué debe poder hacer el usuario (ej. CRUD de actividades, dashboard de control).
5. **Flujos de Usuario**: Pasos que realiza el usuario para cumplir sus objetivos en el sistema.
6. **Limitaciones Técnicas o Integraciones**: Qué stack o servicios de terceros deben considerarse.

NOTAS BRUTAS DEL CLIENTE:
---
{{notas_brutas}}
---

Por favor, devuelve únicamente el contenido estructurado en formato Markdown, sin explicaciones ni introducciones.`;

const PROMPT_LANDING = `Eres un Diseñador UI/UX y Especialista en Branding de Elite. Te proporciono notas brutas, transcripciones o apuntes de reuniones con el cliente sobre su marca.
Tu objetivo es estructurar esta información de manera limpia, legible y profesional en formato Markdown para guiar un diseño visual de alta conversión y no genérico.

DOCUMENTO DE ESTRUCTURA REQUERIDA (Landing/Institucional):
1. **Identidad de Marca & Propuesta de Valor**: Quiénes son, qué los hace únicos y cuál es la personalidad de la marca (voz, tono).
2. **Público Objetivo & Audiencia**: A quién va dirigida la landing, qué deseos o miedos tiene esta audiencia.
3. **Directrices de Diseño & Estética (Design System)**: Colores recomendados, arquetipo de diseño (brutalismo, minimalista, corporativo), metáfora visual o estilo general que represente a la marca.
4. **Secciones de la Página (Layout)**: Propuesta de secciones del sitio (ej. Hero, Beneficios, Servicios, Testimonios, CTA).
5. **Restricciones Visuales o Negaciones**: Qué cosas NO deben hacerse a nivel visual para evitar diseños genéricos o fuera de branding.

NOTAS BRUTAS DEL CLIENTE:
---
{{notas_brutas}}
---

Por favor, devuelve únicamente el contenido estructurado en formato Markdown, sin explicaciones ni introducciones.`;

export const RelevamientoWorkspace: React.FC<RelevamientoWorkspaceProps> = ({
  proyectoId,
  tipoProyecto,
  onSave,
}) => {
  const { mostrarToast } = useToast();

  // Load project context from database
  const contexto = useLiveQuery(async () => {
    const data = await db.proyecto_contexto.get(proyectoId);
    return data;
  }, [proyectoId]);

  const [notasBrutas, setNotasBrutas] = useState("");
  const [relevamientoMarkdown, setRelevamientoMarkdown] = useState("");

  // Determine initial prompt type selection based on project type
  const isLandingType =
    tipoProyecto?.toLowerCase().includes("landing") ||
    tipoProyecto?.toLowerCase().includes("institucional");
  const [promptType, setPromptType] = useState<"sistemas" | "landing">(
    isLandingType ? "landing" : "sistemas"
  );

  useEffect(() => {
    if (contexto) {
      setNotasBrutas((contexto.relevamientoNotasBrutas as string) || "");
      setRelevamientoMarkdown((contexto.relevamientoMarkdown as string) || "");
    }
  }, [contexto]);

  const handleSave = async () => {
    try {
      const currentContext = (await db.proyecto_contexto.get(proyectoId)) || {
        proyectoId,
      };

      // Extract quick values for fallback backward compatibility if markdown has them
      let doloresCliente = (currentContext.doloresCliente as string) || "";
      let reglasNegocio = (currentContext.reglasNegocio as string) || "";
      let publicoObjetivo = (currentContext.publicoObjetivo as string) || "";

      // Simple parsing of markdown headers as fallback values
      if (relevamientoMarkdown) {
        if (relevamientoMarkdown.includes("Dolores del Cliente")) {
          doloresCliente =
            "Consultar el Relevamiento general estructurado en Markdown.";
        }
        if (relevamientoMarkdown.includes("Reglas de Negocio")) {
          reglasNegocio =
            "Consultar el Relevamiento general estructurado en Markdown.";
        }
        if (relevamientoMarkdown.includes("Público Objetivo")) {
          publicoObjetivo =
            "Consultar el Relevamiento general estructurado en Markdown.";
        }
      }

      await db.proyecto_contexto.put({
        ...currentContext,
        proyectoId,
        relevamientoNotasBrutas: notasBrutas,
        relevamientoMarkdown,
        doloresCliente,
        reglasNegocio,
        publicoObjetivo,
      });

      mostrarToast("Relevamiento guardado con éxito.", "exito");
      if (onSave) {
        onSave(notasBrutas, relevamientoMarkdown);
      }
    } catch (err: any) {
      mostrarToast(`Error al guardar relevamiento: ${err.message}`, "error");
    }
  };

  const copiarPrompt = () => {
    if (!notasBrutas.trim()) {
      mostrarToast("Por favor, agrega algunas notas brutas primero.", "error");
      return;
    }

    const template =
      promptType === "landing" ? PROMPT_LANDING : PROMPT_SISTEMAS;
    const finalPrompt = template.replace("{{notas_brutas}}", notasBrutas);

    navigator.clipboard.writeText(finalPrompt);
    mostrarToast(
      "¡Prompt compilado con notas copiado al portapapeles!",
      "exito"
    );
  };

  const descargarMarkdown = () => {
    if (!relevamientoMarkdown.trim()) {
      mostrarToast(
        "No hay resumen Markdown estructurado para descargar.",
        "error"
      );
      return;
    }
    const blob = new Blob([relevamientoMarkdown], {
      type: "text/markdown;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `relevamiento_${proyectoId}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarToast("Descargando archivo markdown...", "info");
  };

  return (
    <Card>
      <div className="mb-4 border-b border-[#2A2A2E] pb-3">
        <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
          Taller de Relevamiento del Cliente
        </h3>
        <p className="text-zinc-550 mt-0.5 font-mono text-[10px] leading-relaxed">
          Junta transcripciones de reuniones, audios o apuntes sueltos.
          Selecciona el prompt según el tipo de proyecto, pásalo a la IA y
          guarda el markdown estructurado de retorno para usarlo de contexto.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left pane: Raw notes and Prompt selector */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
              📝 1. Notas Brutas del Cliente (Reuniones / Chats)
            </span>
          </div>

          <textarea
            value={notasBrutas}
            onChange={(e) => setNotasBrutas(e.target.value)}
            placeholder="Pega aquí toda la información desorganizada del cliente (ej: transcripciones de videollamadas, audios transcritos, notas rápidas)..."
            className="h-[280px] w-full resize-none rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 font-mono text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />

          <div className="mt-1 flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
            <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              ⚙️ Selector de Prompt IA
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPromptType("sistemas")}
                className={`flex-1 rounded py-1.5 font-mono text-[9px] font-bold uppercase transition-all ${
                  promptType === "sistemas"
                    ? "bg-emerald-500 text-zinc-950"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Sistemas (Procesos / Reglas)
              </button>
              <button
                type="button"
                onClick={() => setPromptType("landing")}
                className={`flex-1 rounded py-1.5 font-mono text-[9px] font-bold uppercase transition-all ${
                  promptType === "landing"
                    ? "bg-emerald-500 text-zinc-950"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Landing / Marca (Branding)
              </button>
            </div>
            <button
              type="button"
              onClick={copiarPrompt}
              className="mt-1 rounded border border-emerald-500/20 bg-emerald-500/10 py-2 font-mono text-[9px] font-bold text-emerald-400 uppercase transition-all hover:bg-emerald-500/20"
            >
              🚀 Copiar Prompt + Notas
            </button>
          </div>
        </div>

        {/* Right pane: Markdown input and save/download actions */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
              ✨ 2. Resumen Estructurado (Markdown de la IA)
            </span>
            {relevamientoMarkdown.trim() && (
              <button
                type="button"
                onClick={descargarMarkdown}
                className="text-[9px] font-bold text-sky-400 hover:text-sky-300"
              >
                📥 Descargar .md
              </button>
            )}
          </div>

          <textarea
            value={relevamientoMarkdown}
            onChange={(e) => setRelevamientoMarkdown(e.target.value)}
            placeholder="Pega aquí el resultado en formato Markdown devuelto por Claude / ChatGPT..."
            className="h-[280px] w-full resize-none rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 font-mono text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />

          <div className="mt-2 flex shrink-0 justify-end gap-2 border-t border-[#2A2A2E] pt-3.5">
            <Button onClick={handleSave}>Guardar Relevamiento</Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
