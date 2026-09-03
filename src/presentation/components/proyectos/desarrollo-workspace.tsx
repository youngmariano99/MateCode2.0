/* eslint-disable */
"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { useToast } from "../../hooks/useToast";
import { QueueService } from "../../../offline/services/queue.service";

import { SprintEnfoqueTab } from "./desarrollo/sprint-enfoque-tab";
import { SeccionesDesarrolloTab } from "./desarrollo/secciones-desarrollo-tab";
import { ConsolaTicketsTab } from "./desarrollo/consola-tickets-tab";
import { ConsolaAuditoriaTab } from "./desarrollo/consola-auditoria-tab";
import { BugHotfixModal } from "./desarrollo/bug-hotfix-modal";
import { ImportDesvioModal } from "./desarrollo/import-desvio-modal";
import { ConveyorBeltFocusView } from "./desarrollo/conveyor-belt-focus-view";
import { PROMPT_DESVIO_SPRINT } from "./constants/prompts";
import { generarPromptActividadTicket as generarPromptActividadTicketPuro } from "../../../domain/prompts/generar-prompt-actividad";
import { parseHandoffIA } from "../../../domain/entidades/automatizacion-ia.entity";

interface DesarrolloWorkspaceProps {
  proyectoId: string;
}

const SECCIONES_LANDING_DEFAULT = [
  "Hero Section (Portada & CTA)",
  "Propuesta de Valor / Beneficios Clave",
  "Servicios / Productos / Características",
  "Prueba Social / Testimonios / Logos",
  "Precios / Planes / Oferta",
  "Preguntas Frecuentes (FAQ)",
  "Footer & Formulario de Contacto (CTA)",
  "Sección Personalizada",
];

