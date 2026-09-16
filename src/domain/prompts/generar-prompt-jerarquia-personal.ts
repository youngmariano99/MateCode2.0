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

const NOTA_RECURRENCIA = `Si el Entregable es algo que se repite igual día tras día o semana tras semana (ej. "Contacto en frío, todos los días hábiles hasta llegar a la meta"), agregale "recurrencia": { "frecuencia": "diaria" | "dias_especificos", "diasSemana": [0-6, 0=domingo] } — no hace falta repetir "actividades" cada semana, el sistema las genera solo cada día que corresponda. Si es puntual (una sola vez), no pongas "recurrencia".

Importante — repetitivo vs. evolutivo: si la actividad se mantiene igual a lo largo del tiempo, es un solo Entregable recurrente (no crees uno nuevo por semana). Pero si en algún momento la naturaleza o la cantidad cambia (ej. "esta semana contacto 10 por día" pasa a "la próxima subo a 15 por día", o cambia el enfoque de la tarea), eso es una etapa nueva: creá un Entregable nuevo y aparte (con su propio rango de fechas y, si corresponde, su propia recurrencia) para esa etapa, en vez de forzar un solo Entregable estático a cubrir algo que progresa.

MUY IMPORTANTE — "cantidadObjetivo" en un Entregable recurrente es el TOTAL a acumular en todo el período, NUNCA la cuota de un solo día. Ejemplo: si el usuario quiere hacer 5 contactos por día, de Lunes a Viernes, durante 4 semanas, el "cantidadObjetivo" es 5×20=100 (el total), NO 5. Esto es crítico: el sistema deja de generar instancias nuevas en cuanto la suma de todos los días alcanza "cantidadObjetivo" — si ponés la cuota diaria en vez del total, el Entregable se da por cumplido y deja de aparecer casi al primer día bueno, arruinando la recurrencia. Siempre calculá el total vos mismo (cuota por día × días hábiles en el período) antes de escribir el JSON, y si la cuota diaria va a ir subiendo con el tiempo (progresión tipo pirámide, ej. "empiezo con 2 por día y subo 1 por semana hasta un tope de 10"), calculá el total sumando lo que corresponde a cada semana con su propia cuota — no multipliques la cuota final por todo el período.

Importante — sub-tareas del mismo día: si un procedimiento tiene partes distintas que se hacen el mismo día (ej. "buscar contactos a la mañana" y "escribirles a la tarde"), cada parte es su propio Entregable recurrente, con su propio título y su propia cantidadObjetivo — no las combines en un solo Entregable, porque el sistema solo genera UNA actividad por día por cada Entregable (con un único título fijo), y perderías la distinción entre las partes.`;

const NOTA_HABITO = `Antes de crear un Entregable recurrente, preguntate si en realidad es un Hábito: si lo que se describe NO tiene una meta final numérica a alcanzar y se sostiene indefinidamente en el tiempo sin fecha de corte real (ej. "caminar todos los días", "tomar agua", "meditar") — eso encaja mejor como Hábito (un módulo aparte de esta jerarquía, con seguimiento MIN/MED/MAX). Si notás que es este caso, avisá y preguntá si seguimos igual (creando el Entregable de todos modos, por alguna razón puntual) o si lo dejamos fuera de este árbol para cargarlo como Hábito en la pantalla correspondiente.`;

const NOTA_FASES = `Las Fases NO son un nivel nuevo de la jerarquía (sigue siendo Área → Objetivo → Proyecto → Entregable → Actividad) — son checkpoints OPCIONALES que cuelgan de un Entregable puntual, para partir su meta total en tramos con fecha propia (ej. semanales) y poder revisar cuánto se logró en cada uno. Van anidadas DENTRO del Entregable, en su propio campo "fases" (mismo lugar que "actividades") — nunca en un nivel aparte. Usalas cuando el usuario quiera ir revisando el avance por partes en vez de solo al final: cada Fase lleva título, orden (0, 1, 2...), fecha de inicio, fecha límite, y su propia cantidad objetivo (la porción de la meta total del Entregable que le toca a esa Fase — no repitas el total completo en cada una). Si no hace falta ese nivel de detalle, dejá "fases": [].`;

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

<fases_opcionales>
${NOTA_FASES}
</fases_opcionales>

