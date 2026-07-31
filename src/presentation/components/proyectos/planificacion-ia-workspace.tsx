/* eslint-disable */
"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../card";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { useToast } from "../../hooks/useToast";

import { RequisitosTab } from "./planificacion/requisitos-tab";
import { SitemapTab } from "./planificacion/sitemap-tab";
import { RolesTab } from "./planificacion/roles-tab";
import { ErroresTab } from "./planificacion/errores-tab";
import { SeedsTab } from "./planificacion/seeds-tab";
import { EntidadesTab } from "./planificacion/entidades-tab";
import { ImportadorTab } from "./planificacion/importador-tab";
import { DescargasPlanningTab } from "./planificacion/descargas-planning-tab";

import {
  PROMPT_REQUISITOS,
  PROMPT_SITEMAP_LANDING,
  PROMPT_ENTIDADES,
  PROMPT_BACKLOG,
  PROMPT_SPRINTS,
  PROMPT_INICIALIZADOR,
  PROMPT_MODULAR_EPICAS,
  PROMPT_MODULAR_HISTORIAS,
  PROMPT_MODULAR_ACTIVIDADES,
  PROMPT_CONFIG_ACTIVIDADES,
  PROMPT_ROLES,
  PROMPT_DICCIONARIO_ERRORES,
  PROMPT_SEED_DATA,
} from "./constants/prompts";

import { descargarArchivo, descargarZipDocumentos } from "./utils/file-helpers";

interface PlanificacionIAWorkspaceProps {
  proyectoId: string;
}

export interface SeccionLandingSitemap {
  id: string;
  nombre: string;
  descripcion: string;
}

export const PlanificacionIAWorkspace: React.FC<
  PlanificacionIAWorkspaceProps
