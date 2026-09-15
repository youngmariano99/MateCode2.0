import type {
  HabitoDefinicion,
  HabitoRegistro,
} from "../entidades/habitos.entity";
import {
  calcularRitmoObjetivo,
  type ObjetivoCuantificable,
} from "../entidades/objetivo-cuantificable.entity";
import {
  MAX_TAREAS_ENFOQUE_POR_DIA,
  MAX_TAREAS_MANTENIMIENTO_POR_DIA,
  type TareaPendiente,
} from "../entidades/personal.entity";

const ETIQUETA_RITMO: Record<string, string> = {
  cumplido: "cumplido",
  vencido: "vencido",
  al_dia: "al día",
  atrasado: "atrasado",
  adelantado: "adelantado",
};

/**
 * Resumen histórico puro: cuánto se cumplió cada hábito/compromiso en el
 * período, y en qué ritmo real está cada objetivo activo — es el único
 * "contexto de lo hecho" que existe (no hay un log de avances de objetivo
 * día a día, solo el acumulado actual, que ya refleja el período completo
 * vía calcularRitmoObjetivo).
 */
export function generarResumenPeriodo(
  habitos: HabitoDefinicion[],
  registros: HabitoRegistro[],
  objetivos: ObjetivoCuantificable[],
  hoy: string
): string {
  let md = "";

  if (habitos.length > 0) {
    md += "### Compromisos/hábitos\n";
    for (const h of habitos) {
      const delHabito = registros.filter((r) => r.habitoId === h.id);
      const cumplidos = delHabito.filter(
        (r) => r.nivelEjecutado !== "NO_CUMPLIDO"
      ).length;
      md += `- ${h.nombre}: cumplido ${cumplidos}/${delHabito.length} días registrados en el período.\n`;
    }
    md += "\n";
  }

  if (objetivos.length > 0) {
    md += "### Objetivos activos\n";
    for (const o of objetivos) {
      const ritmo = calcularRitmoObjetivo(o, hoy);
      md += `- ${o.titulo}: ${o.progresoActual}/${o.cantidadObjetivo} ${o.unidad} — ritmo ${ETIQUETA_RITMO[ritmo.estado] || ritmo.estado}.\n`;
    }
    md += "\n";
  }

  if (!md) {
    md = "Sin compromisos ni objetivos activos todavía.\n";
  }

  return md;
}

/**
 * Prompt para armar la planificación de la semana (tareas del Búnker +
 * pendientes) — con el resumen histórico como contexto y la instrucción
 * explícita de preguntar antes de responder, para que no arme cualquier
 * cosa por su cuenta.
 */