<hijos_vs_habitos>
${NOTA_HABITO}
</hijos_vs_habitos>

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
              "actividades": [],
              "fases": [
                { "titulo": "Semana 1", "orden": 0, "diaInicio": "YYYY-MM-DD", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 10, "unidad": "contactos" }
              ]
            },
            {
              "titulo": "...", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 8, "unidad": "pantallas",
              "actividades": [
                { "tipo": "enfoque" | "mantenimiento", "descripcion": "...", "diaTarea": "YYYY-MM-DD" }
              ],
              "fases": []
            }
          ]
        }
      ]
    }
  ]
}
Nota: "proyectos", "entregables", "actividades" y "fases" pueden quedar vacíos ([]) si solo querés armar hasta ese nivel por ahora, o si ese Entregable no necesita checkpoints.
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
Un Proyecto tiene fecha límite obligatoria; cantidad/unidad son opcionales (solo si tiene sentido cuantificarlo). ${NOTA_RECURRENCIA} ${NOTA_HABITO} ${INSTRUCCION_PREGUNTAR}
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
Un Entregable tiene fecha límite obligatoria; cantidad/unidad son opcionales. ${NOTA_RECURRENCIA} ${NOTA_FASES} ${NOTA_HABITO} ${INSTRUCCION_PREGUNTAR}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "proyectoTitulo": "${proyectoTitulo}",
  "entregablesNuevos": [
    {
      "titulo": "...", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 200, "unidad": "contactos",
      "recurrencia": { "frecuencia": "dias_especificos", "diasSemana": [1,2,3,4,5] },
      "actividades": [],
      "fases": []
    }
  ]
}
</output_requerido>`;
}

/**
 * Ajuste asistido por IA (Sprint 21) — se le pasa TODO el contexto de un
 * Objetivo (armado por el caller: Proyectos/Entregables/Fases con
 * logrado/meta/faltante de cada uno) y se le pide de vuelta un JSON con los
 * cambios sugeridos, resueltos por TÍTULO EXACTO (nunca ids — la IA no los
 * conoce). Mismo criterio de vista previa antes de aplicar que el resto.
 */
export function generarPromptAjusteIA(contextoCompleto: string): string {
  return `<rol>
Actúa como asistente de planificación personal, ayudando a reajustar un plan que se desvió de lo esperado.
</rol>

<contexto_completo>
${contextoCompleto}
</contexto_completo>

<instrucciones>
Mirá qué está atrasado, qué se cumplió de más, y qué Fases quedaron con un faltante importante. Proponé ajustes concretos: estirar una fecha límite, subir o bajar una cantidad objetivo, o ambas — a nivel Objetivo, Proyecto, Entregable o Fase, el que corresponda. Cada ajuste tiene que decir CLARAMENTE a qué elemento aplica (por su título EXACTO, tal como aparece en el contexto de arriba) y por qué (el motivo). No inventes elementos nuevos, no cambies nada de lo que no tenga un motivo real para cambiar. ${INSTRUCCION_PREGUNTAR}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "ajustes": [
    {
      "nivel": "objetivo" | "proyecto" | "entregable" | "fase",
      "titulo": "...",
      "cantidadObjetivo": 120,
      "diaLimite": "YYYY-MM-DD",
      "motivo": "..."
    }
  ]
}
Nota: cada ajuste necesita al menos "cantidadObjetivo" o "diaLimite" (pueden ir los dos). No hace falta tocar todo — solo lo que realmente necesita un ajuste.
</output_requerido>`;
}

/** Fase(s) (checkpoints periódicos) bajo un Entregable YA EXISTENTE. */
export function generarPromptFases(
  entregableTitulo: string,
  entregableRestante: string
): string {
  return `<rol>
Actúa como asistente de planificación personal, ayudando a repartir la meta de un Entregable en Fases (checkpoints periódicos, ej. semanales o mensuales) con su propia meta cada una.
</rol>

<entregable_padre>
Estas Fases van a pertenecer al Entregable "${entregableTitulo}" (${entregableRestante}). El título tiene que coincidir EXACTO con ese Entregable para que se vinculen bien — no inventes otro entregable.
</entregable_padre>

<instrucciones>
Cada Fase tiene: título, orden (0, 1, 2...), fecha de inicio, fecha límite, cantidad objetivo PROPIA (no el total del Entregable — la parte que le toca a esa Fase) y unidad. Si la cuota va cambiando con el tiempo (ej. "empiezo en 2 por día y subo 1 por semana"), calculá vos la cantidad de cada Fase (días hábiles de esa Fase × la cuota que corresponde en ese momento) — no repitas el mismo número en todas. Opcionalmente, "bandaAceptable"/"bandaMejorable" (0-100, % de la meta de esa Fase) si el usuario quiere margen para no llegar al 100% y aun así avanzar. ${INSTRUCCION_PREGUNTAR}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "entregableTitulo": "${entregableTitulo}",
  "fasesNuevas": [
    {
      "titulo": "...", "orden": 0, "diaInicio": "YYYY-MM-DD", "diaLimite": "YYYY-MM-DD",
      "cantidadObjetivo": 10, "unidad": "contactos",
      "bandaAceptable": 80, "bandaMejorable": 60
    }
  ]
}
</output_requerido>`;
}

/**
 * Flujo guiado en 3 etapas obligatorias — pedido explícito del usuario: la
 * IA tiene que armar de a partes (primero cuantificar, después resolver el
 * CÓMO en Fases, recién ahí bajar a Proyecto/Entregable/Actividad), nunca
 * saltar directo al detalle. Incluye SIEMPRE el contexto completo (áreas,
 * objetivos activos, Fases abiertas/cerradas recientes) para que la IA no
 * proponga algo que ya existe o contradiga un cierre reciente.
 */
export function generarPromptPlanificacionEnFases(
  resumenHistorico: string,
  areasExistentes: string[],
  resumenFasesRecientes: string
): string {
  const areasTexto =
    areasExistentes.length > 0
      ? areasExistentes.join(", ")
      : "sin áreas todavía";
  return `<rol>