> = ({ proyectoId }) => {
  const { mostrarToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    | "requisitos"
    | "sitemap"
    | "roles"
    | "errores"
    | "seeds"
    | "entidades"
    | "importador"
    | "descargas"
  >("requisitos");

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
  ) as any;

  // States loaded from DB Context
  const [requisitosFuncionales, setRequisitosFuncionales] =
    useState<string>("");
  const [requisitosNoFuncionales, setRequisitosNoFuncionales] =
    useState<string>("");
  const [sitemap, setSitemap] = useState<string>("");
  const [entidades, setEntidades] = useState<string>("");
  const [sitemapMarkup, setSitemapMarkup] = useState<string>("");
  const [seccionesSitemap, setSeccionesSitemap] = useState<
    SeccionLandingSitemap[]
  >([]);
  const [sitemapSystemMarkdown, setSitemapSystemMarkdown] =
    useState<string>("");
  const [rolesMarkdown, setRolesMarkdown] = useState<string>("");
  const [seedMarkdown, setSeedMarkdown] = useState<string>("");
  const [erroresMarkdown, setErroresMarkdown] = useState<string>("");
  const [setupMarkdown, setSetupMarkdown] = useState<string>("");

  const [sitemapMode, setSitemapMode] = useState<"landing" | "sistema">(
    "sistema"
  );
  const [selectedDocName, setSelectedDocName] = useState<string>("CLAUDE.md");
  const [docEditContent, setDocEditContent] = useState<string>("");

  // Real-time DB counts for progress indication
  const epicasCount =
    useLiveQuery(
      () => db.epicas.where("proyectoId").equals(proyectoId).count(),
      [proyectoId]
    ) || 0;
  const historiasCount =
    useLiveQuery(
      () => db.historias.where("proyectoId").equals(proyectoId).count(),
      [proyectoId]
    ) || 0;
  const tareasCount =
    useLiveQuery(
      () => db.tareas.where("proyectoId").equals(proyectoId).count(),
      [proyectoId]
    ) || 0;
  const sprintsCount =
    useLiveQuery(
      () => db.sprints.where("proyectoId").equals(proyectoId).count(),
      [proyectoId]
    ) || 0;

  // Count criteria configured
  const criteriosCount =
    useLiveQuery(async () => {
      const items = await db.tareas
        .where("proyectoId")
        .equals(proyectoId)
        .toArray();
      return items.filter(
        (t: any) =>
          (Array.isArray(t.criteriosAceptacion) &&
            t.criteriosAceptacion.length > 0) ||
          (typeof t.criterioAceptacion === "string" &&
            t.criterioAceptacion.trim().length > 0)
      ).length;
    }, [proyectoId]) || 0;

  const tareasConCriterios =
    useLiveQuery(async () => {
      const items = await db.tareas
        .where("proyectoId")
        .equals(proyectoId)
        .toArray();
      return items.filter(
        (t: any) =>
          (Array.isArray(t.criteriosAceptacion) &&
            t.criteriosAceptacion.length > 0) ||
          (typeof t.criterioAceptacion === "string" &&
            t.criterioAceptacion.trim().length > 0)
      );
    }, [proyectoId]) || [];

  // Count tech configs configured (where custom steps, rol, or path is configured)
  const configCount =
    useLiveQuery(async () => {
      const items = await db.tareas
        .where("proyectoId")
        .equals(proyectoId)
        .toArray();
      return items.filter(
        (t) => (t as any).pasos && (t as any).pasos.length > 0
      ).length;
    }, [proyectoId]) || 0;

  // JSON input state for imports
  const [backlogJson, setBacklogJson] = useState("");
  const [sprintsJson, setSprintsJson] = useState("");
  const [criteriosJson, setCriteriosJson] = useState("");
  const [selectedAuditTareaId, setSelectedAuditTareaId] = useState<
    string | null
  >(null);
  const [epicasJson, setEpicasJson] = useState("");
  const [historiasJson, setHistoriasJson] = useState("");
  const [actividadesJson, setActividadesJson] = useState("");
  const [configJson, setConfigJson] = useState("");
  const [tipoImportacion, setTipoImportacion] = useState<
    "unificada" | "modular"
  >("modular");

  useEffect(() => {
    if (contexto) {
      setRequisitosFuncionales(contexto.requisitosFuncionales || "");
      setRequisitosNoFuncionales(contexto.requisitosNoFuncionales || "");
      setSitemap(contexto.sitemap || "");
      setEntidades(contexto.entidades || "");
      setSitemapMarkup(contexto.sitemapMarkup || "");
      setSitemapSystemMarkdown(contexto.sitemapSystemMarkdown || "");
      setRolesMarkdown(contexto.rolesMarkdown || "");
      setSeedMarkdown(contexto.seedMarkdown || "");
      setErroresMarkdown(contexto.erroresMarkdown || "");
      setSetupMarkdown(contexto.setupMarkdown || "");
      if (Array.isArray(contexto.seccionesSitemap)) {
        setSeccionesSitemap(contexto.seccionesSitemap);
      }
    }
  }, [contexto]);

  const compileStackSummary = () => {
    if (!proyecto) return "No configurado.";
    const list: string[] = [];
    Object.entries((proyecto as any).stack || {}).forEach(([layer, techs]) => {
      if (Array.isArray(techs) && techs.length > 0) {
        list.push(`${layer}: ${techs.join(", ")}`);
      }
    });
    return list.join(" | ");
  };

  const compileDSSummary = () => {
    const activeDs = ds as any;
    if (activeDs?.designSystemMarkdown) return activeDs.designSystemMarkdown;
    if (!activeDs) return "No configurado.";
    return `Arquetipo: ${activeDs.arquetipo || ""}, Metáfora: ${activeDs.metafora || ""}, Colores: ${activeDs.reglaColor || ""}`;
  };

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
    const reqs = `Funcionales:\n${requisitosFuncionales}\n\nNo Funcionales:\n${requisitosNoFuncionales}`;
    const prompt = PROMPT_ENTIDADES.replace(
      "{{relevamiento_markdown}}",
      relevamiento
    )
      .replace("{{requisitos}}", reqs)
      .replace("{{stack_summary}}", compileStackSummary());

    navigator.clipboard.writeText(prompt);
    mostrarToast(
      "Prompt de modelado de Entidades copiado al portapapeles.",
      "exito"
    );
  };

  const copiarPromptBacklog = () => {
    const reqs = `Funcionales:\n${requisitosFuncionales}\n\nNo Funcionales:\n${requisitosNoFuncionales}`;
    const prompt = PROMPT_BACKLOG.replace("{{requisitos}}", reqs)
      .replace("{{entidades}}", entidades || "No configurado.")
      .replace("{{CLAUDE_MD}}", generarClaudeMd(true));

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Backlog copiado al portapapeles.", "exito");
  };

  const copiarPromptEpicasModulares = () => {
    const reqs = `Funcionales:\n${requisitosFuncionales}\n\nNo Funcionales:\n${requisitosNoFuncionales}`;
    const prompt = PROMPT_MODULAR_EPICAS.replace("{{requisitos}}", reqs)
      .replace("{{entidades}}", entidades || "No configurado.")
      .replace("{{CLAUDE_MD}}", generarClaudeMd(true));

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Épicas Modulares copiado.", "exito");
  };

  const copiarPromptHistoriasModulares = async () => {
    const currentEpicas = await db.epicas
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    if (currentEpicas.length === 0) {
      mostrarToast("Importa primero las Épicas.", "error");
      return;
    }
    const epicasListText = currentEpicas
      .map((e) => `- ${e.nombre}: ${e.descripcion}`)
      .join("\n");
    const reqs = `Funcionales:\n${requisitosFuncionales}\n\nNo Funcionales:\n${requisitosNoFuncionales}`;
    const prompt = PROMPT_MODULAR_HISTORIAS.replace("{{requisitos}}", reqs)
      .replace("{{epicas_list}}", epicasListText)
      .replace("{{CLAUDE_MD}}", generarClaudeMd(true));

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Historias Modulares copiado.", "exito");
  };

  const copiarPromptActividadesModulares = async () => {
    const currentStories = await db.historias
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    if (currentStories.length === 0) {
      mostrarToast("Importa primero las Historias de Usuario.", "error");
      return;
    }
    const storiesText = currentStories
      .map((h) => `- ${h.titulo} [Prioridad: ${h.prioridad}]`)
      .join("\n");
    const prompt = PROMPT_MODULAR_ACTIVIDADES.replace(
      "{{historias_list}}",
      storiesText
    ).replace("{{CLAUDE_MD}}", generarClaudeMd(true));

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Actividades Modulares copiado.", "exito");
  };

  const copiarPromptSprints = async () => {
    const projectEpicas = await db.epicas
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();

    const projectStories = await db.historias
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();

    if (projectStories.length === 0) {
      mostrarToast("No hay historias cargadas.", "error");
      return;
    }

    let storiesText = "";
    if (projectEpicas.length > 0) {
      projectEpicas.forEach((ep) => {
        const storiesInEpic = projectStories.filter((h) => h.epicaId === ep.id);
        if (storiesInEpic.length > 0) {
          storiesText += `\n### ÉPICA / MÓDULO: ${ep.nombre}\n`;
          storiesInEpic.forEach((h) => {
            storiesText += `- TÍTULO: ${h.titulo} | ESTIMACIÓN: ${h.estimacion || 3}h | PRIORIDAD: ${h.prioridad || "Media"}\n`;
          });
        }
      });

      const orphanStories = projectStories.filter(
        (h) => !projectEpicas.some((ep) => ep.id === h.epicaId)
      );
      if (orphanStories.length > 0) {
        storiesText += `\n### OTRAS HISTORIAS DE USUARIO:\n`;
        orphanStories.forEach((h) => {
          storiesText += `- TÍTULO: ${h.titulo} | ESTIMACIÓN: ${h.estimacion || 3}h | PRIORIDAD: ${h.prioridad || "Media"}\n`;
        });
      }
    } else {
      storiesText = projectStories
        .map(
          (h) =>
            `- TÍTULO: ${h.titulo} | ESTIMACIÓN: ${h.estimacion || 3}h | PRIORIDAD: ${h.prioridad || "Media"}`
        )
        .join("\n");
    }

    const prompt = PROMPT_SPRINTS.replace(
      "{{backlog_stories}}",
      storiesText
    ).replace("{{CLAUDE_MD}}", generarClaudeMd(true));
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt para generación de Sprints copiado.", "exito");
  };

  const copiarPromptCriterios = () => {
    db.tareas
      .where("proyectoId")
      .equals(proyectoId)
      .toArray()
      .then((projectTareas) => {
        if (projectTareas.length === 0) {
          mostrarToast(
            "No hay actividades cargadas en este proyecto para generar criterios.",
            "error"
          );
          return;
        }

        const listadoActividades = projectTareas
          .map((t) => `- ${t.titulo}`)
          .join("\n");

        const prompt = `Actúas como un QA Automation y Product Owner senior. Para el siguiente listado de actividades técnicas de desarrollo, genera criterios de aceptación detallados y precisos bajo el estándar BDD (Given/When/Then) o listas de verificación técnicas de calidad.

Listado de Actividades:
${listadoActividades}

REQUISITOS DE RESPUESTA:
1. Retorna ÚNICAMENTE un arreglo JSON válido, sin explicaciones ni bloques de código markdown extra.
2. Cada objeto del arreglo debe tener exactamente estas claves:
   - "actividad": el nombre exacto de la actividad de la lista.
   - "criterios": un arreglo de strings, donde cada string es un criterio de aceptación claro y comprobable.

Formato JSON esperado:
[
  {
    "actividad": "Nombre exacto de la actividad",
    "criterios": [
      "Criterio 1: descripción...",
      "Criterio 2: descripción..."
    ]
  }
]`;

        navigator.clipboard.writeText(prompt);
        mostrarToast("¡Prompt de Criterios copiado al portapapeles!", "exito");
      });
  };

  const copiarPromptConfigActividades = async () => {
    const projectTareas = await db.tareas
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    if (projectTareas.length === 0) {
      mostrarToast("No hay actividades cargadas en este proyecto.", "error");
      return;
    }
    const listado = projectTareas.map((t) => `- ${t.titulo}`).join("\n");
    const sitemapContent =
      sitemapSystemMarkdown || sitemapMarkup || sitemap || "No configurado.";
    const prompt = PROMPT_CONFIG_ACTIVIDADES.replace(
      "{{actividades_list}}",
      listado
    )
      .replace("{{sitemap}}", sitemapContent)
      .replace("{{design_system}}", compileDSSummary())
      .replace("{{CLAUDE_MD}}", generarClaudeMd(true));

    navigator.clipboard.writeText(prompt);
    mostrarToast(
      "Prompt de configuración técnica copiado al portapapeles.",
      "exito"
    );
  };

  const copiarPromptInicializador = () => {
    const claudeMd = generarClaudeMd(true);
    const prompt = PROMPT_INICIALIZADOR.replace(
      "{{CONTENIDO_DE_CLAUDE_MD}}",
      claudeMd
    );
    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt Inicializador de Proyecto (DevOps) copiado.", "exito");
  };

  const copiarPromptRoles = () => {
    const relevamiento = contexto?.relevamientoMarkdown || "";
    const prompt = PROMPT_ROLES.replace(
      "{{relevamiento_markdown}}",
      relevamiento
    ).replace("{{entidades}}", entidades || "No configurado.");

    navigator.clipboard.writeText(prompt);
    mostrarToast(
      "Prompt de Roles y Permisos copiado al portapapeles.",
      "exito"
    );
  };

  const copiarPromptSeedData = () => {
    const sitemapContent =
      sitemapSystemMarkdown || sitemapMarkup || sitemap || "No configurado.";
    const prompt = PROMPT_SEED_DATA.replace(
      "{{entidades}}",
      entidades || "No configurado."
    )
      .replace("{{sitemap}}", sitemapContent)
      .replace("{{CLAUDE_MD}}", generarClaudeMd(true));

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Datos Semilla (Seeds) copiado.", "exito");
  };

  const copiarPromptErrores = () => {
    const relevamiento = contexto?.relevamientoMarkdown || "";
    const prompt = PROMPT_DICCIONARIO_ERRORES.replace(
      "{{relevamiento_markdown}}",
      relevamiento
    )
      .replace("{{design_system}}", compileDSSummary())
      .replace("{{CLAUDE_MD}}", generarClaudeMd(true));

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Diccionario de Errores copiado.", "exito");
  };

  const handleProcesarMarkup = () => {
    if (!sitemapMarkup.trim()) {
      mostrarToast("Ingresa texto con etiquetas first.", "error");
      return;
    }

    const regex = /\{\{([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
    const found: SeccionLandingSitemap[] = [];
    let match;
    while ((match = regex.exec(sitemapMarkup)) !== null) {
      const nombre = match[1].trim().toUpperCase();
      const descripcion = match[2].trim();
      found.push({
        id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        nombre,
        descripcion,
      });
    }

    if (found.length === 0) {
      mostrarToast(
        "No se detectaron etiquetas válidas en el formato {{SECCION}}...{{/SECCION}}.",
        "error"
      );
      return;
    }

    const updated = [...seccionesSitemap, ...found];
    setSeccionesSitemap(updated);
    handleSave(updated);
    mostrarToast(
      `Se procesaron y añadieron ${found.length} secciones con éxito.`,
      "exito"
    );
  };

  const handleAgregarSeccionManual = () => {
    const nueva: SeccionLandingSitemap = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nombre: "NUEVA_SECCION",
      descripcion:
        "Descripción e indicaciones específicas para esta sección...",
    };
    const updated = [...seccionesSitemap, nueva];
    setSeccionesSitemap(updated);
    handleSave(updated);
  };

  const handleActualizarSeccion = (
    id: string,
    field: "nombre" | "descripcion",
    value: string
  ) => {
    const updated = seccionesSitemap.map((sec) => {
      if (sec.id === id) {
        return { ...sec, [field]: value };
      }
      return sec;
    });
    setSeccionesSitemap(updated);
    handleSave(updated);
  };

  const handleEliminarSeccion = (id: string, name: string) => {
    if (
      confirm(`¿Estás seguro de que deseas eliminar la sección {{${name}}}?`)
    ) {
      const updated = seccionesSitemap.filter((sec) => sec.id !== id);
      setSeccionesSitemap(updated);
      handleSave(updated);
    }
  };

  const handleSave = async (customSecciones?: SeccionLandingSitemap[]) => {
    try {
      const dataToSave = {
        proyectoId,
        requisitosFuncionales,
        requisitosNoFuncionales,
        sitemap,
        entidades,
        sitemapMarkup,
        sitemapSystemMarkdown,
        rolesMarkdown,
        seedMarkdown,
        erroresMarkdown,
        setupMarkdown,
        seccionesSitemap: customSecciones || seccionesSitemap,
      };

      await db.proyecto_contexto.put(dataToSave);
      mostrarToast(
        "Especificación guardada correctamente en IndexedDB.",
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al guardar en IndexedDB: ${err.message}`, "error");
    }
  };

  const selectDocumentForEdit = async (name: string) => {
    setSelectedDocName(name);
    let content = "";
    if (name === "CLAUDE.md") {
      content = contexto?.claudeMarkdownOverride || generarClaudeMd(true);
    } else if (name === "SCHEMA.md") {
      content = entidades || "";
    } else if (name === "REQUERIMIENTOS.md") {
      if (contexto?.requerimientosMarkdownOverride) {
        content = contexto.requerimientosMarkdownOverride;
      } else {
        content = `# REQUISITOS_${
          String(proyecto?.nombre || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "_") || "PROYECTO"
        }.md\n\n## Requisitos Funcionales\n${requisitosFuncionales || ""}\n\n## Requisitos No Funcionales\n${requisitosNoFuncionales || ""}`;
      }
    } else if (name === "DESIGN.md") {
      content = ds?.designSystemMarkdown || "";
    } else if (name === "SITEMAP.md") {
      content = sitemapSystemMarkdown || sitemapMarkup || sitemap || "";
    } else if (name === "ROLES.md") {
      content = rolesMarkdown || "";
    } else if (name === "SEED.md") {
      content = seedMarkdown || "";
    } else if (name === "ERRORS.md") {
      content = erroresMarkdown || "";
    } else if (name === "SETUP.md") {
      content = setupMarkdown || "";
    } else if (name === "BACKLOG.md") {
      content = await generarBacklogMarkdown();
    } else if (name === "SPRINTS.md") {
      content = await generarSprintsMarkdown();
    }
    setDocEditContent(content);
  };

  useEffect(() => {
    if (activeTab === "descargas") {
      selectDocumentForEdit(selectedDocName);
    }
  }, [activeTab, selectedDocName, contexto]);

  const handleSaveSelectedDoc = async () => {
    try {
      if (
        selectedDocName === "BACKLOG.md" ||
        selectedDocName === "SPRINTS.md"
      ) {
        mostrarToast(
          `${selectedDocName} es una vista generada automáticamente. Edita los ítems directamente en las pestañas 'Backlog' o 'Sprints'.`,
          "info"
        );
        return;
      }

      const currentCtx = (await db.proyecto_contexto.get(proyectoId)) || {
        proyectoId,
      };

      if (selectedDocName === "CLAUDE.md") {
        currentCtx.claudeMarkdownOverride = docEditContent;
      } else if (selectedDocName === "SCHEMA.md") {
        currentCtx.entidades = docEditContent;
        setEntidades(docEditContent);
      } else if (selectedDocName === "REQUERIMIENTOS.md") {
        currentCtx.requerimientosMarkdownOverride = docEditContent;
      } else if (selectedDocName === "DESIGN.md") {
        const currentDs = (await db.proyecto_design_system.get(proyectoId)) || {
          proyectoId,
        };
        currentDs.designSystemMarkdown = docEditContent;
        await db.proyecto_design_system.put(currentDs);
      } else if (selectedDocName === "SITEMAP.md") {
        currentCtx.sitemapSystemMarkdown = docEditContent;
        setSitemapSystemMarkdown(docEditContent);
      } else if (selectedDocName === "ROLES.md") {
        currentCtx.rolesMarkdown = docEditContent;
        setRolesMarkdown(docEditContent);
      } else if (selectedDocName === "SEED.md") {
        currentCtx.seedMarkdown = docEditContent;
        setSeedMarkdown(docEditContent);
      } else if (selectedDocName === "ERRORS.md") {
        currentCtx.erroresMarkdown = docEditContent;
        setErroresMarkdown(docEditContent);
      } else if (selectedDocName === "SETUP.md") {
        currentCtx.setupMarkdown = docEditContent;
        setSetupMarkdown(docEditContent);
      }

      await db.proyecto_contexto.put(currentCtx);
      mostrarToast(
        `Cambios guardados en IndexedDB para ${selectedDocName}.`,
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al guardar: ${err.message}`, "error");
    }
  };

  const generarClaudeMd = (incluirGuia = true): string => {
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

    if (incluirGuia) {
      md += `\n## 6. Guía de Comportamiento e Instrucciones de Handoff\n`;
      md += `1. **Cero Placeholders:** Todos los componentes generados deben incluir el código completo listo para producción.\n`;
      md += `2. **Estructura Modular:** Sigue rigurosamente la arquitectura limpia y convenciones descritas.\n`;
      md += `3. **Flujo de Handoff:** Al finalizar una tarea, responde con el resumen técnico y el checklist auto-tildado en el formato JSON requerido.\n`;
    }

    return md;
  };

  const descargarClaudeMdCompleto = () => {
    const claude = generarClaudeMd(true);
    descargarArchivo(claude, "CLAUDE.md");
    mostrarToast("¡Archivo CLAUDE.md descargado!", "exito");
  };

  const descargarSchemaMd = () => {
    descargarArchivo(entidades || "", "SCHEMA.md");
    mostrarToast("¡Archivo SCHEMA.md descargado!", "exito");
  };

  const descargarRequerimientosMd = () => {
    let md = `# REQUISITOS_${
      String(proyecto?.nombre || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_") || "PROYECTO"
    }.md\n\n`;
    md += `## Requisitos Funcionales\n${requisitosFuncionales || "*No configurado*"}\n\n`;
    md += `## Requisitos No Funcionales\n${requisitosNoFuncionales || "*No configurado*"}\n`;
    descargarArchivo(md, `REQUISITOS_${proyecto?.nombre || "PROYECTO"}.md`);
    mostrarToast("¡Requisitos descargados!", "exito");
  };

  const descargarDesignMd = () => {
    const content =
      ds?.designSystemMarkdown || `# DESIGN.md\n\n*No configurado*`;
    descargarArchivo(content, "DESIGN.md");
    mostrarToast("¡Archivo DESIGN.md descargado!", "exito");
  };

  const descargarSitemapMd = () => {
    let content = `# SITEMAP.md\n\n`;
    if (sitemapSystemMarkdown) {
      content += sitemapSystemMarkdown;
    } else if (sitemapMarkup) {
      content += sitemapMarkup;
    } else {
      content += sitemap || "*No configurado*";
    }
    descargarArchivo(content, "SITEMAP.md");
    mostrarToast("¡Archivo SITEMAP.md descargado!", "exito");
  };

  const descargarRolesMd = () => {
    const content = rolesMarkdown || `# ROLES.md\n\n*No configurado*`;
    descargarArchivo(content, "ROLES.md");
    mostrarToast("¡Archivo ROLES.md descargado!", "exito");
  };

  const descargarSeedMd = () => {
    const content = seedMarkdown || `# SEED.md\n\n*No configurado*`;
    descargarArchivo(content, "SEED.md");
    mostrarToast("¡Archivo SEED.md descargado!", "exito");
  };

  const descargarErrorsMd = () => {
    const content = erroresMarkdown || `# ERRORS.md\n\n*No configurado*`;
    descargarArchivo(content, "ERRORS.md");
    mostrarToast("¡Archivo ERRORS.md descargado!", "exito");
  };

  const descargarSetupMd = () => {
    const content = setupMarkdown || `# SETUP.md\n\n*No configurado*`;
    descargarArchivo(content, "SETUP.md");
    mostrarToast("¡Archivo SETUP.md descargado!", "exito");
  };

  const generarBacklogMarkdown = async (): Promise<string> => {
    const projectEpicas = await db.epicas
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    const projectStories = await db.historias
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    const projectTareas = await db.tareas
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();

    let md = `# Backlog Completo de Ingeniería - ${proyecto?.nombre || "Proyecto"}\n\n`;
    md += `Este documento contiene el desglose jerárquico de Épicas, Historias de Usuario y Actividades Técnicas detalladas con sus respectivos archivos, rutas, pasos de checklist y criterios de aceptación.\n\n`;

    if (projectEpicas.length === 0) {
      md += `*No hay épicas ni backlog registrado.*\n`;
      return md;
    }

    for (const ep of projectEpicas) {
      md += `## 📁 Épica: ${ep.nombre}\n`;
      if (ep.descripcion) md += `*Descripción:* ${ep.descripcion}\n`;
      md += `\n`;

      const storiesEp = projectStories.filter((h) => h.epicaId === ep.id);
      if (storiesEp.length === 0) {
        md += `*Sin historias registradas en esta épica.*\n\n`;
        continue;
      }

      for (const h of storiesEp) {
        md += `### 💡 Historia: ${h.titulo}\n`;
        md += `- **Prioridad:** ${h.prioridad || "Media"}\n`;
        md += `- **Estimación:** ${h.estimacion || 3} SP\n`;
        if (h.descripcion)
          md += `- **Descripción / CA Funcionales:** ${h.descripcion}\n`;
        md += `\n`;

        const tareasStory = projectTareas.filter((t) => t.historiaId === h.id);
        if (tareasStory.length > 0) {
          md += `#### Actividades Técnicas Desglosadas:\n`;
          tareasStory.forEach((t: any, idx: number) => {
            md += `##### ${idx + 1}. ${t.titulo}\n`;
            if (t.rol) md += `- **Rol:** ${t.rol}\n`;
            if (t.componente)
              md += `- **Componente/Archivo:** \`${t.componente}\` en la ruta \`${t.ruta || ""}\`\n`;
            if (t.modulo) md += `- **Módulo:** ${t.modulo}\n`;
            if (Array.isArray(t.etiquetas) && t.etiquetas.length > 0) {
              md += `- **Etiquetas:** ${t.etiquetas.join(", ")}\n`;
            }
            if (Array.isArray(t.pasos) && t.pasos.length > 0) {
              md += `- **Checklist de Implementación:**\n`;
              t.pasos.forEach((p: string) => {
                md += `  - [ ] ${p}\n`;
              });
            }
            if (
              Array.isArray(t.criteriosAceptacion) &&
              t.criteriosAceptacion.length > 0
            ) {
              md += `- **Criterios de Aceptación (BDD):**\n`;
              t.criteriosAceptacion.forEach((crit: string) => {
                md += `  - ${crit}\n`;
              });
            }
            md += `\n`;
          });
        } else {
          md += `*Sin actividades técnicas desglosadas.*\n\n`;
        }
      }
      md += `---\n\n`;
    }

    return md;
  };

  const generarSprintsMarkdown = async (): Promise<string> => {
    const projectSprints = await db.sprints
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    const projectStories = await db.historias
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();

    let md = `# Planificación de Sprints - ${proyecto?.nombre || "Proyecto"}\n\n`;
    md += `Distribución temporal de Historias de Usuario organizadas en iteraciones de desarrollo.\n\n`;

    if (projectSprints.length === 0) {
      md += `*No hay sprints planificados.*\n`;
      return md;
    }

    projectSprints.forEach((sp) => {
      md += `## 🏃 ${sp.nombre}\n`;
      md += `- **Objetivo:** ${sp.objetivo || "Sin objetivo definido."}\n`;
      md += `- **Duración:** ${sp.duracionSemanas || 2} semanas\n`;
      md += `- **Capacidad:** ${sp.capacidad || 20} SP\n`;
      md += `\n### Historias asignadas:\n`;

      const storiesSp = projectStories.filter((h) => h.sprintId === sp.id);
      if (storiesSp.length > 0) {
        storiesSp.forEach((h) => {
          md += `- **${h.titulo}** (${h.estimacion || 3} SP) - Prioridad: ${h.prioridad || "Media"}\n`;
          if (h.descripcion) md += `  *Descripción:* ${h.descripcion}\n`;
        });
      } else {
        md += `*Ninguna historia asignada a este sprint.*\n`;
      }
      md += `\n---\n\n`;
    });

    return md;
  };

  const descargarBacklogMd = async () => {
    const backlogContent = await generarBacklogMarkdown();
    descargarArchivo(backlogContent, "BACKLOG.md");
    mostrarToast("¡Archivo BACKLOG.md descargado!", "exito");
  };

  const descargarSprintsMd = async () => {
    const sprintsContent = await generarSprintsMarkdown();
    descargarArchivo(sprintsContent, "SPRINTS.md");
    mostrarToast("¡Archivo SPRINTS.md descargado!", "exito");
  };

  const descargarZipDocumentosCompleto = async () => {
    try {
      const claude = generarClaudeMd(true);
      const schema = entidades || "";
      let reqs = contexto?.requerimientosMarkdownOverride || "";
      if (!reqs) {
        reqs = `# REQUISITOS_${
          String(proyecto?.nombre || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "_") || "PROYECTO"
        }.md\n\n## Requisitos Funcionales\n${requisitosFuncionales || ""}\n\n## Requisitos No Funcionales\n${requisitosNoFuncionales || ""}`;
      }
      const design =
        ds?.designSystemMarkdown || `# DESIGN.md\n\n*No configurado*`;
      const sitemapContent =
        sitemapSystemMarkdown ||
        sitemapMarkup ||
        sitemap ||
        `# SITEMAP.md\n\n*No configurado*`;
      const rolesContent = rolesMarkdown || `# ROLES.md\n\n*No configurado*`;
      const seedContent = seedMarkdown || `# SEED.md\n\n*No configurado*`;
      const errorsContent =
        erroresMarkdown || `# ERRORS.md\n\n*No configurado*`;
      const setupContent = setupMarkdown || `# SETUP.md\n\n*No configurado*`;

      const backlogContent = await generarBacklogMarkdown();
      const sprintsContent = await generarSprintsMarkdown();

      const filesMap: Record<string, string> = {
        "CLAUDE.md": claude,
        "SCHEMA.md": schema,
        "REQUERIMIENTOS.md": reqs,
        "DESIGN.md": design,
        "SITEMAP.md": sitemapContent,
        "ROLES.md": rolesContent,
        "SEED.md": seedContent,
        "ERRORS.md": errorsContent,
        "SETUP.md": setupContent,
        "BACKLOG.md": backlogContent,
        "SPRINTS.md": sprintsContent,
      };

      await descargarZipDocumentos(
        (proyecto as any)?.nombre || "proyecto",
        filesMap
      );
      mostrarToast("¡ZIP de documentación descargado con éxito!", "exito");
    } catch (err: any) {
      mostrarToast(`Error al generar ZIP: ${err.message}`, "error");
    }
  };

  const descargarTodoMarkdown = async () => {
    try {
      let md = `# Planificación Completa del Proyecto: ${proyecto?.nombre || ""}\n\n`;
      md += `## 1. Requisitos Funcionales\n${requisitosFuncionales || "*No configurado*"}\n\n`;
      md += `## 2. Requisitos No Funcionales\n${requisitosNoFuncionales || "*No configurado*"}\n\n`;

      if (seccionesSitemap.length > 0) {
        md += `## 3. Estructura de Secciones (Sitemap Landing / Institucional)\n\n`;
        seccionesSitemap.forEach((sec) => {
          md += `### {{${sec.nombre}}}\n${sec.descripcion}\n\n`;
        });
      } else {
        md += `## 3. Sitemap General\n${sitemap || "*No configurado*"}\n\n`;
      }

      md += `## 4. Entidades y Modelado 3FN\n${entidades || "*No configurado*"}\n\n`;

      const backlogContent = await generarBacklogMarkdown();
      md += `## 5. Backlog Completo de Ingeniería (Historias y Actividades)\n\n${backlogContent}\n\n`;

      const sprintsContent = await generarSprintsMarkdown();
      md += `## 6. Planificación de Sprints\n\n${sprintsContent}\n\n`;

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
    } catch (err: any) {
      mostrarToast(
        `Error al generar planificación completa: ${err.message}`,
        "error"
      );
    }
  };

  const copiarAuditoriaCompletaParaIA = async () => {
    try {
      const epicas = (await db.epicas
        .where("proyectoId")
        .equals(proyectoId)
        .toArray()) as any[];
      const historias = (await db.historias
        .where("proyectoId")
        .equals(proyectoId)
        .toArray()) as any[];
      const tareas = (await db.tareas
        .where("proyectoId")
        .equals(proyectoId)
        .toArray()) as any[];

      let md = `# AUDITORÍA DE PLANIFICACIÓN - ${String(proyecto?.nombre || "PROYECTO").toUpperCase()}\n\n`;
      md += `## 1. Información General del Proyecto\n`;
      md += `- **Nombre:** ${proyecto?.nombre || "No especificado"}\n`;
      md += `- **Descripción:** ${proyecto?.descripcion || "No especificado"}\n\n`;

      md += `## 2. Stack Tecnológico Elegido\n`;
      const stackList: string[] = [];
      if (proyecto?.stack) {
        Object.entries(proyecto.stack).forEach(([layer, techs]) => {
          if (
            layer !== "comandos" &&
            Array.isArray(techs) &&
            techs.length > 0
          ) {
            const catName =
              layer === "baseDatos"
                ? "Base de Datos"
                : layer.charAt(0).toUpperCase() + layer.slice(1);
            stackList.push(`- **${catName}:** ${techs.join(", ")}`);
          }
        });
      }
      md +=
        stackList.length > 0
          ? stackList.join("\n") + "\n\n"
          : "*No configurado*\n\n";

      md += `## 3. Modelo Físico de Base de Datos (SCHEMA.md)\n`;
      md += `\`\`\`sql\n${entidades || "-- No configurado."}\n\`\`\`\n\n`;

      md += `## 4. Desglose del Backlog Completo\n\n`;
      if (epicas.length === 0) {
        md += `*No hay épicas configuradas en el backlog.*\n`;
      } else {
        epicas.forEach((epica) => {
          md += `### Épica: ${epica.nombre}\n`;
          md += `*Descripción:* ${epica.descripcion || "Sin descripción"}\n\n`;

          const epicaStories = historias.filter(
            (h) =>
              h.epicaId === epica.id ||
              String(h.epicNombre || "")
                .toLowerCase()
                .trim() === String(epica.nombre).toLowerCase().trim()
          );

          if (epicaStories.length === 0) {
            md += `  *Sin historias de usuario registradas para esta épica.*\n\n`;
          } else {
            epicaStories.forEach((story) => {
              md += `#### Historia de Usuario: ${story.titulo}\n`;
              md += `- **Descripción:** ${story.descripcion || "Sin descripción"}\n`;
              md += `- **Prioridad:** ${story.prioridad || "Media"}\n`;
              md += `- **Estimación:** ${story.estimacion || 0} pts\n\n`;

              const storyTareas = tareas.filter(
                (t) => t.historiaId === story.id
              );
              if (storyTareas.length === 0) {
                md += `  *Sin actividades técnicas desglosadas aún.*\n\n`;
              } else {
                md += `##### Actividades Técnicas Desglosadas:\n`;
                storyTareas.forEach((t, idx) => {
                  md += `${idx + 1}. **${t.titulo}** (Estado: ${t.estado?.toUpperCase() || "TODO"})\n`;
                  if (t.descripcion) {
                    md += `   - *Descripción:* ${t.descripcion}\n`;
                  }
                  if (
                    Array.isArray(t.criteriosAceptacion) &&
                    t.criteriosAceptacion.length > 0
                  ) {
                    md += `   - *Criterios de Aceptación (QA/BDD):*\n`;
                    t.criteriosAceptacion.forEach((crit: any) => {
                      md += `     * ${crit}\n`;
                    });
                  }
                });
                md += `\n`;
              }
            });
          }
          md += `---\n\n`;
        });
      }

      navigator.clipboard.writeText(md);
      mostrarToast(
        "Auditoría de planificación copiada al portapapeles.",
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al generar la auditoría: ${err.message}`, "error");
    }
  };

  const handleImportarBacklog = async () => {
    try {
      const parsed = JSON.parse(backlogJson);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON debe ser un arreglo de Épicas.");
      }

      for (const epica of parsed) {
        const epicaId = `epica_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.epicas.put({
          id: epicaId,
          proyectoId,
          nombre: epica.nombre,
          descripcion: epica.descripcion || "",
        });

        if (Array.isArray(epica.historias)) {
          for (const historia of epica.historias) {
            const historiaId = `historia_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            await db.historias.put({
              id: historiaId,
              proyectoId,
              epicaId,
              sprintId: null,
              titulo: historia.titulo,
              descripcion: historia.descripcion || "",
              prioridad: historia.prioridad || "Media",
              estimacion: historia.estimacion || 1,
              estado: "todo",
            });

            if (Array.isArray(historia.actividades)) {
              for (const act of historia.actividades) {
                const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                await db.tareas.put({
                  id: actId,
                  proyectoId,
                  historiaId,
                  titulo: act,
                  descripcion: "",
                  estado: "todo",
                });
              }
            }
          }
        }
      }

      setBacklogJson("");
      mostrarToast("¡Backlog completo importado con éxito!", "exito");
    } catch (err: any) {
      mostrarToast(`Error al importar Backlog: ${err.message}`, "error");
    }
  };

  const handleImportarEpicasModulares = async () => {
    try {
      const parsed = JSON.parse(epicasJson);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON debe ser un arreglo.");
      }

      for (const ep of parsed) {
        const epicaId = `epica_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.epicas.put({
          id: epicaId,
          proyectoId,
          nombre: ep.nombre,
          descripcion: ep.descripcion || "",
        });
      }

      setEpicasJson("");
      mostrarToast(
        `Se importaron ${parsed.length} Épicas correctamente.`,
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al importar Épicas: ${err.message}`, "error");
    }
  };

  const handleImportarHistoriasModulares = async () => {
    try {
      const parsed = JSON.parse(historiasJson);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON debe ser un arreglo.");
      }

      const epicasExistentes = await db.epicas
        .where("proyectoId")
        .equals(proyectoId)
        .toArray();

      for (const h of parsed) {
        const matchedEpic = epicasExistentes.find(
          (ep) =>
            String(ep.nombre).toLowerCase().trim() ===
            String(h.epicNombre).toLowerCase().trim()
        );
        const epicaId = matchedEpic ? matchedEpic.id : "general";

        const historiaId = `historia_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.historias.put({
          id: historiaId,
          proyectoId,
          epicaId,
          sprintId: null,
          titulo: h.titulo,
          descripcion: h.descripcion || "",
          prioridad: h.prioridad || "Media",
          estimacion: h.estimacion || 1,
          estado: "todo",
        });
      }

      setHistoriasJson("");
      mostrarToast(
        `Se importaron ${parsed.length} Historias correctamente.`,
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al importar Historias: ${err.message}`, "error");
    }
  };

  const handleImportarActividadesModulares = async () => {
    try {
      const parsed = JSON.parse(actividadesJson);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON debe ser un arreglo de Actividades.");
      }

      const historiasExistentes = await db.historias
        .where("proyectoId")
        .equals(proyectoId)
        .toArray();

      for (const act of parsed) {
        const matchedStory = historiasExistentes.find(
          (h) =>
            String(h.titulo).toLowerCase().trim() ===
            String(act.storyTitulo).toLowerCase().trim()
        );

        if (matchedStory) {
          const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await db.tareas.put({
            id: actId,
            proyectoId,
            historiaId: matchedStory.id,
            titulo: act.titulo,
            descripcion: act.descripcion || "",
            estado: "todo",
          });
        }
      }

      setActividadesJson("");
      mostrarToast(
        `Se importaron ${parsed.length} Actividades técnicas con éxito.`,
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al importar Actividades: ${err.message}`, "error");
    }
  };

  const handleImportarCriterios = async () => {
    try {
      const parsed = JSON.parse(criteriosJson);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON de Criterios debe ser un arreglo de objetos.");
      }

      const projectTareas = await db.tareas
        .where("proyectoId")
        .equals(proyectoId)
        .toArray();
      let matchedCount = 0;

      for (const item of parsed) {
        const matched = projectTareas.find(
          (t: any) =>
            String(t.titulo).toLowerCase().trim() ===
            String(item.actividad || item.actividadTitulo || "")
              .toLowerCase()
              .trim()
        );

        if (matched) {
          await db.tareas.update(matched.id as string, {
            criteriosAceptacion: item.criterios,
          });
          matchedCount++;
        }
      }

      setCriteriosJson("");
      setSelectedAuditTareaId(null);
      mostrarToast(
        `¡Criterios de aceptación importados con éxito! Se vincularon ${matchedCount} actividades.`,
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al importar criterios: ${err.message}`, "error");
    }
  };

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
        const sprintId = `sprint_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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

  const handleImportarConfigActividades = async () => {
    try {
      const parsed = JSON.parse(configJson);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON debe ser un arreglo.");
      }

      const projectTareas = await db.tareas
        .where("proyectoId")
        .equals(proyectoId)
        .toArray();
      let matchedCount = 0;

      for (const item of parsed) {
        const matched = projectTareas.find(
          (t: any) =>
            String(t.titulo).toLowerCase().trim() ===
            String(item.actividad || item.actividadTitulo || "")
              .toLowerCase()
              .trim()
        );

        if (matched) {
          await db.tareas.update(matched.id as string, {
            rol: item.rol,
            componente: item.componente,
            ruta: item.ruta,
            modulo: item.modulo,
            etiquetas: item.etiquetas,
            pasos: item.pasos,
            seed: item.seed,
          });
          matchedCount++;
        }
      }

      setConfigJson("");
      mostrarToast(
        `¡Configuración técnica vinculada con éxito a ${matchedCount} actividades!`,
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al importar configuración: ${err.message}`, "error");
    }
  };

  const handleLimpiarPlanificacion = async () => {
    if (
      confirm(
        "¿Estás seguro de que deseas eliminar permanentemente todas las Épicas, Historias, Sprints y Tareas de este proyecto? Esta acción no se puede deshacer."
      )
    ) {
      try {
        await db.epicas.where("proyectoId").equals(proyectoId).delete();
        await db.historias.where("proyectoId").equals(proyectoId).delete();
        await db.sprints.where("proyectoId").equals(proyectoId).delete();
        await db.tareas.where("proyectoId").equals(proyectoId).delete();
        mostrarToast("Planificación eliminada con éxito.", "exito");
      } catch (err: any) {
        mostrarToast(`Error al limpiar: ${err.message}`, "error");
      }
    }
  };

  const handleLimpiarEpicas = async () => {
    if (
      confirm(
        "¿Estás seguro de que deseas eliminar permanentemente todas las Épicas de este proyecto? Las historias existentes perderán su asociación con las épicas."
      )
    ) {
      try {
        await db.epicas.where("proyectoId").equals(proyectoId).delete();
        await db.historias
          .where("proyectoId")
          .equals(proyectoId)
          .modify({ epicaId: "" });
        mostrarToast("Épicas eliminadas correctamente.", "exito");
      } catch (err: any) {
        mostrarToast(`Error al limpiar épicas: ${err.message}`, "error");
      }
    }
  };

  const handleLimpiarHistorias = async () => {
    if (
      confirm(
        "¿Estás seguro de que deseas eliminar permanentemente todas las Historias de Usuario de este proyecto? Las actividades existentes perderán su asociación con las historias."
      )
    ) {
      try {
        await db.historias.where("proyectoId").equals(proyectoId).delete();
        await db.tareas
          .where("proyectoId")
          .equals(proyectoId)
          .modify({ historiaId: "" });
        mostrarToast("Historias de Usuario eliminadas correctamente.", "exito");
      } catch (err: any) {
        mostrarToast(`Error al limpiar historias: ${err.message}`, "error");
      }
    }
  };

  const handleLimpiarActividades = async () => {
    if (
      confirm(
        "¿Estás seguro de que deseas eliminar permanentemente todas las Actividades Técnicas de este proyecto?"
      )
    ) {
      try {
        await db.tareas.where("proyectoId").equals(proyectoId).delete();
        mostrarToast("Actividades Técnicas eliminadas correctamente.", "exito");
      } catch (err: any) {
        mostrarToast(`Error al limpiar actividades: ${err.message}`, "error");
      }
    }
  };

  const handleLimpiarConfigActividades = async () => {
    if (
      confirm(
        "¿Estás seguro de que deseas restablecer la Configuración Técnica (Roles, Componentes, Pasos) de todas las actividades de este proyecto?"
      )
    ) {
      try {
        await db.tareas.where("proyectoId").equals(proyectoId).modify({
          rol: "",
          componente: "",
          ruta: "",
          modulo: "",
          pasos: [],
          seed: null,
        });
        mostrarToast(
          "Configuración técnica restablecida correctamente.",
          "exito"
        );
      } catch (err: any) {
        mostrarToast(
          `Error al restablecer configuración: ${err.message}`,
          "error"
        );
      }
    }
  };

  const handleLimpiarCriterios = async () => {
    if (
      confirm(
        "¿Estás seguro de que deseas eliminar permanentemente todos los Criterios de Aceptación vinculados a las actividades de este proyecto?"
      )
    ) {
      try {
        await db.tareas.where("proyectoId").equals(proyectoId).modify({
          criteriosAceptacion: [],
        });
        mostrarToast(
          "Criterios de Aceptación eliminados correctamente.",
          "exito"
        );
      } catch (err: any) {
        mostrarToast(`Error al limpiar criterios: ${err.message}`, "error");
      }
    }
  };

  const handleLimpiarSprints = async () => {
    if (
      confirm(
        "¿Estás seguro de que deseas eliminar permanentemente todos los Sprints de este proyecto? Las historias asociadas a los sprints quedarán sin planificar."
      )
    ) {
      try {
        await db.sprints.where("proyectoId").equals(proyectoId).delete();
        await db.historias
          .where("proyectoId")
          .equals(proyectoId)
          .modify({ sprintId: "" });
        mostrarToast("Sprints eliminados correctamente.", "exito");
      } catch (err: any) {
        mostrarToast(`Error al limpiar sprints: ${err.message}`, "error");
      }
    }
  };

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between border-b border-[#2A2A2E] pb-3">
        <div>
          <h3 className="font-mono text-xs font-bold tracking-wider text-zinc-100 uppercase">
            Taller de Planificación y Requerimientos (IA Workspace)
          </h3>
          <p className="font-mono text-[9px] text-zinc-500">
            Reúne requisitos, sitemap, modelado 3FN y genera el backlog para
            inyectar a tus herramientas de desarrollo.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSave()}
            className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1 font-mono text-[9px] font-bold text-zinc-300 uppercase transition-all hover:bg-zinc-800"
          >
            💾 Guardar IndexedDB
          </button>
          <button
            onClick={descargarZipDocumentosCompleto}
            className="rounded bg-sky-500 px-3.5 py-1 font-mono text-[9px] font-black text-zinc-950 uppercase shadow transition-all hover:bg-sky-400"
          >
            📦 Descargar Documentación (.zip)
          </button>
          <button
            onClick={descargarTodoMarkdown}
            className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1 font-mono text-[9px] font-bold text-zinc-300 uppercase transition-all hover:bg-zinc-800"
          >
            📄 Descargar Todo (.md)
          </button>
          <button
            onClick={copiarAuditoriaCompletaParaIA}
            className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[9px] font-black text-emerald-400 uppercase transition-all hover:bg-emerald-500/20"
          >
            🔍 Copiar Auditoría para IA
          </button>
        </div>
      </div>

      {/* Tabs list bar navigation */}
      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-zinc-900 pb-2 font-mono">
        {[
          { key: "requisitos", label: "📋 Requisitos" },
          { key: "sitemap", label: "🗺️ Sitemap" },
          { key: "entidades", label: "💾 Entidades 3FN" },
          { key: "roles", label: "🔑 Seguridad RLS" },
          { key: "seeds", label: "🌱 Seeds" },
          { key: "errores", label: "🚫 Errores" },
          { key: "importador", label: "📥 Ingesta Backlog & Sprints" },
          { key: "descargas", label: "📝 Centro de Inducción (Descargas)" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`rounded-lg px-2.5 py-1.5 text-[9px] font-bold uppercase transition-all ${
              activeTab === tab.key
                ? "bg-emerald-500 font-black text-zinc-950 shadow"
                : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab components mount */}
      {activeTab === "requisitos" && (
        <RequisitosTab
          requisitosFuncionales={requisitosFuncionales}
          setRequisitosFuncionales={setRequisitosFuncionales}
          requisitosNoFuncionales={requisitosNoFuncionales}
          setRequisitosNoFuncionales={setRequisitosNoFuncionales}
          sitemap={sitemap}
          setSitemap={setSitemap}
          copiarPromptRequisitos={copiarPromptRequisitos}
        />
      )}

      {activeTab === "sitemap" && (
        <SitemapTab
          sitemapMode={sitemapMode}
          setSitemapMode={setSitemapMode}
          sitemapSystemMarkdown={sitemapSystemMarkdown}
          setSitemapSystemMarkdown={setSitemapSystemMarkdown}
          sitemapMarkup={sitemapMarkup}
          setSitemapMarkup={setSitemapMarkup}
          seccionesSitemap={seccionesSitemap}
          copiarPromptSitemapLanding={copiarPromptSitemapLanding}
          handleProcesarMarkup={handleProcesarMarkup}
          handleAgregarSeccionManual={handleAgregarSeccionManual}
          handleActualizarSeccion={handleActualizarSeccion}
          handleEliminarSeccion={handleEliminarSeccion}
          mostrarToast={mostrarToast}
        />
      )}

      {activeTab === "roles" && (
        <RolesTab
          rolesMarkdown={rolesMarkdown}
          setRolesMarkdown={setRolesMarkdown}
          copiarPromptRoles={copiarPromptRoles}
        />
      )}

      {activeTab === "errores" && (
        <ErroresTab
          erroresMarkdown={erroresMarkdown}
          setErroresMarkdown={setErroresMarkdown}
          copiarPromptErrores={copiarPromptErrores}
        />
      )}

      {activeTab === "seeds" && (
        <SeedsTab
          seedMarkdown={seedMarkdown}
          setSeedMarkdown={setSeedMarkdown}
          copiarPromptSeedData={copiarPromptSeedData}
        />
      )}

      {activeTab === "entidades" && (
        <EntidadesTab
          entidades={entidades}
          setEntidades={setEntidades}
          copiarPromptEntidades={copiarPromptEntidades}
        />
      )}

      {activeTab === "importador" && (
        <ImportadorTab
          tipoImportacion={tipoImportacion}
          setTipoImportacion={setTipoImportacion}
          epicasCount={epicasCount}
          historiasCount={historiasCount}
          tareasCount={tareasCount}
          sprintsCount={sprintsCount}
          criteriosCount={criteriosCount}
          configCount={configCount}
          backlogJson={backlogJson}
          setBacklogJson={setBacklogJson}
          epicasJson={epicasJson}
          setEpicasJson={setEpicasJson}
          historiasJson={historiasJson}
          setHistoriasJson={setHistoriasJson}
          actividadesJson={actividadesJson}
          setActividadesJson={setActividadesJson}
          sprintsJson={sprintsJson}
          setSprintsJson={setSprintsJson}
          criteriosJson={criteriosJson}
          setCriteriosJson={setCriteriosJson}
          configJson={configJson}
          setConfigJson={setConfigJson}
          selectedAuditTareaId={selectedAuditTareaId}
          setSelectedAuditTareaId={setSelectedAuditTareaId}
          tareasConCriterios={tareasConCriterios}
          handleLimpiarPlanificacion={handleLimpiarPlanificacion}
          handleLimpiarEpicas={handleLimpiarEpicas}
          handleLimpiarHistorias={handleLimpiarHistorias}
          handleLimpiarActividades={handleLimpiarActividades}
          handleLimpiarConfigActividades={handleLimpiarConfigActividades}
          handleLimpiarCriterios={handleLimpiarCriterios}
          handleLimpiarSprints={handleLimpiarSprints}
          copiarPromptBacklog={copiarPromptBacklog}
          handleImportarBacklog={handleImportarBacklog}
          copiarPromptEpicasModulares={copiarPromptEpicasModulares}
          handleImportarEpicasModulares={handleImportarEpicasModulares}
          copiarPromptHistoriasModulares={copiarPromptHistoriasModulares}
          handleImportarHistoriasModulares={handleImportarHistoriasModulares}
          copiarPromptActividadesModulares={copiarPromptActividadesModulares}
          handleImportarActividadesModulares={
            handleImportarActividadesModulares
          }
          copiarPromptSprints={copiarPromptSprints}
          handleImportarSprints={handleImportarSprints}
          copiarPromptCriterios={copiarPromptCriterios}
          handleImportarCriterios={handleImportarCriterios}
          copiarPromptConfigActividades={copiarPromptConfigActividades}
          handleImportarConfigActividades={handleImportarConfigActividades}
        />
      )}

      {activeTab === "descargas" && (
        <DescargasPlanningTab
          selectedDocName={selectedDocName}
          docEditContent={docEditContent}
          setDocEditContent={setDocEditContent}
          selectDocumentForEdit={selectDocumentForEdit}
          handleSaveSelectedDoc={handleSaveSelectedDoc}
          copiarPromptInicializador={copiarPromptInicializador}
          descargarClaudeMdCompleto={descargarClaudeMdCompleto}
          descargarSchemaMd={descargarSchemaMd}
          descargarRequerimientosMd={descargarRequerimientosMd}
          descargarDesignMd={descargarDesignMd}
          descargarSitemapMd={descargarSitemapMd}
          descargarRolesMd={descargarRolesMd}
          descargarSeedMd={descargarSeedMd}
          descargarErrorsMd={descargarErrorsMd}
          descargarSetupMd={descargarSetupMd}
          descargarBacklogMd={descargarBacklogMd}
          descargarSprintsMd={descargarSprintsMd}
          entidades={entidades}
          requisitosFuncionales={requisitosFuncionales}
          requisitosNoFuncionales={requisitosNoFuncionales}
          ds={ds}
          sitemapSystemMarkdown={sitemapSystemMarkdown}
          sitemapMarkup={sitemapMarkup}
          sitemap={sitemap}
          rolesMarkdown={rolesMarkdown}
          seedMarkdown={seedMarkdown}
          erroresMarkdown={erroresMarkdown}
          setupMarkdown={setupMarkdown}
          mostrarToast={mostrarToast}
        />
      )}
    </Card>
  );
};
