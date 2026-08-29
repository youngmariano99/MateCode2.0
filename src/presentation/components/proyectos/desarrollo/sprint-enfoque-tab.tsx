/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../../card";
import { db } from "../../../../offline/dexie/db";
import { QueueService } from "../../../../offline/services/queue.service";
import { useToast } from "../../../hooks/useToast";

interface SprintEnfoqueTabProps {
  proyecto: any;
  sprints: any[];
  historias: any[];
  historiasSprint: any[];
  epicas: any[];
  tareas: any[];
  actividadesSprint: any[];
  focusedSprint: any | null;
  selectedSprintId: string;
  setSelectedSprintId: (id: string) => void;
  iniciarSprint: () => void;
  finalizarSprint: (targetSprintId?: string) => void;
  cancelarSprint: (reiniciarTareas: boolean) => void;
  iniciarCintaProduccionActividad: (act: any) => void;
  handleUpdateActividadEstado: (id: string, nuevoEstado: string) => void;
  setIsImportDesvioOpen: (open: boolean) => void;
}

const KANBAN_COLUMNS = [
  { key: "todo", label: "Por Hacer", color: "text-zinc-400 border-zinc-800" },
  {
    key: "in_progress",
    label: "En Progreso",
    color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  },
  {
    key: "in_revision",
    label: "En Revisión",
    color: "text-sky-400 border-sky-500/20 bg-sky-500/5",
  },
  {
    key: "completado",
    label: "Completado",
    color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  },
];

const COLUMN_FLOW = ["todo", "in_progress", "in_revision", "completado"];

