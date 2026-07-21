"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { Button } from "../button";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { useToast } from "../../hooks/useToast";

interface PlanificacionIAWorkspaceProps {
  proyectoId: string;
}

export interface SeccionLandingSitemap {
  id: string;
  nombre: string;
  descripcion: string;
}

const PROMPT_REQUISITOS = `Eres un Analista de Negocio y Product Owner Experto. A partir de los siguientes documentos de contexto de nuestro cliente, debes diseñar la especificación de Requerimientos Funcionales y No Funcionales, y la estructura del Sitemap (Secciones).

RELEVAMIENTO DEL CLIENTE:
---
{{relevamiento_markdown}}
---

STACK TECNOLÓGICO Y DISEÑO:
- Stack: {{stack_summary}}
- Estilo Visual: {{design_system_summary}}

INSTRUCCIONES DE RESPUESTA:
Escribe la respuesta en formato Markdown. Utiliza un lenguaje claro, sencillo y de fácil comprensión (apto para desarrolladores junior), detallando:
1. **Requisitos Funcionales**: Lista detallada de las acciones que debe poder hacer el usuario.
2. **Requisitos No Funcionales**: Parámetros de calidad, velocidad, seguridad y rendimiento.
3. **Sitemap**: El mapa de secciones o pantallas donde se ubicarán estas características.

Escribe únicamente el Markdown con estas secciones sin introducciones adicionales.`;

const PROMPT_SITEMAP_LANDING = `Eres un Arquitecto de Información, Diseñador UI/UX y Copywriter Senior. A partir del siguiente Relevamiento del Cliente, Copywriting de Marca y Enlaces de Inspiración Visual, debes diseñar la estructura detallada de secciones (Sitemap / Layout) para el sitio web.

RELEVAMIENTO DEL CLIENTE:
---
{{relevamiento_markdown}}
---

COPYWRITING DE MARCA Y CONTENIDO:
---
{{copy_contenido}}
---

ENLACES DE INSPIRACIÓN VISUAL:
---
{{links_inspiracion}}
---

INSTRUCCIONES DE RESPUESTA:
Debes devolver la estructura de la landing o sitio institucional utilizando OBLIGATORIAMENTE etiquetas de marcado con el formato exacto:
{{NOMBRE_SECCION}}
Descripción detallada de los elementos, copies, tarjetas, llamados a la acción (CTA) y componentes que irán en esta sección.
{{/NOMBRE_SECCION}}

Ejemplo:
{{HERO}}
Encabezado principal con título de alto impacto, subtítulo persuasivo, botón CTA "Agendar Demostración" y video interactivo de fondo.
{{/HERO}}

{{SERVICIOS}}
Grilla de 4 tarjetas destacando las soluciones principales de la empresa con iconos personalizados y modales explicativos.
{{/SERVICIOS}}

{{CONTACTO}}
Formulario directo de captación de leads con validación en tiempo real y mapa interactivo de la agencia.
{{/CONTACTO}}

Escribe ÚNICAMENTE los bloques etiquetados con {{NOMBRE_SECCION}} ... {{/NOMBRE_SECCION}} sin introducciones ni comentarios adicionales.`;

const PROMPT_ENTIDADES = `Eres un Arquitecto de Base de Datos y Software Experto. A partir del relevamiento, requerimientos y el stack elegido, diseña el modelado de datos en Tercera Forma Normal (3FN).

RELEVAMIENTO DEL CLIENTE:
---
{{relevamiento_markdown}}
---

REQUISITOS FUNCIONALES Y NO FUNCIONALES:
---
{{requisitos}}
---

STACK TECNOLÓGICO:
- Stack: {{stack_summary}}

INSTRUCCIONES DE DISEÑO:
1. Diseña las entidades necesarias para cumplir con los requerimientos.
2. Asegura que el modelado cumpla con la Tercera Forma Normal (3FN).
3. Usa español latinoamericano para los nombres de tablas y columnas con nomenclatura limpia y consistente (snake_case).
4. Elige los tipos de datos óptimos según el motor del stack seleccionado.
5. Devuelve la especificación en formato Markdown explicativo de las tablas y campos.
6. Escribe únicamente la documentación en Markdown sin códigos externos ni introducciones.`;

