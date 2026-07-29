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

const PROMPT_COPYWRITING = `Eres un Copywriter de Conversión de Elite. Te proporciono el relevamiento del cliente y el tono de voz de su marca.
Tu objetivo es generar el texto y narrativa completa (Copywriting) para cada sección del sitio web (Hero, Beneficios, Servicios, Prueba Social, FAQ, Llamado a la Acción CTA).

RELEVAMIENTO DE MARCA:
---
{{notas_brutas}}
---

Genera una propuesta de texto limpia, persuasiva y estructurada por secciones lista para colocar en el diseño visual.`;

const PROMPT_IDEA_PRODUCTO = `<role>
Actúa como un Arquitecto de Producto Senior y Analista de Dominio (DDD - Domain-Driven Design).
Tu misión es analizar la información en crudo proporcionada sobre un proyecto o SaaS y generar el "Objeto Maestro de Contexto", un manifiesto técnico y de negocio que alimentará la arquitectura de software, bases de datos y sistemas de diseño sin caer en convencionalismos ni descripciones genéricas.
</role>

<input_crudo>
{{notas_brutas}}
</input_crudo>

<directrices_de_inferencia>
1. PRINCIPIO DE LA REALIDAD SUCIA: Prohibido usar adjetivos genéricos como "interfaz limpia", "usuarios generales", "rápido" o "moderno". Si el input no lo aclara explícitamente, DEDUCE el contexto real e imperfecto del rubro basándote en tu conocimiento de la industria:
   - ¿Dónde se usa realmente el sistema? (ej. mostrador ruidoso, almacén sin luz, vehículo, oficina bajo presión).
   - ¿Qué dispositivos físicos predominan en ese sector? (ej. POS antiguo, celular de gama baja, lector de código de barras USB, monitor de 27").
   - ¿Cuál es el nivel real de alfabetización digital y el estrés del usuario final en el momento crítico de uso?
2. VOCABULARIO DE DOMINIO (Ubiquitous Language): Identifica los sustantivos y verbos exactos del negocio. No los reemplaces por "usuario", "ítem" o "registro". Utiliza los términos del rubro (ej. en un taller mecánico: "Orden de Trabajo", "Repuesto", "Elevador").
3. REGLAS INNEGOCIABLES Y EDGE CASES: Identifica o infiere al menos 2 reglas de negocio críticas donde el software NO PUEDE FALLAR (ej. manejo de stock negativo, inmutabilidad fiscal, qué sucede en cortes de conectividad).
</directrices_de_inferencia>

<instrucciones_ejecucion>
Analiza profundamente el input y devuelve ÚNICAMENTE un objeto JSON válido que cumpla estrictamente con la siguiente estructura. No incluyas explicaciones previas, introducciones ni bloques de código de marcado adicionales fuera del JSON:

{
  "proyecto": {
    "nombre": "Nombre real o deducido del proyecto",
    "rubro": "Sector o nicho específico del negocio",
    "diferenciador_core": "La propuesta de valor innegociable que justifica por qué el cliente pagará por esto en lugar de usar Excel o una herramienta genérica"
  },
  "contexto_usuario": {
    "entorno_fisico": "Descripción cruda del lugar donde se opera el software",
    "dispositivo_primario": "Hardware específico desde donde se opera (móvil, desktop antigua, tablet POS, etc.)",
    "nivel_estres": "Nivel de urgencia o presión en el flujo principal y por qué ocurre",
    "alfabetizacion_digital": "Nivel técnico del operador del sistema y requerimientos pedagógicos para la interfaz"
  },
  "reglas_negocio_y_dominio": {
    "glosario": {
      "TerminoExacto1": "Definición dentro del contexto de este negocio",
      "TerminoExacto2": "Definición dentro del contexto de este negocio",
      "TerminoExacto3": "Definición dentro del contexto de este negocio"
    },
    "reglas_innegociables": [
      "Regla 1 sobre cómo se comportan las transacciones o el flujo operativo",
      "Regla 2 sobre situaciones críticas del día a día (edge cases)"
    ]
  },
  "datos_y_seguridad": {
    "modelo_tenancy": "Estrategia de multitenencia y aislamiento recomendada",
    "volumen_esperado": "Estimación del comportamiento transaccional (alta lectura vs alta escritura)",
    "auditoria_y_sensibilidad": "Qué tablas o flujos requieren borrado lógico obligatorio, logs inmutables y nivel de sensibilidad del dato"
  },
  "integraciones": [
    "Integración hardware/software 1 requerida o típica del sector",
    "Integración hardware/software 2 requerida o típica del sector"
  ]
}
</instrucciones_ejecucion>`;

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
  const [linksInspiracion, setLinksInspiracion] = useState<string[]>([]);
  const [nuevoLinkInput, setNuevoLinkInput] = useState("");
  const [copyContenido, setCopyContenido] = useState("");

  // Determine initial prompt type selection based on project type
  const isLandingType =
    tipoProyecto?.toLowerCase().includes("landing") ||
    tipoProyecto?.toLowerCase().includes("institucional");
  const [promptType, setPromptType] = useState<
    "sistemas" | "landing" | "idea_producto"
  >(isLandingType ? "landing" : "sistemas");

  useEffect(() => {
    if (contexto) {
      setNotasBrutas((contexto.relevamientoNotasBrutas as string) || "");
      setRelevamientoMarkdown(
        (contexto.relevamientoMarkdown as string) ||
          (contexto.masterContextJson as string) ||
          ""
      );
      setLinksInspiracion(
        Array.isArray(contexto.linksInspiracion)
          ? (contexto.linksInspiracion as string[])
          : []
      );
      setCopyContenido((contexto.copyContenido as string) || "");
    }
  }, [contexto]);

  const handleAgregarLink = () => {
    if (!nuevoLinkInput.trim()) return;
    const url = nuevoLinkInput.trim();
    if (!linksInspiracion.includes(url)) {
      setLinksInspiracion([...linksInspiracion, url]);
      setNuevoLinkInput("");
      mostrarToast("Link de inspiración agregado.", "info");
    }
  };

  const handleEliminarLink = (url: string) => {
    setLinksInspiracion(linksInspiracion.filter((l) => l !== url));
  };

  const copiarTodosLosLinks = () => {
    if (linksInspiracion.length === 0) {
      mostrarToast("No hay enlaces de inspiración guardados.", "error");
      return;
    }
    const texto = linksInspiracion.map((l) => `- ${l}`).join("\n");
    navigator.clipboard.writeText(
      `REFERENCIAS Y INSPIRACIÓN VISUAL:\n${texto}`
    );
    mostrarToast("¡Enlaces de inspiración copiados al portapapeles!", "exito");
  };

  const copiarPromptCopy = () => {
    if (!notasBrutas.trim() && !relevamientoMarkdown.trim()) {
      mostrarToast(
        "Agrega notas brutas o un relevamiento estructurado primero.",
        "error"
      );
      return;
    }
    const baseText = relevamientoMarkdown || notasBrutas;
    const finalPrompt = PROMPT_COPYWRITING.replace(
      "{{notas_brutas}}",
      baseText
    );
    navigator.clipboard.writeText(finalPrompt);
    mostrarToast(
      "¡Prompt de redacción de Copywriting copiado al portapapeles!",
      "exito"
    );
  };

  const handleSave = async () => {
    try {
      const currentContext = (await db.proyecto_contexto.get(proyectoId)) || {
        proyectoId,
      };

      let doloresCliente = (currentContext.doloresCliente as string) || "";
      let reglasNegocio = (currentContext.reglasNegocio as string) || "";
      let publicoObjetivo = (currentContext.publicoObjetivo as string) || "";

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
        linksInspiracion,
        copyContenido,
        masterContextJson:
          promptType === "idea_producto"
            ? relevamientoMarkdown
            : currentContext.masterContextJson || "",
      });

      mostrarToast("Relevamiento, Copy y Links guardados con éxito.", "exito");
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

    let template = PROMPT_SISTEMAS;
    if (promptType === "landing") template = PROMPT_LANDING;
    else if (promptType === "idea_producto") template = PROMPT_IDEA_PRODUCTO;

    let finalPrompt = template.replace("{{notas_brutas}}", notasBrutas);

    if (linksInspiracion.length > 0) {
      finalPrompt += `\n\nLINKS DE INSPIRACIÓN VISUAL Y REFERENCIA:\n${linksInspiracion.join("\n")}`;
    }

    navigator.clipboard.writeText(finalPrompt);
    mostrarToast(
      "¡Prompt compilado con notas e inspiración copiado al portapapeles!",
      "exito"
    );
  };

  const descargarMarkdown = () => {
    if (!relevamientoMarkdown.trim() && !copyContenido.trim()) {
      mostrarToast(
        "No hay resumen ni copy estructurado para descargar.",
        "error"
      );
      return;
    }

    let fullContent = `# Relevamiento del Proyecto: ${proyectoId}\n\n`;
    if (relevamientoMarkdown) {
      fullContent += `${relevamientoMarkdown}\n\n`;
    }
    if (copyContenido) {
      fullContent += `## Contenido y Copywriting de Marca\n${copyContenido}\n\n`;
    }
    if (linksInspiracion.length > 0) {
      fullContent += `## Enlaces de Inspiración Visual\n${linksInspiracion.map((l) => `- ${l}`).join("\n")}\n\n`;
    }

    const blob = new Blob([fullContent], {
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
          Junta transcripciones de reuniones, audios, enlaces de inspiración y
          el copy de marca. Pásalo a la IA y guarda el resumen estructurado para
          utilizarlo de contexto en todo el desarrollo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left pane: Raw notes, Prompt selector and Links manager */}
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
            className="h-[220px] w-full resize-none rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 font-mono text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />

          {/* Links de Inspiración Visual */}
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] font-bold text-sky-400 uppercase">
                🎨 Links de Inspiración Visual & Referencias
              </span>
              {linksInspiracion.length > 0 && (
                <button
                  type="button"
                  onClick={copiarTodosLosLinks}
                  className="font-mono text-[8px] text-sky-400 underline hover:text-sky-300"
                >
                  Copiar todos los links
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={nuevoLinkInput}
                onChange={(e) => setNuevoLinkInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleAgregarLink())
                }
                placeholder="https://dribbble.com/shots/... o https://sitio.com"
                className="border-zinc-850 flex-1 rounded border bg-zinc-950 px-2 py-1 font-mono text-[9px] text-zinc-200 outline-none"
              />
              <button
                type="button"
                onClick={handleAgregarLink}
                className="rounded border border-sky-500/20 bg-sky-500/10 px-3 py-1 font-mono text-[9px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
              >
                + Agregar
              </button>
            </div>

            {linksInspiracion.length > 0 && (
              <div className="mt-1 flex max-h-[80px] flex-wrap gap-1.5 overflow-y-auto">
                {linksInspiracion.map((link, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[8px] text-zinc-300"
                  >
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="max-w-[200px] truncate hover:text-sky-400"
                    >
                      {link}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleEliminarLink(link)}
                      className="text-zinc-550 font-bold hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-1 flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
            <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              ⚙️ Selector de Prompt IA
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPromptType("sistemas")}
                className={`min-w-[100px] flex-1 rounded py-1.5 font-mono text-[9px] font-bold uppercase transition-all ${
                  promptType === "sistemas"
                    ? "bg-emerald-500 text-zinc-950"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Sistemas
              </button>
              <button
                type="button"
                onClick={() => setPromptType("landing")}
                className={`min-w-[100px] flex-1 rounded py-1.5 font-mono text-[9px] font-bold uppercase transition-all ${
                  promptType === "landing"
                    ? "bg-emerald-500 text-zinc-950"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Landing / Marca
              </button>
              <button
                type="button"
                onClick={() => setPromptType("idea_producto")}
                className={`min-w-[100px] flex-1 rounded py-1.5 font-mono text-[9px] font-bold uppercase transition-all ${
                  promptType === "idea_producto"
                    ? "bg-emerald-500 text-zinc-950"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                💡 Idea (Contexto DDD)
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

        {/* Right pane: Markdown/JSON input, Copywriting text, and save/download actions */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
              {promptType === "idea_producto"
                ? "✨ 2. Objeto Maestro de Contexto (JSON)"
                : "✨ 2. Resumen Estructurado (Markdown de la IA)"}
            </span>
            {(relevamientoMarkdown.trim() || copyContenido.trim()) && (
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
            placeholder={
              promptType === "idea_producto"
                ? "Pega aquí el Objeto Maestro de Contexto en formato JSON devuelto por la IA..."
                : "Pega aquí el resultado en formato Markdown devuelto por Claude / ChatGPT..."
            }
            className="h-[200px] w-full resize-none rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 font-mono text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />

          {/* Copywriting & Contenido de Marca */}
          {promptType !== "idea_producto" && (
            <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] font-bold text-amber-400 uppercase">
                  ✍️ Contenido y Copywriting (Texto del Sitio)
                </span>
                <button
                  type="button"
                  onClick={copiarPromptCopy}
                  className="font-mono text-[8px] text-amber-400 underline hover:text-amber-300"
                >
                  Copiar Prompt para generar Copy
                </button>
              </div>
              <textarea
                value={copyContenido}
                onChange={(e) => setCopyContenido(e.target.value)}
                placeholder="Escribe o pega aquí el copy redactado para los encabezados, llamados a la acción, beneficios, etc..."
                className="h-[120px] w-full resize-none rounded-xl border border-[#2A2A2E] bg-zinc-950 p-2 font-mono text-xs text-zinc-200 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          )}

          <div className="mt-2 flex shrink-0 justify-end gap-2 border-t border-[#2A2A2E] pt-3.5">
            <Button onClick={handleSave}>
              Guardar Relevamiento y Contexto
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
