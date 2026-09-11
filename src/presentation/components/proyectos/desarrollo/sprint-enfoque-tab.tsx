/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../../card";
import { db } from "../../../../offline/dexie/db";
import { QueueService } from "../../../../offline/services/queue.service";
import { SyncService } from "../../../../offline/services/sync.service";
import { useToast } from "../../../hooks/useToast";
import { CheckpointPullService } from "../../../../offline/services/checkpoint-pull.service";
import { iniciarTicketConIA } from "../../../../application/use-cases/proyecto/iniciar-ticket-ia.use-case";
import { PROMPT_SPRINTS_CONTINUACION } from "../constants/prompts";
import { ModalExtenderBacklog } from "./modal-extender-backlog";
import { ModalCancelarSprint } from "./modal-cancelar-sprint";
import { ModalRolloverSprint } from "./modal-rollover-sprint";
import { SprintDashboardGrid } from "./sprint-dashboard-grid";
import { SprintKanbanBoard } from "./sprint-kanban-board";

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
  reabrirSprint?: (sprintId?: string) => Promise<void> | void;
  finalizarSprint: (targetSprintId?: string) => void;
  cancelarSprint: (reiniciarTareas: boolean) => void;
  iniciarCintaProduccionActividad: (act: any) => void;
  handleUpdateActividadEstado: (id: string, nuevoEstado: string) => void;
  setIsImportDesvioOpen: (open: boolean) => void;
}

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
  reabrirSprint,
  finalizarSprint,
  cancelarSprint,
  iniciarCintaProduccionActividad,
  handleUpdateActividadEstado,
  setIsImportDesvioOpen,
}) => {
  const sprints = (rawSprints || [])
    .filter((s) => !s.eliminado)
    .sort((a, b) => {
      const matchA = a.nombre?.match(/Sprint\s+(\d+)/i);
      const matchB = b.nombre?.match(/Sprint\s+(\d+)/i);
      if (matchA && matchB) {
        return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
      }
      return (a.creadoEn || 0) - (b.creadoEn || 0);
    });
  const { mostrarToast } = useToast();

  // El runner de automatización IA corre aparte (Node local) y escribe el
  // progreso directo en Supabase — este es el único punto del sistema que
  // "hala" (pull) cambios remotos hacia IndexedDB, para que el tablero
  // refleje en vivo lo que el runner va haciendo con cada ticket.
  useEffect(() => {
    if (!proyecto?.id) return;
    const traer = () => {
      CheckpointPullService.sincronizarDesdeRemoto(proyecto.id).catch(() => {
        // Silencioso: si no hay conexión, el tablero sigue mostrando el último estado conocido.
      });
    };
    traer();
    const intervalo = setInterval(traer, 10000);
    return () => clearInterval(intervalo);
  }, [proyecto?.id]);

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
            const eliminadoEn = Date.now();
            await db.sprints.update(sprintId, { eliminado: true, eliminadoEn });
            await QueueService.encolar("sprints", "editar", sprintId, {
              id: sprintId,
              eliminado: true,
              eliminadoEn,
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
        mdContent += `## HU: ${story.titulo}\n`;
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

          mdContent += `### [${isCompletado ? "COMPLETADA" : "⏳ PENDIENTE"}] ${task.titulo}\n`;
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
            mdContent += `#### Devolución / Handoff de la IA:\n`;
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

  const handleReabrirSprintClick = (sprintId?: string) => {
    const targetId = sprintId || focusedSprint?.id;
    if (!targetId) return;
    if (
      confirm(
        "¿Deseas reabrir este Sprint? Su fecha de inicio original se mantendrá y podrás agregar tareas o corregir bugs. La fecha de fin se actualizará cuando vuelvas a finalizarlo."
      )
    ) {
      if (reabrirSprint) {
        reabrirSprint(targetId);
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

  // "Sprint Automático": encola de una todos los tickets pendientes del
  // sprint (columna "Por Hacer"). No los corre en paralelo — los deja en
  // IDLE y el runner (que ya procesa un ticket a la vez, ver
  // cicloDeTrabajo() en runner/index.ts) los va tomando de a uno, en el
  // mismo orden en que están acá. Un click reemplaza abrir cada ticket a
  // mano uno por uno.
  const [motorIASprint, setMotorIASprint] = useState<"claude" | "antigravity">(
    "claude"
  );
  const [encolandoSprintIA, setEncolandoSprintIA] = useState(false);

  const handleIniciarSprintAutomatico = async () => {
    if (!proyecto || !focusedSprint) return;
    const pendientes = actividadesSprint.filter(
      (t) => (t.estado || "todo") === "todo"
    );
    if (pendientes.length === 0) {
      mostrarToast("No hay tickets pendientes en este sprint.", "info");
      return;
    }
    if (
      !confirm(
        `Se van a encolar ${pendientes.length} tickets para que el runner los procese uno por uno con ${
          motorIASprint === "antigravity"
            ? "Antigravity (Gemini)"
            : "Claude Code"
        }. ¿Continuar?`
      )
    ) {
      return;
    }
    setEncolandoSprintIA(true);
    try {
      let encolados = 0;
      for (const t of pendientes) {
        // Si el ticket ya tiene un checkpoint (ej. se había arrancado y
        // cancelado a mano), no lo pisamos acá — que el usuario lo revise
        // desde su propia tarjeta.
        const yaTieneCheckpoint = await db.task_execution_checkpoints.get(
          `chk_${t.id}`
        );
        if (yaTieneCheckpoint) continue;
        await iniciarTicketConIA({
          proyectoId: proyecto.id,
          actividad: { id: t.id, titulo: t.titulo },
          motorIA: motorIASprint,
        });
        encolados++;
      }
      await SyncService.sincronizar().catch(() => {
        // Si falla, los eventos quedan en cola y se sincronizan solos.
      });
      mostrarToast(
        encolados > 0
          ? `${encolados} tickets encolados. El runner los va a ir tomando de a uno en su próximo ciclo.`
          : "Todos los tickets pendientes ya estaban encolados.",
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al encolar el sprint: ${err.message}`, "error");
    } finally {
      setEncolandoSprintIA(false);
    }
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
            {focusedSprint &&
              focusedSprint.estado === "completado" &&
              viewMode === "kanban" && (
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[7px] font-bold text-emerald-400 uppercase">
                  Sprint Completado
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
              Ver Sprints
            </button>
          )}

          {viewMode === "kanban" && focusedSprint && (
            <button
              onClick={descargarHandoffsSprint}
              className="rounded border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-sky-400 uppercase transition-all hover:bg-sky-500/20"
              title="Descargar devoluciones de la IA de este Sprint en un archivo .md"
            >
              Descargar Handoffs (.md)
            </button>
          )}

          {viewMode === "kanban" &&
            focusedSprint &&
            focusedSprint.estado === "completado" && (
              <button
                onClick={() => handleReabrirSprintClick(focusedSprint.id)}
                className="rounded border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-amber-400 uppercase transition-all hover:bg-amber-500/20"
                title="Reabrir sprint para agregar tareas o registrar bugs manteniendo la fecha de inicio"
              >
                Reabrir Sprint
              </button>
            )}

          {viewMode === "kanban" &&
            focusedSprint &&
            focusedSprint.estado === "planificado" && (
              <button
                onClick={iniciarSprint}
                className="rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
              >
                Comenzar Sprint
              </button>
            )}

          {viewMode === "kanban" &&
            focusedSprint &&
            focusedSprint.estado === "activo" && (
              <>
                <select
                  value={motorIASprint}
                  onChange={(e) =>
                    setMotorIASprint(e.target.value as "claude" | "antigravity")
                  }
                  className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 font-mono text-[9px] text-zinc-300 focus:outline-none"
                  title="Motor de IA para los tickets que se encolen"
                >
                  <option value="claude">Claude Code</option>
                  <option value="antigravity">Antigravity (Gemini)</option>
                </select>
                <button
                  onClick={handleIniciarSprintAutomatico}
                  disabled={encolandoSprintIA}
                  className="rounded border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-violet-400 uppercase transition-all hover:bg-violet-500/20 disabled:opacity-50"
                  title="Encola todos los tickets pendientes del sprint para que el runner los procese uno por uno"
                >
                  {encolandoSprintIA ? "Encolando..." : "Sprint Automático"}
                </button>
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="rounded border border-red-500/20 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-red-400 uppercase transition-all hover:bg-red-500/20"
                >
                  Cancelar Sprint
                </button>
                <button
                  onClick={handleFinalizarSprintClick}
                  className="rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
                >
                  Finalizar Sprint
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
                  Finalizar Desarrollo
                </button>
              )}
              <button
                onClick={() => setIsExtensionModalOpen(true)}
                className="rounded border border-sky-500/20 bg-sky-500/10 px-2.5 py-1.5 font-mono text-[9px] font-bold text-sky-400 uppercase hover:bg-sky-500/20"
              >
                Extender Sprint / Backlog
              </button>
            </>
          )}

          <button
            onClick={() => setIsImportDesvioOpen(true)}
            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
          >
            Importar Desvío
          </button>
        </div>
      </div>

      {/* DASHBOARD MODE: Sprint Grid List */}
      {viewMode === "dashboard" ? (
        <SprintDashboardGrid
          sprints={sprints}
          tareas={tareas}
          historias={historias}
          handleEliminarSprintSoft={handleEliminarSprintSoft}
          handleIniciarSprintFromDashboard={handleIniciarSprintFromDashboard}
          handleVerSprintDetails={handleVerSprintDetails}
          handleReabrirSprintClick={handleReabrirSprintClick}
        />
      ) : (
        /* KANBAN / SCOPE VIEW MODE */
        <SprintKanbanBoard
          proyecto={proyecto}
          focusedSprint={focusedSprint}
          historiasSprint={historiasSprint}
          tareas={tareas}
          epicas={epicas}
          getActividadesByCol={getActividadesByCol}
          handleMoveState={handleMoveState}
          setActiveModalContext={setActiveModalContext}
          iniciarCintaProduccionActividad={iniciarCintaProduccionActividad}
        />
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
      <ModalRolloverSprint
        isOpen={isRolloverOpen}
        onClose={() => setIsRolloverOpen(false)}
        rolloverTargetSprintId={rolloverTargetSprintId}
        setRolloverTargetSprintId={setRolloverTargetSprintId}
        sprints={sprints}
        selectedSprintId={selectedSprintId}
        onConfirm={() => {
          finalizarSprint(rolloverTargetSprintId || "backlog");
          setIsRolloverOpen(false);
          setViewMode("dashboard");
        }}
      />

      {/* Cancel Sprint Dialog Modal */}
      <ModalCancelarSprint
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        resetTasksOnCancel={resetTasksOnCancel}
        setResetTasksOnCancel={setResetTasksOnCancel}
        onConfirm={() => {
          cancelarSprint(resetTasksOnCancel);
          setIsCancelModalOpen(false);
          setViewMode("dashboard");
        }}
      />

      {/* Backlog & Sprint Extension Modal */}
      <ModalExtenderBacklog
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
        extensionTab={extensionTab}
        setExtensionTab={setExtensionTab}
        userInstructions={userInstructions}
        setUserInstructions={setUserInstructions}
        handleCopiarPromptIA={handleCopiarPromptIA}
        backlogJson={backlogJson}
        setBacklogJson={setBacklogJson}
        handleImportarSprintsJson={handleImportarSprintsJson}
        newSprintNombre={newSprintNombre}
        setNewSprintNombre={setNewSprintNombre}
        newSprintCapacidad={newSprintCapacidad}
        setNewSprintCapacidad={setNewSprintCapacidad}
        newSprintDuracion={newSprintDuracion}
        setNewSprintDuracion={setNewSprintDuracion}
        newSprintObjetivo={newSprintObjetivo}
        setNewSprintObjetivo={setNewSprintObjetivo}
        handleCrearSprintManual={handleCrearSprintManual}
        selectedSprintForAssign={selectedSprintForAssign}
        setSelectedSprintForAssign={setSelectedSprintForAssign}
        sprints={sprints}
        historias={historias}
        handleAsignarHistoriaASprint={handleAsignarHistoriaASprint}
      />
    </Card>
  );
};
