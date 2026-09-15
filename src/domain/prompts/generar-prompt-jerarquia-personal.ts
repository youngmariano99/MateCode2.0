/**
 * Prompts de "armar la jerarquía con IA" — Área→Objetivo→Proyecto→
 * Entregable→Actividad. Mismo estilo XML-tag que generar-prompt-
 * planificacion-personal.ts (<rol>/<contexto>/<instrucciones>/
 * <output_requerido>), mismo criterio de preguntar antes de generar. Cada
 * prompt mete en <contexto> el título y las restricciones del nivel padre
 * (si aplica) para que la IA nunca proponga algo fuera de escala o sin
 * padre — ver planificacion-jerarquica.entity.ts para los schemas que
 * validan la respuesta.
 */

const NOTA_RECURRENCIA = `Si el Entregable es algo que se repite (ej. "Contacto en frío, todos los días hábiles hasta llegar a la meta"), agregale "recurrencia": { "frecuencia": "diaria" | "dias_especificos", "diasSemana": [0-6, 0=domingo] } — no hace falta repetir "actividades" cada semana, el sistema las genera solo cada día que corresponda. Si es puntual (una sola vez), no pongas "recurrencia".`;

const INSTRUCCION_PREGUNTAR = `Antes de generar el JSON final, hacé todas las preguntas que necesites para no inventar nada: fechas, cantidades, si algo es recurrente o puntual. Esperá mi respuesta a cada pregunta. NO generes el JSON hasta que confirme que ya tenés todo lo necesario.`;

/** Árbol completo: Área (nueva o existente) → Objetivo(s) → Proyecto(s) → Entregable(s) → Actividad(es), todo en un JSON. */
export function generarPromptArbolCompleto(
  resumenHistorico: string,
  areasExistentes: string[]
): string {
  const areasTexto =
    areasExistentes.length > 0
      ? areasExistentes.join(", ")
      : "sin áreas todavía";
  return `<rol>
Actúa como asistente de planificación personal, ayudando a armar una jerarquía completa: Área → Objetivo → Proyecto → Entregable → Actividad, de largo a corto plazo.
</rol>

<contexto_lo_hecho_hasta_ahora>
${resumenHistorico}
</contexto_lo_hecho_hasta_ahora>

<areas_existentes>
${areasTexto}
</areas_existentes>

<como_funciona_la_jerarquia>
- Área: el paraguas (ej. "Freelancer", "Salud"). Si el nombre coincide EXACTO con una de las áreas existentes, se reusa esa área — si no, se crea una nueva.
- Objetivo: largo plazo (meses/año). SMART: cantidad + unidad + fecha límite obligatorias.
- Proyecto: mediano plazo (~un mes), hijo de un Objetivo. Cantidad/unidad opcionales.
- Entregable: corto plazo (~una semana), hijo de un Proyecto. ${NOTA_RECURRENCIA}
- Actividad: día a día, hijo de un Entregable. Si el Entregable es recurrente, NO hace falta declarar actividades — se generan solas.
</como_funciona_la_jerarquia>

<instrucciones>
${INSTRUCCION_PREGUNTAR} Preguntame primero qué Área es, y si es una de las existentes o una nueva.
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "areaTitulo": "...",
  "objetivosNuevos": [
    {
      "titulo": "...", "unidad": "...", "cantidadObjetivo": 5, "diaLimite": "YYYY-MM-DD",
      "proyectos": [
        {
          "titulo": "...", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 120, "unidad": "horas",
          "entregables": [
            {
              "titulo": "...", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 200, "unidad": "contactos",
              "recurrencia": { "frecuencia": "dias_especificos", "diasSemana": [1,2,3,4,5] },
              "actividades": []
            },
            {
              "titulo": "...", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 8, "unidad": "pantallas",
              "actividades": [
                { "tipo": "enfoque" | "mantenimiento", "descripcion": "...", "diaTarea": "YYYY-MM-DD" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
Nota: "proyectos", "entregables", "actividades" pueden quedar vacíos ([]) si solo querés armar hasta ese nivel por ahora.
</output_requerido>`;
}

