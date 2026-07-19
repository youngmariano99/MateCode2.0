"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { db } from "../../../offline/dexie/db";
import { useToast } from "../../hooks/useToast";
import { useLiveQuery } from "dexie-react-hooks";

interface DesignSystemFormProps {
  proyectoId: string;
}

const DESIGN_SYSTEM_PROMPT = `Eres un Diseñador UI/UX Senior y Especialista en Design Systems. A partir del siguiente Relevamiento del Cliente y requerimientos, debes diseñar un Sistema de Diseño visual completo, coherente, premium y no genérico.

RELEVAMIENTO DEL CLIENTE:
---
{{relevamiento_markdown}}
---

INSTRUCCIONES Y ESTRUCTURA REQUERIDA PARA EL DOCUMENTO:
Debes devolver únicamente un documento en formato Markdown estructurado con las siguientes secciones obligatorias:
1. **Arquetipo de Diseño & Metáfora Visual**: Describe la dirección artística y la vibra del diseño (ej. Neo-Brutalismo, Diseños Suizos, Cyberpunk).
2. **Pareja Tipográfica**: Define la combinación de fuentes y pesos recomendados para títulos y textos.
3. **Escala de Espaciado & Ritmo Vertical**: Directrices de espaciados (denso, holgado, etc.).
4. **Paleta de Colores & Reglas de Color**: Define los colores de fondo, texto principal, acento y colores secundarios en HSL o Hexadecimal.
5. **Bordes y Sombras (UI Tokens)**: Especifica radios de bordes (ej: 0px, 12px) y dureza de sombras.
6. **Micro-interacciones y Animaciones**: Reglas para transiciones de estados, duraciones y curvas físicas (spring/ease).
7. **Directriz de Negación (Freno de IA)**: Detalla explícitamente qué estilos NO deben usarse para evitar diseños genéricos o aburridos.

Por favor, genera únicamente el contenido estructurado en formato Markdown, sin introducciones ni comentarios.`;

export const DesignSystemForm: React.FC<DesignSystemFormProps> = ({
  proyectoId,
}) => {
  const { mostrarToast } = useToast();

  // Load design system from DB
  const dsData = useLiveQuery(() =>
    db.proyecto_design_system.get(proyectoId)
  ) as any;

  // Load project relevamiento context
  const contexto = useLiveQuery(() =>
    db.proyecto_contexto.get(proyectoId)
  ) as any;

  const [designSystemMarkdown, setDesignSystemMarkdown] = useState("");

  useEffect(() => {
    if (dsData) {
      setDesignSystemMarkdown(dsData.designSystemMarkdown || "");
    }
  }, [dsData]);

  const handleSave = async () => {
    try {
      const currentDS = (await db.proyecto_design_system.get(proyectoId)) || {
        proyectoId,
      };

      // Extract fallbacks for legacy variables to maintain backward compatibility in prompts
      let arquetipo = currentDS.arquetipo || "Diseño Suizo";
      let metafora = currentDS.metafora || "";
      const radioBordes = currentDS.radioBordes || "0px";
      const sombras = currentDS.sombras || "Prohibidas";
      let directrizNegacion = currentDS.directrizNegacion || "";
      const parejaTipografica = currentDS.parejaTipografica || "Inter";
      const escalaEspaciado = currentDS.escalaEspaciado || "Holgado";
      const reglaColor = currentDS.reglaColor || "";
      const estiloAnimaciones = currentDS.estiloAnimaciones || "Secas 0ms";
      const estadoHover = currentDS.estadoHover || "";

      if (designSystemMarkdown) {
        arquetipo = "Personalizado";
        metafora = "Ver especificación del Design System en Markdown.";
        directrizNegacion = "Ver especificación del Design System en Markdown.";
      }

      await db.proyecto_design_system.put({
        ...currentDS,
        proyectoId,
        designSystemMarkdown,
        arquetipo,
        metafora,
        radioBordes,
        sombras,
        directrizNegacion,
        parejaTipografica,
        escalaEspaciado,
        reglaColor,
        estiloAnimaciones,
        estadoHover,
      });

      mostrarToast("Sistema de Diseño guardado con éxito.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al guardar design system: ${err.message}`, "error");
    }
  };

  const copiarPrompt = () => {
    const relevamiento = contexto?.relevamientoMarkdown || "";
    if (!relevamiento.trim()) {
      mostrarToast(
        "Falta el Relevamiento del Cliente en el paso anterior. Agrégalo para enriquecer el prompt.",
        "info"
      );
    }
    const finalPrompt = DESIGN_SYSTEM_PROMPT.replace(
      "{{relevamiento_markdown}}",
      relevamiento || "No hay notas de relevamiento cargadas."
    );
    navigator.clipboard.writeText(finalPrompt);
    mostrarToast("¡Prompt de Design System copiado al portapapeles!", "exito");
  };

  const descargarDesignSystem = () => {
    if (!designSystemMarkdown.trim()) {
      mostrarToast(
        "No hay especificación de diseño cargada para descargar.",
        "error"
      );
      return;
    }
    const blob = new Blob([designSystemMarkdown], {
      type: "text/markdown;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `design_system_${proyectoId}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarToast("Descargando archivo design system markdown...", "info");
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-3">
        <div>
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            🎨 Sistema de Diseño del Proyecto (IA Design System)
          </h3>
          <p className="text-zinc-550 mt-0.5 font-mono text-[9px]">
            Genera un prompt de diseño visual, pásalo a la IA y guarda las
            directrices visuales en formato Markdown
          </p>
        </div>
        {designSystemMarkdown.trim() && (
          <button
            type="button"
            onClick={descargarDesignSystem}
            className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[9px] font-bold text-sky-400 hover:text-sky-300"
          >
            📥 Descargar Design System (.md)
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
          <div>
            <span className="block font-mono text-[9px] font-bold text-zinc-400 uppercase">
              🚀 Generador de Prompt para la IA
            </span>
            <span className="text-zinc-650 mt-0.5 block text-[8px]">
              Une el Relevamiento con instrucciones detalladas para armar el
              Design System
            </span>
          </div>
          <button
            type="button"
            onClick={copiarPrompt}
            className="rounded bg-emerald-500 px-4 py-2 font-mono text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-600"
          >
            Copiar Prompt
          </button>
        </div>

        <div className="mt-1 flex flex-col gap-1.5">
          <label className="block font-mono text-[10px] font-bold text-zinc-300 uppercase">
            Directrices Visuales y Metáforas (Markdown)
          </label>
          <textarea
            value={designSystemMarkdown}
            onChange={(e) => setDesignSystemMarkdown(e.target.value)}
            placeholder="Pega aquí las directrices visuales del Design System en Markdown..."
            rows={15}
            className="w-full rounded-xl border border-[#2A2A2E] bg-zinc-950 p-4 font-mono text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="mt-1.5 flex shrink-0 justify-end border-t border-[#2A2A2E] pt-3">
          <Button onClick={handleSave}>Guardar Design System</Button>
        </div>
      </div>
    </Card>
  );
};