export const DesarrolloWorkspace: React.FC<DesarrolloWorkspaceProps> = ({
  proyectoId,
}) => {
  const { mostrarToast } = useToast();

  // Load project details & context
  const proyecto = useLiveQuery(
    () => db.proyectos.get(proyectoId),
    [proyectoId]
  );
  const contexto = useLiveQuery(
    () => db.proyecto_contexto.get(proyectoId),
    [proyectoId]
  ) as any;
  const ds = useLiveQuery(
    () => db.proyecto_design_system.get(proyectoId),
    [proyectoId]
  );

  const isLandingType =
    (proyecto?.tipo as string)?.toLowerCase().includes("landing") ||
    (proyecto?.tipo as string)?.toLowerCase().includes("institucional");

  const [activeTabMode, setActiveTabMode] = useState<
    "secciones" | "tickets" | "auditoria"
  >(isLandingType ? "secciones" : "tickets");

  useEffect(() => {
    if (isLandingType) {
      setActiveTabMode("secciones");
    }
  }, [isLandingType]);

  // Load Sprints, Stories, and Activities reactively
  const sprints = (
    (useLiveQuery(() =>
      db.sprints.where("proyectoId").equals(proyectoId).toArray()
    ) || []) as any[]
  )
    .filter((s) => !s.eliminado)
    .sort((a, b) => {
      const matchA = a.nombre?.match(/Sprint\s+(\d+)/i);
      const matchB = b.nombre?.match(/Sprint\s+(\d+)/i);
      if (matchA && matchB) {
        return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
      }
      return (a.creadoEn || 0) - (b.creadoEn || 0);
    });

  const historias = (useLiveQuery(() =>
    db.historias.where("proyectoId").equals(proyectoId).toArray()
  ) || []) as any[];

  const tareas = (useLiveQuery(() =>
    db.tareas.where("proyectoId").equals(proyectoId).toArray()
  ) || []) as any[];

  const epicas = (useLiveQuery(() =>
    db.epicas.where("proyectoId").equals(proyectoId).toArray()
  ) || []) as any[];

  // Active focused Sprint State
  const [selectedSprintId, setSelectedSprintId] = useState("");

  // Conveyor Belt (Cinta de Producción) states
  const [selectedHistoriaCinta, setSelectedHistoriaCinta] = useState<
    any | null
  >(null);
  const [selectedActividadCinta, setSelectedActividadCinta] = useState<
    any | null
  >(null);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [cintaPipelineConfig, setCintaPipelineConfig] = useState<string[]>([
    "BD",
    "Backend",
    "Frontend",
    "QA",
  ]);

  // Reactive query for the active Cinta Task Execution
  const activeCintaExecution = useLiveQuery(async () => {
    if (selectedActividadCinta) {
      return await db.task_executions.get(
        `execution_act_${selectedActividadCinta.id}`
      );
    }
    if (selectedHistoriaCinta) {
      return await db.task_executions.get(
        `cinta_hu_${selectedHistoriaCinta.id}`
      );
    }
    return undefined;
  }, [selectedActividadCinta, selectedHistoriaCinta]) as any;

  // Focus Mode local input states
  const [cintaHandoffInput, setCintaHandoffInput] = useState("");
  const [cintaIterationFeedback, setCintaIterationFeedback] = useState("");
  const [cintaBugLogs, setCintaBugLogs] = useState("");
  const [cintaBugExpected, setCintaBugExpected] = useState("");
  const [cintaBugReal, setCintaBugReal] = useState("");
  const [isCicdModalOpen, setIsCicdModalOpen] = useState(false);
  const [detectedDocUpdates, setDetectedDocUpdates] = useState<any>(null);

  // Form states for Feature ticket
  const [selectedActividadId, setSelectedActividadId] = useState("");
  const [selectedRole, setSelectedRole] = useState(
    isLandingType ? "disenador_ui" : "desarrollador"
  );
  const [ticketMiembro, setTicketMiembro] = useState("Mariano");

  // Form states for Landing Section Tickets
  const [seccionNombre, setSeccionNombre] = useState(
    SECCIONES_LANDING_DEFAULT[0]
  );
  const [seccionNombreCustom, setSeccionNombreCustom] = useState("");
  const [seccionDescripcion, setSeccionDescripcion] = useState("");

  // Dynamic sitemap sections loaded from planning context
  const seccionesSitemap =
    (contexto?.seccionesSitemap as Array<{
      id: string;
      nombre: string;
      descripcion: string;
    }>) || [];

  const [isImportDesvioOpen, setIsImportDesvioOpen] = useState(false);
  const [desvioJsonText, setDesvioJsonText] = useState("");

  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [auditFilterType, setAuditFilterType] = useState("all");

  const [storiesPage, setStoriesPage] = useState(1);
  const [expandedStoryIds, setExpandedStoryIds] = useState<
    Record<string, boolean>
  >({});

  const seccionesDisponibles =
    seccionesSitemap.length > 0
      ? seccionesSitemap.map((s) => s.nombre)
      : SECCIONES_LANDING_DEFAULT;

  useEffect(() => {
    if (seccionesSitemap.length > 0 && !seccionDescripcion) {
      setSeccionNombre(seccionesSitemap[0].nombre);
      setSeccionDescripcion(seccionesSitemap[0].descripcion);
    }
  }, [seccionesSitemap, seccionDescripcion]);

  const generarClaudeMd = (): string => {
    let md = `# CLAUDE.md - Resumen Ejecutivo del Proyecto\n\n`;
    md += `## 1. Información General del Proyecto\n`;
    md += `- **Nombre:** ${proyecto?.nombre || "No especificado"}\n`;
    md += `- **Descripción:** ${proyecto?.descripcion || "No especificado"}\n`;
    md += `- **Idioma Principal:** Español (Latinoamérica) para variables, funciones, parámetros y comentarios.\n`;

    const stackList: string[] = [];
    if (proyecto?.stack) {
      Object.entries(proyecto.stack).forEach(([layer, techs]) => {
        if (layer !== "comandos" && Array.isArray(techs) && techs.length > 0) {
          const catName =
            layer === "baseDatos"
              ? "Base de Datos"
              : layer.charAt(0).toUpperCase() + layer.slice(1);
          stackList.push(`  - **${catName}:** ${techs.join(", ")}`);
        }
      });
    }
    if (stackList.length > 0) {
      md += `\n## 2. Stack Tecnológico Elegido\n${stackList.join("\n")}\n`;
    }

    md += `\n## 3. Comandos Frecuentes\n`;
    const cmds = (proyecto?.stack as any)?.comandos;
    if (Array.isArray(cmds) && cmds.length > 0) {
      cmds.forEach((cmd: string) => {
        const parts = cmd.split(":");
        if (parts.length > 1) {
          md += `- \`${parts[0].trim()}\`: ${parts.slice(1).join(":").trim()}\n`;
        } else {
          md += `- \`${cmd.trim()}\`\n`;
        }
      });
    } else {
      md += `- \`npm run dev\`: Inicia el servidor de desarrollo.\n`;
      md += `- \`npm run build\`: Construcción de producción.\n`;
      md += `- \`npm run test\`: Ejecución de pruebas unitarias e integración.\n`;
    }

    if (proyecto?.estandares && Object.keys(proyecto.estandares).length > 0) {
      md += `\n## 4. Reglas Críticas e Innegociables\n`;
      Object.entries(proyecto.estandares).forEach(([cat, rules]) => {
        if (Array.isArray(rules) && rules.length > 0) {
          md += `- **${cat}:**\n  * ${rules.join("\n  * ")}\n`;
        }
      });
    }

    md += `\n## 5. Índice de Documentación (Leer Bajo Demanda)\n`;
    md += `Antes de planificar o ejecutar una tarea compleja, lee el documento correspondiente en la carpeta \`docs/\`:\n`;
    md += `- **Base de Datos y Entidades:** Para crear tablas, modificar migraciones o consultar el modelo físico, lee \`docs/SCHEMA.md\`.\n`;
    md += `- **Rutas, Navegación y Flujos:** Para agregar vistas, controladores o consultar el mapa de rutas del sitio, lee \`docs/SITEMAP.md\`.\n`;
    md += `- **Roles, Accesos y RLS:** Para chequear permisos y políticas RLS de base de datos, lee \`docs/ROLES.md\`.\n`;
    md += `- **Estrategia de Datos Semilla:** Para sembrar fixtures o mock de pruebas locales, lee \`docs/SEED.md\`.\n`;
    md += `- **Diccionario de Excepciones:** Para verificar códigos de error estandarizados, lee \`docs/ERRORS.md\`.\n`;
    md += `- **Inicialización y CI/CD:** Para revisar pipelines, tsconfig, docker y scripts DevOps de inicio, lee \`docs/SETUP.md\`.\n`;

    return md;
  };

  const copiarPromptDesvio = () => {
    const activeSprint = sprints.find((s) => s.id === selectedSprintId);
    const sprintText = activeSprint
      ? `Sprint: ${activeSprint.nombre}\nObjetivo: ${activeSprint.objetivo}`
      : "No seleccionado.";
    const sitemapContent =
      contexto?.sitemapSystemMarkdown ||
      contexto?.sitemapMarkup ||
      contexto?.sitemap ||
      "No configurado.";

    const prompt = PROMPT_DESVIO_SPRINT.replace("{{sprint_actual}}", sprintText)
      .replace("{{sitemap}}", sitemapContent)
      .replace("{{CLAUDE_MD}}", generarClaudeMd());

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de desvío copiado al portapapeles.", "exito");
  };

  useEffect(() => {
    if (sprints.length > 0 && !selectedSprintId) {
      const active = sprints.find((s) => s.estado === "activo");
      if (active) {
        setSelectedSprintId(active.id);
      } else {
        setSelectedSprintId(sprints[0].id);
      }
    }
  }, [sprints, selectedSprintId]);

  useEffect(() => {
    if (!cintaHandoffInput.trim()) {
      setDetectedDocUpdates(null);
      return;
    }
    try {
      const parsed = JSON.parse(cintaHandoffInput);
      if (
        parsed &&
        parsed.update_docs &&
        Object.keys(parsed.update_docs).length > 0
      ) {
        setDetectedDocUpdates(parsed.update_docs);
      } else {
        setDetectedDocUpdates(null);
      }
    } catch (e) {
      setDetectedDocUpdates(null);
    }
  }, [cintaHandoffInput]);

  const focusedSprint = sprints.find((s) => s.id === selectedSprintId);
  const historiasSprint = historias.filter(
    (h) => h.sprintId === selectedSprintId
  );
  const actividadesSprint = tareas.filter((t) =>
    historiasSprint.some((h) => h.id === t.historiaId)
  );

  const generarPromptEstacion = (
    historia: any,
    estacion: string,
    execution: any
  ) => {
    if (!proyecto) return "";

    const shortId = `hu-${historia.id.split("_").pop() || "hu"}`;
    const cleanTitle = historia.titulo
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const branchName = `feature/mc-${shortId}-${cleanTitle}`;

    let handoffStr = "No hay handoff previo (estación inicial).";
    if (execution && execution.metadata?.handoffs) {
      const pipeline = execution.metadata.pipeline || [];
      const currentIdx = pipeline.indexOf(estacion);
      if (currentIdx > 0) {
        const prevStationName = pipeline[currentIdx - 1];
        const prevHandoff = execution.metadata.handoffs[prevStationName];
        if (prevHandoff) {
          handoffStr = JSON.stringify(prevHandoff, null, 2);
        }
      }
    }

    const stationIterations = execution?.metadata?.iterations?.[estacion] || [];
    let iterationsStr = "";
    if (stationIterations.length > 0) {
      iterationsStr =
        "\n" +
        stationIterations
          .map((it: any, idx: number) => {
            return `[Iteración ${idx + 1} - ${it.fecha}]: ${it.feedback}`;
          })
          .join("\n") +
        "\n";
    }

    const stationBugs = execution?.metadata?.bugs?.[estacion] || [];
    let bugsStr = "";
    const activeBug = stationBugs.find((b: any) => !b.resuelto);
    if (activeBug) {
      bugsStr = `\n<reporte_error_bug_activo>
  - Logs/Error de consola: ${activeBug.logs}
  - Comportamiento esperado: ${activeBug.comportamientoEsperado}
  - Comportamiento real: ${activeBug.comportamientoReal}
  - Rama de depuración: bugfix/mc-bug-${shortId}
</reporte_error_bug_activo>\n`;
    }

    let role = "Desarrollador Fullstack Senior";
    if (estacion === "BD") role = "Arquitecto de Base de Datos Senior";
    if (estacion === "Backend") role = "Desarrollador Backend Senior";
    if (estacion === "Frontend")
      role = "Diseñador UI/UX & Frontend Developer Senior";
    if (estacion === "QA") role = "Ingeniero QA y Devops Senior";

    let prom = `<role>
Actúa como un ${role} de nivel Senior.
Tu objetivo es resolver el ticket de la estación "${estacion}" de manera ejecutiva, escribiendo código limpio, modular y listo para producción sin agregar introducciones, saludos ni disculpas.
</role>

<ticket_context>
  - Proyecto: ${proyecto.nombre || "MateCode"}
  - Historia: ${historia.titulo}
  - Prioridad: ${historia.prioridad || "Media"}
  - Estación Actual: ${estacion}
  - Criterios de Aceptación: ${historia.descripcion || "Ver requerimientos generales."}
  - Instrucción local: "Consulta los archivos de especificación local en tu repositorio si tienes dudas (CLAUDE.md, SCHEMA.md, DESIGN.md, SITEMAP.md, ROLES.md, ERRORS.md, SEED.md)."
</ticket_context>

<handoff_estacion_anterior>
${handoffStr}
</handoff_estacion_anterior>

<errores_de_negocio>
Implementa y maneja el control de excepciones de negocio siguiendo estrictamente las definiciones y códigos estandarizados en el archivo local "ERRORS.md".
- Antes de emitir o manejar un error de BD/Permisos/Sistema (ej: códigos NX-PER-*, NX-SYS-*), LEER el archivo "ERRORS.md" en el repositorio para aplicar el código y mensaje exacto.
- Prohibido inventar códigos de error que no estén en dicho catálogo.
- Todo error visual en cliente debe respetar las directrices de diseño (sin alerts nativos del navegador, usando librerías UI del proyecto).
</errores_de_negocio>
`;

    const storyTareas = (tareas || []).filter(
      (t: any) => t.historiaId === historia.id
    );

    if (storyTareas.length > 0) {
      prom += `\n<actividades_tecnicas>\n`;
      prom += `Para cumplir con esta historia de usuario, debes implementar o verificar las siguientes actividades técnicas desglosadas en la fase de planificación:\n\n`;
      storyTareas.forEach((t: any, idx: number) => {
        prom += `### Actividad ${idx + 1}: ${t.titulo}\n`;
        if (t.rol) prom += `- **Rol Recomendado:** ${t.rol}\n`;
        if (t.componente)
          prom += `- **Componente/Archivo:** \`${t.componente}\` en la ruta \`${t.ruta || ""}\`\n`;
        if (t.modulo) prom += `- **Módulo:** ${t.modulo}\n`;
        if (Array.isArray(t.etiquetas) && t.etiquetas.length > 0) {
          prom += `- **Etiquetas:** ${t.etiquetas.join(", ")}\n`;
        }
        if (Array.isArray(t.pasos) && t.pasos.length > 0) {
          prom += `- **Checklist de Pasos a Seguir:**\n`;
          t.pasos.forEach((p: string) => {
            prom += `  * [ ] ${p}\n`;
          });
        }
        if (
          Array.isArray(t.criteriosAceptacion) &&
          t.criteriosAceptacion.length > 0
        ) {
          prom += `- **Criterios de Aceptación Específicos:**\n`;
          t.criteriosAceptacion.forEach((crit: string) => {
            prom += `  * ${crit}\n`;
          });
        }
        prom += `\n`;
      });
      prom += `</actividades_tecnicas>\n`;
    }

    const tareasWithSeed = storyTareas.filter(
      (t: any) => t.seed && t.seed.modelo
    );
    if (tareasWithSeed.length > 0) {
      prom +=
        `\n<requerimiento_datos_semilla>
Para la siembra y pruebas volumétricas del sistema, genera scripts de datos semilla (Seed Data) correspondientes:
` +
        tareasWithSeed
          .map((t: any) => {
            const s = t.seed;
            return `  - Modelo: "${s.modelo}" (Volumen deseado: ${s.volumen} registros)
    * Directrices: ${s.indicaciones || "Generar datos de muestra realistas para simular estrés y probar filtros/paginaciones."}`;
          })
          .join("\n") +
        `\nNota: La cantidad de registros a simular debe seguir los volúmenes indicados para probar adecuadamente paginaciones y límites del frontend.
</requerimiento_datos_semilla>\n`;
    }

    if (iterationsStr) {
      prom += `\n<refinamientos_solicitados>${iterationsStr}</refinamientos_solicitados>\n`;
    }

    if (bugsStr) {
      prom += `\n<instrucciones_correccion_error>
${bugsStr}
  Analiza la causa raíz del error reportado arriba y proporciona la corrección pertinente asegurando no romper contratos ni firmas previas.
</instrucciones_correccion_error>\n`;
    }

    prom += `
<instrucciones_git>
  Trabaja y realiza los cambios sobre la rama "${branchName}".
</instrucciones_git>

<salida_requerida>
Devuelve el código limpio completo que deba ser creado o modificado.
Al final de tu respuesta, adjunta OBLIGATORIAMENTE un bloque JSON con esta estructura exacta para realizar el handoff e indicar si realizaste algún cambio en los documentos de especificaciones locales (SCHEMA.md, SITEMAP.md, ROLES.md, SEED.md, ERRORS.md o DESIGN.md). Si no hubo cambios en un documento, omite su propiedad en "update_docs":

\`\`\`json
{
  "handoff": {
    "archivos_creados_o_modificados": ["lista de archivos modificados"],
    "firmas_o_contratos_exportados": ["lista de firmas, endpoints o esquemas"],
    "resumen_tecnico": "breve descripción de las decisiones tomadas en esta estación"
  },
  "update_docs": {
    "schema": "contenido completo de SCHEMA.md si cambió, sino omitir",
    "sitemap": "contenido completo de SITEMAP.md si cambió, sino omitir",
    "roles": "contenido completo de ROLES.md si cambió, sino omitir",
    "errors": "contenido completo de ERRORS.md si cambió, sino omitir",
    "seed": "contenido completo de SEED.md si cambió, sino omitir",
    "design": "contenido completo de DESIGN.md si cambió, sino omitir"
  }
}
\`\`\`
</salida_requerida>`;

    return prom;
  };

  const iniciarCintaProduccion = async (historia: any) => {
    const ticketId = `cinta_hu_${historia.id}`;
    try {
      await db.transaction(
        "rw",
        [db.task_executions, db.task_step_states],
        async () => {
          await db.task_executions.put({
            id: ticketId,
            proyectoId,
            templateId: "cinta_produccion_hu",
            titulo: `Cinta HU: ${historia.titulo}`,
            estado: "IN_PROGRESS",
            usuarioAsignadoId: ticketMiembro,
            fechaInicio: Date.now(),
            metadata: {
              pipeline: cintaPipelineConfig,
              activeStationIndex: 0,
              handoffs: {},
              iterations: {},
              bugs: {},
            },
          });

          for (let i = 0; i < cintaPipelineConfig.length; i++) {
            await db.task_step_states.put({
              id: `state_${ticketId}_step_${i + 1}`,
              executionId: ticketId,
              stepId: `step_${i + 1}`,
              titulo: `Estación: ${cintaPipelineConfig[i]}`,
              completado: false,
            });
          }
        }
      );

      setSelectedHistoriaCinta(historia);
      setIsFocusMode(true);
      mostrarToast(
        `Cinta de Producción iniciada para "${historia.titulo}"`,
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al iniciar la cinta: ${err.message}`, "error");
    }
  };

  const handleTogglePipelineStation = (station: string) => {
    setCintaPipelineConfig((prev) => {
      if (prev.includes(station)) {
        if (prev.length <= 1) return prev;
        return prev.filter((s) => s !== station);
      } else {
        return [...prev, station];
      }
    });
  };

  const avanzarEstacionCinta = async (
    estacion: string,
    handoffJsonStr: string
  ) => {
    if (!activeCintaExecution) return;
    if (!selectedHistoriaCinta && !selectedActividadCinta) return;

    const isActividad = !!selectedActividadCinta;

    try {
      let parsedRaw: any;
      try {
        parsedRaw = JSON.parse(handoffJsonStr);
      } catch {
        throw new Error(
          "El contenido ingresado no es un JSON válido. Asegúrate de copiarlo completo."
        );
      }
      const handoffCandidate = parsedRaw.handoff || parsedRaw;
      const validacion = parseHandoffIA(JSON.stringify(handoffCandidate));
      if (!validacion.ok) {
        throw new Error(
          `El handoff no cumple el formato esperado (${validacion.codigoError}): ${validacion.detalle}`
        );
      }
      const handoffData = validacion.data;

      const meta = activeCintaExecution.metadata || {};
      const updatedHandoffs = {
        ...(meta.handoffs || {}),
        [estacion]: {
          ...handoffData,
          fecha: new Date().toLocaleTimeString(),
        },
      };

      if (isActividad && selectedActividadCinta) {
        await db.task_executions.update(activeCintaExecution.id, {
          estado: "IN_REVISION",
          metadata: {
            ...meta,
            handoffs: updatedHandoffs,
          },
        });
        await db.tareas.update(selectedActividadCinta.id, {
          estado: "in_revision",
        });

        setSelectedActividadCinta((prev: any) => ({
          ...prev,
          estado: "in_revision",
        }));

        mostrarToast(
          "Handoff guardado con éxito. Actividad ahora está En Revisión.",
          "exito"
        );
      } else if (selectedHistoriaCinta) {
        const pipeline = meta.pipeline || [];
        const activeIdx = meta.activeStationIndex || 0;

        if (activeIdx >= pipeline.length - 1) {
          await db.task_executions.update(activeCintaExecution.id, {
            estado: "COMPLETED",
            fechaFin: Date.now(),
            metadata: {
              ...meta,
              handoffs: updatedHandoffs,
            },
          });
          await db.historias.update(selectedHistoriaCinta.id, {
            estado: "done",
          });
          setIsFocusMode(false);
          setSelectedHistoriaCinta(null);
          mostrarToast(
            `¡Historia "${selectedHistoriaCinta.titulo}" completada con éxito en la Cinta!`,
            "exito"
          );
        } else {
          await db.task_executions.update(activeCintaExecution.id, {
            metadata: {
              ...meta,
              activeStationIndex: activeIdx + 1,
              handoffs: updatedHandoffs,
            },
          });
          mostrarToast(
            `Estación ${estacion} completada. Avanzando...`,
            "exito"
          );
        }
      }
    } catch (err: any) {
      mostrarToast(`Error al avanzar: ${err.message}`, "error");
    }
  };

  const registrarIteracionEstacion = async (
    estacion: string,
    feedback: string
  ) => {
    if (
      !activeCintaExecution ||
      (!selectedHistoriaCinta && !selectedActividadCinta) ||
      !feedback.trim()
    )
      return;

    try {
      const meta = activeCintaExecution.metadata || {};
      const currentIterations = meta.iterations || {};
      const stationIterations = currentIterations[estacion] || [];

      const newIt = {
        fecha: new Date().toLocaleTimeString(),
        version: `v${stationIterations.length + 1}`,
        feedback: feedback.trim(),
      };

      await db.task_executions.update(activeCintaExecution.id, {
        metadata: {
          ...meta,
          iterations: {
            ...currentIterations,
            [estacion]: [...stationIterations, newIt],
          },
        },
      });
      mostrarToast("Iteración registrada con éxito.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al registrar iteración: ${err.message}`, "error");
    }
  };

  const registrarBugEstacion = async (
    estacion: string,
    logs: string,
    expected: string,
    real: string
  ) => {
    if (
      !activeCintaExecution ||
      (!selectedHistoriaCinta && !selectedActividadCinta) ||
      !logs.trim()
    )
      return;

    try {
      const meta = activeCintaExecution.metadata || {};
      const currentBugs = meta.bugs || {};
      const stationBugs = currentBugs[estacion] || [];

      const newBug = {
        id: `bug_${Date.now()}`,
        logs: logs.trim(),
        comportamientoEsperado: expected.trim(),
        comportamientoReal: real.trim(),
        resuelto: false,
        fecha: new Date().toLocaleTimeString(),
      };

      await db.task_executions.update(activeCintaExecution.id, {
        metadata: {
          ...meta,
          bugs: {
            ...currentBugs,
            [estacion]: [...stationBugs, newBug],
          },
        },
      });
      mostrarToast(
        "Bug reportado en la estación. Revisa el prompt de depuración.",
        "info"
      );
    } catch (err: any) {
      mostrarToast(`Error al reportar bug: ${err.message}`, "error");
    }
  };

  const resolverBugEstacion = async (estacion: string) => {
    if (!activeCintaExecution) return;
    try {
      const meta = activeCintaExecution.metadata || {};
      const currentBugs = meta.bugs || {};
      const stationBugs = currentBugs[estacion] || [];

      const updated = stationBugs.map((b: any) => {
        if (!b.resuelto) {
          return { ...b, resuelto: true };
        }
        return b;
      });

      await db.task_executions.update(activeCintaExecution.id, {
        metadata: {
          ...meta,
          bugs: {
            ...currentBugs,
            [estacion]: updated,
          },
        },
      });
      mostrarToast("¡Bug marcado como resuelto!", "exito");
    } catch (err: any) {
      mostrarToast(`Error al resolver bug: ${err.message}`, "error");
    }
  };

  const handleSeleccionarSeccion = (val: string) => {
    setSeccionNombre(val);
    const matched = seccionesSitemap.find(
      (s) => s.nombre.toUpperCase() === val.toUpperCase()
    );
    if (matched && matched.descripcion) {
      setSeccionDescripcion(matched.descripcion);
    }
  };

  // Form states for creating Bug ticket
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [bugNombre, setBugNombre] = useState("");
  const [linkedTicketId, setLinkedTicketId] = useState("");
  const [bugLogs, setBugLogs] = useState("");
  const [bugType, setBugType] = useState<"bugfix" | "hotfix">("bugfix");

  // Tickets (executions) loaded
  const ticketExecutions = (useLiveQuery(async () => {
    const todos = await db.task_executions
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    return todos.filter((t: any) => !t.eliminado);
  }) || []) as any[];

  // Collapsible cards state: record of ticketId -> isExpanded
  const [expandedTicketIds, setExpandedTicketIds] = useState<
    Record<string, boolean>
  >({});

  // Auto-expand newly created tickets
  useEffect(() => {
    if (ticketExecutions.length > 0) {
      setExpandedTicketIds((prev) => {
        const next = { ...prev };
        let hasNew = false;
        ticketExecutions.forEach((t) => {
          if (next[t.id] === undefined) {
            next[t.id] = true;
            hasNew = true;
          }
        });
        return hasNew ? next : prev;
      });
    }
  }, [ticketExecutions]);

  const toggleExpandTicket = (id: string) => {
    setExpandedTicketIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const salirEnfoqueActividad = async () => {
    try {
      await db.proyecto_estado_tecnico.update(proyectoId, {
        activeActivityFocusId: null,
      });
      setSelectedActividadCinta(null);
      setIsFocusMode(false);
    } catch (err: any) {
      console.error("Error al salir de enfoque:", err);
    }
  };

  const completarCerrarActividad = async (actividadId: string) => {
    try {
      await db.transaction(
        "rw",
        [db.tareas, db.task_executions, db.proyecto_estado_tecnico],
        async () => {
          await db.tareas.update(actividadId, { estado: "completado" });
          await db.task_executions.update(`execution_act_${actividadId}`, {
            estado: "COMPLETED",
            fechaFin: Date.now(),
          });
          await db.proyecto_estado_tecnico.update(proyectoId, {
            activeActivityFocusId: null,
          });
        }
      );
      setSelectedActividadCinta(null);
      setIsFocusMode(false);
      mostrarToast("Actividad completada y ticket cerrado.", "exito");
    } catch (err: any) {
      mostrarToast(
        `Error al completar y cerrar actividad: ${err.message}`,
        "error"
      );
    }
  };

  const iniciarCintaProduccionActividad = async (actividad: any) => {
    try {
      await db.tareas.update(actividad.id, { estado: "in_progress" });
      const execId = `execution_act_${actividad.id}`;
      const existing = await db.task_executions.get(execId);
      if (!existing) {
        await db.task_executions.put({
          id: execId,
          proyectoId,
          actividadId: actividad.id,
          titulo: actividad.titulo,
          estado: "IN_PROGRESS",
          fechaInicio: Date.now(),
          metadata: {
            handoffs: {},
            iterations: [],
            bugs: [],
          },
        });
      }
      await db.proyecto_estado_tecnico.put({
        proyectoId,
        activeActivityFocusId: actividad.id,
      });
      setSelectedActividadCinta(actividad);
      setIsFocusMode(true);
      mostrarToast(
        `Iniciando enfoque en actividad: ${actividad.titulo}`,
        "info"
      );
    } catch (err: any) {
      mostrarToast(`Error al iniciar enfoque: ${err.message}`, "error");
    }
  };

  const generarPromptActividadTicket = (actividad: any) => {
    if (!proyecto) return "";
    const parentStory = historias.find((h) => h.id === actividad.historiaId);

    const stationIterations: any[] =
      activeCintaExecution?.metadata?.iterations?.default || [];
    const stationBugs: any[] =
      activeCintaExecution?.metadata?.bugs?.default || [];
    const activeBug = stationBugs.find((b: any) => !b.resuelto);

    return generarPromptActividadTicketPuro({
      actividad,
      proyectoNombre: (proyecto as any).nombre,
      historiaPadre: parentStory
        ? { titulo: parentStory.titulo, prioridad: parentStory.prioridad }
        : undefined,
      iteraciones: stationIterations.map((it) => ({
        fecha: it.fecha,
        feedback: it.feedback,
      })),
      bugActivo: activeBug
        ? {
            logs: activeBug.logs,
            comportamientoEsperado: activeBug.comportamientoEsperado,
            comportamientoReal: activeBug.comportamientoReal,
          }
        : undefined,
    });
  };

  useEffect(() => {
    const restoreFocusState = async () => {
      try {
        const state = await db.proyecto_estado_tecnico.get(proyectoId);
        if (state && state.activeActivityFocusId) {
          const act = await db.tareas.get(state.activeActivityFocusId);
          if (act && act.estado !== "completado" && act.estado !== "done") {
            setSelectedActividadCinta(act);
            setIsFocusMode(true);
          } else {
            await db.proyecto_estado_tecnico.update(proyectoId, {
              activeActivityFocusId: null,
            });
          }
        }
      } catch (err) {
        console.error("Error restoring focus state:", err);
      }
    };
    restoreFocusState();
  }, [proyectoId]);

  const iniciarSprint = async () => {
    if (!selectedSprintId) return;
    try {
      const spr = sprints.find((s) => s.id === selectedSprintId);
      const duration = spr?.duracionSemanas || 2;
      // Preserve existing fechaInicio if previously recorded
      const start = spr?.fechaInicio || Date.now();
      const end = start + duration * 7 * 24 * 60 * 60 * 1000;

      await db.transaction("rw", [db.sprints, db.cola_eventos], async () => {
        const projectSprints = await db.sprints
          .where("proyectoId")
          .equals(proyectoId)
          .toArray();
        for (const s of projectSprints) {
          const sAny = s as any;
          if (sAny.estado === "activo" && sAny.id !== selectedSprintId) {
            await db.sprints.update(sAny.id, { estado: "planificado" });
            await QueueService.encolar("sprints", "editar", sAny.id, {
              id: sAny.id,
              estado: "planificado",
            });
          }
        }

        await db.sprints.update(selectedSprintId, {
          estado: "activo",
          fechaInicio: start,
          fechaFin: end,
          finalizadoEn: null,
        });
        await QueueService.encolar("sprints", "editar", selectedSprintId, {
          id: selectedSprintId,
          estado: "activo",
          fechaInicio: start,
          fechaFin: end,
          finalizadoEn: null,
        });
      });
      mostrarToast("Sprint iniciado con éxito.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al iniciar sprint: ${err.message}`, "error");
    }
  };

  const reabrirSprint = async (sprintIdToReopen?: string) => {
    const targetId = sprintIdToReopen || selectedSprintId;
    if (!targetId) return;
    try {
      const spr = sprints.find((s) => s.id === targetId);
      const start = spr?.fechaInicio || Date.now();
      const duration = spr?.duracionSemanas || 2;
      const end = start + duration * 7 * 24 * 60 * 60 * 1000;

      await db.transaction("rw", [db.sprints, db.cola_eventos], async () => {
        await db.sprints.update(targetId, {
          estado: "activo",
          fechaInicio: start,
          fechaFin: end,
          finalizadoEn: null,
        });
        await QueueService.encolar("sprints", "editar", targetId, {
          id: targetId,
          estado: "activo",
          fechaInicio: start,
          fechaFin: end,
          finalizadoEn: null,
        });
      });
      mostrarToast("Sprint reabierto en modo activo.", "info");
    } catch (err: any) {
      mostrarToast(`Error al reabrir sprint: ${err.message}`, "error");
    }
  };

  const finalizarSprint = async (targetSprintId?: string) => {
    if (!selectedSprintId) return;
    try {
      const finishDate = Date.now();
      await db.transaction(
        "rw",
        [db.sprints, db.historias, db.cola_eventos],
        async () => {
          if (targetSprintId) {
            const storiesToMove = historias.filter((h) => {
              if (h.sprintId !== selectedSprintId) return false;
              const subTareas = tareas.filter((t) => t.historiaId === h.id);
              return subTareas.some(
                (t) => t.estado !== "completado" && t.estado !== "done"
              );
            });
            for (const story of storiesToMove) {
              const nextSprintId =
                targetSprintId === "backlog" ? null : targetSprintId;
              await db.historias.update(story.id, {
                sprintId: nextSprintId,
              });
              await QueueService.encolar("historias", "editar", story.id, {
                id: story.id,
                sprintId: nextSprintId,
              });
            }
          }
          await db.sprints.update(selectedSprintId, {
            estado: "completado",
            finalizadoEn: finishDate,
          });
          await QueueService.encolar("sprints", "editar", selectedSprintId, {
            id: selectedSprintId,
            estado: "completado",
            finalizadoEn: finishDate,
          });
        }
      );
      mostrarToast("Sprint finalizado con éxito.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al finalizar sprint: ${err.message}`, "error");
    }
  };

  const cancelarSprint = async (reiniciarTareas: boolean) => {
    if (!selectedSprintId) return;
    try {
      await db.transaction(
        "rw",
        [
          db.sprints,
          db.historias,
          db.tareas,
          db.proyecto_estado_tecnico,
          db.cola_eventos,
        ],
        async () => {
          await db.sprints.update(selectedSprintId, {
            estado: "planificado",
            fechaInicio: null,
            fechaFin: null,
          });
          await QueueService.encolar("sprints", "editar", selectedSprintId, {
            id: selectedSprintId,
            estado: "planificado",
            fechaInicio: null,
            fechaFin: null,
          });

          const stories = await db.historias
            .where("sprintId")
            .equals(selectedSprintId)
            .toArray();
          const storyIds = stories.map((h) => h.id);

          if (reiniciarTareas && storyIds.length > 0) {
            await db.tareas
              .where("historiaId")
              .anyOf(storyIds as string[])
              .modify({ estado: "todo" });

            const tasks = await db.tareas
              .where("historiaId")
              .anyOf(storyIds as string[])
              .toArray();
            for (const t of tasks) {
              const tAny = t as any;
              await QueueService.encolar("tareas", "editar", tAny.id, {
                id: tAny.id,
                estado: "todo",
              });
            }
          }

          const focusState = await db.proyecto_estado_tecnico.get(proyectoId);
          if (focusState && focusState.activeActivityFocusId) {
            const act = await db.tareas.get(focusState.activeActivityFocusId);
            if (act && storyIds.includes(act.historiaId)) {
              await db.proyecto_estado_tecnico.update(proyectoId, {
                activeActivityFocusId: null,
              });
              await QueueService.encolar(
                "proyecto_estado_tecnico",
                "editar",
                proyectoId,
                {
                  id: proyectoId,
                  activeActivityFocusId: null,
                }
              );
            }
          }
        }
      );

      const focusState = await db.proyecto_estado_tecnico.get(proyectoId);
      if (!focusState?.activeActivityFocusId) {
        setSelectedActividadCinta(null);
        setIsFocusMode(false);
      }

      mostrarToast("Sprint cancelado con éxito.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al cancelar sprint: ${err.message}`, "error");
    }
  };

  const handleUpdateActividadEstado = async (id: string, estado: string) => {
    try {
      await db.tareas.update(id, { estado });
      mostrarToast("Estado de actividad actualizado.", "exito");
    } catch (err: any) {
      mostrarToast(`Error al actualizar estado: ${err.message}`, "error");
    }
  };

  const handleImportarDesvio = async () => {
    if (!desvioJsonText.trim()) {
      mostrarToast("Ingresa el JSON primero.", "error");
      return;
    }
    try {
      const parsed = JSON.parse(desvioJsonText);
      if (!parsed.titulo) {
        throw new Error("El JSON debe contener la propiedad 'titulo'.");
      }

      await db.transaction("rw", [db.historias, db.tareas], async () => {
        const historiaId = `historia_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.historias.put({
          id: historiaId,
          proyectoId,
          sprintId: selectedSprintId || null,
          titulo: `[DESVÍO] ${parsed.titulo}`,
          descripcion: parsed.descripcion || "",
          prioridad: parsed.prioridad || "Alta",
          estimacion: parsed.estimacion || 2,
          estado: "todo",
        });

        if (Array.isArray(parsed.actividades)) {
          for (const act of parsed.actividades) {
            const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            await db.tareas.put({
              id: actId,
              proyectoId,
              historiaId,
              titulo: act.actividadTitulo,
              descripcion: act.descripcion || "",
              rol: act.rol,
              componente: act.componente,
              ruta: act.ruta,
              modulo: act.modulo,
              etiquetas: act.etiquetas,
              pasos: act.pasos,
              seed: act.seed,
              estado: "todo",
            });
          }
        }
      });

      setDesvioJsonText("");
      setIsImportDesvioOpen(false);
      mostrarToast(
        "Historia de Desvío importada y cargada con éxito.",
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al procesar JSON de desvío: ${err.message}`, "error");
    }
  };

  const handleAplicarActualizacionesDocs = async () => {
    if (!detectedDocUpdates) return;
    try {
      const currentCtx = (await db.proyecto_contexto.get(proyectoId)) || {
        proyectoId,
      };
      const currentDs = (await db.proyecto_design_system.get(proyectoId)) || {
        proyectoId,
      };

      const updatedFields: string[] = [];

      if (detectedDocUpdates.schema !== undefined) {
        currentCtx.entidades = detectedDocUpdates.schema;
        updatedFields.push("SCHEMA.md");
      }
      if (detectedDocUpdates.sitemap !== undefined) {
        currentCtx.sitemapSystemMarkdown = detectedDocUpdates.sitemap;
        updatedFields.push("SITEMAP.md");
      }
      if (detectedDocUpdates.roles !== undefined) {
        currentCtx.rolesMarkdown = detectedDocUpdates.roles;
        updatedFields.push("ROLES.md");
      }
      if (detectedDocUpdates.errors !== undefined) {
        currentCtx.erroresMarkdown = detectedDocUpdates.errors;
        updatedFields.push("ERRORS.md");
      }
      if (detectedDocUpdates.seed !== undefined) {
        currentCtx.seedMarkdown = detectedDocUpdates.seed;
        updatedFields.push("SEED.md");
      }
      if (detectedDocUpdates.design !== undefined) {
        currentDs.designSystemMarkdown = detectedDocUpdates.design;
        await db.proyecto_design_system.put(currentDs);
        updatedFields.push("DESIGN.md");
      }

      await db.proyecto_contexto.put(currentCtx);
      mostrarToast(
        `¡Documentos actualizados en base de datos: ${updatedFields.join(", ")}!`,
        "exito"
      );
      setDetectedDocUpdates(null);
    } catch (err: any) {
      mostrarToast(`Error al actualizar documentos: ${err.message}`, "error");
    }
  };

  const descargarContextoCompleto = async () => {
    try {
      let md = `# CONTEXTO_EJECUCION_${
        String(proyecto?.nombre || "")
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_") || "PROYECTO"
      }.md\n\n`;

      md += `Este archivo resume el estado exacto de desarrollo y ejecución de la Cinta de Producción. Úsalo como instrucción de inicio para Claude.\n\n`;
      md += `## 1. Stack Tecnológico\n`;
      if (proyecto?.stack) {
        Object.entries(proyecto.stack).forEach(([layer, techs]) => {
          if (Array.isArray(techs) && techs.length > 0) {
            md += `- **${layer}:** ${techs.join(", ")}\n`;
          }
        });
      }

      md += `\n## 2. Historial de Ejecuciones de Tickets (Cinta de Producción)\n\n`;
      for (const t of ticketExecutions) {
        md += `### TICKET: ${t.titulo} (${t.estado})\n`;
        md += `- **Template/Tipo:** ${t.templateId}\n`;
        md += `- **Asignado a:** ${t.usuarioAsignadoId || "Sin asignar"}\n`;
        md += `- **Fecha Inicio:** ${new Date(t.fechaInicio).toLocaleDateString()}\n`;

        const steps = await db.task_step_states
          .where("executionId")
          .equals(t.id)
          .toArray();
        if (steps.length > 0) {
          md += `- **Estaciones/Pasos:**\n`;
          steps.forEach((st) => {
            md += `  * [${st.completado ? "x" : " "}] ${st.titulo}\n`;
          });
        }

        const metadata = t.metadata || {};
        if (metadata.handoffs && Object.keys(metadata.handoffs).length > 0) {
          md += `- **Handoffs Registrados:**\n`;
          Object.entries(metadata.handoffs).forEach(
            ([stName, data]: [string, any]) => {
              md += `  * **Estación: ${stName}**\n`;
              if (data.archivos_creados_o_modificados) {
                const files = Array.isArray(data.archivos_creados_o_modificados)
                  ? data.archivos_creados_o_modificados.join(", ")
                  : String(data.archivos_creados_o_modificados);
                md += `    - Archivos: ${files}\n`;
              }
              if (data.resumen_tecnico) {
                md += `    - Resumen: ${data.resumen_tecnico}\n`;
              }
            }
          );
        }
        md += `\n---\n\n`;
      }

      const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `CONTEXTO_EJECUCION.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      mostrarToast("Descargando contexto de ejecución...", "info");
    } catch (err: any) {
      mostrarToast(`Error al descargar contexto: ${err.message}`, "error");
    }
  };

  const iniciarSeccionLandingTicket = async () => {
    if (isLandingType && !seccionNombre.trim()) {
      mostrarToast("Escribe o selecciona una sección.", "error");
      return;
    }

    const finalNombre =
      seccionNombre === "Sección Personalizada"
        ? seccionNombreCustom
        : seccionNombre;

    if (!finalNombre.trim()) {
      mostrarToast("El nombre de la sección no puede estar vacío.", "error");
      return;
    }

    const ticketId = `tick_sec_${Date.now()}`;
    try {
      await db.transaction(
        "rw",
        [db.task_executions, db.task_step_states],
        async () => {
          await db.task_executions.put({
            id: ticketId,
            proyectoId,
            templateId: "workflow_seccion_landing",
            titulo: `Landing: ${finalNombre}`,
            estado: "IN_PROGRESS",
            usuarioAsignadoId: ticketMiembro,
            fechaInicio: Date.now(),
            metadata: {
              seccionNombre: finalNombre,
              seccionDescripcion,
            },
          });

          const steps = [
            "Maquetado HTML y Estructura Semántica",
            "Estilos CSS (Flexbox/Grid & Responsive)",
            "Copywriting & Textos Persuasivos",
            "Interactividad JavaScript (Eventos & Animaciones)",
            "Revisión QA y Optimización SEO",
          ];

          for (let i = 0; i < steps.length; i++) {
            await db.task_step_states.put({
              id: `state_${ticketId}_step_${i + 1}`,
              executionId: ticketId,
              stepId: `step_${i + 1}`,
              titulo: steps[i],
              completado: false,
            });
          }
        }
      );

      setExpandedTicketIds((prev) => ({ ...prev, [ticketId]: true }));
      setSeccionNombreCustom("");
      mostrarToast(
        `Ticket de desarrollo para "${finalNombre}" iniciado con éxito.`,
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al iniciar ticket: ${err.message}`, "error");
    }
  };

  const iniciarBugTicket = async () => {
    if (!bugNombre.trim()) {
      mostrarToast("Escribe un nombre para el bug.", "error");
      return;
    }

    const ticketId = `tick_bug_${Date.now()}`;
    try {
      await db.transaction(
        "rw",
        [db.task_executions, db.task_step_states],
        async () => {
          await db.task_executions.put({
            id: ticketId,
            proyectoId,
            templateId: "workflow_bugfix",
            titulo: `${bugType.toUpperCase()}: ${bugNombre}`,
            estado: "IN_PROGRESS",
            usuarioAsignadoId: ticketMiembro,
            fechaInicio: Date.now(),
            metadata: {
              linkedTicketId,
              logs: bugLogs,
              tipoBug: bugType,
            },
          });

          const steps = [
            "Aislamiento y Rama (Git Checkout)",
            "Pruebas de Regresión (TDD para Bug)",
            "La Solución (Debugging & Fix)",
            "Pull Request y QA Review",
            "Despliegue y Post-Mortem",
          ];

          for (let i = 0; i < steps.length; i++) {
            await db.task_step_states.put({
              id: `state_${ticketId}_step_${i + 1}`,
              executionId: ticketId,
              stepId: `step_${i + 1}`,
              titulo: steps[i],
              completado: false,
            });
          }
        }
      );

      setExpandedTicketIds((prev) => ({ ...prev, [ticketId]: true }));
      setBugNombre("");
      setBugLogs("");
      setLinkedTicketId("");
      setIsBugModalOpen(false);
      mostrarToast(`Ticket de ${bugType} iniciado con éxito.`, "exito");
    } catch (err: any) {
      mostrarToast(`Error al iniciar bug: ${err.message}`, "error");
    }
  };

  const handleEliminarTicket = async (id: string, titulo: string) => {
    if (confirm(`¿Estás seguro de eliminar el ticket "${titulo}"?`)) {
      try {
        const eliminadoEn = Date.now();
        await db.transaction(
          "rw",
          [db.task_executions, db.task_step_states],
          async () => {
            // Soft-delete: task_executions sincroniza con Supabase, un hard-delete
            // local dejaría el registro remoto huérfano sin propagar el borrado.
            await db.task_executions.update(id, {
              eliminado: true,
              eliminadoEn,
            });
            // task_step_states nunca sincroniza con el servidor, se puede purgar local.
            await db.task_step_states.where("executionId").equals(id).delete();
          }
        );
        await QueueService.encolar("task_executions", "editar", id, {
          id,
          eliminado: true,
          eliminadoEn,
        });
        mostrarToast("Ticket eliminado correctamente.", "exito");
      } catch (err: any) {
        mostrarToast(`Error al eliminar ticket: ${err.message}`, "error");
      }
    }
  };

  const ticketsOrdenados = [...ticketExecutions].sort(
    (a, b) => (a.fechaInicio || 0) - (b.fechaInicio || 0)
  );

  const promptMagro = selectedActividadCinta
    ? generarPromptActividadTicket(selectedActividadCinta)
    : selectedHistoriaCinta && activeCintaExecution
      ? generarPromptEstacion(
          selectedHistoriaCinta,
          (activeCintaExecution.metadata?.pipeline || [])[
            activeCintaExecution.metadata?.activeStationIndex || 0
          ] || "QA",
          activeCintaExecution
        )
      : "";

  return (
    <div className="flex flex-col gap-5">
      {/* Focus Mode Fullscreen Conveyor Belt Viewport */}
      <ConveyorBeltFocusView
        isOpen={isFocusMode}
        onClose={
          selectedActividadCinta
            ? salirEnfoqueActividad
            : () => {
                setIsFocusMode(false);
                setSelectedHistoriaCinta(null);
              }
        }
        selectedHistoriaCinta={selectedHistoriaCinta}
        selectedActividadCinta={selectedActividadCinta}
        activeCintaExecution={activeCintaExecution}
        focusedSprint={focusedSprint}
        cintaHandoffInput={cintaHandoffInput}
        setCintaHandoffInput={setCintaHandoffInput}
        detectedDocUpdates={detectedDocUpdates}
        handleAplicarActualizacionesDocs={handleAplicarActualizacionesDocs}
        cintaIterationFeedback={cintaIterationFeedback}
        setCintaIterationFeedback={setCintaIterationFeedback}
        cintaBugLogs={cintaBugLogs}
        setCintaBugLogs={setCintaBugLogs}
        cintaBugExpected={cintaBugExpected}
        setCintaBugExpected={setCintaBugExpected}
        cintaBugReal={cintaBugReal}
        setCintaBugReal={setCintaBugReal}
        avanzarEstacionCinta={avanzarEstacionCinta}
        registrarIteracionEstacion={registrarIteracionEstacion}
        registrarBugEstacion={registrarBugEstacion}
        resolverBugEstacion={resolverBugEstacion}
        completarCerrarActividad={completarCerrarActividad}
        promptMagro={promptMagro}
        mostrarToast={mostrarToast}
        isCicdModalOpen={isCicdModalOpen}
        setIsCicdModalOpen={setIsCicdModalOpen}
      />

      {/* Header bar with controls */}
      <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-3">
        <div>
          <h2 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
            Taller de Ejecución & Desarrollo Seccional
          </h2>
          <p className="text-zinc-555 font-mono text-[10px]">
            Inicia tickets por sección o por sprints, abre múltiples tarjetas
            desplegables y genera prompts limpios para la IA.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBugModalOpen(true)}
            className="rounded border border-red-500/20 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-red-400 uppercase transition-all hover:bg-red-500/20"
          >
            🐛 Reportar Bug / Hotfix
          </button>
        </div>
      </div>

      {/* Mode switcher tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTabMode("secciones")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTabMode === "secciones"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          🎨 Desarrollo de Secciones (Landing / Sitio)
        </button>
        <button
          onClick={() => setActiveTabMode("tickets")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTabMode === "tickets"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          ⚡ Desarrollo por Sprints & Actividades
        </button>
        <button
          onClick={() => setActiveTabMode("auditoria")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTabMode === "auditoria"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          📋 Historial & Auditoría
        </button>
      </div>

      {/* Main Grid Layout */}
      {activeTabMode === "auditoria" ? (
        <ConsolaAuditoriaTab
          ticketExecutions={ticketExecutions}
          descargarContextoCompleto={descargarContextoCompleto}
          auditSearchQuery={auditSearchQuery}
          setAuditSearchQuery={setAuditSearchQuery}
          auditFilterType={auditFilterType}
          setAuditFilterType={setAuditFilterType}
        />
      ) : (
        <div className="flex w-full flex-col gap-6">
          {activeTabMode === "secciones" ? (
            <>
              <SeccionesDesarrolloTab
                seccionesDisponibles={seccionesDisponibles}
                seccionNombre={seccionNombre}
                handleSeleccionarSeccion={handleSeleccionarSeccion}
                seccionNombreCustom={seccionNombreCustom}
                setSeccionNombreCustom={setSeccionNombreCustom}
                seccionDescripcion={seccionDescripcion}
                setSeccionDescripcion={setSeccionDescripcion}
                ticketMiembro={ticketMiembro}
                setTicketMiembro={setTicketMiembro}
                selectedRole={selectedRole}
                setSelectedRole={setSelectedRole}
                iniciarSeccionLandingTicket={iniciarSeccionLandingTicket}
              />
              <ConsolaTicketsTab
                ticketsOrdenados={ticketsOrdenados}
                proyecto={proyecto}
                contexto={contexto}
                ds={ds}
                expandedTicketIds={expandedTicketIds}
                toggleExpandTicket={toggleExpandTicket}
                handleEliminarTicket={handleEliminarTicket}
                mostrarToast={mostrarToast}
              />
            </>
          ) : (
            <SprintEnfoqueTab
              proyecto={proyecto}
              sprints={sprints}
              historias={historias}
              historiasSprint={historiasSprint}
              epicas={epicas}
              tareas={tareas}
              actividadesSprint={actividadesSprint}
              focusedSprint={focusedSprint}
              selectedSprintId={selectedSprintId}
              setSelectedSprintId={setSelectedSprintId}
              iniciarSprint={iniciarSprint}
              reabrirSprint={reabrirSprint}
              finalizarSprint={finalizarSprint}
              cancelarSprint={cancelarSprint}
              iniciarCintaProduccionActividad={iniciarCintaProduccionActividad}
              handleUpdateActividadEstado={handleUpdateActividadEstado}
              setIsImportDesvioOpen={setIsImportDesvioOpen}
            />
          )}
        </div>
      )}

      {/* Modal / Panel for Bug Tickets */}
      <BugHotfixModal
        isOpen={isBugModalOpen}
        onClose={() => setIsBugModalOpen(false)}
        bugNombre={bugNombre}
        setBugNombre={setBugNombre}
        bugType={bugType}
        setBugType={setBugType}
        linkedTicketId={linkedTicketId}
        setLinkedTicketId={setLinkedTicketId}
        ticketExecutions={ticketExecutions}
        bugLogs={bugLogs}
        setBugLogs={setBugLogs}
        iniciarBugTicket={iniciarBugTicket}
      />

      {/* Modal: Importar Desvío JSON */}
      <ImportDesvioModal
        isOpen={isImportDesvioOpen}
        onClose={() => setIsImportDesvioOpen(false)}
        desvioJsonText={desvioJsonText}
        setDesvioJsonText={setDesvioJsonText}
        handleImportarDesvio={handleImportarDesvio}
        copiarPromptDesvio={copiarPromptDesvio}
      />
    </div>
  );
};
