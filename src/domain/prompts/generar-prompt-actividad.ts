/**
 * Generador puro del "prompt de enfoque" para una actividad técnica.
 * Extraído de desarrollo-workspace.tsx para que el mismo texto que arma el
 * sistema (sin gastar tokens de la IA en reconstruir contexto) pueda ser
 * reusado tanto por la UI (flujo manual) como por el runner de automatización
 * (Fase 2) — un solo lugar de verdad para el prompt, no dos implementaciones
 * que puedan divergir.
 */

export interface ActividadPromptData {
  id: string;
  titulo: string;
  rol?: string;
  componente?: string;
  ruta?: string;
  modulo?: string;
  historiaId?: string;
  pasos?: string[];
  criteriosAceptacion?: string[];
  seed?: { modelo?: string; volumen?: number; indicaciones?: string };
}

export interface IteracionPrompt {
  fecha: string;
  feedback: string;
}

export interface BugActivoPrompt {
  logs: string;
  comportamientoEsperado: string;
  comportamientoReal: string;
}

export interface GenerarPromptActividadInput {
  actividad: ActividadPromptData;
  proyectoNombre?: string;
  historiaPadre?: { titulo: string; prioridad: string };
  iteraciones?: IteracionPrompt[];
  bugActivo?: BugActivoPrompt;
  /**
   * Handoffs de tickets ya completados en el mismo sprint (archivos tocados +
   * firmas exportadas), para que un ticket hermano no rompa lo que otro ya
   * construyó. Se pasa como lista compacta, no como handoff completo, para no
   * inflar el prompt con prosa que la IA no necesita.
   */
  contextoSprintActual?: {
    ticket: string;
    archivos: string[];
    firmas: string[];
  }[];
  /** Máximo de líneas por archivo del proyecto (proyecto_config_automatizacion). Se repite en el prompt para que no se pierda en sesiones largas. */
  maxLineasPorArchivo?: number;
}

/**
 * Bloque de reglas duras, pensado para repetirse en CADA turno que se le
 * pida código al agente (desarrollo inicial, reintentos, fix de CI) — no solo
 * al principio. En sesiones largas el modelo deja de priorizar instrucciones
 * dadas muchos turnos atrás; repetirlo es la única forma confiable de que no
 * se "olvide" a mitad de ticket.
 */
export function bloqueEstandaresNoNegociables(
  maxLineasPorArchivo?: number
): string {
  return `<estandares_no_negociables>
Estas reglas son innegociables y aplican en TODO momento del desarrollo, no solo al empezar:
1. Los archivos de especificación del proyecto (CLAUDE.md y todo lo que exista en /docs: Backlog, Design, Errors, Requerimientos, Roles, Schema, SEED, Setup, Sitemap, Sprints) son la fuente de verdad — es OBLIGATORIO leerlos con tus herramientas antes de escribir la primera línea de código, no es opcional. Tenés PROHIBIDO tomar decisiones que los contradigan.
2. Si la planificación no cubre un caso puntual, podés completar el detalle faltante vos mismo, pero siempre a favor de lo ya definido en esos archivos y nunca comprometiendo la integridad del sistema o los datos de usuarios. Reportalo como "desvío del plan" igual.
3. Límite de líneas por archivo: ${maxLineasPorArchivo ?? "el configurado para este proyecto"}. Ningún archivo que crees o modifiques puede superarlo. Si un archivo se está acercando al límite, modularizalo DURANTE el desarrollo (dividiendo en archivos más chicos), no al final — corregirlo después cuesta más tokens que hacerlo bien desde el principio.
4. Seguridad de credenciales: prohibido hardcodear passwords, API keys, tokens o connection strings con credenciales reales en el código, incluso "de prueba". Usá variables de entorno y agregá la entrada correspondiente (con valor de ejemplo, nunca real) en ".env.example" para que el usuario cargue el valor real después.
5. Economía de tokens: reutilizá código/patrones ya existentes en el repo en vez de reescribirlos, y mantenete enfocado en el alcance del ticket — no refactorices ni "mejores" código que no forma parte de esta actividad.
6. Autoverificación: si tenés permitido ejecutar comandos en este repo (build, lint, tests), corrélos vos mismo ANTES de dar tu respuesta final y corregí lo que falle. Un fallo que detectás y arreglás vos ahora sale mucho más barato que uno que detecta el sistema después y te obliga a un reintento completo con todo el contexto de nuevo.
</estandares_no_negociables>`;
}