export function generarPromptPlanSemanal(
  resumenHistorico: string,
  pendientesActuales: TareaPendiente[]
): string {
  const pendientesTexto =
    pendientesActuales.length > 0
      ? pendientesActuales
          .map((p) => `- ${p.descripcion} (${p.prioridad})`)
          .join("\n")
      : "Sin pendientes en el backlog general.";

  return `<rol>
Actúa como asistente de planificación personal, ayudando a armar la semana.
</rol>

<como_funciona_la_planificacion>
El sistema organiza el trabajo en 3 niveles distintos — es importante que entiendas la diferencia antes de preguntar, para ubicar cada cosa en el lugar correcto:

1. **Búnker del día** ("tareasDiarias" en el JSON de salida): cada día tiene un cupo FIJO y chico — como máximo ${MAX_TAREAS_ENFOQUE_POR_DIA} tarea de tipo "enfoque" (el foco profundo del día, lo más importante, a lo que le vas a dedicar el grueso del tiempo) y como máximo ${MAX_TAREAS_MANTENIMIENTO_POR_DIA} de tipo "mantenimiento" (tareas más chicas y rápidas). Es un límite DURO del sistema — no se puede cargar un 2do enfoque ni un 4to mantenimiento el mismo día, aunque quieras. Un día puede tener menos de esos cupos ocupados, nunca más.
2. **Pendientes / backlog general** ("pendientes" en el JSON): todo lo que hay que hacer esta semana pero NO entra en el cupo diario de arriba, va acá — sin día fijo, con prioridad (urgente / importante / puede_esperar). Este es el lugar correcto para: (a) cualquier tarea que sobre una vez llenado el cupo del Búnker de un día, (b) algo que puede llevar más de un día o no tiene sentido atarlo a una fecha exacta, (c) cosas que "hay que completar en algún momento de la semana" sin apuro puntual. No hay límite de cantidad acá — se resuelven a medida que hay lugar en el Búnker de los próximos días.
3. **Compromisos/hábitos recurrentes** (NO se crean ni se editan con este prompt — se gestionan aparte, en la pantalla de Hábitos): pueden ser "diarios" (todos los días, sin excepción) o de "días específicos" (ej. solo lunes/miércoles/viernes). Ya están reflejados en el contexto histórico de abajo. Si en la charla detectás que hace falta un compromiso nuevo o cambiar la frecuencia de uno existente, decímelo en tu respuesta de texto — no intentes meterlo en el JSON, ese formato no lo soporta.
</como_funciona_la_planificacion>

<contexto_lo_hecho_hasta_ahora>
${resumenHistorico}
</contexto_lo_hecho_hasta_ahora>

<pendientes_backlog_general>
${pendientesTexto}
</pendientes_backlog_general>

<instrucciones>
Antes de generar el JSON final, hacé todas las preguntas que necesites para entender bien la semana: para cada día, cuál es EL foco (máximo ${MAX_TAREAS_ENFOQUE_POR_DIA}) y qué mantenimiento chico entra (hasta ${MAX_TAREAS_MANTENIMIENTO_POR_DIA}); qué otras cosas de la semana no tienen día fijo o son más grandes (van como pendientes, no como tareasDiarias); si hay algo puntual (reunión, entrega, viaje); si algún hábito quedó atrasado y hay que ajustarlo. Esperá mi respuesta a cada pregunta. NO generes el JSON hasta que yo confirme que ya tenés todo lo necesario — no inventes tareas que no te haya confirmado, y no propongas más tareasDiarias por día de las que el cupo permite.
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "tareasDiarias": [
    { "diaTarea": "YYYY-MM-DD", "tipo": "enfoque" | "mantenimiento", "descripcion": "..." }
  ],
  "pendientes": [
    { "descripcion": "...", "prioridad": "urgente" | "importante" | "puede_esperar" }
  ]
}
Nota: para "tareasDiarias", nunca pongas más de ${MAX_TAREAS_ENFOQUE_POR_DIA} entrada "enfoque" ni más de ${MAX_TAREAS_MANTENIMIENTO_POR_DIA} "mantenimiento" para un mismo "diaTarea" — todo lo que exceda eso va en "pendientes".
</output_requerido>`;
}

/**
 * Prompt para (re)planificar objetivos y sus compromisos vinculados —
 * horizonte mensual, mismo criterio de preguntar antes de responder.
 */
export function generarPromptPlanObjetivos(
  resumenHistorico: string,
  objetivosActivos: ObjetivoCuantificable[],
  areasDisponibles: string[]
): string {
  const objetivosTexto =
    objetivosActivos.length > 0
      ? objetivosActivos
          .map((o) => `- ${o.titulo} (${o.unidad}, hasta ${o.diaLimite})`)
          .join("\n")
      : "Sin objetivos activos todavía.";
  const areasTexto =
    areasDisponibles.length > 0
      ? areasDisponibles.join(", ")
      : "sin áreas definidas todavía";

  return `<rol>
Actúa como asistente de planificación personal, ayudando a revisar y ajustar objetivos del mes.
</rol>

<contexto_lo_hecho_hasta_ahora>
${resumenHistorico}
</contexto_lo_hecho_hasta_ahora>

<objetivos_activos>
${objetivosTexto}
</objetivos_activos>

<areas_existentes>
${areasTexto}
</areas_existentes>

<instrucciones>
Antes de generar el JSON final, preguntame: qué objetivos nuevos quiero sumar este mes, si algún objetivo activo hay que ajustar (cantidad o fecha) dado el ritmo real que ves arriba, y a qué área pertenece cada uno. Esperá mi respuesta. NO generes el JSON hasta confirmar.
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "objetivosNuevos": [
    {
      "titulo": "...",
      "unidad": "...",
      "cantidadObjetivo": 200,
      "diaLimite": "YYYY-MM-DD",
      "etiquetaArea": "..."
    }
  ],
  "ajustes": [
    { "titulo": "Título EXACTO de un objetivo activo existente", "cantidadObjetivo": 150, "diaLimite": "YYYY-MM-DD" }
  ]
}
</output_requerido>`;
}
