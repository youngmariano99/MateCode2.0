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

const PROMPT_BACKLOG = `Actúa como un Product Owner y Scrum Master. Debes transformar los requerimientos y entidades del proyecto en un plan de backlog detallado de Épicas, Historias de Usuario y Actividades.
Debes basarte estrictamente en la arquitectura, el stack y los estándares definidos en el archivo CLAUDE.md.

<requisitos>
{{requisitos}}
</requisitos>

<base_de_datos>
{{entidades}}
</base_de_datos>

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

const PROMPT_SPRINTS = `Actúa como un Scrum Master Senior. A partir de las historias de usuario dadas, organízalas en sprints lógicos y coherentes.
Debes considerar los criterios y la arquitectura del archivo CLAUDE.md.

<historias_disponibles>
{{backlog_stories}}
</historias_disponibles>

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

const PROMPT_INICIALIZADOR = `Eres un DevOps y Tech Lead Experto. Genera los comandos y scripts de terminal necesarios para inicializar manualmente el proyecto en limpio basándote en la especificación de stack de CLAUDE.md.

INSTRUCCIONES:
Proporciona paso a paso las instrucciones del setup:
1. Comandos de inicialización (ej: npm init, npx create-next-app, etc.).
2. Comandos de instalación de dependencias del stack.
3. Configuración inicial de herramientas de desarrollo (ESLint, Prettier, TypeScript, Dockerfiles).
4. Estructura de carpetas inicial.`;

const PROMPT_MODULAR_EPICAS = `Actúa como un Product Owner Senior. Tu objetivo es analizar los requisitos y la base de datos para generar las Épicas del backlog del proyecto.
Debes basarte estrictamente en la arquitectura, el stack y los estándares definidos en el archivo CLAUDE.md.

<requisitos>
{{requisitos}}
</requisitos>

<base_de_datos>
{{entidades}}
</base_de_datos>

Devuelve un JSON estrictamente estructurado con las Épicas resultantes, sin introducciones ni markdown decorativo.

FORMATO JSON ESPERADO:
\`\`\`json
[
  {
    "nombre": "Épica 1: Nombre descriptivo",
    "descripcion": "Descripción detallada del alcance de la épica"
  }
]
\`\`\``;

const PROMPT_MODULAR_HISTORIAS = `Actúa como un Product Owner Senior. Tu objetivo es detallar las Historias de Usuario asociadas a cada una de las Épicas del proyecto.
Debes basarte en la arquitectura y estándares definidos en el archivo CLAUDE.md.

<requisitos>
{{requisitos}}
</requisitos>

<epicas_existentes>
{{epicas_list}}
</epicas_existentes>

Devuelve un JSON estrictamente estructurado con las Historias de Usuario vinculadas a sus épicas (epicNombre), sin comentarios ni markdown decorativo.

FORMATO JSON ESPERADO:
\`\`\`json
[
  {
    "epicNombre": "Nombre exacto de la Épica de la lista",
    "titulo": "Título de la Historia",
    "descripcion": "Como [rol] quiero [acción] para [beneficio]",
    "prioridad": "Alta" | "Media" | "Baja",
    "estimacion": 3
  }
]
\`\`\``;

const PROMPT_MODULAR_ACTIVIDADES = `Actúa como un Tech Lead Senior. Tu objetivo es descomponer las Historias de Usuario en Actividades Técnicas concretas.
Debes alinear cada actividad a la estructura y estándares del archivo CLAUDE.md.

<historias_de_usuario>
{{historias_list}}
</historias_de_usuario>

Devuelve un JSON estrictamente estructurado con las actividades técnicas vinculadas a su historia (storyTitulo), sin comentarios ni markdown decorativo.

FORMATO JSON ESPERADO:
\`\`\`json
[
  {
    "storyTitulo": "Título exacto de la Historia de la lista",
    "titulo": "Título de la Actividad Técnica (ej: Configurar Supabase Auth, Crear formulario de contacto)",
    "descripcion": "Instrucciones técnicas de implementación"
  }
]
\`\`\``;

