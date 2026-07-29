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
Es crítico que la arquitectura y descomposición de tareas siga estrictamente los estándares y stack del proyecto elegidos para garantizar consistencia.

STACK DEL PROYECTO:
- Stack: {{stack_summary}}

ESTÁNDARES DE INGENIERÍA:
- Estándares: {{estandares_summary}}

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
Es obligatorio que la organización en sprints respete estrictamente los estándares y la arquitectura elegida para el desarrollo.

STACK DEL PROYECTO:
- Stack: {{stack_summary}}

ESTÁNDARES DE INGENIERÍA:
- Estándares: {{estandares_summary}}

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

const PROMPT_MODULAR_EPICAS = `Eres un Product Owner Senior. Tu objetivo es analizar los requisitos funcionales, no funcionales y el modelo de base de datos para generar las Épicas del backlog del proyecto.
Es crítico que la arquitectura sugerida siga estrictamente los estándares y stack del proyecto definidos a continuación para garantizar consistencia.

STACK DEL PROYECTO:
- Stack: {{stack_summary}}

ESTÁNDARES DE INGENIERÍA:
- Estándares: {{estandares_summary}}

REQUISITOS DEL PROYECTO:
---
{{requisitos}}
---

ENTIDADES DE BASE DE DATOS:
---
{{entidades}}
---

INSTRUCCIONES DE RESPUESTA:
Devuelve un JSON estrictamente estructurado según el siguiente formato, sin explicaciones ni markdown decorativo.

FORMATO JSON ESPERADO:
\`\`\`json
[
  {
    "nombre": "Épica 1: Nombre descriptivo",
    "descripcion": "Descripción detallada del alcance de la épica"
  }
]
\`\`\``;

const PROMPT_MODULAR_HISTORIAS = `Eres un Product Owner Senior. Tu objetivo es detallar las Historias de Usuario para cada una de las Épicas ya creadas en el proyecto.
Es obligatorio que todas las historias de usuario sigan los estándares y stack definidos.

STACK DEL PROYECTO:
- Stack: {{stack_summary}}

ESTÁNDARES DE INGENIERÍA:
- Estándares: {{estandares_summary}}

REQUISITOS DEL PROYECTO:
---
{{requisitos}}
---

ÉPICAS DISPONIBLES EN EL SISTEMA:
{{epicas_list}}

INSTRUCCIONES DE RESPUESTA:
Devuelve un JSON estrictamente estructurado según el siguiente formato. Asegúrate de asociar cada historia a su épica correspondiente mediante "epicNombre".

FORMATO JSON ESPERADO:
\`\`\`json
[
  {
    "epicNombre": "Nombre exacto de la Épica de la lista",
    "titulo": "Título corto y claro de la Historia",
    "descripcion": "Como [rol] quiero [acción] para [beneficio]",
    "prioridad": "Alta" | "Media" | "Baja",
    "estimacion": 3
  }
]
\`\`\``;

const PROMPT_MODULAR_ACTIVIDADES = `Eres un Tech Lead Senior. Tu objetivo es descomponer las Historias de Usuario en Actividades/Tareas Técnicas concretas listas para ser implementadas por los desarrolladores.
Sigue estrictamente el stack de tecnología y estándares definidos.

STACK DEL PROYECTO:
- Stack: {{stack_summary}}

ESTÁNDARES DE INGENIERÍA:
- Estándares: {{estandares_summary}}

HISTORIAS DE USUARIO DISPONIBLES EN EL SISTEMA:
{{historias_list}}

INSTRUCCIONES DE RESPUESTA:
Devuelve un JSON estrictamente estructurado según el siguiente formato. Asocia cada actividad técnica a su historia correspondiente mediante "storyTitulo".

FORMATO JSON ESPERADO:
\`\`\`json
[
  {
    "storyTitulo": "Título exacto de la Historia de la lista",
    "titulo": "Título de la Actividad Técnica (ej: Crear vista de Login, Configurar RLS de Tabla)",
    "descripcion": "Indicaciones técnicas claras de lo que debe resolver esta actividad"
  }
]
\`\`\``;