export const SprintEnfoqueTab: React.FC<SprintEnfoqueTabProps> = ({
  proyecto,
  sprints: rawSprints,
  historias,
  historiasSprint,
  epicas,
  tareas,
  actividadesSprint,
  focusedSprint,
  selectedSprintId,
  setSelectedSprintId,
  iniciarSprint,
  finalizarSprint,
  cancelarSprint,
  iniciarCintaProduccionActividad,
  handleUpdateActividadEstado,
  setIsImportDesvioOpen,
}) => {
  const sprints = (rawSprints || []).filter((s) => !s.eliminado);
  const { mostrarToast } = useToast();

  const PROMPT_SPRINTS_CONTINUACION = `<rol>
Actúa como Scrum Master y Tech Lead Senior.
Tu objetivo es planificar nuevos Sprints correctivos o de extensión para desarrollar funcionalidades faltantes o nuevas, basándote en la situación actual del Backlog del proyecto.
</rol>

<contexto>
  - Proyecto: {{nombre_proyecto}}
  - Descripción: {{descripcion_proyecto}}
  - Stack Técnico y Estándares:
{{CLAUDE_MD}}

  - Sitemap / Mapa del Sitio actual:
{{sitemap}}

  - Backlog de Épicas e Historias Existentes:
{{backlog_historias}}
</contexto>

<instrucciones_de_usuario>
El usuario indica lo siguiente sobre lo que se necesita desarrollar a continuación:
"{{instrucciones_usuario}}"
</instrucciones_de_usuario>

<reglas_de_generacion>
1. COHERENCIA LOGÍSTICA: Si se trata de desarrollar algo que faltó de sprints anteriores, asocia las nuevas historias/actividades a las Épicas existentes. Si son nuevas funcionalidades, crea las Épicas y las Historias de Usuario correspondientes.
2. DETALLE TÉCNICO COMPLETO: Para cada nueva historia de usuario o actividad técnica que agregues, debes especificar:
   - Las actividades técnicas individuales (desglose de tareas).
   - Para cada actividad, define:
     - "rol": El rol técnico idóneo (BD, Backend, Frontend, QA, etc.).
     - "componente": El nombre del archivo o componente a crear o modificar.
     - "ruta": La ruta de archivos sugerida dentro del repositorio.
     - "modulo": El nombre del módulo del sistema.
     - "etiquetas": Array de tecnologías/keywords.
     - "pasos": Checklist detallado de pasos de implementación.
     - "criteriosAceptacion": Criterios de aceptación técnicos que validen la tarea.
     - "seed": (Opcional) Directrices de datos semilla si la actividad requiere sembrar base de datos.
3. ESTADO INICIAL: Todo nuevo sprint, historia y actividad que se cree debe inicializarse con estado planificado/pendiente ("todo" / "planificado").
</reglas_de_generacion>

<output_requerido>
Devuelve ÚNICAMENTE un array JSON válido con la siguiente estructura, sin texto explicativo, sin bloques de código markdown extra (solo el JSON crudo):
[
  {
    "sprintNombre": "Sprint X: [Breve título descriptivo del sprint]",
    "sprintObjetivo": "[Objetivo principal del sprint]",
    "sprintDuracionSemanas": 2,
    "sprintCapacidad": 20,
    "historias": [
      {
        "epicaNombre": "[Nombre de Épica existente o una nueva si es funcionalidad nueva]",
        "epicaDescripcion": "[Descripción de la épica si es nueva, o vacío/omitido si ya existe]",
        "titulo": "[Título descriptivo de la Historia de Usuario]",
        "descripcion": "[Como usuario quiero... para... (Criterios de aceptación generales)]",
        "prioridad": "Alta" | "Media" | "Baja",
        "estimacion": 5,
        "actividades": [
          {
            "titulo": "[Título de la actividad técnica]",
            "rol": "Backend" | "Frontend" | "BD" | "QA" | "Devops",
            "componente": "[Nombre de componente/archivo]",
            "ruta": "[Ruta sugerida]",
            "modulo": "[Nombre del módulo]",
            "etiquetas": ["etiqueta1", "etiqueta2"],
            "pasos": [
              "Paso 1...",
              "Paso 2..."
            ],
            "criteriosAceptacion": [
              "Criterio 1...",
              "Criterio 2..."
            ],
            "seed": {
              "modelo": "[Nombre de tabla/entidad si requiere datos semilla, sino omitir]",
              "volumen": 10,
              "indicaciones": "[Directrices de datos de prueba]"
            }
          }
        ]
      }
    ]
  }
]
</output_requerido>`;

  // Extension Modal States
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [extensionTab, setExtensionTab] = useState<"sprint" | "backlog" | "ia">(
    "ia"
  );

  // Form states for manual sprint
  const [newSprintNombre, setNewSprintNombre] = useState("");
  const [newSprintObjetivo, setNewSprintObjetivo] = useState("");
  const [newSprintDuracion, setNewSprintDuracion] = useState(2);
  const [newSprintCapacidad, setNewSprintCapacidad] = useState(20);

  // Form states for IA Tab
  const [userInstructions, setUserInstructions] = useState("");
  const [backlogJson, setBacklogJson] = useState("");

  // Planificar backlog states
  const [selectedSprintForAssign, setSelectedSprintForAssign] = useState("");

  // Set default selected sprint for assignment when sprints load
  useEffect(() => {
    const defaultSprint = sprints.find(
      (s) => s.estado === "planificado" || s.estado === "activo"
    );
    if (defaultSprint && !selectedSprintForAssign) {
      const timer = setTimeout(() => {
        setSelectedSprintForAssign(defaultSprint.id);
      }, 0);
      return () => clearTimeout(timer);
    } else if (sprints.length > 0 && !selectedSprintForAssign) {
      const timer = setTimeout(() => {
        setSelectedSprintForAssign(sprints[0].id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [sprints, selectedSprintForAssign]);

  const handleFinalizarDesarrollo = async () => {
    if (!proyecto) return;
    if (
      confirm(
        `¿Estás seguro de dar por finalizado el desarrollo del proyecto "${proyecto.nombre}"? Esto cambiará su estado a "Finalizado".`
      )
    ) {
      try {
        await db.transaction(
          "rw",
          [db.proyectos, db.cola_eventos],
          async () => {
            await db.proyectos.update(proyecto.id, { estado: "Finalizado" });
            await QueueService.encolar("proyectos", "editar", proyecto.id, {
              id: proyecto.id,
              estado: "Finalizado",
            });
          }
        );
        mostrarToast("Desarrollo finalizado con éxito.", "exito");
      } catch (err: any) {
        mostrarToast("Error al finalizar desarrollo: " + err.message, "error");
      }
    }
  };

  const handleCrearSprintManual = async () => {
    if (!proyecto) return;
    if (!newSprintNombre.trim()) {
      mostrarToast("El nombre del sprint es obligatorio.", "error");
      return;
    }
    const sprintId = `spr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const start = Date.now();
    const end = start + newSprintDuracion * 7 * 24 * 60 * 60 * 1000;

    const payload = {
      id: sprintId,
      proyectoId: proyecto.id,
      nombre: newSprintNombre,
      duracionSemanas: newSprintDuracion,
      fechaInicio: start,
      fechaFin: end,
      objetivo: newSprintObjetivo,
      capacidad: newSprintCapacidad,
      estado: "planificado",
    };

    try {
      await db.transaction("rw", [db.sprints, db.cola_eventos], async () => {
        await db.sprints.add(payload);
        await QueueService.encolar("sprints", "crear", sprintId, payload);
      });
      setNewSprintNombre("");
      setNewSprintObjetivo("");
      setIsExtensionModalOpen(false);
      mostrarToast("Sprint planificado con éxito.", "exito");
    } catch (err: any) {
      mostrarToast("Error al crear sprint: " + err.message, "error");
    }
  };

  const handleAsignarHistoriaASprint = async (storyId: string) => {
    if (!selectedSprintForAssign) {
      mostrarToast("Selecciona un sprint de destino.", "error");
      return;
    }
    try {
      await db.transaction("rw", [db.historias, db.cola_eventos], async () => {
        await db.historias.update(storyId, {
          sprintId: selectedSprintForAssign,
        });
        await QueueService.encolar("historias", "editar", storyId, {
          id: storyId,
          sprintId: selectedSprintForAssign,
        });
      });
      mostrarToast("Historia asignada con éxito.", "exito");
    } catch (err: any) {
      mostrarToast("Error al asignar historia: " + err.message, "error");
    }
  };

  const handleCopiarPromptIA = async () => {
    if (!proyecto) return;
    try {
      const ctx = await db.proyecto_contexto.get(proyecto.id);
      const sitemapContent = String(
        (ctx as any)?.sitemapSystemMarkdown ||
          (ctx as any)?.sitemapMarkup ||
          (ctx as any)?.sitemap ||
          "No configurado."
      );

      const backlogText = epicas
        .map((e) => {
          const storyList = historias.filter((h) => h.epicaId === e.id);
          const storyText = storyList
            .map((h) => {
              const sprint = sprints.find((s) => s.id === h.sprintId);
              const sprintText = sprint
                ? ` (Sprint: ${sprint.nombre}, Estado Sprint: ${sprint.estado})`
                : " (En Backlog)";
              return `    - Historia: "${h.titulo}" [Prioridad: ${h.prioridad || "Media"}, Estimación: ${h.estimacion || 3} Ptos, Estado: ${h.estado || "Todo"}]${sprintText}\n      Criterios/Descripción: ${h.descripcion || "Sin descripción"}`;
            })
            .join("\n");
          return `- Épica: "${e.nombre}"\n  Descripción: ${e.descripcion || "Sin descripción"}\n  Historias:\n${storyText || "    (Sin historias)"}`;
        })
        .join("\n\n");

      let stackText = "No configurado.";
      if (proyecto.stack) {
        stackText = Object.entries(proyecto.stack)
          .filter(([key]) => key !== "comandos")
          .map(
            ([layer, techs]) =>
              `  - **${layer}:** ${Array.isArray(techs) ? techs.join(", ") : techs}`
          )
          .join("\n");
      }

      let estandaresText = "No configurado.";
      if (proyecto.estandares) {
        estandaresText = Object.entries(proyecto.estandares)
          .map(
            ([cat, rules]) =>
              `  - **${cat}:** ${Array.isArray(rules) ? rules.join(", ") : rules}`
          )
          .join("\n");
      }

      const prompt = PROMPT_SPRINTS_CONTINUACION.replace(
        "{{nombre_proyecto}}",
        proyecto.nombre || ""
      )
        .replace("{{descripcion_proyecto}}", proyecto.descripcion || "")
        .replace(
          "{{CLAUDE_MD}}",
          `### Stack Tecnológico\n${stackText}\n\n### Estándares\n${estandaresText}`
        )
        .replace("{{sitemap}}", sitemapContent)
        .replace("{{backlog_historias}}", backlogText)
        .replace(
          "{{instrucciones_usuario}}",
          userInstructions || "Ajustes varios y continuación de desarrollo."
        );

      await navigator.clipboard.writeText(prompt);
      mostrarToast(
        "¡Prompt unificado copiado al portapapeles! Pégalo en tu IA preferida.",
        "exito"
      );
    } catch (err: any) {
      mostrarToast("Error al copiar prompt: " + err.message, "error");
    }
  };

  const handleImportarSprintsJson = async () => {
    if (!proyecto) return;
    if (!backlogJson.trim()) {
      mostrarToast("Por favor, pega el JSON de la IA primero.", "error");
      return;
    }
    try {
      const parsed = JSON.parse(backlogJson);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON debe ser un array de Sprints.");
      }

      await db.transaction(
        "rw",
        [db.sprints, db.epicas, db.historias, db.tareas, db.cola_eventos],
        async () => {
          const epicasExistentes = await db.epicas
            .where("proyectoId")
            .equals(proyecto.id)
            .toArray();
          const historiasExistentes = await db.historias
            .where("proyectoId")
            .equals(proyecto.id)
            .toArray();

          for (const sp of parsed) {
            const sprintId = `spr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const duration = sp.sprintDuracionSemanas || 2;
            const start = Date.now();
            const end = start + duration * 7 * 24 * 60 * 60 * 1000;

            const sprintPayload = {
              id: sprintId,
              proyectoId: proyecto.id,
              nombre: sp.sprintNombre,
              objetivo: sp.sprintObjetivo || "",
              duracionSemanas: duration,
              fechaInicio: start,
              fechaFin: end,
              capacidad: sp.sprintCapacidad || 20,
              estado: "planificado",
            };

            await db.sprints.add(sprintPayload);
            await QueueService.encolar(
              "sprints",
              "crear",
              sprintId,
              sprintPayload
            );

            if (Array.isArray(sp.historias)) {
              for (const h of sp.historias) {
                // Find or create Epic
                let epicaId = "";
                const matchedEpic = epicasExistentes.find(
                  (e: any) =>
                    e.nombre.toLowerCase().trim() ===
                    h.epicaNombre.toLowerCase().trim()
                );

                if (matchedEpic) {
                  epicaId = matchedEpic.id as string;
                } else {
                  epicaId = `epi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                  const epicPayload = {
                    id: epicaId,
                    proyectoId: proyecto.id,
                    nombre: h.epicaNombre,
                    descripcion: h.epicaDescripcion || "",
                    creadoEn: Date.now(),
                  };
                  await db.epicas.add(epicPayload);
                  await QueueService.encolar(
                    "epicas",
                    "crear",
                    epicaId,
                    epicPayload
                  );
                  epicasExistentes.push(epicPayload);
                }

                // Find or create Story
                let storyId = "";
                const matchedStory = historiasExistentes.find(
                  (he: any) =>
                    he.titulo.toLowerCase().trim() ===
                    h.titulo.toLowerCase().trim()
                );

                if (matchedStory) {
                  storyId = matchedStory.id as string;
                  await db.historias.update(storyId, {
                    sprintId: sprintId,
                    epicaId: epicaId,
                  });
                  await QueueService.encolar("historias", "editar", storyId, {
                    id: storyId,
                    sprintId: sprintId,
                    epicaId: epicaId,
                  });
                } else {
                  storyId = `his_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                  const storyPayload = {
                    id: storyId,
                    proyectoId: proyecto.id,
                    epicaId: epicaId,
                    sprintId: sprintId,
                    titulo: h.titulo,
                    descripcion: h.descripcion || "",
                    prioridad: h.prioridad || "Media",
                    estimacion: h.estimacion || 3,
                    estado: "Todo",
                    creadoEn: Date.now(),
                  };
                  await db.historias.add(storyPayload);
                  await QueueService.encolar(
                    "historias",
                    "crear",
                    storyId,
                    storyPayload
                  );
                  historiasExistentes.push(storyPayload);
                }

                // Create Tasks/Activities
                if (Array.isArray(h.actividades)) {
                  for (const act of h.actividades) {
                    const newTaskId = `tar_${Math.random().toString(36).substring(2, 9)}`;
                    const taskPayload = {
                      id: newTaskId,
                      proyectoId: proyecto.id,
                      historiaId: storyId,
                      titulo: act.titulo,
                      estado: "todo",
                      rol: act.rol || "",
                      componente: act.componente || "",
                      ruta: act.ruta || "",
                      modulo: act.modulo || "",
                      etiquetas: act.etiquetas || [],
                      pasos: act.pasos || [],
                      criteriosAceptacion: act.criteriosAceptacion || [],
                      seed: act.seed || null,
                      creadoEn: Date.now(),
                      actualizadoEn: Date.now(),
                    };
                    await db.tareas.add(taskPayload);
                    await QueueService.encolar(
                      "tareas",
                      "crear",
                      newTaskId,
                      taskPayload
                    );
                  }
                }
              }
            }
          }
        }
      );

      setBacklogJson("");
      setIsExtensionModalOpen(false);
      mostrarToast(
        "¡Sprints, Épicas, Historias y Actividades importadas con éxito!",
        "exito"
      );
    } catch (err: any) {
      mostrarToast("Error al importar: " + err.message, "error");
    }
  };

  const handleEliminarSprintSoft = async (sprintId: string) => {
    if (!proyecto) return;
    if (
      confirm(
        "¿Estás seguro de eliminar este sprint? Las historias asignadas a él regresarán al backlog de forma permanente."
      )
    ) {
      try {
        await db.transaction(
          "rw",
          [db.sprints, db.historias, db.cola_eventos],
          async () => {
            await db.sprints.update(sprintId, { eliminado: true });
            await QueueService.encolar("sprints", "editar", sprintId, {
              id: sprintId,
              eliminado: true,
            });

            const sprintStories = historias.filter(
              (h) => h.sprintId === sprintId
            );
            for (const story of sprintStories) {
              await db.historias.update(story.id, { sprintId: "" });
              await QueueService.encolar("historias", "editar", story.id, {
                id: story.id,
                sprintId: "",
              });
            }
          }
        );
        mostrarToast("Sprint eliminado con éxito.", "exito");
      } catch (err: any) {
        mostrarToast("Error al eliminar sprint: " + err.message, "error");
      }
    }
  };

  // viewMode can be "dashboard" (list of all sprints) or "kanban" (focus view of a sprint)
  const [viewMode, setViewMode] = useState<"dashboard" | "kanban">("dashboard");

  // Context modals
  const [activeModalContext, setActiveModalContext] = useState<{
    tipo: "epica" | "historia";
    nombre: string;
    descripcion: string;
  } | null>(null);

  // Rollover dialog
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [rolloverTargetSprintId, setRolloverTargetSprintId] = useState("");

  // Cancel sprint dialog
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [resetTasksOnCancel, setResetTasksOnCancel] = useState(true);

  // Auto-switch to Kanban mode if there is an active sprint
  useEffect(() => {
    const activeSprint = sprints.find((s) => s.estado === "activo");
    if (activeSprint && viewMode !== "kanban") {
      const timer = setTimeout(() => {
        setSelectedSprintId(activeSprint.id);
        setViewMode("kanban");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [sprints, viewMode, setSelectedSprintId]);

  const descargarHandoffsSprint = async () => {
    if (!selectedSprintId || !focusedSprint) return;
    try {
      const stories = historias.filter((h) => h.sprintId === selectedSprintId);
      if (stories.length === 0) {
        alert("No hay historias en este sprint para descargar.");
        return;
      }

      let mdContent = `# Handoffs y Entregables del Sprint - ${focusedSprint.nombre}\n\n`;
      mdContent += `**Objetivo:** ${focusedSprint.objetivo || "Sin objetivo definido."}\n`;
      mdContent += `**Capacidad:** ${focusedSprint.capacidad || 0} Ptos | **Duración:** ${focusedSprint.duracionSemanas || 2} Semanas\n`;
      mdContent += `**Estado del Sprint:** ${focusedSprint.estado.toUpperCase()}\n\n`;
      mdContent += `--- \n\n`;

      for (const story of stories) {
        mdContent += `## 🎯 HU: ${story.titulo}\n`;
        if (story.descripcion) {
          mdContent += `*Criterios de Aceptación/Descripción:*\n\`\`\`text\n${story.descripcion}\n\`\`\`\n\n`;
        }

        const subTasks = tareas.filter((t) => t.historiaId === story.id);
        if (subTasks.length === 0) {
          mdContent += `*Sin actividades programadas.*\n\n`;
          continue;
        }

        for (const task of subTasks) {
          const isCompletado =
            task.estado === "completado" ||
            task.estado === "Completado" ||
            task.estado === "done" ||
            task.estado === "Done" ||
            task.estado === "Finalizado";

          mdContent += `### 📄 [${isCompletado ? "✔ COMPLETADA" : "⏳ PENDIENTE"}] ${task.titulo}\n`;
          mdContent += `- **Rol:** ${task.rol || "General"}\n`;
          mdContent += `- **Componente/Ruta:** \`${task.componente || "N/A"}\` (${task.ruta || "N/A"})\n\n`;
          const executionId = `execution_act_${task.id}`;
          const execution = (await db.task_executions.get(executionId)) as any;

          // Intentar obtener handoff singular, o recopilar de handoffs plurales
          const handoffsList: any[] = [];
          if (execution && execution.metadata) {
            if (execution.metadata.handoff) {
              handoffsList.push(execution.metadata.handoff);
            }
            if (
              execution.metadata.handoffs &&
              typeof execution.metadata.handoffs === "object"
            ) {
              Object.values(execution.metadata.handoffs).forEach((ho: any) => {
                if (ho && typeof ho === "object") {
                  handoffsList.push(ho);
                }
              });
            }
          }

          if (handoffsList.length > 0) {
            mdContent += `#### 💾 Devolución / Handoff de la IA:\n`;
            for (const ho of handoffsList) {
              if (ho.resumen_tecnico) {
                mdContent += `**Resumen Técnico:**\n${ho.resumen_tecnico}\n\n`;
              }
              if (ho.archivos_creados_o_modificados) {
                const filesArray = Array.isArray(
                  ho.archivos_creados_o_modificados
                )
                  ? ho.archivos_creados_o_modificados
                  : typeof ho.archivos_creados_o_modificados === "string"
                    ? ho.archivos_creados_o_modificados
                        .split(",")
                        .map((s: string) => s.trim())
                    : [];
                if (filesArray.length > 0) {
                  mdContent += `**Archivos Modificados:**\n`;
                  filesArray.forEach((f: string) => {
                    mdContent += `- \`${f}\`\n`;
                  });
                  mdContent += `\n`;
                }
              }
              if (ho.firmas_o_contratos_exportados) {
                const exportsArray = Array.isArray(
                  ho.firmas_o_contratos_exportados
                )
                  ? ho.firmas_o_contratos_exportados
                  : typeof ho.firmas_o_contratos_exportados === "string"
                    ? ho.firmas_o_contratos_exportados
                        .split(",")
                        .map((s: string) => s.trim())
                    : [];
                if (exportsArray.length > 0) {
                  mdContent += `**Contratos y API signatures:**\n`;
                  exportsArray.forEach((c: string) => {
                    mdContent += `- \`${c}\`\n`;
                  });
                  mdContent += `\n`;
                }
              }
            }
          } else {
            mdContent += `*No se registró devolución técnica para esta actividad.*\n\n`;
          }
          mdContent += `\n`;
        }
        mdContent += `--- \n\n`;
      }

      const blob = new Blob([mdContent], {
        type: "text/markdown;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const cleanName = focusedSprint.nombre
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      link.setAttribute("href", url);
      link.setAttribute("download", `devoluciones-${cleanName}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error al generar handoffs: ${err.message}`);
    }
  };

  const getActividadesByCol = (colKey: string) => {
    return actividadesSprint.filter((t) => {
      const st = t.estado || "todo";
      if (colKey === "todo") return st === "todo";
      if (colKey === "in_progress")
        return st === "doing" || st === "in_progress";
      if (colKey === "in_revision")
        return st === "review" || st === "testing" || st === "in_revision";
      if (colKey === "completado") return st === "done" || st === "completado";
      return false;
    });
  };

  const handleMoveState = (
    actId: string,
    currentState: string,
    direction: "prev" | "next"
  ) => {
    let flowKey = "todo";
    if (currentState === "doing" || currentState === "in_progress")
      flowKey = "in_progress";
    else if (
      currentState === "review" ||
      currentState === "testing" ||
      currentState === "in_revision"
    )
      flowKey = "in_revision";
    else if (currentState === "done" || currentState === "completado")
      flowKey = "completado";

    const currentIndex = COLUMN_FLOW.indexOf(flowKey);
    let nextIndex = currentIndex;
    if (direction === "next" && currentIndex < COLUMN_FLOW.length - 1) {
      nextIndex++;
    } else if (direction === "prev" && currentIndex > 0) {
      nextIndex--;
    }

    if (nextIndex !== currentIndex) {
      handleUpdateActividadEstado(actId, COLUMN_FLOW[nextIndex]);
    }
  };

  const handleFinalizarSprintClick = () => {
    const incomplete = actividadesSprint.filter((t) => {
      const st = t.estado || "todo";
      return st !== "done" && st !== "completado";
    });

    if (incomplete.length > 0) {
      setIsRolloverOpen(true);
    } else {
      if (
        confirm(
          "¿Estás seguro de finalizar este sprint? Todas las tareas han sido completadas."
        )
      ) {
        finalizarSprint();
        setViewMode("dashboard");
      }
    }
  };

  const handleIniciarSprintFromDashboard = (sprintId: string) => {
    setSelectedSprintId(sprintId);
    // Execute iniciarSprint next tick
    setTimeout(() => {
      iniciarSprint();
      setViewMode("kanban");
    }, 50);
  };

  const handleVerSprintDetails = (sprintId: string) => {
    setSelectedSprintId(sprintId);
    setViewMode("kanban");
  };

  return (
    <Card>
      {/* View Switcher Top Bar */}
      <div className="mb-4 flex flex-col justify-between gap-3 border-b border-zinc-900 pb-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
              {viewMode === "dashboard"
                ? "Planificador y Control de Sprints"
                : `Tablero de Trabajo: ${focusedSprint?.nombre || ""}`}
            </h3>
            {focusedSprint &&
              focusedSprint.estado === "activo" &&
              viewMode === "kanban" && (
                <span className="animate-pulse rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[7px] text-emerald-400 uppercase">
                  Sprint en Curso
                </span>
              )}
          </div>
          <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
            {viewMode === "dashboard"
              ? "Dashboard general con el estado, capacidad y métricas de todos los sprints."
              : "Vista de ejecución por estados de actividad y modo enfoque."}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {viewMode === "kanban" && (
            <button
              onClick={() => setViewMode("dashboard")}
              className="text-zinc-350 hover:bg-zinc-850 rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-[9px] font-bold uppercase transition-all hover:text-zinc-100"
            >
              📂 Ver Sprints
            </button>
          )}

          {viewMode === "kanban" && focusedSprint && (
            <button
              onClick={descargarHandoffsSprint}
              className="rounded border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-sky-400 uppercase transition-all hover:bg-sky-500/20"
              title="Descargar devoluciones de la IA de este Sprint en un archivo .md"
            >
              📥 Descargar Handoffs (.md)
            </button>
          )}

          {viewMode === "kanban" &&
            focusedSprint &&
            focusedSprint.estado === "planificado" && (
              <button
                onClick={iniciarSprint}
                className="rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
              >
                ⚡ Comenzar Sprint
              </button>
            )}

          {viewMode === "kanban" &&
            focusedSprint &&
            focusedSprint.estado === "activo" && (
              <>
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="rounded border border-red-500/20 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-red-400 uppercase transition-all hover:bg-red-500/20"
                >
                  ❌ Cancelar Sprint
                </button>
                <button
                  onClick={handleFinalizarSprintClick}
                  className="rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
                >
                  🏁 Finalizar Sprint
                </button>
              </>
            )}

          {viewMode === "dashboard" && (
            <>
              {proyecto && proyecto.estado === "Desarrollo" && (
                <button
                  onClick={handleFinalizarDesarrollo}
                  className="rounded bg-emerald-500 px-2.5 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-400"
                  title="Finalizar el desarrollo del proyecto"
                >
                  🏁 Finalizar Desarrollo
                </button>
              )}
              <button
                onClick={() => setIsExtensionModalOpen(true)}
                className="rounded border border-sky-500/20 bg-sky-500/10 px-2.5 py-1.5 font-mono text-[9px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
              >
                ➕ Extender Sprint / Backlog
              </button>
            </>
          )}

          <button
            onClick={() => setIsImportDesvioOpen(true)}
            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
          >
            ➕ Importar Desvío
          </button>
        </div>
      </div>

      {/* DASHBOARD MODE: Sprint Grid List */}
      {viewMode === "dashboard" ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sprints.map((s) => {
              const stories = tareas.filter((t) =>
                historias.some(
                  (h) => h.sprintId === s.id && h.id === t.historiaId
                )
              );
              const completedCount = stories.filter(
                (t) =>
                  t.estado === "completado" ||
                  t.estado === "Completado" ||
                  t.estado === "done" ||
                  t.estado === "Done" ||
                  t.estado === "Finalizado"
              ).length;
              const progressPct =
                stories.length > 0
                  ? Math.round((completedCount / stories.length) * 100)
                  : 0;

              return (
                <div
                  key={s.id}
                  className={`flex flex-col rounded-xl border p-4 font-mono transition-all hover:bg-zinc-900/10 ${
                    s.estado === "activo"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : s.estado === "completado"
                        ? "border-zinc-900 bg-zinc-950/20 opacity-70"
                        : "border-zinc-900 bg-zinc-950/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="truncate text-[11px] font-bold text-zinc-200">
                      {s.nombre}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={`py-0.2 rounded border px-1.5 text-[7px] font-bold uppercase ${
                          s.estado === "activo"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : s.estado === "completado"
                              ? "border-zinc-800 bg-zinc-900 text-zinc-500"
                              : "border-zinc-800 bg-zinc-900 text-zinc-400"
                        }`}
                      >
                        {s.estado === "activo"
                          ? "Activo"
                          : s.estado === "completado"
                            ? "Completado"
                            : "Planificado"}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEliminarSprintSoft(s.id);
                        }}
                        className="text-zinc-650 rounded p-0.5 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        title="Eliminar Sprint (Soft Delete)"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-2 min-h-[24px] text-[8px] leading-normal text-zinc-400">
                    {s.objetivo || "Sin objetivo definido."}
                  </p>

                  {/* Micro stats grid */}
                  <div className="my-3 grid grid-cols-3 gap-2 border-t border-b border-zinc-900/60 py-2 text-[8px] text-zinc-500">
                    <div>
                      <span className="block text-[7px] text-zinc-600 uppercase">
                        Capacidad
                      </span>
                      <span className="text-zinc-350 font-bold">
                        {s.capacidad || 0} Ptos
                      </span>
                    </div>
                    <div>
                      <span className="block text-[7px] text-zinc-600 uppercase">
                        Duración
                      </span>
                      <span className="text-zinc-350 font-bold">
                        {s.duracionSemanas || 2} Semanas
                      </span>
                    </div>
                    <div>
                      <span className="block text-[7px] text-zinc-600 uppercase">
                        Tareas
                      </span>
                      <span className="text-zinc-350 font-bold">
                        {completedCount}/{stories.length}
                      </span>
                    </div>
                  </div>

                  {/* Start/End/Completion Dates */}
                  <div className="mb-3 flex flex-col gap-0.5 border-b border-zinc-900/40 pb-2.5 font-mono text-[8px] text-zinc-500">
                    {s.fechaInicio && (
                      <div className="flex justify-between">
                        <span className="text-zinc-650">INICIO:</span>
                        <span className="font-bold text-zinc-400">
                          {new Date(s.fechaInicio).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                    )}
                    {s.fechaFin && s.estado !== "completado" && (
                      <div className="flex justify-between">
                        <span className="text-zinc-650">FIN ESTIMADO:</span>
                        <span className="font-bold text-zinc-400">
                          {new Date(s.fechaFin).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                    )}
                    {s.finalizadoEn && (
                      <div className="flex justify-between">
                        <span className="text-zinc-650 text-emerald-500/80">
                          COMPLETADO:
                        </span>
                        <span className="font-bold text-emerald-400">
                          {new Date(s.finalizadoEn).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  {stories.length > 0 && (
                    <div className="mb-4">
                      <div className="mb-1 flex items-center justify-between text-[7px] text-zinc-500">
                        <span>Progreso</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-900">
                        <div
                          className={`h-full ${s.estado === "activo" ? "animate-pulse bg-emerald-500" : "bg-sky-500"}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions footer */}
                  <div className="mt-auto flex gap-2 pt-2">
                    {s.estado === "planificado" && (
                      <button
                        onClick={() => handleIniciarSprintFromDashboard(s.id)}
                        className="flex-1 rounded bg-emerald-500 py-1.5 text-center text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
                      >
                        ⚡ Comenzar
                      </button>
                    )}
                    {s.estado === "activo" && (
                      <button
                        onClick={() => handleVerSprintDetails(s.id)}
                        className="flex-1 rounded border border-emerald-500/30 bg-emerald-500/20 py-1.5 text-center text-[9px] font-bold text-emerald-400 uppercase transition-all hover:bg-emerald-500/30"
                      >
                        🎯 Tablero
                      </button>
                    )}
                    <button
                      onClick={() => handleVerSprintDetails(s.id)}
                      className="flex-1 rounded border border-zinc-800 bg-zinc-900 py-1.5 text-center text-[9px] font-bold text-zinc-400 uppercase transition-all hover:text-zinc-200"
                    >
                      📋 Detalles
                    </button>
                  </div>
                </div>
              );
            })}

            {sprints.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-zinc-900 bg-zinc-900/10 py-10 text-center font-mono text-[10px] text-zinc-500">
                No hay sprints creados en la planificación de este proyecto.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* KANBAN / SCOPE VIEW MODE */
        <div className="animate-in fade-in flex flex-col gap-4 duration-200">
          {/* Metadata banner */}
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-900 bg-zinc-950/40 p-2.5 sm:grid-cols-3">
            <div className="border-zinc-900 text-center sm:border-r">
              <span className="block font-mono text-[8px] text-zinc-500 uppercase">
                Objetivo del Sprint
              </span>
              <span className="block truncate font-mono text-[10px] font-bold text-zinc-300">
                {focusedSprint?.objetivo || "Sin objetivo definido"}
              </span>
            </div>
            <div className="border-zinc-900 text-center sm:border-r">
              <span className="block font-mono text-[8px] text-zinc-500 uppercase">
                Capacidad Planeada
              </span>
              <span className="block font-mono text-[10px] font-bold text-zinc-300">
                {focusedSprint?.capacidad || 0} Ptos de Historia
              </span>
            </div>
            <div className="text-center">
              <span className="block font-mono text-[8px] text-zinc-500 uppercase">
                Duración
              </span>
              <span className="block font-mono text-[10px] font-bold text-zinc-300">
                {focusedSprint?.duracionSemanas || 2} Semanas
              </span>
            </div>
          </div>

          {/* Planning view if the selected sprint is NOT started yet */}
          {focusedSprint?.estado === "planificado" ? (
            <div className="rounded-xl border border-zinc-900 bg-zinc-950/20 p-8 text-center font-mono">
              <p className="text-[10px] text-zinc-400">
                Este sprint se encuentra actualmente en **Planificación**.
              </p>
              <p className="text-zinc-650 mt-1 text-[8px]">
                Revisa los ítems asignados o haz clic en &quot;Comenzar
                Sprint&quot; en la barra de control para habilitar el Kanban de
                ejecución.
              </p>

              <div className="mt-6 overflow-x-auto text-left">
                <span className="mb-2 block text-[8px] font-bold text-zinc-500 uppercase">
                  Historias y Actividades Programadas
                </span>
                <table className="w-full border-collapse font-mono text-[9px] text-zinc-400">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 uppercase">
                      <th className="p-2 text-left">Historia de Usuario</th>
                      <th className="p-2 text-left">Estimación</th>
                      <th className="p-2 text-left">Actividades asignadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historiasSprint.map((h) => {
                      const sub = tareas.filter((t) => t.historiaId === h.id);
                      return (
                        <tr key={h.id} className="border-b border-zinc-900/40">
                          <td className="p-2 font-bold text-zinc-300">
                            {h.titulo}
                          </td>
                          <td className="p-2">{h.estimacion}h</td>
                          <td className="p-2">
                            {sub.length > 0 ? (
                              <div className="flex flex-col gap-1 text-[8px]">
                                {sub.map((t) => (
                                  <div key={t.id} className="text-zinc-450">
                                    • {t.titulo}{" "}
                                    <span className="text-[7px] text-zinc-600">
                                      ({t.rol})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-600 italic">
                                Sin actividades asignadas
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {historiasSprint.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-4 text-center text-zinc-600"
                        >
                          No hay historias asignadas a este sprint.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* KANBAN BOARD VIEW */
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {KANBAN_COLUMNS.map((col) => {
                const acts = getActividadesByCol(col.key);
                return (
                  <div
                    key={col.key}
                    className="flex min-h-[500px] flex-col rounded-xl border border-zinc-900 bg-zinc-950/20 p-3"
                  >
                    {/* Column Header */}
                    <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
                      <span
                        className={`font-mono text-[10px] font-bold uppercase ${col.color.split(" ")[0]}`}
                      >
                        {col.label}
                      </span>
                      <span className="py-0.2 rounded border border-zinc-800 bg-zinc-900 px-1.5 font-mono text-[8px] font-bold text-zinc-400">
                        {acts.length}
                      </span>
                    </div>

                    {/* Column Items */}
                    <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                      {acts.map((t) => {
                        const matchedStory = historiasSprint.find(
                          (h) => h.id === t.historiaId
                        );
                        const matchedEpic = matchedStory
                          ? epicas.find((e) => e.id === matchedStory.epicaId)
                          : null;

                        const isCompletado =
                          t.estado === "done" || t.estado === "completado";
                        const isRevision =
                          t.estado === "review" ||
                          t.estado === "testing" ||
                          t.estado === "in_revision";
                        const isEnProgreso =
                          t.estado === "doing" || t.estado === "in_progress";

                        return (
                          <div
                            key={t.id}
                            className={`flex flex-col gap-2 rounded-lg border border-zinc-900 bg-zinc-900/10 p-3 transition-all hover:border-zinc-800 hover:bg-zinc-900/30 ${
                              isEnProgreso
                                ? "border-amber-500/20 bg-amber-500/5"
                                : isRevision
                                  ? "border-sky-500/20 bg-sky-500/5"
                                  : isCompletado
                                    ? "border-emerald-500/20 bg-emerald-500/5 opacity-70"
                                    : ""
                            }`}
                          >
                            {/* Card Top Title & ID */}
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-mono text-[8px] font-bold text-zinc-500 uppercase">
                                ACT-{t.id.slice(-4).toUpperCase()}
                              </span>
                              {/* Arrow state changers */}
                              {focusedSprint?.estado === "activo" && (
                                <div className="flex shrink-0 items-center gap-1">
                                  {col.key !== "todo" && (
                                    <button
                                      onClick={() =>
                                        handleMoveState(
                                          t.id,
                                          t.estado || "todo",
                                          "prev"
                                        )
                                      }
                                      className="rounded border border-zinc-800 bg-zinc-900 px-1 font-mono text-[8px] text-zinc-400 hover:text-zinc-200"
                                      title="Mover columna anterior"
                                    >
                                      ◀
                                    </button>
                                  )}
                                  {col.key !== "completado" && (
                                    <button
                                      onClick={() =>
                                        handleMoveState(
                                          t.id,
                                          t.estado || "todo",
                                          "next"
                                        )
                                      }
                                      className="rounded border border-zinc-800 bg-zinc-900 px-1 font-mono text-[8px] text-zinc-400 hover:text-zinc-200"
                                      title="Mover columna siguiente"
                                    >
                                      ▶
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            <span className="font-mono text-[9px] leading-normal font-bold text-zinc-200">
                              {t.titulo}
                            </span>

                            {/* Tags layer (Epic & HU) */}
                            <div className="flex flex-wrap gap-1.5">
                              {matchedEpic && (
                                <button
                                  onClick={() =>
                                    setActiveModalContext({
                                      tipo: "epica",
                                      nombre: matchedEpic.nombre,
                                      descripcion:
                                        matchedEpic.descripcion ||
                                        "Sin descripción",
                                    })
                                  }
                                  className="py-0.2 rounded border border-sky-500/20 bg-sky-500/5 px-1 font-mono text-[7px] text-sky-400 uppercase transition-all hover:bg-sky-500/10"
                                  title="Ver Épica"
                                >
                                  📦 {matchedEpic.nombre.slice(0, 15)}...
                                </button>
                              )}
                              {matchedStory && (
                                <button
                                  onClick={() =>
                                    setActiveModalContext({
                                      tipo: "historia",
                                      nombre: matchedStory.titulo,
                                      descripcion:
                                        matchedStory.descripcion ||
                                        "Sin descripción de criterios de aceptación.",
                                    })
                                  }
                                  className="py-0.2 rounded border border-purple-500/20 bg-purple-500/5 px-1 font-mono text-[7px] text-purple-400 uppercase transition-all hover:bg-purple-500/10"
                                  title="Ver Historia de Usuario"
                                >
                                  🎯 HU-
                                  {matchedStory.id.slice(-4).toUpperCase()}
                                </button>
                              )}
                            </div>

                            {/* Technical meta info */}
                            <div className="mt-0.5 flex flex-col gap-0.5 border-t border-zinc-900/60 pt-1.5 font-mono text-[7px] text-zinc-500">
                              {t.rol && <span>👤 Rol: {t.rol}</span>}
                              {t.componente && (
                                <span>📄 File: {t.componente}</span>
                              )}
                              {t.ruta && (
                                <span className="truncate">
                                  📂 Path: {t.ruta}
                                </span>
                              )}
                            </div>

                            {/* Launch focus mode */}
                            {focusedSprint?.estado === "activo" &&
                              !isCompletado && (
                                <button
                                  onClick={() =>
                                    iniciarCintaProduccionActividad(t)
                                  }
                                  className="mt-1 flex items-center justify-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/10 py-1 font-mono text-[8px] font-bold text-emerald-400 uppercase transition-all hover:bg-emerald-500/20"
                                >
                                  🎯 Modo Enfoque
                                </button>
                              )}
                          </div>
                        );
                      })}
                      {acts.length === 0 && (
                        <div className="rounded-xl border border-dashed border-zinc-900/60 py-8 text-center font-mono text-[8px] text-zinc-600">
                          Vacio
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sutil Context Modal for Epics / HUs */}
      {activeModalContext && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm duration-200">
          <div className="w-[450px] rounded-xl border border-zinc-800 bg-zinc-950/90 p-5 font-mono shadow-2xl">
            <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-[10px] font-bold text-sky-400 uppercase">
                Contexto:{" "}
                {activeModalContext.tipo === "epica"
                  ? "Épica / Módulo"
                  : "Historia de Usuario"}
              </span>
              <button
                onClick={() => setActiveModalContext(null)}
                className="hover:text-zinc-350 text-[9px] text-zinc-500 uppercase"
              >
                Cerrar
              </button>
            </div>
            <h4 className="mb-2 text-[11px] leading-snug font-bold text-zinc-100">
              {activeModalContext.nombre}
            </h4>
            <div className="max-h-[220px] overflow-y-auto rounded border border-zinc-900/60 bg-zinc-900/20 p-2.5 pr-1 text-[9px] leading-relaxed text-zinc-400">
              {activeModalContext.descripcion}
            </div>
          </div>
        </div>
      )}

      {/* Rollover Modal */}
      {isRolloverOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm duration-200">
          <div className="w-[480px] rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-mono shadow-2xl">
            <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-[10px] font-bold text-red-400 uppercase">
                ⚠️ Finalizar Sprint con Tareas Pendientes
              </span>
              <button
                onClick={() => setIsRolloverOpen(false)}
                className="hover:text-zinc-350 text-[9px] text-zinc-500 uppercase"
              >
                Cancelar
              </button>
            </div>
            <p className="mb-3 text-[9px] leading-relaxed text-zinc-400">
              Detectamos actividades no completadas en este sprint. Para poder
              cerrar el sprint, debes reprogramar las Historias de Usuario con
              tareas pendientes a otro sprint (o al Backlog general):
            </p>
            <div className="flex flex-col gap-3">
              <select
                value={rolloverTargetSprintId}
                onChange={(e) => setRolloverTargetSprintId(e.target.value)}
                className="w-full rounded border border-zinc-900 bg-zinc-900 p-2 text-[9px] text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="backlog">
                  (Enviar al Backlog - Sin Sprint)
                </option>
                {sprints
                  .filter(
                    (s) =>
                      s.id !== selectedSprintId && s.estado !== "completado"
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      Reprogramar a: {s.nombre} (
                      {s.estado === "planificado"
                        ? "En Planificación"
                        : "Activo"}
                      )
                    </option>
                  ))}
              </select>

              <button
                onClick={() => {
                  finalizarSprint(rolloverTargetSprintId || "backlog");
                  setIsRolloverOpen(false);
                  setViewMode("dashboard");
                }}
                className="hover:bg-red-650 w-full rounded bg-red-500 py-2 text-center text-[10px] font-bold text-zinc-100 uppercase transition-all"
              >
                Confirmar y Finalizar Sprint 🏁
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Sprint Dialog Modal */}
      {isCancelModalOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm duration-200">
          <div className="w-[450px] rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-mono shadow-2xl">
            <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="text-[10px] font-bold text-red-400 uppercase">
                ⚠️ Cancelar Sprint Activo
              </span>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="hover:text-zinc-350 text-[9px] text-zinc-500 uppercase"
              >
                Cerrar
              </button>
            </div>
            <p className="mb-4 text-[9px] leading-relaxed text-zinc-400">
              Esta acción detendrá el desarrollo y devolverá el sprint al estado
              **&quot;Planificado&quot;**. Podrás iniciarlo de nuevo más tarde.
            </p>

            <div className="flex flex-col gap-3">
              <span className="block text-[8px] font-bold text-zinc-500 uppercase">
                ¿Qué hacer con las tareas del sprint?
              </span>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-900 bg-zinc-900/10 p-2.5 hover:border-zinc-800">
                <input
                  type="radio"
                  checked={resetTasksOnCancel}
                  onChange={() => setResetTasksOnCancel(true)}
                  className="mt-0.5 accent-emerald-500"
                />
                <div className="text-[9px]">
                  <span className="block font-bold text-zinc-200">
                    Reiniciar Progreso (Recomendado)
                  </span>
                  <span className="block text-[8px] leading-normal text-zinc-500">
                    Restablece todas las actividades de este sprint al estado
                    **&quot;Por Hacer&quot;** (todo).
                  </span>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-900 bg-zinc-900/10 p-2.5 hover:border-zinc-800">
                <input
                  type="radio"
                  checked={!resetTasksOnCancel}
                  onChange={() => setResetTasksOnCancel(false)}
                  className="mt-0.5 accent-emerald-500"
                />
                <div className="text-[9px]">
                  <span className="block font-bold text-zinc-200">
                    Mantener Progreso
                  </span>
                  <span className="block text-[8px] leading-normal text-zinc-500">
                    Conserva el estado actual de las actividades (ej: las que ya
                    estaban completadas seguirán completadas).
                  </span>
                </div>
              </label>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setIsCancelModalOpen(false)}
                  className="text-zinc-450 flex-1 rounded border border-zinc-800 bg-zinc-900 py-2 text-center text-[9px] font-bold uppercase transition-all hover:text-zinc-200"
                >
                  Volver atrás
                </button>
                <button
                  onClick={() => {
                    cancelarSprint(resetTasksOnCancel);
                    setIsCancelModalOpen(false);
                    setViewMode("dashboard");
                  }}
                  className="flex-1 rounded bg-red-500 py-2 text-center text-[9px] font-bold text-zinc-100 uppercase transition-all hover:bg-red-600"
                >
                  Sí, Cancelar Sprint
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backlog & Sprint Extension Modal */}
      {isExtensionModalOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm duration-200">
          <div className="flex max-h-[85vh] w-[650px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-6 font-mono shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
                <span className="text-[11px] font-bold tracking-wider text-zinc-100 uppercase">
                  Extender Backlog & Sprints
                </span>
              </div>
              <button
                onClick={() => setIsExtensionModalOpen(false)}
                className="hover:text-zinc-350 text-[10px] font-bold text-zinc-500 uppercase"
              >
                Cerrar ✕
              </button>
            </div>

            {/* Modal Tabs Header */}
            <div className="mb-4 flex gap-1 border-b border-zinc-900 pb-2">
              {[
                { id: "ia", label: "✨ Importar con IA (Recomendado)" },
                { id: "sprint", label: "📅 Crear Sprint Manual" },
                { id: "backlog", label: "📋 Vincular Backlog" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setExtensionTab(t.id as any)}
                  className={`rounded-lg border px-3 py-1.5 text-[9px] font-bold uppercase transition-all ${
                    extensionTab === t.id
                      ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
                      : "hover:text-zinc-350 border-transparent text-zinc-500 hover:bg-zinc-900/40"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Modal Content Scroll Area */}
            <div className="flex-1 overflow-y-auto pr-1 text-left">
              {extensionTab === "ia" && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-lg border border-sky-500/10 bg-sky-500/5 p-3 text-[9px] leading-relaxed text-sky-300">
                    💡 **¿Cómo funciona?**
                    <br />
                    1. Escribe en las instrucciones lo que deseas agregar o
                    corregir (ej. &quot;Falta agregar cupones de descuento y
                    reparar el flujo de login que falla al expirar token&quot;).
                    <br />
                    2. Haz clic en **Copiar Prompt** para enviar a la IA todo el
                    contexto actual (backlog, stack y sitemap).
                    <br />
                    3. Pega el JSON que te devuelva la IA abajo y haz clic en
                    **Importar**. Se creará todo de forma estructurada
                    automáticamente.
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[8px] font-bold tracking-wider text-zinc-500 uppercase">
                      1. Instrucciones para la IA (Ajustes o Nuevas
                      Funcionalidades)
                    </label>
                    <textarea
                      value={userInstructions}
                      onChange={(e) => setUserInstructions(e.target.value)}
                      placeholder="Escribe lo que falta desarrollar o los nuevos requerimientos..."
                      className="h-20 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 font-mono text-[9px] text-zinc-300 placeholder-zinc-700 focus:border-sky-500/40 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleCopiarPromptIA}
                    className="w-full rounded bg-sky-500 py-2 text-center text-[9px] font-bold text-zinc-950 uppercase shadow-md shadow-sky-500/25 transition-all hover:bg-sky-400"
                  >
                    📋 Generar & Copiar Prompt para la IA
                  </button>

                  <div className="flex flex-col gap-1.5 border-t border-zinc-900 pt-4">
                    <label className="text-[8px] font-bold tracking-wider text-zinc-500 uppercase">
                      2. Pegar JSON de respuesta de la IA
                    </label>
                    <textarea
                      value={backlogJson}
                      onChange={(e) => setBacklogJson(e.target.value)}
                      placeholder="Pega el array JSON devuelto por la IA..."
                      className="h-28 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 font-mono text-[8px] text-zinc-300 placeholder-zinc-700 focus:border-emerald-500/40 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleImportarSprintsJson}
                    className="w-full rounded bg-emerald-500 py-2.5 text-center text-[9px] font-bold text-zinc-950 uppercase shadow-md shadow-emerald-500/25 transition-all hover:bg-emerald-400"
                  >
                    📥 Procesar e Importar Backlog de Extensión
                  </button>
                </div>
              )}

              {extensionTab === "sprint" && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold text-zinc-500 uppercase">
                        Nombre del Sprint
                      </label>
                      <input
                        type="text"
                        value={newSprintNombre}
                        onChange={(e) => setNewSprintNombre(e.target.value)}
                        placeholder="Ej: Sprint 5: Ajustes y QA"
                        className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 font-mono text-[9px] text-zinc-200 focus:border-sky-500/40 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold text-zinc-500 uppercase">
                        Capacidad (Puntos)
                      </label>
                      <input
                        type="number"
                        value={newSprintCapacidad}
                        onChange={(e) =>
                          setNewSprintCapacidad(Number(e.target.value))
                        }
                        className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 font-mono text-[9px] text-zinc-200 focus:border-sky-500/40 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-bold text-zinc-500 uppercase">
                      Duración (Semanas)
                    </label>
                    <select
                      value={newSprintDuracion}
                      onChange={(e) =>
                        setNewSprintDuracion(Number(e.target.value))
                      }
                      className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 font-mono text-[9px] text-zinc-200 focus:border-sky-500/40 focus:outline-none"
                    >
                      <option value={1}>1 Semana</option>
                      <option value={2}>2 Semanas</option>
                      <option value={3}>3 Semanas</option>
                      <option value={4}>4 Semanas</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-bold text-zinc-500 uppercase">
                      Objetivo del Sprint
                    </label>
                    <textarea
                      value={newSprintObjetivo}
                      onChange={(e) => setNewSprintObjetivo(e.target.value)}
                      placeholder="Describir el objetivo principal o alcance del sprint..."
                      className="h-20 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 font-mono text-[9px] text-zinc-300 focus:border-sky-500/40 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleCrearSprintManual}
                    className="w-full rounded bg-emerald-500 py-2 text-center text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
                  >
                    ➕ Planificar Sprint
                  </button>
                </div>
              )}

              {extensionTab === "backlog" && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[8px] font-bold text-zinc-500 uppercase">
                      Seleccionar Sprint de Destino
                    </label>
                    <select
                      value={selectedSprintForAssign}
                      onChange={(e) =>
                        setSelectedSprintForAssign(e.target.value)
                      }
                      className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 font-mono text-[9px] text-zinc-200 focus:border-sky-500/40 focus:outline-none"
                    >
                      <option value="">-- Selecciona un Sprint --</option>
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} ({s.estado})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-zinc-900 pt-3">
                    <span className="mb-2 block text-[8px] font-bold text-zinc-500 uppercase">
                      Historias Huérfanas (Sin Sprint Asignado)
                    </span>

                    <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto pr-1">
                      {historias.filter((h) => !h.sprintId).length === 0 ? (
                        <p className="py-6 text-center text-[9px] text-zinc-500">
                          No hay historias sin sprint asignado.
                        </p>
                      ) : (
                        historias
                          .filter((h) => !h.sprintId)
                          .map((h) => (
                            <div
                              key={h.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-900 bg-zinc-900/20 p-2.5"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-[9px] font-bold text-zinc-200">
                                  {h.titulo}
                                </span>
                                <span className="block truncate text-[7px] text-zinc-500">
                                  Prioridad: {h.prioridad || "Media"} •
                                  Estimación: {h.estimacion || 0} Ptos
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  handleAsignarHistoriaASprint(h.id)
                                }
                                className="shrink-0 rounded border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[8px] font-bold text-sky-400 uppercase transition-all hover:bg-sky-500/20"
                              >
                                Vincular 🔗
                              </button>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
