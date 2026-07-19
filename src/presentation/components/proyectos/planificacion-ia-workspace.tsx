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
Devuelve únicamente una lista JSON con la división de sprints recomendada. Cada historia debe ser asignada a un sprint referenciándola por su título exacto.

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
  const [activeTab, setActiveTab] = useState<
    "requisitos" | "entidades" | "importador" | "descargas"
  >("requisitos");

  // Load project details
  const proyecto = useLiveQuery(
    () => db.proyectos.get(proyectoId),
    [proyectoId]
  );

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

  // JSON input state for imports
  const [backlogJson, setBacklogJson] = useState("");
  const [sprintsJson, setSprintsJson] = useState("");

  useEffect(() => {
    if (contexto) {
      setRequisitosFuncionales(contexto.requisitosFuncionales || "");
      setRequisitosNoFuncionales(contexto.requisitosNoFuncionales || "");
      setSitemap(contexto.sitemap || "");
      setEntidades(contexto.entidades || "");
    }
  }, [contexto]);

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
    const relevamiento = contexto?.relevamientoMarkdown || "";
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
      list || "No hay historias en el backlog."
    );
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Sprints copiado al portapapeles.", "exito");
  };

  const copiarPromptInicializador = () => {
    const prompt = PROMPT_INICIALIZADOR.replace(
      "{{stack_summary}}",
      compileStackSummary()
    ).replace("{{estandares_summary}}", compileStandardsSummary());

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Inicialización copiado al portapapeles.", "exito");
  };

  // Importers
  const importarBacklog = async () => {
    try {
      const data = JSON.parse(backlogJson);
      if (!Array.isArray(data))
        throw new Error("El JSON debe ser un array de épicas.");

      await db.transaction(
        "rw",
        [db.epicas, db.historias, db.tareas],
        async () => {
          for (const epica of data) {
            const epicaId = `epi_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            await db.epicas.put({
              id: epicaId,
              proyectoId,
              nombre: epica.nombre,
              descripcion: epica.descripcion || "",
              creadoEn: Date.now(),
            });

            if (Array.isArray(epica.historias)) {
              for (const historia of epica.historias) {
                const historiaId = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                await db.historias.put({
                  id: historiaId,
                  proyectoId,
                  epicaId,
                  titulo: historia.titulo,
                  descripcion: historia.descripcion || "",
                  prioridad: historia.prioridad || "Media",
                  estimacion: Number(historia.estimacion) || 3,
                  estado: "todo",
                });

                if (Array.isArray(historia.actividades)) {
                  for (const act of historia.actividades) {
                    const tareaId = `tar_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    await db.tareas.put({
                      id: tareaId,
                      proyectoId,
                      historiaId,
                      titulo: act,
                      estado: "todo",
                      creadoEn: Date.now(),
                    });
                  }
                }
              }
            }
          }
        }
      );

      setBacklogJson("");
      mostrarToast("¡Backlog importado con éxito!", "exito");
    } catch (err: any) {
      mostrarToast(`Error al importar backlog: ${err.message}`, "error");
    }
  };

  const importarSprints = async () => {
    try {
      const data = JSON.parse(sprintsJson);
      if (!Array.isArray(data))
        throw new Error("El JSON debe ser un array de sprints.");

      await db.transaction("rw", [db.sprints, db.historias], async () => {
        for (const sprint of data) {
          const sprintId = `spr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          const start = Date.now();
          const weeks = Number(sprint.duracionSemanas) || 2;
          const end = start + weeks * 7 * 24 * 60 * 60 * 1000;

          await db.sprints.put({
            id: sprintId,
            proyectoId,
            nombre: sprint.nombre,
            objetivo: sprint.objetivo || "",
            duracionSemanas: weeks,
            fechaInicio: start,
            fechaFin: end,
            capacidad: Number(sprint.capacidad) || 20,
            estado: "planificacion",
          });

          if (Array.isArray(sprint.historiasTitulos)) {
            for (const title of sprint.historiasTitulos) {
              const matches = await db.historias
                .where("proyectoId")
                .equals(proyectoId)
                .filter(
                  (h) =>
                    ((h.titulo as string) || "").toLowerCase().trim() ===
                    title.toLowerCase().trim()
                )
                .toArray();

              for (const match of matches) {
                await db.historias.update(match.id as string, { sprintId });
              }
            }
          }
        }
      });

      setSprintsJson("");
      mostrarToast("¡Sprints importados y vinculados correctamente!", "exito");
    } catch (err: any) {
      mostrarToast(`Error al importar sprints: ${err.message}`, "error");
    }
  };

  // Exporters download files
  const descargarRequerimientos = () => {
    let md = `# Requerimientos del Proyecto: ${proyecto?.nombre || "Especificaciones"}\n\n`;
    md += `## 1. Requisitos Funcionales\n\n${requisitosFuncionales || "*No cargados.*"}\n\n`;
    md += `## 2. Requisitos No Funcionales\n\n${requisitosNoFuncionales || "*No cargados.*"}\n\n`;
    md += `## 3. Sitemap (Secciones)\n\n${sitemap || "*No cargado.*"}\n\n`;
    md += `## 4. Entidades y Modelado de Datos (3FN)\n\n${entidades || "*No cargado.*"}\n`;

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `requerimientos_${proyectoId}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarToast("Descargando requerimientos.md...", "info");
  };

  const descargarPlanificacion = async () => {
    const epicasList = await db.epicas
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    const historiasList = await db.historias
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    const tareasList = await db.tareas
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();

    let md = `# Planificación de Épicas, Historias y Actividades\n\n`;
    if (epicasList.length === 0) {
      md += `*No hay backlog ni planificación de épicas estructurada en el sistema.*\n`;
    } else {
      epicasList.forEach((epi) => {
        md += `## Épica: ${epi.nombre}\n`;
        md += `> ${epi.descripcion || "Sin descripción"}\n\n`;

        const subHist = historiasList.filter((h) => h.epicaId === epi.id);
        subHist.forEach((hist) => {
          md += `- [ ] **Historia:** ${hist.titulo} (Prioridad: ${hist.prioridad || "Media"}, Estimación: ${hist.estimacion || 3}h)\n`;
          md += `  *Descripción:* ${hist.descripcion || "Sin descripción"}\n`;

          const subTasks = tareasList.filter((t) => t.historiaId === hist.id);
          if (subTasks.length > 0) {
            md += `  *Actividades (Checklist):*\n`;
            subTasks.forEach((t) => {
              md += `    - [ ] ${t.titulo}\n`;
            });
          }
          md += `\n`;
        });
        md += `\n---\n\n`;
      });
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `planificacion_${proyectoId}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarToast("Descargando planificacion.md...", "info");
  };

  const descargarBacklog = async () => {
    const historiasList = await db.historias
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    let md = `# Backlog General de Historias de Usuario\n\n`;
    if (historiasList.length === 0) {
      md += `*El backlog está vacío.*\n`;
    } else {
      historiasList.forEach((hist) => {
        md += `- [ ] **${hist.titulo}**\n`;
        md += `  * Prioridad: ${hist.prioridad || "Media"}\n`;
        md += `  * Estimación: ${hist.estimacion || 3} puntos\n`;
        md += `  * Detalle: ${hist.descripcion || "Sin descripción"}\n\n`;
      });
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `backlog_${proyectoId}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarToast("Descargando backlog.md...", "info");
  };

  const descargarSprints = async () => {
    const sprintsList = await db.sprints
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    const historiasList = await db.historias
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();

    let md = `# Planificación de Sprints del Proyecto\n\n`;
    if (sprintsList.length === 0) {
      md += `*No se han planificado sprints para este proyecto.*\n`;
    } else {
      sprintsList.forEach((spr) => {
        md += `## Sprint: ${spr.nombre} [Estado: ${((spr.estado as string) || "").toUpperCase()}]\n`;
        md += `* **Objetivo:** ${spr.objetivo || "Sin objetivo definido"}\n`;
        md += `* **Duración:** ${spr.duracionSemanas} semanas\n`;
        md += `* **Capacidad:** ${spr.capacidad} puntos\n\n`;
        md += `### Historias Asignadas:\n`;

        const subHist = historiasList.filter(
          (h) => h.sprintId === (spr.id as string)
        );
        if (subHist.length === 0) {
          md += `*Ninguna historia de usuario asignada a este sprint.*\n`;
        } else {
          subHist.forEach((h) => {
            md += `- [ ] ${h.titulo} (Estimación: ${h.estimacion || 3} ptos, Prioridad: ${h.prioridad})\n`;
          });
        }
        md += `\n---\n\n`;
      });
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sprints_${proyectoId}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarToast("Descargando sprints.md...", "info");
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-3">
        <div>
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Planificación y Especificaciones (IA Taller)
          </h3>
          <p className="text-zinc-550 mt-0.5 font-mono text-[9px]">
            Define requerimientos, modela entidades y genera sprints cargando
            información de la IA.
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-zinc-900 pb-2">
        <button
          onClick={() => setActiveTab("requisitos")}
          className={`rounded px-3 py-1 font-mono text-[10px] font-bold uppercase ${
            activeTab === "requisitos"
              ? "border border-sky-500/20 bg-sky-500/10 text-sky-400"
              : "text-zinc-550 hover:text-zinc-350 bg-zinc-950"
          }`}
        >
          📋 Requisitos y Sitemap
        </button>
        <button
          onClick={() => setActiveTab("entidades")}
          className={`rounded px-3 py-1 font-mono text-[10px] font-bold uppercase ${
            activeTab === "entidades"
              ? "border border-sky-500/20 bg-sky-500/10 text-sky-400"
              : "text-zinc-550 hover:text-zinc-350 bg-zinc-950"
          }`}
        >
          🗄️ Entidades (3FN)
        </button>
        <button
          onClick={() => setActiveTab("importador")}
          className={`rounded px-3 py-1 font-mono text-[10px] font-bold uppercase ${
            activeTab === "importador"
              ? "border border-sky-500/20 bg-sky-500/10 text-sky-400"
              : "text-zinc-550 hover:text-zinc-350 bg-zinc-950"
          }`}
        >
          📥 Importador de Backlog / Sprints
        </button>
        <button
          onClick={() => setActiveTab("descargas")}
          className={`rounded px-3 py-1 font-mono text-[10px] font-bold uppercase ${
            activeTab === "descargas"
              ? "border border-sky-500/20 bg-sky-500/10 text-sky-400"
              : "text-zinc-550 hover:text-zinc-350 bg-zinc-950"
          }`}
        >
          💾 Descargas y Prompts Setup
        </button>
      </div>

      {/* Tab: Requisitos */}
      {activeTab === "requisitos" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
            <div>
              <span className="block font-mono text-[9px] font-bold text-zinc-400 uppercase">
                🚀 Generador de Requerimientos & Sitemap
              </span>
              <span className="text-zinc-650 mt-0.5 block text-[8px]">
                Genera un prompt simplificado para desarrolladores junior
                uniendo el Relevamiento + Stack
              </span>
            </div>
            <button
              onClick={copiarPromptRequisitos}
              className="rounded border border-sky-500/20 bg-sky-500/10 px-4 py-2 font-mono text-[9px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
            >
              Copiar Prompt
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                Requisitos Funcionales
              </label>
              <textarea
                value={requisitosFuncionales}
                onChange={(e) => setRequisitosFuncionales(e.target.value)}
                placeholder="Pega aquí los requisitos funcionales generados por la IA en un lenguaje simple para junior..."
                rows={10}
                className="w-full rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 font-mono text-xs text-zinc-200 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                Requisitos No Funcionales
              </label>
              <textarea
                value={requisitosNoFuncionales}
                onChange={(e) => setRequisitosNoFuncionales(e.target.value)}
                placeholder="Pega aquí los requisitos no funcionales..."
                rows={10}
                className="w-full rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 font-mono text-xs text-zinc-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              Sitemap (Secciones del Sistema)
            </label>
            <textarea
              value={sitemap}
              onChange={(e) => setSitemap(e.target.value)}
              placeholder="Estructura de pantallas, rutas o layouts donde residen las funcionalidades..."
              rows={4}
              className="w-full rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 font-mono text-xs text-zinc-200 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-[#2A2A2E] pt-3">
            <Button onClick={handleSave}>Guardar Especificación</Button>
          </div>
        </div>
      )}

      {/* Tab: Entidades */}
      {activeTab === "entidades" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
            <div>
              <span className="block font-mono text-[9px] font-bold text-zinc-400 uppercase">
                🚀 Generador de Entidades (3FN)
              </span>
              <span className="text-zinc-650 mt-0.5 block text-[8px]">
                Genera un prompt consolidando stack y requerimientos para
                diseñar las tablas de base de datos
              </span>
            </div>
            <button
              onClick={copiarPromptEntidades}
              className="rounded border border-sky-500/20 bg-sky-500/10 px-4 py-2 font-mono text-[9px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
            >
              Copiar Prompt
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              Modelado de Tablas y Columnas (Base de Datos)
            </label>
            <textarea
              value={entidades}
              onChange={(e) => setEntidades(e.target.value)}
              placeholder="Especificación de tablas, llaves primarias, foráneas y tipos de datos..."
              rows={15}
              className="w-full rounded-xl border border-[#2A2A2E] bg-zinc-950 p-3 font-mono text-xs text-zinc-200 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-[#2A2A2E] pt-3">
            <Button onClick={handleSave}>Guardar Entidades</Button>
          </div>
        </div>
      )}

      {/* Tab: Importador */}
      {activeTab === "importador" && (
        <div className="flex flex-col gap-5">
          {/* Section 1: Epics and Backlog JSON Import */}
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="block font-mono text-[10px] font-bold text-zinc-300 uppercase">
                  🛠️ Paso 1: Importar Épicas / Historias / Actividades (JSON)
                </span>
                <span className="text-zinc-650 mt-0.5 block text-[8px]">
                  Copia el prompt, pásalo a la IA y pega el JSON de retorno para
                  poblar el backlog
                </span>
              </div>
              <button
                onClick={copiarPromptBacklog}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
              >
                Copiar Prompt Backlog
              </button>
            </div>
            <textarea
              value={backlogJson}
              onChange={(e) => setBacklogJson(e.target.value)}
              placeholder='[{"nombre": "Gestión de Pedidos", "descripcion": "...", "historias": [{"titulo": "Crear carrito", "descripcion": "Como...", "prioridad": "Alta", "estimacion": 3, "actividades": ["Crear botón", "Guardar local"]}]}]'
              rows={6}
              className="w-full rounded-xl border border-zinc-900 bg-zinc-950 p-3 font-mono text-[10px] text-zinc-300 focus:outline-none"
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={importarBacklog}
                className="rounded bg-emerald-500 px-4 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-600"
              >
                Importar Backlog JSON
              </button>
            </div>
          </div>

          {/* Section 2: Sprints JSON Import */}
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="block font-mono text-[10px] font-bold text-zinc-300 uppercase">
                  🚀 Paso 2: Importar Planificación de Sprints (JSON)
                </span>
                <span className="text-zinc-650 mt-0.5 block text-[8px]">
                  Divide las historias de usuario en varios sprints cronológicos
                  mediante JSON
                </span>
              </div>
              <button
                onClick={copiarPromptSprints}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
              >
                Copiar Prompt Sprints
              </button>
            </div>
            <textarea
              value={sprintsJson}
              onChange={(e) => setSprintsJson(e.target.value)}
              placeholder='[{"nombre": "Sprint 1: Núcleo", "objetivo": "Montar autenticación", "duracionSemanas": 2, "capacidad": 20, "historiasTitulos": ["Crear carrito"]}]'
              rows={6}
              className="w-full rounded-xl border border-zinc-900 bg-zinc-950 p-3 font-mono text-[10px] text-zinc-300 focus:outline-none"
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={importarSprints}
                className="rounded bg-emerald-500 px-4 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-600"
              >
                Importar Sprints JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Descargas & Prompts Setup */}
      {activeTab === "descargas" && (
        <div className="flex flex-col gap-4">
          {/* Script Initializer Generator */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
            <div>
              <span className="block font-mono text-[9px] font-bold text-zinc-400 uppercase">
                🚀 Prompt para Inicializar el Proyecto
              </span>
              <span className="text-zinc-650 mt-0.5 block text-[8px]">
                Copia el prompt consolidado para que la IA genere los comandos
                de terminal de setup
              </span>
            </div>
            <button
              onClick={copiarPromptInicializador}
              className="rounded border border-sky-500/20 bg-sky-500/10 px-4 py-2 font-mono text-[9px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
            >
              Copiar Prompt Setup
            </button>
          </div>

          <div className="rounded-xl border border-zinc-900 bg-zinc-950/20 p-4">
            <span className="mb-3 block font-mono text-[10px] font-bold text-zinc-300 uppercase">
              💾 Exportar Documentación del Proyecto (.md Checklists)
            </span>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                onClick={descargarRequerimientos}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-center transition-all hover:border-sky-500/40 hover:bg-zinc-900"
              >
                <span className="text-xl">📋</span>
                <span className="mt-2 font-mono text-[10px] font-bold text-zinc-200">
                  requerimientos.md
                </span>
                <span className="text-zinc-550 mt-0.5 text-[8px]">
                  Requisitos y Entidades
                </span>
              </button>

              <button
                onClick={descargarPlanificacion}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-center transition-all hover:border-sky-500/40 hover:bg-zinc-900"
              >
                <span className="text-xl">🛠️</span>
                <span className="mt-2 font-mono text-[10px] font-bold text-zinc-200">
                  planificacion.md
                </span>
                <span className="text-zinc-550 mt-0.5 text-[8px]">
                  Épicas e Historias
                </span>
              </button>

              <button
                onClick={descargarBacklog}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-center transition-all hover:border-sky-500/40 hover:bg-zinc-900"
              >
                <span className="text-xl">📂</span>
                <span className="mt-2 font-mono text-[10px] font-bold text-zinc-200">
                  backlog.md
                </span>
                <span className="text-zinc-550 mt-0.5 text-[8px]">
                  General Stories List
                </span>
              </button>

              <button
                onClick={descargarSprints}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-center transition-all hover:border-sky-500/40 hover:bg-zinc-900"
              >
                <span className="text-xl">🚀</span>
                <span className="mt-2 font-mono text-[10px] font-bold text-zinc-200">
                  sprints.md
                </span>
                <span className="text-zinc-550 mt-0.5 text-[8px]">
                  Organización Ágil
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