const PROMPT_BACKLOG = `Eres un Product Owner y Scrum Master. Debes transformar los requerimientos y entidades del proyecto en un plan de backlog detallado de Épicas, Historias de Usuario y Actividades.

REQUISITOS DEL PROYECTO:
---
{{requisitos}}
---

ENTIDADES DE BASE DE DATOS:
---
{{entidades}}
---

INSTRUCCIONES DE RESPUESTA:
Devuelve un JSON estrictamente estructurado según el siguiente formato, sin explicaciones ni markdown decorativo. Las descripciones y títulos deben ser en lenguaje simple y claro para desarrolladores junior.

FORMATO JSON ESPERADO:
\`\`\`json
[
  {
    "nombre": "Nombre de la Épica",
    "descripcion": "Descripción de la épica",
    "historias": [
      {
        "titulo": "Título de la Historia de Usuario",
        "descripcion": "Como [rol] quiero [acción] para [beneficio]",
        "prioridad": "Alta",
        "estimacion": 3,
        "actividades": [
          "Tarea 1",
          "Tarea 2",
          "Tarea 3"
        ]
      }
    ]
  }
]
\`\`\``;

const PROMPT_SPRINTS = `Eres un Scrum Master Senior. A partir del backlog del proyecto y la lista de Épicas/Historias/Actividades, debes organizar el trabajo en sprints de manera lógica y coherente.

BACKLOG DE HISTORIAS DEL PROYECTO:
---
{{backlog_stories}}
---

INSTRUCCIONES DE RESPUESTA:
Devuelve un JSON estrictamente estructurado según el siguiente formato, sin explicaciones ni markdown decorativo.

FORMATO JSON ESPERADO:
\`\`\`json
[
  {
    "nombre": "Sprint 1: Nombre",
    "objetivo": "Objetivo principal del sprint",
    "duracionSemanas": 2,
    "capacidad": 20,
    "historiasTitulos": [
      "Título exacto de la historia 1",
      "Título exacto de la historia 2"
    ]
  }
]
\`\`\``;

const PROMPT_INICIALIZADOR = `Eres un DevOps y Tech Lead Experto. A partir del stack y estándares elegidos, genera los comandos y scripts de terminal necesarios para inicializar manualmente el proyecto en limpio.

STACK TECNOLÓGICO:
- Stack: {{stack_summary}}

ESTÁNDARES DE INGENIERÍA:
- Estándares: {{estandares_summary}}

INSTRUCCIONES:
Proporciona paso a paso las instrucciones del setup:
1. Comandos de inicialización (ej: npm init, npx create-next-app, etc.).
2. Comandos de instalación de dependencias del stack.
3. Configuración inicial de herramientas de desarrollo (ESLint, Prettier, TypeScript, Dockerfiles).
4. Estructura de carpetas inicial.`;

export const PlanificacionIAWorkspace: React.FC<
  PlanificacionIAWorkspaceProps