const PROMPT_SITEMAP_SISTEMA = `Actúa como un Arquitecto de Información y UX Senior.
Genera el mapa de navegación y estructura de rutas (SITEMAP.md) para un sistema web/SaaS a partir del relevamiento.

INSTRUCCIONES Y ESTRUCTURA REQUERIDA (SITEMAP.md):
Genera un documento Markdown detallando:
1. **Mapa de Rutas del Sistema**: Listado jerárquico de carpetas y archivos Next.js App Router (ej: /dashboard/settings/page.tsx).
2. **Roles y Accesos por Ruta**: Indica qué roles de usuario pueden acceder a cada ruta.
3. **Flujos Clave**: Breve descripción del flujo operativo en las vistas principales.

Por favor, devuelve únicamente el contenido Markdown sin introducciones ni comentarios.`;

const PROMPT_ROLES = `Actúa como un Arquitecto de Seguridad y Administrador de Base de Datos Senior.
Genera la especificación de Roles de Usuario y políticas de acceso para el proyecto basándote en el relevamiento y el modelo de negocio.

INSTRUCCIONES Y ESTRUCTURA REQUERIDA (ROLES.md):
Devuelve un archivo Markdown (ROLES.md) con la siguiente estructura:
1. **Listado de Roles del Sistema**: Nombre del rol y descripción de responsabilidades (ej: Administrador, Operador, Cliente Final).
2. **Matriz de Permisos (RBAC)**: Tabla indicando qué rol tiene acceso a qué módulos/rutas y acciones permitidas (Crear, Leer, Modificar, Eliminar).
3. **Reglas de Aislamiento y Supabase RLS**: Directrices y plantillas de políticas RLS sugeridas para proteger las tablas de la base de datos de forma multi-tenant o según el rol de la sesión.

Por favor, devuelve únicamente el contenido en Markdown, sin introducciones ni comentarios.`;

const PROMPT_DICCIONARIO_ERRORES = `Actúa como un Arquitecto de Software Principal y PO Senior.
Genera el diccionario de excepciones y errores de negocio estandarizado para el proyecto basándote en el relevamiento y las reglas de dominio.

INSTRUCCIONES Y ESTRUCTURA REQUERIDA (ERRORS.md):
Devuelve un archivo Markdown (ERRORS.md) detallando:
1. **Códigos de Error Estructurados**: Nomenclatura del error (ej: MC_USER_DUPLICATE, MC_INSUFFICIENT_FUNDS).
2. **Mensaje de Usuario Amigable**: Explicación legible y clara en español latino.
3. **Capa y Código HTTP**: Capa lógica del error y estado HTTP recomendado (ej: 400 Bad Request, 422 Unprocessable Entity).
4. **Instrucciones de Manejo**: Directriz breve de cómo reportar o capturar el error.

Por favor, devuelve únicamente el contenido en Markdown, sin introducciones ni comentarios.`;

const PROMPT_SEED_DATA = `Actúa como un Administrador de Base de Datos y Tech Lead Senior.
Genera el plan de datos semilla (Seed Data / Fixtures) para poblar y probar la base de datos del proyecto de manera realista.

INSTRUCCIONES Y ESTRUCTURA REQUERIDA (SEED.md):
Devuelve un archivo Markdown (SEED.md) con la siguiente estructura:
1. **Estrategia de Datos Semilla**: Indicar la cantidad lógica de registros para pruebas desafiantes (ej: 50 productos para filtros/paginación, pero 3-4 roles).
2. **Tablas y Volumen a Generar**: Resumen de cada entidad y volumen de datos de muestra para simular estrés y verificar la interfaz.
3. **Scripts SQL o Data Fixtures**: Código completo de siembra (seed.sql) o fixtures JSON/TypeScript listos para importar.

Por favor, devuelve únicamente el contenido en Markdown, sin introducciones ni comentarios.`;