/** Solo un Objetivo (mismo formato que el árbol completo, sin nivel de Proyecto). */
export function generarPromptObjetivo(
  resumenHistorico: string,
  areasExistentes: string[]
): string {
  const areasTexto =
    areasExistentes.length > 0
      ? areasExistentes.join(", ")
      : "sin áreas todavía";
  return `<rol>
Actúa como asistente de planificación personal, ayudando a definir un nuevo Objetivo de largo plazo.
</rol>

<contexto_lo_hecho_hasta_ahora>
${resumenHistorico}
</contexto_lo_hecho_hasta_ahora>

<areas_existentes>
${areasTexto}
</areas_existentes>

<instrucciones>
Un Objetivo es SMART: cantidad + unidad + fecha límite obligatorias, y pertenece a un Área (existente o nueva). ${INSTRUCCION_PREGUNTAR}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "areaTitulo": "...",
  "objetivosNuevos": [
    { "titulo": "...", "unidad": "...", "cantidadObjetivo": 5, "diaLimite": "YYYY-MM-DD", "proyectos": [] }
  ]
}
</output_requerido>`;
}

/** Proyecto(s) bajo un Objetivo YA EXISTENTE. */
export function generarPromptProyecto(
  objetivoTitulo: string,
  objetivoRestante: string
): string {
  return `<rol>
Actúa como asistente de planificación personal, ayudando a desglosar un Objetivo en Proyectos de mediano plazo (~un mes cada uno).
</rol>

<objetivo_padre>
Este/estos Proyecto(s) van a pertenecer al Objetivo "${objetivoTitulo}" (${objetivoRestante}). El título tiene que coincidir EXACTO con ese Objetivo para que se vinculen bien — no inventes otro objetivo.
</objetivo_padre>

<instrucciones>
Un Proyecto tiene fecha límite obligatoria; cantidad/unidad son opcionales (solo si tiene sentido cuantificarlo). ${NOTA_RECURRENCIA} ${INSTRUCCION_PREGUNTAR}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "objetivoTitulo": "${objetivoTitulo}",
  "proyectosNuevos": [
    {
      "titulo": "...", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 120, "unidad": "horas",
      "entregables": []
    }
  ]
}
</output_requerido>`;
}

/** Entregable(s) bajo un Proyecto YA EXISTENTE. */
export function generarPromptEntregable(
  proyectoTitulo: string,
  proyectoRestante: string
): string {
  return `<rol>
Actúa como asistente de planificación personal, ayudando a desglosar un Proyecto en Entregables de corto plazo (~una semana cada uno).
</rol>

<proyecto_padre>
Este/estos Entregable(s) van a pertenecer al Proyecto "${proyectoTitulo}" (${proyectoRestante}). El título tiene que coincidir EXACTO con ese Proyecto para que se vinculen bien — no inventes otro proyecto.
</proyecto_padre>

<instrucciones>
Un Entregable tiene fecha límite obligatoria; cantidad/unidad son opcionales. ${NOTA_RECURRENCIA} ${INSTRUCCION_PREGUNTAR}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "proyectoTitulo": "${proyectoTitulo}",
  "entregablesNuevos": [
    {
      "titulo": "...", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 200, "unidad": "contactos",
      "recurrencia": { "frecuencia": "dias_especificos", "diasSemana": [1,2,3,4,5] },
      "actividades": []
    }
  ]
}
</output_requerido>`;
}

/** Actividad(es) bajo un Entregable YA EXISTENTE — no aplica si el Entregable es recurrente (esas se generan solas). */
export function generarPromptActividades(
  entregableTitulo: string,
  entregableRestante: string
): string {
  return `<rol>
Actúa como asistente de planificación personal, ayudando a armar las actividades concretas de un Entregable puntual.
</rol>

<entregable_padre>
Esta/estas Actividad(es) van a pertenecer al Entregable "${entregableTitulo}" (${entregableRestante}). El título tiene que coincidir EXACTO con ese Entregable para que se vinculen bien — no inventes otro entregable. Si este Entregable es recurrente, NO hace falta este prompt: las actividades se generan solas cada día que corresponde.
</entregable_padre>

<instrucciones>
"enfoque" es como máximo 1 por día (lo más importante), "mantenimiento" hasta 3 por día — no propongas más de eso para un mismo día. ${INSTRUCCION_PREGUNTAR}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "entregableTitulo": "${entregableTitulo}",
  "actividadesNuevas": [
    { "tipo": "enfoque" | "mantenimiento", "descripcion": "...", "diaTarea": "YYYY-MM-DD" }
  ]
}
</output_requerido>`;
}