> = ({ proyectoId }) => {
  const { mostrarToast } = useToast();

  // Load project details
  const proyecto = useLiveQuery(
    () => db.proyectos.get(proyectoId),
    [proyectoId]
  );

  const isLandingType =
    (proyecto?.tipo as string)?.toLowerCase().includes("landing") ||
    (proyecto?.tipo as string)?.toLowerCase().includes("institucional");

  const [activeTab, setActiveTab] = useState<
    "requisitos" | "sitemap_landing" | "entidades" | "importador" | "descargas"
  >(isLandingType ? "sitemap_landing" : "requisitos");

  useEffect(() => {
    if (isLandingType) {
      setActiveTab("sitemap_landing");
    }
  }, [isLandingType]);

  // Load context and design system
  const contexto = useLiveQuery(
    () => db.proyecto_contexto.get(proyectoId),
    [proyectoId]
  ) as any;
  const ds = useLiveQuery(
    () => db.proyecto_design_system.get(proyectoId),
    [proyectoId]
  ) as any;

  // Local state for requirements, sitemap and entities
  const [requisitosFuncionales, setRequisitosFuncionales] = useState("");
  const [requisitosNoFuncionales, setRequisitosNoFuncionales] = useState("");
  const [sitemap, setSitemap] = useState("");
  const [entidades, setEntidades] = useState("");

  // Landing Sitemap markup & sections state
  const [sitemapMarkup, setSitemapMarkup] = useState("");
  const [seccionesSitemap, setSeccionesSitemap] = useState<
    SeccionLandingSitemap[]
  >([]);

  // JSON input state for imports
  const [backlogJson, setBacklogJson] = useState("");
  const [sprintsJson, setSprintsJson] = useState("");

  useEffect(() => {
    if (contexto) {
      setRequisitosFuncionales(contexto.requisitosFuncionales || "");
      setRequisitosNoFuncionales(contexto.requisitosNoFuncionales || "");
      setSitemap(contexto.sitemap || "");
      setEntidades(contexto.entidades || "");
      setSitemapMarkup(contexto.sitemapMarkup || "");

      if (Array.isArray(contexto.seccionesSitemap)) {
        setSeccionesSitemap(contexto.seccionesSitemap);
      }
    }
  }, [contexto]);

  const parsearSitemapMarkup = (textoMarkup: string) => {
    const regex = /\{\{([A-Z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/gi;
    const secciones: SeccionLandingSitemap[] = [];
    let match;
    let index = 1;

    while ((match = regex.exec(textoMarkup)) !== null) {
      const rawNombre = match[1].trim();
      const rawDesc = match[2].trim();
      if (rawNombre) {
        secciones.push({
          id: `sec_${Date.now()}_${index++}`,
          nombre: rawNombre.toUpperCase(),
          descripcion: rawDesc,
        });
      }
    }
    return secciones;
  };

  const handleProcesarMarkup = () => {
    if (!sitemapMarkup.trim()) {
      mostrarToast(
        "Pega o escribe el marcado con etiquetas {{SECCION}} primero.",
        "error"
      );
      return;
    }

    const parseadas = parsearSitemapMarkup(sitemapMarkup);
    if (parseadas.length === 0) {
      mostrarToast(
        "No se encontraron etiquetas con el formato {{NOMBRE}}...{{/NOMBRE}}.",
        "error"
      );
      return;
    }

    setSeccionesSitemap(parseadas);
    mostrarToast(
      `¡${parseadas.length} secciones extraídas con éxito!`,
      "exito"
    );
  };

  const handleAgregarSeccionManual = () => {
    const nueva: SeccionLandingSitemap = {
      id: `sec_${Date.now()}`,
      nombre: `SECCION_${seccionesSitemap.length + 1}`,
      descripcion:
        "Descripción e indicaciones de los elementos de esta sección...",
    };
    setSeccionesSitemap([...seccionesSitemap, nueva]);
  };

  const handleActualizarSeccion = (
    id: string,
    campo: "nombre" | "descripcion",
    valor: string
  ) => {
    setSeccionesSitemap((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [campo]: valor } : s))
    );
  };

  const handleEliminarSeccion = async (secId: string, secNombre: string) => {
    // Check for linked active execution tickets in Dexie DB
    const ejecuciones = await db.task_executions
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();

    const ticketAsociado = ejecuciones.find((e: any) => {
      const data = e.data || {};
      return (
        data.seccionNombre?.toUpperCase() === secNombre.toUpperCase() ||
        data.actividadNombre?.toUpperCase().includes(secNombre.toUpperCase())
      );
    });

    if (ticketAsociado) {
      const seguro = confirm(
        `La sección "${secNombre}" tiene un ticket de desarrollo activo ("${ticketAsociado.id}"). ¿Deseas eliminar la sección y borrar permanentemente su ticket vinculado?`
      );
      if (!seguro) return;

      // Cascade delete associated execution ticket and step states
      await db.task_executions.delete(ticketAsociado.id as string);
      const stepStates = await db.task_step_states
        .where("executionId")
        .equals(ticketAsociado.id as string)
        .toArray();
      for (const s of stepStates) {
        await db.task_step_states.delete(s.id as any);
      }
      mostrarToast(`Ticket de desarrollo vinculado borrado.`, "info");
    }

    const nextSecciones = seccionesSitemap.filter((s) => s.id !== secId);
    setSeccionesSitemap(nextSecciones);

    const currentCtx = (await db.proyecto_contexto.get(proyectoId)) || {
      proyectoId,
    };
    await db.proyecto_contexto.put({
      ...currentCtx,
      seccionesSitemap: nextSecciones,
    });
    mostrarToast(`Sección "${secNombre}" eliminada.`, "exito");
  };

  const handleSave = async () => {
    try {
      const currentCtx = (await db.proyecto_contexto.get(proyectoId)) || {
        proyectoId,
      };
      await db.proyecto_contexto.put({
        ...currentCtx,
        proyectoId,
        requisitosFuncionales,
        requisitosNoFuncionales,
        sitemap,
        entidades,
        sitemapMarkup,
        seccionesSitemap,
      });
      mostrarToast(
        "Planificación y requerimientos guardados correctamente.",
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al guardar: ${err.message}`, "error");
    }
  };

  // Stack text compiler
  const compileStackSummary = () => {
    if (!proyecto?.stack) return "No configurado.";
    const list: string[] = [];
    Object.entries(proyecto.stack).forEach(([layer, techs]) => {
      if (Array.isArray(techs) && techs.length > 0) {
        list.push(`${layer}: ${techs.join(", ")}`);
      }
    });
    return list.join(" | ");
  };

  // Standards text compiler
  const compileStandardsSummary = () => {
    if (!proyecto?.estandares) return "No configurado.";
    const list: string[] = [];
    Object.entries(proyecto.estandares).forEach(([cat, techs]) => {
      if (Array.isArray(techs) && techs.length > 0) {
        list.push(`${cat}: ${techs.join(", ")}`);
      }
    });
    return list.join(" | ");
  };

  // Design System text compiler
  const compileDSSummary = () => {
    if (ds?.designSystemMarkdown) return ds.designSystemMarkdown;
    if (!ds) return "No configurado.";
    return `Arquetipo: ${ds.arquetipo || ""}, Metáfora: ${ds.metafora || ""}, Colores: ${ds.reglaColor || ""}`;
  };

  // Copiers
  const copiarPromptRequisitos = () => {
    let relevamiento = contexto?.relevamientoMarkdown || "";
    if (contexto?.copyContenido) {
      relevamiento += `\n\nCONTENIDO Y COPYWRITING DE MARCA:\n${contexto.copyContenido}`;
    }
    if (
      Array.isArray(contexto?.linksInspiracion) &&
      contexto.linksInspiracion.length > 0
    ) {
      relevamiento += `\n\nLINKS DE INSPIRACIÓN VISUAL:\n${(contexto.linksInspiracion as string[]).join("\n")}`;
    }

    if (!relevamiento.trim()) {
      mostrarToast(
        "Asegúrate de tener un Relevamiento guardado en la fase anterior.",
        "info"
      );
    }
    const prompt = PROMPT_REQUISITOS.replace(
      "{{relevamiento_markdown}}",
      relevamiento
    )
      .replace("{{stack_summary}}", compileStackSummary())
      .replace("{{design_system_summary}}", compileDSSummary());

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Requisitos copiado al portapapeles.", "exito");
  };

  const copiarPromptSitemapLanding = () => {
    const relevamiento = contexto?.relevamientoMarkdown || "No especificado.";
    const copyContenido = contexto?.copyContenido || "No especificado.";
    const linksInspiracion =
      Array.isArray(contexto?.linksInspiracion) &&
      contexto.linksInspiracion.length > 0
        ? contexto.linksInspiracion.join("\n")
        : "No especificado.";

    const prompt = PROMPT_SITEMAP_LANDING.replace(
      "{{relevamiento_markdown}}",
      relevamiento
    )
      .replace("{{copy_contenido}}", copyContenido)
      .replace("{{links_inspiracion}}", linksInspiracion);

    navigator.clipboard.writeText(prompt);
    mostrarToast(
      "Prompt de Sitemap Landing (etiquetas {{SECCION}}) copiado al portapapeles.",
      "exito"
    );
  };

  const copiarPromptEntidades = () => {
    const relevamiento = contexto?.relevamientoMarkdown || "";
    const reqText = `Requisitos Funcionales:\n${requisitosFuncionales}\n\nRequisitos No Funcionales:\n${requisitosNoFuncionales}`;

    const prompt = PROMPT_ENTIDADES.replace(
      "{{relevamiento_markdown}}",
      relevamiento
    )
      .replace("{{requisitos}}", reqText)
      .replace("{{stack_summary}}", compileStackSummary());

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Entidades copiado al portapapeles.", "exito");
  };

  const copiarPromptBacklog = () => {
    const reqText = `Requisitos Funcionales:\n${requisitosFuncionales}\n\nRequisitos No Funcionales:\n${requisitosNoFuncionales}\n\nSitemap:\n${sitemap}`;
    const prompt = PROMPT_BACKLOG.replace("{{requisitos}}", reqText).replace(
      "{{entidades}}",
      entidades || "No configurado."
    );

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Backlog copiado al portapapeles.", "exito");
  };

  const copiarPromptSprints = async () => {
    const stories = await db.historias
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    const list = stories
      .map(
        (s) =>
          `- Título: ${s.titulo} (Estimación: ${s.estimacion}, Prioridad: ${s.prioridad})`
      )
      .join("\n");

    const prompt = PROMPT_SPRINTS.replace(
      "{{backlog_stories}}",
      list || "No hay historias registradas aún."
    );

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Planificación de Sprints copiado.", "exito");
  };

  const copiarPromptInicializador = () => {
    const prompt = PROMPT_INICIALIZADOR.replace(
      "{{stack_summary}}",
      compileStackSummary()
    ).replace("{{estandares_summary}}", compileStandardsSummary());

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Setup Inicializador copiado.", "exito");
  };

  // Mass Backlog Importer
  const handleImportarBacklog = async () => {
    try {
      const parsed = JSON.parse(backlogJson);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON debe ser un arreglo de Épicas.");
      }

      for (const epica of parsed) {
        const epicaId = `epica_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 6)}`;
        await db.epicas.put({
          id: epicaId,
          proyectoId,
          nombre: epica.nombre,
          descripcion: epica.descripcion || "",
        });

        if (Array.isArray(epica.historias)) {
          for (const historia of epica.historias) {
            const historiaId = `historia_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 6)}`;
            await db.historias.put({
              id: historiaId,
              proyectoId,
              epicaId,
              sprintId: null,
              titulo: historia.titulo,
              descripcion: historia.descripcion || "",
              prioridad: historia.prioridad || "Media",
              estimacion: historia.estimacion || 1,
              estado: "por_hacer",
            });

            if (Array.isArray(historia.actividades)) {
              for (const actNombre of historia.actividades) {
                const tareaId = `tarea_${Date.now()}_${Math.random()
                  .toString(36)
                  .substring(2, 6)}`;
                await db.tareas.put({
                  id: tareaId,
                  proyectoId,
                  historiaId,
                  nombre: actNombre,
                  estado: "pendiente",
                });
              }
            }
          }
        }
      }

      setBacklogJson("");
      mostrarToast(
        "¡Backlog de Épicas, Historias y Tareas importado con éxito!",
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al importar Backlog: ${err.message}`, "error");
    }
  };

  // Mass Sprints Importer
  const handleImportarSprints = async () => {
    try {
      const parsed = JSON.parse(sprintsJson);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON debe ser un arreglo de Sprints.");
      }

      const historiasExistentes = await db.historias
        .where("proyectoId")
        .equals(proyectoId)
        .toArray();

      for (const sp of parsed) {
        const sprintId = `sprint_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 6)}`;
        await db.sprints.put({
          id: sprintId,
          proyectoId,
          nombre: sp.nombre,
          objetivo: sp.objetivo || "",
          duracionSemanas: sp.duracionSemanas || 2,
          capacidad: sp.capacidad || 20,
          estado: "planificado",
        });

        if (Array.isArray(sp.historiasTitulos)) {
          for (const titulo of sp.historiasTitulos) {
            const matched = historiasExistentes.find(
              (h: any) =>
                String(h.titulo).toLowerCase().trim() ===
                String(titulo).toLowerCase().trim()
            );
            if (matched) {
              await db.historias.update(matched.id as string, { sprintId });
            }
          }
        }
      }

      setSprintsJson("");
      mostrarToast("¡Sprints importados y vinculados correctamente!", "exito");
    } catch (err: any) {
      mostrarToast(`Error al importar Sprints: ${err.message}`, "error");
    }
  };

  const descargarTodoMarkdown = () => {
    let md = `# Planificación Completa del Proyecto: ${proyecto?.nombre || ""}\n\n`;
    md += `## 1. Requisitos Funcionales\n${
      requisitosFuncionales || "*No configurado*"
    }\n\n`;
    md += `## 2. Requisitos No Funcionales\n${
      requisitosNoFuncionales || "*No configurado*"
    }\n\n`;

    if (seccionesSitemap.length > 0) {
      md += `## 3. Estructura de Secciones (Sitemap Landing / Institucional)\n\n`;
      seccionesSitemap.forEach((sec) => {
        md += `### {{${sec.nombre}}}\n${sec.descripcion}\n\n`;
      });
    } else {
      md += `## 3. Sitemap General\n${sitemap || "*No configurado*"}\n\n`;
    }

    md += `## 4. Entidades y Modelado 3FN\n${entidades || "*No configurado*"}\n\n`;

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `planificacion_${proyecto?.nombre || proyectoId}.md`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarToast("Descargando planificación completa .md...", "info");
  };

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between border-b border-[#2A2A2E] pb-3">
        <div>
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Taller de Planificación y Requerimientos (IA Workspace)
          </h3>
          <p className="text-zinc-550 mt-0.5 font-mono text-[10px]">
            Diseña los requerimientos funcionales, estructura de secciones
            (Sitemap) y entidades 3FN.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={descargarTodoMarkdown}
            className="rounded border border-sky-500/20 bg-sky-500/10 px-2 py-1 font-mono text-[9px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
          >
            📥 Exportar .md
          </button>
          <Button onClick={handleSave}>Guardar Planificación</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2 border-b border-zinc-900 pb-2">
        <button
          onClick={() => setActiveTab("requisitos")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTab === "requisitos"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          1. Requerimientos Funcionales / No Funcionales
        </button>
        <button
          onClick={() => setActiveTab("sitemap_landing")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTab === "sitemap_landing"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          📐 Sitemap & Secciones ({"{{SECCION}}"})
        </button>
        <button
          onClick={() => setActiveTab("entidades")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTab === "entidades"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          2. Entidades & Modelado 3FN
        </button>
        <button
          onClick={() => setActiveTab("importador")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTab === "importador"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          3. Importador Masivo JSON (Backlog & Sprints)
        </button>
        <button
          onClick={() => setActiveTab("descargas")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTab === "descargas"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          4. Prompts de Inicialización
        </button>
      </div>

      {/* Tab 1: Requerimientos */}
      {activeTab === "requisitos" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
            <div>
              <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                Generador de Requerimientos y Sitemap con IA
              </span>
              <p className="font-mono text-[9px] text-zinc-500">
                Inyecta el relevamiento, copy de marca, inspiración visual,
                stack y design system en un prompt estructurado para
                desarrolladores junior.
              </p>
            </div>
            <button
              onClick={copiarPromptRequisitos}
              className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
            >
              📋 Copiar Prompt IA
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                Requisitos Funcionales (Language Claro/Junior)
              </label>
              <textarea
                value={requisitosFuncionales}
                onChange={(e) => setRequisitosFuncionales(e.target.value)}
                placeholder="Pegar aquí la lista de requisitos funcionales devueltos por la IA..."
                rows={10}
                className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-300 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                Requisitos No Funcionales
              </label>
              <textarea
                value={requisitosNoFuncionales}
                onChange={(e) => setRequisitosNoFuncionales(e.target.value)}
                placeholder="Rendimiento, seguridad, SEO, accesibilidad..."
                rows={10}
                className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-300 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              Sitemap y Mapa de Secciones Generales
            </label>
            <textarea
              value={sitemap}
              onChange={(e) => setSitemap(e.target.value)}
              placeholder="Descripción general de páginas y rutas del sistema..."
              rows={4}
              className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-300 outline-none"
            />
          </div>
        </div>
      )}

      {/* Tab: Sitemap & Secciones Landing */}
      {activeTab === "sitemap_landing" && (
        <div className="flex flex-col gap-5">
          {/* Prompt Generator Banner */}
          <div className="flex items-start justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
            <div>
              <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                Generador de Sitemap por Secciones con IA ({`{{SECCION}}`})
              </span>
              <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
                Copia el prompt estructurado para pasarle a la IA el
                Relevamiento + Copywriting de Marca + Inspiración Visual. La IA
                te devolverá los bloques etiquetados con{" "}
                {`{{NOMBRE}} ... {{/NOMBRE}}`}.
              </p>
            </div>
            <button
              onClick={copiarPromptSitemapLanding}
              className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
            >
              📋 Copiar Prompt IA Sitemap
            </button>
          </div>

          {/* Tag Parser Area */}
          <div className="flex flex-col gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] font-bold text-sky-400 uppercase">
                Marcado Rápido con Etiquetas ({`{{HERO}}`})
              </span>
              <span className="font-mono text-[8px] text-zinc-500">
                Formato: {`{{SECCION}} Descripción de la sección {{/SECCION}}`}
              </span>
            </div>
            <textarea
              value={sitemapMarkup}
              onChange={(e) => setSitemapMarkup(e.target.value)}
              placeholder={`Ejemplo:\n{{HERO}}\nTítulo de alto impacto, CTA de contacto y video de fondo.\n{{/HERO}}\n\n{{SERVICIOS}}\nTarjetas con los 4 servicios principales.\n{{/SERVICIOS}}`}
              rows={5}
              className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-300 outline-none"
            />
            <button
              type="button"
              onClick={handleProcesarMarkup}
              className="self-end rounded bg-sky-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-sky-400"
            >
              ⚡ Procesar Marcado {`{{SECCION}}`}
            </button>
          </div>

          {/* Dynamic Section Cards List */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                Estructura de Secciones ({seccionesSitemap.length})
              </span>
              <button
                onClick={handleAgregarSeccionManual}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
              >
                + Agregar Sección Manual
              </button>
            </div>

            {seccionesSitemap.length === 0 ? (
              <div className="border-zinc-850 rounded-xl border border-dashed bg-zinc-950/40 p-8 text-center">
                <p className="font-mono text-[10px] text-zinc-500">
                  No hay secciones definidas aún. Copia el prompt para la IA,
                  pega el marcado con etiquetas o presiona &quot;+ Agregar
                  Sección Manual&quot;.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {seccionesSitemap.map((sec) => (
                  <div
                    key={sec.id}
                    className="flex flex-col gap-2 rounded-xl border border-[#2A2A2E] bg-zinc-950/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-2">
                      <div className="flex flex-1 items-center gap-2">
                        <span className="font-mono text-[9px] font-bold text-emerald-400 uppercase">
                          {`{{`}
                        </span>
                        <input
                          type="text"
                          value={sec.nombre}
                          onChange={(e) =>
                            handleActualizarSeccion(
                              sec.id,
                              "nombre",
                              e.target.value.toUpperCase()
                            )
                          }
                          className="max-w-[280px] flex-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] font-bold text-zinc-100 outline-none"
                        />
                        <span className="font-mono text-[9px] font-bold text-emerald-400 uppercase">
                          {`}}`}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleEliminarSeccion(sec.id, sec.nombre)
                        }
                        className="font-mono text-[9px] text-red-400 underline hover:text-red-300"
                      >
                        × Eliminar Sección
                      </button>
                    </div>

                    <textarea
                      value={sec.descripcion}
                      onChange={(e) =>
                        handleActualizarSeccion(
                          sec.id,
                          "descripcion",
                          e.target.value
                        )
                      }
                      placeholder="Descripción detallada e indicaciones de lo que incluye esta sección..."
                      rows={3}
                      className="border-zinc-850 w-full rounded border bg-zinc-900 p-2 font-mono text-[10px] text-zinc-300 outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Entidades */}
      {activeTab === "entidades" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
            <div>
              <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                Modelado de Datos 3FN con IA
              </span>
              <p className="font-mono text-[9px] text-zinc-500">
                A partir de los requisitos funcionales, genera las tablas en 3FN
                con nomenclatura en español latino.
              </p>
            </div>
            <button
              onClick={copiarPromptEntidades}
              className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
            >
              📋 Copiar Prompt Entidades
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              Especificación de Entidades y Campos (3FN)
            </label>
            <textarea
              value={entidades}
              onChange={(e) => setEntidades(e.target.value)}
              placeholder="Pegar aquí la especificación de entidades devuelta por la IA..."
              rows={12}
              className="border-zinc-850 w-full rounded border bg-zinc-950 p-2 font-mono text-[10px] text-zinc-300 outline-none"
            />
          </div>
        </div>
      )}

      {/* Tab 3: Importador JSON */}
      {activeTab === "importador" && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                  1. Importación Masiva de Backlog (Épicas / Historias /
                  Actividades)
                </span>
                <p className="font-mono text-[9px] text-zinc-500">
                  Copia el prompt del backlog, pásalo a la IA y pega el JSON
                  devuelto aquí para cargar todo el backlog automáticamente.
                </p>
              </div>
              <button
                onClick={copiarPromptBacklog}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
              >
                📋 Copiar Prompt Backlog
              </button>
            </div>
            <textarea
              value={backlogJson}
              onChange={(e) => setBacklogJson(e.target.value)}
              placeholder="Pega aquí el JSON devuelto por la IA..."
              rows={5}
              className="border-zinc-850 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none"
            />
            <button
              onClick={handleImportarBacklog}
              className="self-end rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400"
            >
              Procesar e Importar Backlog
            </button>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                  2. Importación Masiva de Configuración de Sprints
                </span>
                <p className="font-mono text-[9px] text-zinc-500">
                  Organiza las historias de usuario en Sprints pegando el JSON
                  devuelto por la IA.
                </p>
              </div>
              <button
                onClick={copiarPromptSprints}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
              >
                📋 Copiar Prompt Sprints
              </button>
            </div>
            <textarea
              value={sprintsJson}
              onChange={(e) => setSprintsJson(e.target.value)}
              placeholder="Pega aquí el JSON de configuración de Sprints..."
              rows={5}
              className="border-zinc-850 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none"
            />
            <button
              onClick={handleImportarSprints}
              className="self-end rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400"
            >
              Procesar e Importar Sprints
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Descargas / Prompt Inicializador */}
      {activeTab === "descargas" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-4">
            <div>
              <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                Setup Inicializador del Proyecto (Terminal & Scripts)
              </span>
              <p className="font-mono text-[9px] text-zinc-500">
                Genera los comandos de inicialización paso a paso para arrancar
                la base del proyecto en tu máquina.
              </p>
            </div>
            <button
              onClick={copiarPromptInicializador}
              className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
            >
              📋 Copiar Prompt Setup
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};
