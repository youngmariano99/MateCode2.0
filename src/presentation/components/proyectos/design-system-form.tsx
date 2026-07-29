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

const DESIGN_SYSTEM_PROMPT = `Eres un Diseñador UI/UX Senior y Especialista en Design Systems. A partir del Relevamiento del Cliente o la Idea de Negocio, debes diseñar un Sistema de Diseño visual premium, técnico y de alta precisión.

RELEVAMIENTO DEL CLIENTE / IDEA DE NEGOCIO:
---
{{relevamiento_markdown}}
---

INSTRUCCIONES Y ESTRUCTURA REQUERIDA PARA EL DOCUMENTO (DESIGN.md):
Devuelve únicamente el documento en formato Markdown estructurado exactamente como sigue, sin introducciones ni comentarios explicativos externos:

# Sistema de Diseño: {{nombre_proyecto}} UI SYSTEM

<ui-tokens>
  - theme-mode: dark-only
  - min-touch-target: 44px
  - font-size-base: 16px (mínimo absoluto: 14px)
  - border-radius-sm: 4px
  - border-radius-md: 8px
  - transition-duration: 150ms-200ms
</ui-tokens>

---

## 1. Arquetipo de Diseño & Metáfora Visual
- **Arquetipo:** Minimalismo Industrial Oscuro ("Dark Utility Premium").
- **Vibra y Personalidad:** Herramienta técnica, sólida, limpia y de alta precisión. Evita marketing genérico; debe asemejarse a un software de ingeniería.
- **Enfoque UX:** Alta legibilidad, baja fatiga visual y UX Educativa (placeholders ejemplares, ayuda en estados vacíos).

---

## 2. Paleta de Colores & Mapeo Estricto a Tailwind CSS
Fondo oscuro profundo (sin usar negro puro #000000 para evitar fatiga por contraste extremo) y un único color de acento minimalista.

| Rol | Hexadecimal | Variable / Clase Tailwind | Uso Permitido |
| :--- | :--- | :--- | :--- |
| **Fondo Base** | \`#0B0F19\` | \`bg-slate-950\` | General de la página / Layout base |
| **Superficie 1** | \`#1E293B\` | \`bg-slate-800\` | Tarjetas, contenedores de tablas, modales |
| **Superficie 2** | \`#334155\` | \`bg-slate-700\` | Hover en filas, fondos de inputs |
| **Texto Principal**| \`#F8FAFC\` | \`text-slate-50\` | Títulos, párrafos, labels de formularios |
| **Texto Muted** | \`#94A3B8\` | \`text-slate-400\` | Placeholders, leyendas, metadatos |
| **Acento Core** | \`#3B82F6\` | \`bg-blue-500\` / \`text-blue-500\` | Botón primario, links activos, selección |
| **Éxito (Semántico)**| \`#10B981\` | \`text-emerald-500\` | Stock positivo, guardado exitoso |
| **Error (Semántico)**| \`#EF4444\` | \`text-red-500\` / \`border-red-500\` | Errores de formulario, alertas destructivas |

---

## 3. Pareja Tipográfica & Jerarquía
- **Títulos y Display (\`font-display\`):** Satoshi o Plus Jakarta Sans (Weight: 600 SemiBold / 700 Bold).
- **UI & Lectura (\`font-sans\`):** Inter (Weight: 400 Regular para cuerpo, 500 Medium para botones y labels).
- **Datos y Números (\`font-mono\`):** JetBrains Mono. Obligatorio para precios, SKUs, fechas y columnas de tablas (garantiza alineación perfecta en columnas).

---

## 4. Patrones de Interacción & UX Educativa
- **Placeholders Educativos:** No usar placeholders genéricos. Ejemplo: \`ej. juan.perez@comercio.com\`.
- **Formularios Fail-Fast:** Validación visual con bordes rojos (\`border-red-500\`), ícono de alerta ⚠️ y mensaje explicativo claro.
- **Empty States (Estados Vacíos):** Mostrar contenedor con borde discontinuo (\`border-dashed\`), texto explicativo amigable y un botón de Call To Action (CTA) azul principal.

---

## 5. Directrices de Negación ("El Freno de IA")
Queda ESTRICTAMENTE PROHIBIDO en todo código frontend de este proyecto:
- NO usar el color púrpura, violeta o índigo de Tailwind.
- NO generar fuentes de tamaño menor a 14px.
- NO usar negro puro (\`#000000\`) ni blanco puro (\`#FFFFFF\`).
- NO comunicar errores únicamente por color (añadir textos e iconos descriptivos).
- NO crear botones o enlaces interactivos de menos de 44x44px (áreas táctiles accesibles).`;

export const DesignSystemForm: React.FC<DesignSystemFormProps> = ({
  proyectoId,
}) => {
  const { mostrarToast } = useToast();

  // Load project query
  const proyecto = useLiveQuery(() => db.proyectos.get(proyectoId));

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
    ).replace("{{nombre_proyecto}}", String(proyecto?.nombre || "NODEXA"));
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