Actúa como asistente de planificación personal, ayudando a armar un plan completo de largo a corto plazo, EN ETAPAS — nunca saltes directo al detalle sin cerrar la etapa anterior.
</rol>

<contexto_lo_hecho_hasta_ahora>
${resumenHistorico}
</contexto_lo_hecho_hasta_ahora>

<areas_existentes>
${areasTexto}
</areas_existentes>

<fases_recientes>
${resumenFasesRecientes || "Sin Fases abiertas o cerradas recientes."}
</fases_recientes>

<como_funciona_la_jerarquia>
La jerarquía tiene 5 niveles fijos: Área → Objetivo → Proyecto → Entregable → Actividad. Las Fases NO son un nivel nuevo — son checkpoints opcionales que van DENTRO de un Entregable puntual (ver más abajo). Nunca pongas Proyecto o Entregable "dentro de" una Fase: es al revés, la Fase vive adentro del Entregable.
</como_funciona_la_jerarquia>

<fases_opcionales>
${NOTA_FASES}
</fases_opcionales>

<flujo_obligatorio>
Etapa 1 — Cuantificar: definí solo el/los Objetivo(s) SMART (cantidad + unidad + fecha límite). NO bajes a Proyecto/Entregable todavía. Confirmá conmigo que los números están bien antes de seguir.

Etapa 2 — El ritmo: para cada Objetivo, pensá en voz alta cómo se llega al total con el tiempo — constante (lo mismo cada semana) o progresivo (arrancar despacio e ir subiendo, tipo pirámide). No hace falta el detalle fino todavía, pero sí el reparto semana a semana (o mes a mes) de cuánto corresponde en cada tramo. Confirmá conmigo ese reparto antes de seguir — en la Etapa 3 se va a convertir directamente en las "fases" del Entregable que corresponda.

Etapa 3 — Estructura: recién acá bajá a Proyecto(s) → Entregable(s) → Actividad(es). El reparto que acordamos en la Etapa 2 va como "fases" ANIDADAS dentro del Entregable recurrente que corresponda (no como un nivel aparte). ${NOTA_RECURRENCIA}

${NOTA_HABITO}
</flujo_obligatorio>

<instrucciones>
${INSTRUCCION_PREGUNTAR} No generes NINGÚN JSON hasta terminar las 3 etapas — cada etapa se confirma en el chat antes de pasar a la siguiente. Al final se genera UN SOLO JSON con todo (objetivos, proyectos, entregables, actividades y fases juntos) — no hace falta pegar nada por separado.
</instrucciones>

<output_requerido>
Recién al final de la Etapa 3, cuando confirme que todo está listo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional) — TODO en un solo JSON, con "fases" anidadas dentro de cada Entregable que las necesite (el reparto que armamos en la Etapa 2, ya con números concretos por fase):
{
  "areaTitulo": "...",
  "objetivosNuevos": [
    {
      "titulo": "...", "unidad": "...", "cantidadObjetivo": 5, "diaLimite": "YYYY-MM-DD",
      "proyectos": [
        {
          "titulo": "...", "diaLimite": "YYYY-MM-DD",
          "entregables": [
            {
              "titulo": "...", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 200, "unidad": "contactos",
              "recurrencia": { "frecuencia": "dias_especificos", "diasSemana": [1,2,3,4,5] },
              "actividades": [],
              "fases": [
                { "titulo": "Semana 1", "orden": 0, "diaInicio": "YYYY-MM-DD", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 10, "unidad": "contactos" },
                { "titulo": "Semana 2", "orden": 1, "diaInicio": "YYYY-MM-DD", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 15, "unidad": "contactos" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
Nota: "fases" puede quedar vacío ([]) en los Entregables que no necesitan checkpoints — no es obligatorio en todos.
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
Como guía general, "enfoque" (lo más importante del día) ronda 1 por día y "mantenimiento" ronda 3 por día — tratá de organizar el trabajo cerca de esa cantidad para que un mismo día no termine con 10 actividades encima, pero no es un límite estricto: si genuinamente hace falta más para no dejar nada afuera, no te sientas limitado a esos números. ${INSTRUCCION_PREGUNTAR}
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