const PROMPT_CONFIG_ACTIVIDADES = `Actúa como un Arquitecto y Tech Lead Senior. Tu objetivo es definir el rol recomendado, componente, ruta, módulo, etiquetas (tags), checklist paso a paso de implementación, y los requisitos de datos semilla (seed data) para cada actividad técnica.
La arquitectura, nombres de componentes y convenciones de rutas deben ajustarse estrictamente a lo establecido en el archivo CLAUDE.md.

<actividades_del_backlog>
{{actividades_list}}
</actividades_del_backlog>

Devuelve un JSON estructurado con los detalles de configuración técnica por actividad, sin introducciones ni markdown decorativo.

FORMATO JSON ESPERADO:
\`\`\`json
[
  {
    "actividadTitulo": "Título exacto de la actividad técnica",
    "rol": "Senior Fullstack Developer (React/Next.js)",
    "componente": "login-form.tsx",
    "ruta": "src/presentation/components/auth/",
    "modulo": "Autenticación",
    "etiquetas": ["FRONTEND", "BACKEND", "BD", "TESTING"],
    "pasos": [
      "Paso 1: Crear la estructura del componente de formulario usando React",
      "Paso 2: Integrar la validación del esquema de email y password",
      "Paso 3: Conectar el flujo con la API de autenticación y manejar estados",
      "Paso 4: Realizar la verificación manual o tests unitarios del login"
    ],
    "seed": {
      "modelo": "usuarios",
      "volumen": 10,
      "indicaciones": "Crear roles administrador, supervisor, operador con datos realistas para verificar permisos."
    }
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
    | "requisitos"
    | "sitemap"
    | "roles"
    | "errores"
    | "seeds"
    | "entidades"
    | "importador"
    | "descargas"
  >(isLandingType ? "sitemap" : "requisitos");

  useEffect(() => {
    if (isLandingType) {
      setActiveTab("sitemap");
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

  // System Routing sitemap & User roles safety state
  const [sitemapMode, setSitemapMode] = useState<"landing" | "sistema">(
    isLandingType ? "landing" : "sistema"
  );
  const [sitemapSystemMarkdown, setSitemapSystemMarkdown] = useState("");
  const [rolesMarkdown, setRolesMarkdown] = useState("");
  const [erroresMarkdown, setErroresMarkdown] = useState("");
  const [seedMarkdown, setSeedMarkdown] = useState("");
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

      if (Array.isArray(contexto.seccionesSitemap)) {
        setSeccionesSitemap(contexto.seccionesSitemap);
      }

      if (contexto.sitemapSystemMarkdown) {
        setSitemapMode("sistema");
      } else if (
        contexto.sitemapMarkup ||
        (contexto.seccionesSitemap && contexto.seccionesSitemap.length > 0)
      ) {
        setSitemapMode("landing");
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
        sitemapSystemMarkdown,
        rolesMarkdown,
        seedMarkdown,
        erroresMarkdown,
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
            etiquetas: item.etiquetas || [],
            seed: item.seed || null,
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

  const selectDocumentForEdit = (name: string) => {
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
    }
    setDocEditContent(content);
  };

  useEffect(() => {
    if (activeTab === "descargas") {
      selectDocumentForEdit(selectedDocName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    selectedDocName,
    entidades,
    requisitosFuncionales,
    requisitosNoFuncionales,
    sitemapSystemMarkdown,
    sitemapMarkup,
    sitemap,
    rolesMarkdown,
    seedMarkdown,
    erroresMarkdown,
    contexto,
  ]);

  const handleSaveSelectedDoc = async () => {
    try {
      const currentCtx = (await db.proyecto_contexto.get(proyectoId)) || {
        proyectoId,
      };
      if (selectedDocName === "CLAUDE.md") {
        await db.proyecto_contexto.put({
          ...currentCtx,
          claudeMarkdownOverride: docEditContent,
        });
      } else if (selectedDocName === "SCHEMA.md") {
        setEntidades(docEditContent);
        await db.proyecto_contexto.put({
          ...currentCtx,
          entidades: docEditContent,
        });
      } else if (selectedDocName === "REQUERIMIENTOS.md") {
        const parts = docEditContent.split("## Requisitos No Funcionales");
        const func = parts[0]
          .replace("# REQUISITOS", "")
          .replace("## Requisitos Funcionales", "")
          .trim();
        const noFunc = parts[1] ? parts[1].trim() : "";
        setRequisitosFuncionales(func);
        setRequisitosNoFuncionales(noFunc);
        await db.proyecto_contexto.put({
          ...currentCtx,
          requisitosFuncionales: func,
          requisitosNoFuncionales: noFunc,
          requerimientosMarkdownOverride: docEditContent,
        });
      } else if (selectedDocName === "DESIGN.md") {
        const currentDs = (await db.proyecto_design_system.get(proyectoId)) || {
          proyectoId,
        };
        await db.proyecto_design_system.put({
          ...currentDs,
          designSystemMarkdown: docEditContent,
        });
      } else if (selectedDocName === "SITEMAP.md") {
        setSitemapSystemMarkdown(docEditContent);
        await db.proyecto_contexto.put({
          ...currentCtx,
          sitemapSystemMarkdown: docEditContent,
        });
      } else if (selectedDocName === "ROLES.md") {
        setRolesMarkdown(docEditContent);
        await db.proyecto_contexto.put({
          ...currentCtx,
          rolesMarkdown: docEditContent,
        });
      } else if (selectedDocName === "SEED.md") {
        setSeedMarkdown(docEditContent);
        await db.proyecto_contexto.put({
          ...currentCtx,
          seedMarkdown: docEditContent,
        });
      } else if (selectedDocName === "ERRORS.md") {
        setErroresMarkdown(docEditContent);
        await db.proyecto_contexto.put({
          ...currentCtx,
          erroresMarkdown: docEditContent,
        });
      }
      mostrarToast(`¡Archivo ${selectedDocName} guardado con éxito!`, "exito");
    } catch (err: any) {
      mostrarToast(`Error al guardar cambios: ${err.message}`, "error");
    }
  };

  const descargarZipDocumentos = async () => {
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const claude = contexto?.claudeMarkdownOverride || generarClaudeMd(true);
      const schema = entidades || generarSchemaMd();
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

      zip.file("CLAUDE.md", claude);

      const docsFolder = zip.folder("docs");
      if (docsFolder) {
        docsFolder.file("SCHEMA.md", schema);
        docsFolder.file(
          `REQUERIMIENTOS_${String(proyecto?.nombre || "PROYECTO")
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "_")}.md`,
          reqs
        );
        docsFolder.file("DESIGN.md", design);
        docsFolder.file("SITEMAP.md", sitemapContent);
        docsFolder.file("ROLES.md", rolesContent);
        docsFolder.file("SEED.md", seedContent);
        docsFolder.file("ERRORS.md", errorsContent);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `documentacion_${proyecto?.nombre || "proyecto"}.zip`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      mostrarToast("¡ZIP de documentación descargado con éxito!", "exito");
    } catch (err: any) {
      mostrarToast(`Error al generar ZIP: ${err.message}`, "error");
    }
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
          <button
            onClick={descargarZipDocumentos}
            className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
          >
            📦 Descargar .zip
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
          1. Requisitos
        </button>
        <button
          onClick={() => setActiveTab("sitemap")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTab === "sitemap"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          2. Sitemap & Rutas
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTab === "roles"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          3. Roles & Seguridad
        </button>
        <button
          onClick={() => setActiveTab("errores")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTab === "errores"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          3.1. Errores de Negocio
        </button>
        <button
          onClick={() => setActiveTab("seeds")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTab === "seeds"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          3.2. Estrategia de Seeds
        </button>
        <button
          onClick={() => setActiveTab("entidades")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTab === "entidades"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          4. Entidades (3FN)
        </button>
        <button
          onClick={() => setActiveTab("importador")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTab === "importador"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          5. Importador JSON
        </button>
        <button
          onClick={() => setActiveTab("descargas")}
          className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-bold uppercase transition-all ${
            activeTab === "descargas"
              ? "bg-emerald-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          }`}
        >
          6. Docs Dashboard
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

      {/* Tab: Sitemap & Secciones */}
      {activeTab === "sitemap" && (
        <div className="flex flex-col gap-5">
          {/* Sitemap Mode Selector */}
          <div className="flex gap-2 rounded-xl border border-zinc-900 bg-zinc-950/40 p-2">
            <button
              type="button"
              onClick={() => setSitemapMode("sistema")}
              className={`flex-1 rounded py-1.5 font-mono text-[9px] font-bold uppercase transition-all ${
                sitemapMode === "sistema"
                  ? "bg-sky-500 font-black text-zinc-950 shadow"
                  : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Estructura de Rutas del Sistema (Next.js SaaS)
            </button>
            <button
              type="button"
              onClick={() => setSitemapMode("landing")}
              className={`flex-1 rounded py-1.5 font-mono text-[9px] font-bold uppercase transition-all ${
                sitemapMode === "landing"
                  ? "bg-sky-500 font-black text-zinc-950 shadow"
                  : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Secciones Visuales Landing Page
            </button>
          </div>

          {sitemapMode === "sistema" ? (
            <div className="flex flex-col gap-4">
              {/* Prompt Generator Banner for System Sitemap */}
              <div className="flex items-start justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
                <div>
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Generador de Sitemap del Sistema / SaaS (Rutas & Navegación)
                  </span>
                  <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
                    Copia el prompt estructurado para que la IA diseñe el
                    sitemap completo de rutas del software, mapeo de roles y
                    accesos por ruta.
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(PROMPT_SITEMAP_SISTEMA);
                    mostrarToast(
                      "Prompt de Sitemap del Sistema copiado.",
                      "exito"
                    );
                  }}
                  className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
                >
                  📋 Copiar Prompt IA
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
                  Especificación de Rutas del Sistema (SITEMAP.md)
                </label>
                <textarea
                  value={sitemapSystemMarkdown}
                  onChange={(e) => setSitemapSystemMarkdown(e.target.value)}
                  placeholder="Pega aquí la especificación Markdown del sitemap del sistema (rutas Next.js App Router)..."
                  rows={15}
                  className="border-zinc-850 w-full rounded border bg-zinc-950 p-3 font-mono text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Prompt Generator Banner */}
              <div className="flex items-start justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
                <div>
                  <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                    Generador de Sitemap por Secciones con IA ({"{{SECCION}}"})
                  </span>
                  <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
                    Copia el prompt estructurado para pasarle a la IA el
                    Relevamiento + Copywriting de Marca + Inspiración Visual. La
                    IA te devolverá los bloques etiquetados con{" "}
                    {"{{NOMBRE}} ... {{/NOMBRE}}"}.
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
                    Marcado Rápido con Etiquetas ({"{{HERO}}"})
                  </span>
                  <span className="font-mono text-[8px] text-zinc-500">
                    Formato:{" "}
                    {"{{SECCION}} Descripción de la sección {{/SECCION}}"}
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
                  ⚡ Procesar Marcado {"{{SECCION}}"}
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
                      No hay secciones definidas aún. Copia el prompt para la
                      IA, pega el marcado con etiquetas o presiona &quot;+
                      Agregar Sección Manual&quot;.
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
                              {"{{"}
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
                              {"}}"}
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
        </div>
      )}

      {/* Tab: Roles y Seguridad */}
      {activeTab === "roles" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
            <div>
              <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                Definición de Roles de Usuario y Seguridad (ROLES.md)
              </span>
              <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
                Diseña y estructura los roles del sistema, accesos por módulo y
                políticas Supabase RLS.
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(PROMPT_ROLES);
                mostrarToast(
                  "Prompt de Roles y Seguridad copiado al portapapeles.",
                  "exito"
                );
              }}
              className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
            >
              📋 Copiar Prompt IA Roles
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              Roles y Reglas de Seguridad (ROLES.md)
            </label>
            <textarea
              value={rolesMarkdown}
              onChange={(e) => setRolesMarkdown(e.target.value)}
              placeholder="Pega aquí la especificación de roles y permisos devuelta por la IA..."
              rows={15}
              className="border-zinc-850 w-full rounded border bg-zinc-950 p-3 font-mono text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Tab: Errores de Negocio */}
      {activeTab === "errores" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
            <div>
              <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                Diccionario de Errores de Negocio (ERRORS.md)
              </span>
              <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
                Copia el prompt para diseñar los códigos de error
                estandarizados, mensajes amigables y códigos HTTP.
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(PROMPT_DICCIONARIO_ERRORES);
                mostrarToast(
                  "Prompt de Diccionario de Errores copiado.",
                  "exito"
                );
              }}
              className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
            >
              📋 Copiar Prompt Errores
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              Códigos de Error & Diccionario (ERRORS.md)
            </label>
            <textarea
              value={erroresMarkdown}
              onChange={(e) => setErroresMarkdown(e.target.value)}
              placeholder="Pega aquí el diccionario de errores devuelto por la IA..."
              rows={15}
              className="border-zinc-850 w-full rounded border bg-zinc-950 p-3 font-mono text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Tab: Estrategia de Seeds */}
      {activeTab === "seeds" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between rounded-xl border border-zinc-900 bg-zinc-950 p-3">
            <div>
              <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase">
                Planificación de Datos Semilla (SEED.md)
              </span>
              <p className="mt-0.5 font-mono text-[9px] text-zinc-500">
                Diseña la estrategia de volumen de pruebas desafiantes para
                filtros, paginación y test de estrés.
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(PROMPT_SEED_DATA);
                mostrarToast(
                  "Prompt de Estrategia de Datos Semilla copiado.",
                  "exito"
                );
              }}
              className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[9px] font-bold text-emerald-400 uppercase hover:bg-emerald-500/20"
            >
              📋 Copiar Prompt Seeds
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[9px] font-bold text-zinc-400 uppercase">
              Estrategia y Scripts Fixtures (SEED.md)
            </label>
            <textarea
              value={seedMarkdown}
              onChange={(e) => setSeedMarkdown(e.target.value)}
              placeholder="Pega aquí el plan y código de siembra devuelto por la IA..."
              rows={15}
              className="border-zinc-850 w-full rounded border bg-zinc-950 p-3 font-mono text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
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
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-900 bg-zinc-950 p-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              {/* Import Box */}
              <div className="flex flex-col gap-2 md:col-span-6">
                <span className="text-zinc-450 mb-1 block font-mono text-[8px] font-bold uppercase">
                  📥 Importador de Criterios (JSON)
                </span>
                <textarea
                  value={criteriosJson}
                  onChange={(e) => setCriteriosJson(e.target.value)}
                  placeholder="Pega aquí el JSON de criterios de aceptación..."
                  rows={6}
                  className="border-zinc-850 text-zinc-350 w-full rounded border bg-zinc-900 p-2 font-mono text-[9px] outline-none focus:border-emerald-500/30"
                />
                <button
                  onClick={handleImportarCriterios}
                  className="self-end rounded bg-emerald-500 px-3 py-1.5 font-mono text-[9px] font-bold text-zinc-950 uppercase shadow-sm transition-all hover:bg-emerald-400"
                >
                  Procesar y Vincular Criterios
                </button>
              </div>

              {/* Visualizer list */}
              <div className="flex flex-col gap-2 border-t border-zinc-900 pt-4 md:col-span-6 md:border-t-0 md:border-l md:pt-0 md:pl-4">
                <span className="text-zinc-450 mb-1 block font-mono text-[8px] font-bold uppercase">
                  🔍 Visualizador de Criterios Vinculados
                </span>

                {(() => {
                  const listToShow = (tareasConCriterios || []) as any[];
                  if (listToShow.length === 0) {
                    return (
                      <div className="rounded border border-zinc-900/60 bg-zinc-900/10 py-8 text-center font-mono text-[9px] text-zinc-500">
                        Aún no hay criterios vinculados. Pega el JSON a la
                        izquierda para procesar.
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-2">
                      <div className="flex max-h-[140px] flex-col gap-1 overflow-y-auto rounded border border-zinc-900 bg-zinc-900/20 p-1.5 pr-1">
                        {listToShow.map((t) => {
                          const isSelected = selectedAuditTareaId === t.id;
                          const listSize = Array.isArray(t.criteriosAceptacion)
                            ? t.criteriosAceptacion.length
                            : 1;
                          return (
                            <button
                              key={t.id}
                              onClick={() =>
                                setSelectedAuditTareaId(
                                  isSelected ? null : t.id
                                )
                              }
                              className={`flex w-full items-center justify-between gap-2 rounded border p-1.5 text-left font-mono text-[8px] transition-all ${
                                isSelected
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                  : "text-zinc-350 border-zinc-800/40 bg-zinc-900/40 hover:bg-zinc-900/80"
                              }`}
                            >
                              <span className="flex-1 truncate">
                                {t.titulo}
                              </span>
                              <span className="shrink-0 rounded border border-zinc-800 bg-zinc-900/80 px-1 py-0.5 font-bold text-zinc-400">
                                📋 {listSize}{" "}
                                {listSize === 1 ? "criterio" : "criterios"}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Selected task criteria list detail view */}
                      {(() => {
                        if (!selectedAuditTareaId) return null;
                        const activeT = listToShow.find(
                          (t) => t.id === selectedAuditTareaId
                        );
                        if (!activeT) return null;

                        let criteriaArr: string[] = [];
                        if (Array.isArray(activeT.criteriosAceptacion)) {
                          criteriaArr = activeT.criteriosAceptacion;
                        } else if (
                          typeof activeT.criterioAceptacion === "string"
                        ) {
                          criteriaArr = [activeT.criterioAceptacion];
                        }

                        return (
                          <div className="mt-1 max-h-[150px] overflow-y-auto rounded border border-emerald-500/10 bg-emerald-500/5 p-2.5 pr-1">
                            <span className="mb-1 block text-[8px] font-bold text-emerald-400 uppercase">
                              Criterios para: {activeT.titulo}
                            </span>
                            <ul className="flex list-disc flex-col gap-1 pl-3 font-mono text-[9px] text-zinc-300">
                              {criteriaArr.map((crit, idx) => (
                                <li key={idx} className="leading-normal">
                                  {crit}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            </div>
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
          {/* Docs Dashboard - Centro de Descargas Grid */}
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: "CLAUDE.md",
                desc: "Reglas de inducción, arquitectura y estándares para inicializar la IA.",
                status: true,
                onDownload: descargarClaudeMdCompleto,
              },
              {
                name: "SCHEMA.md",
                desc: "Esquema completo y tablas de base de datos en 3FN.",
                status: !!entidades?.trim(),
                onDownload: descargarSchemaMd,
              },
              {
                name: "REQUERIMIENTOS.md",
                desc: "Especificación completa de requisitos funcionales y no funcionales.",
                status: !!(
                  requisitosFuncionales?.trim() ||
                  requisitosNoFuncionales?.trim()
                ),
                onDownload: descargarRequerimientosMd,
              },
              {
                name: "DESIGN.md",
                desc: "Reglas de estilo, tokens, paletas de colores y tipografía.",
                status: !!ds?.designSystemMarkdown?.trim(),
                onDownload: descargarDesignMd,
              },
              {
                name: "SITEMAP.md",
                desc: "Rutas de la aplicación (Next.js App Router) y accesos.",
                status: !!(
                  sitemapSystemMarkdown?.trim() ||
                  sitemapMarkup?.trim() ||
                  sitemap?.trim()
                ),
                onDownload: descargarSitemapMd,
              },
              {
                name: "ROLES.md",
                desc: "Políticas Supabase RLS y matriz de accesos de usuarios.",
                status: !!rolesMarkdown?.trim(),
                onDownload: descargarRolesMd,
              },
              {
                name: "SEED.md",
                desc: "Estrategia de datos de prueba desafiantes y volumen de siembra.",
                status: !!seedMarkdown?.trim(),
                onDownload: descargarSeedMd,
              },
              {
                name: "ERRORS.md",
                desc: "Diccionario unificado de excepciones de negocio y códigos HTTP.",
                status: !!erroresMarkdown?.trim(),
                onDownload: descargarErrorsMd,
              },
            ].map((doc) => {
              const isSelected = selectedDocName === doc.name;
              return (
                <div
                  key={doc.name}
                  onClick={() => selectDocumentForEdit(doc.name)}
                  className={`flex cursor-pointer flex-col justify-between gap-3 rounded-xl border p-3.5 font-mono transition-all hover:bg-zinc-900/40 ${
                    isSelected
                      ? "border-emerald-500 bg-zinc-900/60 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                      : "border-zinc-900 bg-zinc-950/60 hover:border-zinc-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          isSelected ? "text-emerald-400" : "text-zinc-100"
                        }`}
                      >
                        {doc.name}
                      </span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[8px] font-bold ${
                          doc.status
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {doc.status ? "🟢 Armado" : "🟡 Pendiente"}
                      </span>
                    </div>
                    <p className="text-zinc-550 mt-2 text-[8px] leading-relaxed">
                      {doc.desc}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      doc.onDownload();
                    }}
                    className="w-full rounded border border-zinc-800 bg-zinc-900/60 py-1.5 text-center text-[8px] font-bold text-zinc-300 uppercase transition-all hover:bg-zinc-900 hover:text-zinc-100"
                  >
                    📥 Descargar
                  </button>
                </div>
              );
            })}
          </div>

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

          {/* Interactive Document Editor Workspace */}
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-900 bg-zinc-950 p-4 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2A2E] pb-3">
              <div>
                <span className="text-[10px] font-bold text-zinc-100 uppercase">
                  📝 Editor Interactivo: {selectedDocName}
                </span>
                <p className="text-zinc-550 mt-0.5 text-[9px]">
                  Modifica y guarda los cambios de {selectedDocName}{" "}
                  directamente en el proyecto.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(docEditContent);
                    mostrarToast(
                      `Contenido de ${selectedDocName} copiado al portapapeles.`,
                      "exito"
                    );
                  }}
                  className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-[9px] font-bold text-zinc-300 uppercase transition-all hover:bg-zinc-900"
                >
                  📋 Copiar
                </button>
                <button
                  onClick={handleSaveSelectedDoc}
                  className="rounded bg-emerald-500 px-4 py-1.5 text-[9px] font-bold text-zinc-950 uppercase transition-all hover:bg-emerald-400"
                >
                  💾 Guardar Cambios
                </button>
              </div>
            </div>

            <textarea
              value={docEditContent}
              onChange={(e) => setDocEditContent(e.target.value)}
              rows={16}
              placeholder={`Contenido del archivo ${selectedDocName}...`}
              className="border-zinc-850 w-full rounded border bg-zinc-900/50 p-3 font-mono text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}
    </Card>
  );
};