const PROMPT_CONFIG_ACTIVIDADES = `Eres un Arquitecto y Tech Lead Senior. Tu objetivo es elaborar la especificación de desarrollo técnico y los pasos de ejecución para cada una de las actividades técnicas del backlog.
Toda la arquitectura, nombres de componentes, rutas e instrucciones de código deben respetar estrictamente los estándares y el stack tecnológico especificados para garantizar consistencia.

STACK DEL PROYECTO:
- Stack: {{stack_summary}}

ESTÁNDARES DE INGENIERÍA:
- Estándares: {{estandares_summary}}

ACTIVIDADES TÉCNICAS DISPONIBLES EN EL BACKLOG:
{{actividades_list}}

INSTRUCCIONES DE RESPUESTA:
Devuelve un JSON estructurado como un array que contenga un objeto para cada actividad técnica de la lista. Cada objeto debe definir:
- "actividadTitulo": El título exacto de la actividad técnica de la lista.
- "rol": El rol senior recomendado para resolver esta tarea (ej: "Senior Frontend Developer (Next.js)", "Senior Database Architect (Supabase)", etc.).
- "componente": El nombre exacto del archivo/componente principal a crear o modificar (ej: "auth-modal.tsx", "use-auth.ts").
- "ruta": La ruta de carpetas sugerida dentro de la estructura estándar (ej: "src/presentation/components/auth/", "src/application/hooks/").
- "modulo": El módulo de negocio al que pertenece (ej: "Autenticación", "Ventas", "Dashboard").
- "pasos": Un array conteniendo entre 3 y 6 pasos ordenados que debe seguir la IA para implementar la tarea. Deben ser pasos concretos que terminen con verificación.

FORMATO JSON ESPERADO:
\`\`\`json
[
  {
    "actividadTitulo": "Título exacto de la actividad técnica",
    "rol": "Senior Fullstack Developer (React/Next.js)",
    "componente": "login-form.tsx",
    "ruta": "src/presentation/components/auth/",
    "modulo": "Autenticación",
    "pasos": [
      "Paso 1: Crear la estructura del componente de formulario usando React",
      "Paso 2: Integrar la validación del esquema de email y password",
      "Paso 3: Conectar el flujo con la API de autenticación y manejar estados",
      "Paso 4: Realizar la verificación manual o tests unitarios del login"
    ]
  }
]
\`\`\``;

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
          t.criterioAceptacion && t.criterioAceptacion.trim().length > 0
      ).length;
    }, [proyectoId]) || 0;

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
    const prompt = PROMPT_BACKLOG.replace("{{requisitos}}", reqText)
      .replace("{{entidades}}", entidades || "No configurado.")
      .replace("{{stack_summary}}", compileStackSummary())
      .replace("{{estandares_summary}}", compileStandardsSummary());

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
    )
      .replace("{{stack_summary}}", compileStackSummary())
      .replace("{{estandares_summary}}", compileStandardsSummary());

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

  const copiarPromptEpicasModulares = () => {
    const reqText = `Requisitos Funcionales:\n${requisitosFuncionales}\n\nRequisitos No Funcionales:\n${requisitosNoFuncionales}\n\nSitemap:\n${sitemap}`;
    const prompt = PROMPT_MODULAR_EPICAS.replace("{{requisitos}}", reqText)
      .replace("{{entidades}}", entidades || "No configurado.")
      .replace("{{stack_summary}}", compileStackSummary())
      .replace("{{estandares_summary}}", compileStandardsSummary());

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Épicas Modulares copiado.", "exito");
  };

  const handleImportarEpicasModulares = async () => {
    if (!epicasJson.trim()) {
      mostrarToast("Pega el JSON de épicas primero.", "error");
      return;
    }
    try {
      const parsed = JSON.parse(epicasJson);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON debe ser un arreglo de Épicas.");
      }
      for (const item of parsed) {
        await db.epicas.add({
          id: `epic_${Math.random()}`,
          proyectoId,
          nombre: item.nombre,
          descripcion: item.descripcion,
        });
      }
      setEpicasJson("");
      mostrarToast(`¡${parsed.length} Épicas importadas con éxito!`, "exito");
    } catch (err: any) {
      mostrarToast(`Error al importar: ${err.message}`, "error");
    }
  };

  const copiarPromptHistoriasModulares = async () => {
    const epicas = await db.epicas
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    const epicasList = epicas
      .map((e) => `- ${e.nombre} (${e.descripcion})`)
      .join("\n");

    const reqText = `Requisitos Funcionales:\n${requisitosFuncionales}\n\nRequisitos No Funcionales:\n${requisitosNoFuncionales}`;
    const prompt = PROMPT_MODULAR_HISTORIAS.replace("{{requisitos}}", reqText)
      .replace("{{epicas_list}}", epicasList || "Ninguna épica cargada aún.")
      .replace("{{stack_summary}}", compileStackSummary())
      .replace("{{estandares_summary}}", compileStandardsSummary());

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Historias Modulares copiado.", "exito");
  };

  const handleImportarHistoriasModulares = async () => {
    if (!historiasJson.trim()) {
      mostrarToast("Pega el JSON de historias primero.", "error");
      return;
    }
    try {
      const parsed = JSON.parse(historiasJson);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON debe ser un arreglo de historias.");
      }
      const epicas = await db.epicas
        .where("proyectoId")
        .equals(proyectoId)
        .toArray();
      let importedCount = 0;
      for (const item of parsed) {
        const matched = epicas.find(
          (e: any) =>
            e.nombre.toLowerCase().trim() ===
            item.epicNombre.toLowerCase().trim()
        );
        if (matched) {
          await db.historias.add({
            id: `story_${Math.random()}`,
            proyectoId,
            epicaId: (matched as any).id,
            titulo: item.titulo,
            descripcion: item.descripcion,
            prioridad: item.prioridad || "Media",
            estimacion: item.estimacion || 3,
            estado: "todo",
          });
          importedCount++;
        }
      }
      setHistoriasJson("");
      mostrarToast(
        `¡${importedCount} de ${parsed.length} Historias importadas con éxito!`,
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al importar: ${err.message}`, "error");
    }
  };

  const copiarPromptActividadesModulares = async () => {
    const stories = await db.historias
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    const storiesList = stories
      .map((s) => `- ${s.titulo} (${s.descripcion})`)
      .join("\n");

    const prompt = PROMPT_MODULAR_ACTIVIDADES.replace(
      "{{historias_list}}",
      storiesList || "Ninguna historia cargada aún."
    )
      .replace("{{stack_summary}}", compileStackSummary())
      .replace("{{estandares_summary}}", compileStandardsSummary());

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Actividades Modulares copiado.", "exito");
  };

  const handleImportarActividadesModulares = async () => {
    if (!actividadesJson.trim()) {
      mostrarToast("Pega el JSON de actividades primero.", "error");
      return;
    }
    try {
      const parsed = JSON.parse(actividadesJson);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON debe ser un arreglo de actividades.");
      }
      const stories = await db.historias
        .where("proyectoId")
        .equals(proyectoId)
        .toArray();
      let importedCount = 0;
      for (const item of parsed) {
        const matched = stories.find(
          (s: any) =>
            s.titulo.toLowerCase().trim() ===
            item.storyTitulo.toLowerCase().trim()
        );
        if (matched) {
          await db.tareas.add({
            id: `tar_${Math.random()}`,
            proyectoId,
            historiaId: (matched as any).id,
            titulo: item.titulo,
            estado: "todo",
          });
          importedCount++;
        }
      }
      setActividadesJson("");
      mostrarToast(
        `¡${importedCount} de ${parsed.length} Actividades importadas con éxito!`,
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al importar: ${err.message}`, "error");
    }
  };

  const copiarPromptConfigActividades = async () => {
    const tasks = await db.tareas
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    const tasksList = tasks.map((t) => `- ${(t as any).titulo}`).join("\n");

    const prompt = PROMPT_CONFIG_ACTIVIDADES.replace(
      "{{actividades_list}}",
      tasksList || "Ninguna actividad cargada aún."
    )
      .replace("{{stack_summary}}", compileStackSummary())
      .replace("{{estandares_summary}}", compileStandardsSummary());

    navigator.clipboard.writeText(prompt);
    mostrarToast("Prompt de Configuración de Actividades copiado.", "exito");
  };

  const handleImportarConfigActividades = async () => {
    if (!configJson.trim()) {
      mostrarToast("Pega el JSON de configuración primero.", "error");
      return;
    }
    try {
      const parsed = JSON.parse(configJson);
      if (!Array.isArray(parsed)) {
        throw new Error("El JSON debe ser un arreglo de configuraciones.");
      }
      const tasks = await db.tareas
        .where("proyectoId")
        .equals(proyectoId)
        .toArray();
      let updatedCount = 0;
      for (const item of parsed) {
        const matched = tasks.find(
          (t: any) =>
            t.titulo.toLowerCase().trim() ===
            item.actividadTitulo.toLowerCase().trim()
        );
        if (matched) {
          await db.tareas.update((matched as any).id as string, {
            rol: item.rol,
            componente: item.componente,
            ruta: item.ruta,
            modulo: item.modulo,
            pasos: item.pasos || [],
          });
          updatedCount++;
        }
      }
      setConfigJson("");
      mostrarToast(
        `¡${updatedCount} Actividades configuradas técnicamente con éxito!`,
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al importar: ${err.message}`, "error");
    }
  };

  const comprimirEsquema = (rawEntidades: string): string => {
    if (!rawEntidades) return "No especificado.";
    if (rawEntidades.includes("- Tabla ") || rawEntidades.includes("- Table "))
      return rawEntidades;

    const lines = rawEntidades.split("\n");
    const tables: { name: string; columns: string[] }[] = [];
    let currentTable: { name: string; columns: string[] } | null = null;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const createTableMatch = line.match(
        /CREATE\s+TABLE\s+(?:public\.)?([a-zA-Z0-9_"]+)/i
      );
      const tableHeaderMatch = line.match(
        /(?:^#+\s+|^Table\s+)([a-zA-Z0-9_"]+)/i
      );

      if (createTableMatch || tableHeaderMatch) {
        if (currentTable) tables.push(currentTable);
        const tableName = (
          createTableMatch ? createTableMatch[1] : tableHeaderMatch![1]
        ).replace(/"/g, "");
        currentTable = { name: tableName, columns: [] };
      } else if (currentTable) {
        if (line === ");" || line === ")") {
          tables.push(currentTable);
          currentTable = null;
          continue;
        }
        if (
          line.toUpperCase().startsWith("CONSTRAINT") ||
          line.toUpperCase().startsWith("PRIMARY KEY") ||
          line.toUpperCase().startsWith("FOREIGN KEY") ||
          line.startsWith("--")
        ) {
          continue;
        }
        const colMatch = line.match(/^([a-zA-Z0-9_"]+)\s+([a-zA-Z0-9_()[\]]+)/);
        if (colMatch) {
          currentTable.columns.push(
            `${colMatch[1].replace(/"/g, "")} (${colMatch[2].toLowerCase()})`
          );
        } else {
          const mdMatch = line.match(
            /^[-*+]\s+([a-zA-Z0-9_]+)(?:\s*[:(]\s*([a-zA-Z0-9_]+))?/
          );
          if (mdMatch) {
            currentTable.columns.push(
              `${mdMatch[1]} (${mdMatch[2] ? mdMatch[2].toLowerCase() : "any"})`
            );
          }
        }
      }
    }
    if (currentTable) tables.push(currentTable);
    if (tables.length === 0)
      return (
        rawEntidades.split("\n").slice(0, 30).join("\n") +
        "\n... (esquema simplificado)"
      );

    return tables
      .map((t) => `- Tabla ${t.name}: ${t.columns.join(", ")}`)
      .join("\n");
  };

  const generarClaudeMd = (incluirEsquemaCompleto = true) => {
    if (!proyecto) return "";

    // Formatear Stack
    let stackStr = "";
    if (proyecto.stack) {
      Object.entries(proyecto.stack).forEach(([layer, techs]) => {
        if (Array.isArray(techs) && techs.length > 0) {
          stackStr += `- **${layer.charAt(0).toUpperCase() + layer.slice(1)}**: ${techs.join(", ")}\n`;
        }
      });
    }
    if (!stackStr) stackStr = "- No configurado.";

    // Formatear Estándares
    let estandaresStr = "";
    if (proyecto.estandares) {
      Object.entries(proyecto.estandares).forEach(([cat, techs]) => {
        if (Array.isArray(techs) && techs.length > 0) {
          estandaresStr += `- **${cat.charAt(0).toUpperCase() + cat.slice(1)}**: ${techs.join(", ")}\n`;
        }
      });
    }
    if (!estandaresStr) estandaresStr = "- No configurados.";

    const schemaStr = incluirEsquemaCompleto
      ? comprimirEsquema(entidades)
      : "El esquema detallado de base de datos se encuentra documentado en el archivo SCHEMA.md de forma completa.";

    return `# CLAUDE.md

## Propósito del Proyecto
- **Nombre**: ${proyecto.nombre || "Sin Nombre"}
- **Tipo**: ${proyecto.tipo || "General"}
- **Descripción**: ${proyecto.descripcion || "Sin descripción."}

## Comandos de Desarrollo
<commands>
- Servidor de Desarrollo: npm run dev
- Type Check: npx tsc --noEmit
- Correr Tests: npm run test
- Lint y Formateo: npm run lint
</commands>

## Stack Tecnológico
<stack>
${stackStr.trim()}
</stack>

## Estándares de Codificación
<coding-standards>
${estandaresStr.trim()}
</coding-standards>

## Modelo de Base de Datos (3FN)
<database-schema>
${schemaStr.trim()}
</database-schema>
`;
  };

  const generarSchemaMd = () => {
    if (!proyecto) return "";
    return `# SCHEMA.md

## Modelo de Base de Datos Completo (3FN)
<database-schema>
${comprimirEsquema(entidades)}
</database-schema>
`;
  };

  const descargarArchivo = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const descargarClaudeMdCompleto = () => {
    descargarArchivo(generarClaudeMd(true), "CLAUDE.md");
    mostrarToast("¡Archivo CLAUDE.md (Completo) descargado!", "exito");
  };

  const descargarClaudeMdDividido = () => {
    descargarArchivo(generarClaudeMd(false), "CLAUDE.md");
    mostrarToast("¡Archivo CLAUDE.md (Dividido) descargado!", "exito");
  };

  const descargarSchemaMd = () => {
    descargarArchivo(generarSchemaMd(), "SCHEMA.md");
    mostrarToast("¡Archivo SCHEMA.md descargado!", "exito");
  };

  const copiarClaudeMd = () => {
    const fullContent = generarClaudeMd(true);
    const totalLines = fullContent.split("\n").length;
    // Si supera el límite de 300, copiamos el dividido por defecto para cuidar el contexto
    const content = totalLines > 300 ? generarClaudeMd(false) : fullContent;
    navigator.clipboard.writeText(content);
    mostrarToast(
      totalLines > 300
        ? "¡Inducción CLAUDE.md (Dividido) copiada al portapapeles!"
        : "¡Inducción CLAUDE.md copiada al portapapeles!",
      "exito"
    );
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

            const actividadesList =
              historia.actividades || historia.tareas || [];
            if (Array.isArray(actividadesList)) {
              for (const act of actividadesList) {
                let actNombre = "";
                if (typeof act === "string") {
                  actNombre = act;
                } else if (act && typeof act === "object") {
                  actNombre =
                    act.nombre || act.titulo || act.descripcion || String(act);
                }
                if (!actNombre) continue;

                const tareaId = `tarea_${Date.now()}_${Math.random()
                  .toString(36)
                  .substring(2, 6)}`;
                await db.tareas.put({
                  id: tareaId,
                  proyectoId,
                  historiaId,
                  titulo: actNombre.trim(),
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

  // Mass Criteria Importer
  const handleImportarCriterios = async () => {
    try {
      const parsed = JSON.parse(criteriosJson);
      if (!Array.isArray(parsed)) {
        throw new Error(
          "El JSON debe ser un arreglo de objetos con 'actividad' y 'criterios'."
        );
      }

      // Fetch all tasks for the current project to find matching ones
      const projectTareas = await db.tareas
        .where("proyectoId")
        .equals(proyectoId)
        .toArray();

      let matchedCount = 0;
      for (const item of parsed) {
        if (!item.actividad || !Array.isArray(item.criterios)) continue;

        // Find matching task by title (case insensitive, trim)
        const targetTitle = String(item.actividad).toLowerCase().trim();
        const matchedTarea = projectTareas.find(
          (t) => String(t.titulo).toLowerCase().trim() === targetTitle
        );

        if (matchedTarea) {
          await db.tareas.update(matchedTarea.id as string, {
            criteriosAceptacion: item.criterios,
          });
          matchedCount++;
        }
      }

      setCriteriosJson("");
      mostrarToast(
        `¡Criterios de aceptación importados con éxito! Se vincularon ${matchedCount} actividades.`,
        "exito"
      );
    } catch (err: any) {
      mostrarToast(`Error al importar criterios: ${err.message}`, "error");
    }
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
          {/* Wipe section / Warning banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="min-w-0 flex-1">
              <span className="font-mono text-[10px] font-bold text-red-400 uppercase">
                ⚠️ Zona de Peligro: Reiniciar Planificación
              </span>
              <p className="mt-1 font-mono text-[9px] text-zinc-500">
                ¿Quieres volver a empezar? Esta opción eliminará permanentemente
                todo el backlog (Épicas, Historias y Tareas/Actividades) y
                Sprints asociados a este proyecto.
              </p>
            </div>
            <button
              onClick={handleLimpiarPlanificacion}
              className="shrink-0 rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-red-400 uppercase hover:bg-red-500/25"
            >
              🗑️ Limpiar Backlog y Sprints
            </button>
          </div>

          {/* Import option selector */}
          <div className="flex border-b border-zinc-900 pb-2">
            <button
              onClick={() => setTipoImportacion("modular")}
              className={`px-4 py-2 font-mono text-[10px] font-bold uppercase transition-all ${
                tipoImportacion === "modular"
                  ? "border-b-2 border-emerald-500 text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              🔄 Paso a Paso Modular (Recomendado)
            </button>
            <button
              onClick={() => setTipoImportacion("unificada")}
              className={`px-4 py-2 font-mono text-[10px] font-bold uppercase transition-all ${
                tipoImportacion === "unificada"
                  ? "border-b-2 border-emerald-500 text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              📦 Ingesta Unificada (JSON Único)
            </button>
          </div>

          {/* Unified Bulk Importer */}
          {tipoImportacion === "unificada" && (
            <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Importación Masiva de Backlog (Épicas / Historias /
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
          )}

          {/* Modular Step-by-Step Importers */}
          {tipoImportacion === "modular" && (
            <div className="flex flex-col gap-4">
              {/* Step 1: Epicas */}
              <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                        Fase 1: Importar Épicas
                      </span>
                      <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
                        {epicasCount} creadas
                      </span>
                    </div>
                    <p className="font-mono text-[9px] text-zinc-500">
                      Analiza tus requerimientos y genera el listado base de
                      Épicas de tu Backlog.
                    </p>
                  </div>
                  <button
                    onClick={copiarPromptEpicasModulares}
                    className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
                  >
                    📋 Copiar Prompt Épicas
                  </button>
                </div>
                <textarea
                  value={epicasJson}
                  onChange={(e) => setEpicasJson(e.target.value)}
                  placeholder="Pega aquí el JSON de Épicas devuelto por la IA..."
                  rows={4}
                  className="border-zinc-850 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none"
                />
                <button
                  onClick={handleImportarEpicasModulares}
                  className="self-end rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400"
                >
                  Procesar e Importar Épicas
                </button>
              </div>

              {/* Step 2: Historias */}
              <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                        Fase 2: Importar Historias de Usuario
                      </span>
                      <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
                        {historiasCount} creadas
                      </span>
                    </div>
                    <p className="font-mono text-[9px] text-zinc-500">
                      Asocia historias de usuario detalladas a cada una de tus
                      Épicas importadas.
                    </p>
                  </div>
                  <button
                    disabled={epicasCount === 0}
                    onClick={copiarPromptHistoriasModulares}
                    className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20 disabled:opacity-40"
                  >
                    📋 Copiar Prompt Historias
                  </button>
                </div>
                <textarea
                  value={historiasJson}
                  onChange={(e) => setHistoriasJson(e.target.value)}
                  placeholder="Pega aquí el JSON de Historias de Usuario devuelto por la IA..."
                  rows={4}
                  className="border-zinc-850 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none"
                />
                <button
                  onClick={handleImportarHistoriasModulares}
                  className="self-end rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400"
                >
                  Procesar e Importar Historias
                </button>
              </div>

              {/* Step 3: Actividades */}
              <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                        Fase 3: Importar Actividades Técnicas
                      </span>
                      <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
                        {tareasCount} creadas
                      </span>
                    </div>
                    <p className="font-mono text-[9px] text-zinc-500">
                      Descompone las historias de usuario en tareas o
                      actividades técnicas concretas.
                    </p>
                  </div>
                  <button
                    disabled={historiasCount === 0}
                    onClick={copiarPromptActividadesModulares}
                    className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20 disabled:opacity-40"
                  >
                    📋 Copiar Prompt Actividades
                  </button>
                </div>
                <textarea
                  value={actividadesJson}
                  onChange={(e) => setActividadesJson(e.target.value)}
                  placeholder="Pega aquí el JSON de Actividades Técnicas devuelto por la IA..."
                  rows={4}
                  className="border-zinc-850 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none"
                />
                <button
                  onClick={handleImportarActividadesModulares}
                  className="self-end rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400"
                >
                  Procesar e Importar Actividades
                </button>
              </div>
            </div>
          )}

          {/* Sprints Configuration */}
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Configuración de Sprints
                  </span>
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
                    {sprintsCount} sprints
                  </span>
                </div>
                <p className="font-mono text-[9px] text-zinc-500">
                  Organiza las historias de usuario en Sprints pegando el JSON
                  devuelto por la IA.
                </p>
              </div>
              <button
                disabled={historiasCount === 0}
                onClick={copiarPromptSprints}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20 disabled:opacity-40"
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

          {/* Acceptance Criteria */}
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Criterios de Aceptación por Actividad
                  </span>
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
                    {criteriosCount} con criterios
                  </span>
                </div>
                <p className="font-mono text-[9px] text-zinc-500">
                  Asocia criterios de aceptación BDD y QA a cada una de tus
                  actividades técnicas inyectadas.
                </p>
              </div>
              <button
                disabled={tareasCount === 0}
                onClick={copiarPromptCriterios}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20 disabled:opacity-40"
              >
                📋 Copiar Prompt Criterios
              </button>
            </div>
            <textarea
              value={criteriosJson}
              onChange={(e) => setCriteriosJson(e.target.value)}
              placeholder="Pega aquí el JSON de criterios de aceptación..."
              rows={5}
              className="border-zinc-850 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none"
            />
            <button
              onClick={handleImportarCriterios}
              className="self-end rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400"
            >
              Procesar y Vincular Criterios
            </button>
          </div>

          {/* Technical Configuration of Activities */}
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-900 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Configuración Técnica de Actividades (Rol, Pasos y
                    Componente)
                  </span>
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
                    {configCount} configuradas
                  </span>
                </div>
                <p className="font-mono text-[9px] text-zinc-500">
                  Importa el JSON con el rol recomendado, componente, ruta,
                  módulo y lista de pasos de checklist dinámico de la IA para
                  cada actividad.
                </p>
              </div>
              <button
                disabled={tareasCount === 0}
                onClick={copiarPromptConfigActividades}
                className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20 disabled:opacity-40"
              >
                📋 Copiar Prompt Config
              </button>
            </div>
            <textarea
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              placeholder="Pega aquí el JSON de configuración técnica de actividades..."
              rows={5}
              className="border-zinc-850 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] text-zinc-300 outline-none"
            />
            <button
              onClick={handleImportarConfigActividades}
              className="self-end rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase hover:bg-emerald-400"
            >
              Procesar y Configurar Actividades
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

          {/* CLAUDE.md Induction File Generator */}
          {(() => {
            const fullContent = generarClaudeMd(true);
            const lineasClaude = fullContent.split("\n").length;
            const superaLimite = lineasClaude > 300;
            const previewContent = generarClaudeMd(!superaLimite);

            return (
              <div className="flex flex-col gap-3 rounded-xl border border-zinc-900 bg-zinc-950 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                      Inducción para IA (CLAUDE.md)
                    </span>
                    <p className="font-mono text-[9px] text-zinc-500">
                      Genera el archivo de inducción para la IA para inicializar
                      cada sesión con las reglas de arquitectura, base de datos
                      y stack de tu proyecto.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={copiarClaudeMd}
                      className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
                    >
                      📋 Copiar
                    </button>
                    {!superaLimite ? (
                      <button
                        onClick={descargarClaudeMdCompleto}
                        className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
                      >
                        📥 Descargar CLAUDE.md
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={descargarClaudeMdCompleto}
                          className="rounded border border-red-500/20 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-red-400 uppercase hover:bg-red-500/20"
                          title="Descargar CLAUDE.md incluyendo el esquema completo, superando las 300 líneas"
                        >
                          📥 Descargar Completo
                        </button>
                        <button
                          onClick={descargarClaudeMdDividido}
                          className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
                          title="Descargar CLAUDE.md compacto sin esquema completo"
                        >
                          📥 Descargar Dividido
                        </button>
                        <button
                          onClick={descargarSchemaMd}
                          className="rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
                          title="Descargar SCHEMA.md con el esquema de base de datos completo"
                        >
                          📥 Descargar SCHEMA.md
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {superaLimite && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 font-mono text-[9px] text-amber-300">
                    ⚠️ <b>Advertencia de Longitud:</b> El archivo CLAUDE.md
                    completo tiene <b>{lineasClaude} líneas</b> y supera el
                    límite recomendado de 300 líneas.
                    <br />
                    Te sugerimos descargar la versión{" "}
                    <b>Dividida (CLAUDE.md + SCHEMA.md)</b> para evitar saturar
                    el contexto de la IA y reducir costos.
                  </div>
                )}

                <textarea
                  readOnly
                  value={previewContent}
                  rows={12}
                  className="border-zinc-850 w-full rounded border bg-zinc-900/50 p-2 font-mono text-[9px] text-zinc-400 outline-none"
                />
              </div>
            );
          })()}
        </div>
      )}
    </Card>
  );
};
