/* eslint-disable @typescript-eslint/no-explicit-any */
// Generadores de prompt/documento puros usados por DesarrolloWorkspace —
// extraídos del componente para que este no cargue con ~350 líneas de
// construcción de strings sin JSX. Reciben todo por parámetro (nada de
// closures sobre estado de React) para poder testearse aislados.

export function generarClaudeMd(proyecto: any): string {
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
}

// Variante usada por PlanificacionIAWorkspace: igual a generarClaudeMd pero
// con una sección opcional de guía de comportamiento/handoff para IA.
export function generarClaudeMdConGuia(
  proyecto: any,
  incluirGuia = true
): string {
  let md = generarClaudeMd(proyecto);

  if (incluirGuia) {
    md += `\n## 6. Guía de Comportamiento e Instrucciones de Handoff\n`;
    md += `1. **Cero Placeholders:** Todos los componentes generados deben incluir el código completo listo para producción.\n`;
    md += `2. **Estructura Modular:** Sigue rigurosamente la arquitectura limpia y convenciones descritas.\n`;
    md += `3. **Flujo de Handoff:** Al finalizar una tarea, responde con el resumen técnico y el checklist auto-tildado en el formato JSON requerido.\n`;
  }

  return md;
}

export function generarPromptEstacion(
  proyecto: any,
  tareas: any[],
  historia: any,
  estacion: string,
  execution: any
): string {
  if (!proyecto) return "";

  const shortId = `hu-${historia.id.split("_").pop() || "hu"}`;
  const cleanTitle = historia.titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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
}