export function generarPromptActividadTicket({
  actividad,
  proyectoNombre,
  historiaPadre,
  iteraciones = [],
  bugActivo,
  contextoSprintActual = [],
  maxLineasPorArchivo,
}: GenerarPromptActividadInput): string {
  const storyTitle = historiaPadre ? historiaPadre.titulo : "General";
  const priority = historiaPadre ? historiaPadre.prioridad : "Media";

  const shortId = `act-${actividad.id.split("_").pop() || "act"}`;
  const cleanTitle = actividad.titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const branchName = `feature/mc-${shortId}-${cleanTitle}`;

  let iterationsStr = "";
  if (iteraciones.length > 0) {
    iterationsStr =
      "\n" +
      iteraciones
        .map(
          (it, idx) => `[Iteración ${idx + 1} - ${it.fecha}]: ${it.feedback}`
        )
        .join("\n") +
      "\n";
  }

  let bugsStr = "";
  if (bugActivo) {
    bugsStr = `\n<reporte_error_bug_activo>
  - Logs/Error de consola: ${bugActivo.logs}
  - Comportamiento esperado: ${bugActivo.comportamientoEsperado}
  - Comportamiento real: ${bugActivo.comportamientoReal}
  - Rama de depuración: bugfix/mc-bug-${shortId}
</reporte_error_bug_activo>\n`;
  }

  const stepsList = Array.isArray(actividad.pasos)
    ? actividad.pasos.map((p) => `  * [ ] ${p}`).join("\n")
    : "  * [ ] Implementar la funcionalidad técnica de la actividad.";

  const criteriaList = Array.isArray(actividad.criteriosAceptacion)
    ? actividad.criteriosAceptacion.map((c) => `  * ${c}`).join("\n")
    : "  * Confirmar funcionamiento y robustez de la lógica implementada.";

  let contextoSprintStr = "";
  if (contextoSprintActual.length > 0) {
    contextoSprintStr = `\n<contexto_sprint_actual>
Tickets ya completados en este sprint — no dupliques lo que ya existe y respetá las firmas ya exportadas:
${contextoSprintActual
  .map(
    (t) =>
      `  - ${t.ticket}: archivos [${t.archivos.join(", ")}]${
        t.firmas.length ? `, firmas [${t.firmas.join(", ")}]` : ""
      }`
  )
  .join("\n")}
</contexto_sprint_actual>\n`;
  }

  let prompt = `<role>
Actúa como un ${actividad.rol || "Desarrollador Fullstack"} de nivel Senior.
Tu objetivo es resolver el ticket de la actividad de manera ejecutiva, escribiendo código limpio, modular y listo para producción sin agregar introducciones, saludos ni disculpas.
</role>

<ticket_context>
  - Proyecto: ${proyectoNombre || "NODEXA CORE"}
  - Historia: ${storyTitle}
  - Prioridad: ${priority}
  - Actividad Actual: ${actividad.titulo}
  - Componente/Archivo: ${actividad.componente || "No especificado"}
  - Ruta de Destino: ${actividad.ruta || "No especificada"}
  - Módulo: ${actividad.modulo || "No especificado"}
  - Criterios de Aceptación: Ver detalle abajo en actividades_tecnicas.
  - Instrucción local: "Antes de escribir código, leé con tus herramientas CLAUDE.md y todo lo que exista en /docs de este repositorio (Backlog, Design, Errors, Requerimientos, Roles, Schema, SEED, Setup, Sitemap, Sprints). Es un paso obligatorio, no opcional — ver <estandares_no_negociables> abajo."
</ticket_context>
${bloqueEstandaresNoNegociables(maxLineasPorArchivo)}
${contextoSprintStr}
<handoff_estacion_anterior>
No hay handoff previo (estación inicial).
</handoff_estacion_anterior>

<errores_de_negocio>
Implementa y maneja el control de excepciones de negocio siguiendo estrictamente las definiciones y códigos estandarizados en el archivo local "ERRORS.md".
- Antes de emitir o manejar un error de BD/Permisos/Sistema (ej: códigos NX-PER-*, NX-SYS-*), LEER el archivo "ERRORS.md" en el repositorio para aplicar el código y mensaje exacto.
- Prohibido inventar códigos de error que no estén en dicho catálogo.
- Todo error visual en cliente debe respetar las directrices de diseño (sin alerts nativos del navegador, usando librerías UI del proyecto).
</errores_de_negocio>

<mantenimiento_equipo>
Trabajás como parte de un equipo donde cada ticket lo resuelve una sesión distinta (sin memoria entre sí) — estos archivos son la única forma en que "el próximo desarrollador" sabe lo que hiciste. Actualizalos vos mismo, directamente en el repo, como parte de tu trabajo (no alcanza con reportarlo solo en el JSON final):
- Si tu ticket introduce una convención nueva (patrón, decisión de arquitectura, endpoint importante), actualizá el archivo de documentación correspondiente (CLAUDE.md, SCHEMA.md, SITEMAP.md, ROLES.md, ERRORS.md, SEED.md, DESIGN.md) en el mismo commit.
- Si tomaste una decisión DISTINTA de lo que pedía el ticket porque la considerás mejor, agregá una entrada al final de "docs/DECISIONES.md" (creá el archivo con un título si no existe) con este formato:
  ## [fecha ISO] <título del ticket>
  **Pedía:** ...
  **Se hizo:** ...
  **Motivo:** ...
  Reportá lo mismo, textual, en el campo "desvios_del_plan" del JSON de salida — nunca uno sin el otro.
- Si el ticket requiere pasos para probar manualmente (endpoint nuevo, flujo de UI nuevo, etc.), creá un archivo en "docs/pruebas_testeos/" con nombre "N_NombreDescriptivo_Frontend.md" o "N_NombreDescriptivo_Backend.md" (usá ambos tags separados por guion si el ticket tiene las dos partes, ej. "_Frontend_Backend"). "N" es el próximo número correlativo: mirá los archivos ya existentes en esa carpeta para calcularlo (empezá en 1 si la carpeta no existe todavía). El contenido debe tener esta estructura exacta:
  # N. <Nombre de la funcionalidad> (Frontend|Backend)
  ## Prerequisitos
  - ...
  ## Pasos
  1. ...
  ## Resultado esperado
  - Mensaje visible: ...
  - Dónde verificar: ...
  - Código HTTP esperado: ...
  Además, agregá (o creá) una fila en "docs/pruebas_testeos/INDEX.md" con: número, nombre, tag Frontend/Backend, y el ticket al que corresponde — para poder testear un sprint completo mirando un solo archivo.
</mantenimiento_equipo>

<actividades_tecnicas>
Para cumplir con esta actividad, debes implementar o verificar los siguientes pasos de checklist y criterios específicos:

### Checklist de Pasos a Seguir:
${stepsList}

### Criterios de Aceptación Específicos:
${criteriaList}
</actividades_tecnicas>
`;

  if (actividad.seed && actividad.seed.modelo) {
    prompt += `\n<requerimiento_datos_semilla>
Para la siembra y pruebas volumétricas del sistema, genera scripts de datos semilla (Seed Data) correspondientes:
  - Modelo: "${actividad.seed.modelo}" (Volumen deseado: ${actividad.seed.volumen} registros)
  - Directrices: ${actividad.seed.indicaciones || "Generar datos de muestra realistas para simular estrés y probar filtros/paginaciones."}
Nota: La cantidad de registros a simular debe seguir los volúmenes indicados para probar adecuadamente paginaciones y límites del frontend.
</requerimiento_datos_semilla>\n`;
  }

  if (iterationsStr) {
    prompt += `\n<refinamientos_solicitados>${iterationsStr}</refinamientos_solicitados>\n`;
  }

  if (bugsStr) {
    prompt += `\n<instrucciones_correccion_error>
${bugsStr}
  Analiza la causa raíz del error reportado arriba y proporciona la corrección pertinente asegurando no romper contratos ni firmas previas.
</instrucciones_correccion_error>\n`;
  }

  prompt += `
<instrucciones_git>
  Trabaja y realiza los cambios sobre la rama "${branchName}".
</instrucciones_git>

<salida_requerida>
Devuelve el código limpio completo que deba ser creado o modificado.
Al final de tu respuesta, adjunta OBLIGATORIAMENTE un bloque JSON con esta estructura exacta para realizar el handoff. Si alguna sección no aplica, igual incluí la clave con un valor vacío ([] o ""), no la omitas:

\`\`\`json
{
  "handoff": {
    "archivos_creados_o_modificados": ["lista de archivos modificados"],
    "firmas_o_contratos_exportados": ["lista de firmas, endpoints o esquemas"],
    "resumen_tecnico": "breve descripción técnica de las decisiones tomadas, para otro desarrollador",
    "resumen_negocio": "explicación en 3-5 oraciones, SIN jerga técnica, de qué problema resolvió este ticket y qué puede hacer ahora el usuario final que antes no podía — como si se lo explicaras a un Product Owner",
    "guia_pruebas_manual": {
      "prerequisitos": ["ej: correr npm run dev", "ej: tener un usuario con rol X"],
      "pasos": ["paso 1 concreto con URL o botón exacto", "paso 2", "..."],
      "datosPrueba": "credenciales o datos de prueba a usar, si aplica",
      "resultadoEsperado": {
        "descripcion": "qué debería observar quien prueba si todo funciona bien",
        "mensajeVisible": "texto exacto que debería aparecer en pantalla, si aplica",
        "dondeVerificar": "en qué pantalla/URL se ve el resultado",
        "codigoHttpEsperado": 200
      }
    },
    "acciones_manuales_requeridas": [
      { "nivel": "moderada", "descripcion": "acción que NO bloquea seguir desarrollando pero hace falta para probar end-to-end (ej: cargar una credencial real)" },
      { "nivel": "critica", "descripcion": "acción que SÍ bloquea continuar (ej: falta una config sin la cual no se puede verificar objetivamente el ticket)" }
    ],
    "desvios_del_plan": [
      { "loQuePediaElTicket": "...", "loQueSeHizo": "...", "motivo": "..." }
    ],
    "archivo_prueba_creado": "docs/pruebas_testeos/N_Nombre_Backend.md (si creaste uno, sino omitir)"
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
Nota: "update_docs" es un respaldo por si no pudiste editar el archivo directamente vos mismo — si ya lo actualizaste en el repo (preferido, ver <mantenimiento_equipo>), no hace falta repetir el contenido acá.
</salida_requerida>`;
  return prompt;
}
