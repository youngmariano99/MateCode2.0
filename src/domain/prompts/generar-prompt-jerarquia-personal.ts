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

import { obtenerDiaTareaHoy } from "../entidades/personal.entity";

const NOMBRES_DIA_SEMANA = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

/** La IA no sabe qué día es hoy: sin esto no puede resolver "el lunes que viene" ni "las próximas 5 semanas". */
function bloqueFechaActual(): string {
  const hoy = obtenerDiaTareaHoy();
  const [a, m, d] = hoy.split("-").map(Number);
  const diaSemana = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `<fecha_actual>
Hoy es ${NOMBRES_DIA_SEMANA[diaSemana]} ${hoy} (formato YYYY-MM-DD). Usala para resolver "hoy", "mañana", "el lunes que viene", "las próximas 5 semanas", etc. Numeración de los días de la semana dentro del JSON: 0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado.
</fecha_actual>`;
}

const REGLA_SOLO_CREA =
  "- Esto solo CREA cosas nuevas: no edita ni borra nada de lo que ya existe. Si repetís algo que ya existe (mismo título bajo el mismo padre) el sistema lo reconoce y no lo duplica, pero tampoco le cambia los datos: para cambiar fechas o cantidades de algo existente se usa el ajuste. No incluyas nada que ya exista según el contexto.";
const REGLA_SOLO_AJUSTA =
  "- Esto solo AJUSTA fechas y cantidades de elementos que YA existen (por título exacto, tal como aparecen en el contexto): no crea ni borra nada. Cada ajuste lleva su motivo.";

const REGLAS_JSON = `<reglas_del_json>
- Devolvé UN solo objeto JSON válido, con EXACTAMENTE la estructura del <output_requerido> de ESTE prompt — no mezcles estructuras de otros prompts, no cambies los nombres de las claves, sin texto antes ni después y sin bloques de código (\`\`\`).
- Usá SOLO las claves del ejemplo. Las que no existan se descartan en silencio: un error de tipeo en "diasSemana", por ejemplo, haría que se ignore y se asuma lunes a viernes sin avisar.
- Los títulos de niveles que YA existen (Área, Objetivo, Proyecto, Entregable) tienen que coincidir EXACTO, letra por letra. Nunca inventes ids.
- Fechas siempre en formato YYYY-MM-DD, reales (nada de "31 de febrero"), con la fecha límite igual o posterior a la de inicio. Lo que cuelga de un padre tiene que caer dentro del rango de fechas de ese padre.
- Los números tienen que cerrar: las cantidades de los hijos suman la del padre (ej. 5 entregables de 40 para un proyecto de 200) — no repitas el total del padre en cada hijo. Misma unidad en toda la rama. Cantidades siempre positivas.
__REGLA_MODO__
- Si te falta un dato, preguntame; no lo inventes.
</reglas_del_json>`;

/** Inserta la fecha actual y las reglas comunes antes de las instrucciones — así ningún prompt puede quedar sin ellas. */
function conContextoComun(
  prompt: string,
  modo: "crear" | "ajustar" = "crear"
): string {
  const marca = "<instrucciones>";
  if (!prompt.includes(marca)) return prompt;
  return prompt.replace(
    marca,
    `${bloqueFechaActual()}\n\n${REGLAS_JSON.replace(
      "__REGLA_MODO__",
      modo === "crear" ? REGLA_SOLO_CREA : REGLA_SOLO_AJUSTA
    )}\n\n${marca}`
  );
}

const NOTA_REPARTO = `Metas numéricas repartidas en días (ej. "contactar 200 en frío, de lunes a viernes, hasta tal fecha"): NO uses "recurrencia" — usá "reparto" (dentro del Entregable, o dentro de una Fase): { "descripcion": "Contactar en frío", "tipo": "mantenimiento", "diasSemana": [1,2,3,4,5], "cantidadTotal": 40, "diaInicio": "YYYY-MM-DD", "diaLimite": "YYYY-MM-DD", "unidad": "contactos" }. El sistema genera UNA Actividad por día con su cantidad, repartiendo el total parejo entre los días elegidos sin perder ni inventar unidades (40 en 5 días = 8 por día) — vos NO escribas las actividades una por una ni hagas esa cuenta. Todo es opcional salvo "descripcion": si no ponés fechas, total o unidad, heredan las del Entregable (o de la Fase donde va). Cómo estructurarlo:
- Cuota CONSTANTE (lo mismo cada semana): Proyecto → Entregables (ej. uno por semana, cada uno con su porción del total: 200 en 5 semanas = 5 entregables de 40) y cada Entregable con su "reparto". No hacen falta Fases.
- Cuota PROGRESIVA (va subiendo, tipo pirámide): Proyecto → un Entregable con "fases" (cada Fase con su porción y sus fechas) y un "reparto" DENTRO de cada Fase.
- Sin cantidad numérica (hitos, ej. "terminar el módulo X"): Entregables con "actividades" puntuales (con "diaTarea"), sin reparto.
Una Actividad puntual también puede llevar "cantidadObjetivo" y "unidad" si se cuenta.`;

const NOTA_RECURRENCIA_SIMPLE = `Recurrencia — SOLO para tareas que se repiten sin una cantidad por día que importe registrar (ej. "revisar mails"); para metas numéricas usá "reparto" (ver arriba). Si el Entregable es algo que se repite igual día tras día o semana tras semana (ej. "Contacto en frío, todos los días hábiles hasta llegar a la meta"), agregale "recurrencia": { "frecuencia": "diaria" | "dias_especificos", "diasSemana": [0-6, 0=domingo] } — no hace falta repetir "actividades" cada semana, el sistema las genera solo cada día que corresponda. Si es puntual (una sola vez), no pongas "recurrencia".

Importante — repetitivo vs. evolutivo: si la actividad se mantiene igual a lo largo del tiempo, es un solo Entregable recurrente (no crees uno nuevo por semana). Pero si en algún momento la naturaleza o la cantidad cambia (ej. "esta semana contacto 10 por día" pasa a "la próxima subo a 15 por día", o cambia el enfoque de la tarea), eso es una etapa nueva: creá un Entregable nuevo y aparte (con su propio rango de fechas y, si corresponde, su propia recurrencia) para esa etapa, en vez de forzar un solo Entregable estático a cubrir algo que progresa.

MUY IMPORTANTE — "cantidadObjetivo" en un Entregable recurrente es el TOTAL a acumular en todo el período, NUNCA la cuota de un solo día. Ejemplo: si el usuario quiere hacer 5 contactos por día, de Lunes a Viernes, durante 4 semanas, el "cantidadObjetivo" es 5×20=100 (el total), NO 5. Esto es crítico: el sistema deja de generar instancias nuevas en cuanto la suma de todos los días alcanza "cantidadObjetivo" — si ponés la cuota diaria en vez del total, el Entregable se da por cumplido y deja de aparecer casi al primer día bueno, arruinando la recurrencia. Siempre calculá el total vos mismo (cuota por día × días hábiles en el período) antes de escribir el JSON, y si la cuota diaria va a ir subiendo con el tiempo (progresión tipo pirámide, ej. "empiezo con 2 por día y subo 1 por semana hasta un tope de 10"), calculá el total sumando lo que corresponde a cada semana con su propia cuota — no multipliques la cuota final por todo el período.

Importante — sub-tareas del mismo día: si un procedimiento tiene partes distintas que se hacen el mismo día (ej. "buscar contactos a la mañana" y "escribirles a la tarde"), cada parte es su propio Entregable recurrente, con su propio título y su propia cantidadObjetivo — no las combines en un solo Entregable, porque el sistema solo genera UNA actividad por día por cada Entregable (con un único título fijo), y perderías la distinción entre las partes.`;

const NOTA_RECURRENCIA = `${NOTA_REPARTO}

${NOTA_RECURRENCIA_SIMPLE}`;

const NOTA_HABITO = `Antes de crear un Entregable recurrente, preguntate si en realidad es un Hábito: si lo que se describe NO tiene una meta final numérica a alcanzar y se sostiene indefinidamente en el tiempo sin fecha de corte real (ej. "caminar todos los días", "tomar agua", "meditar") — eso encaja mejor como Hábito (un módulo aparte de esta jerarquía, con seguimiento MIN/MED/MAX). Si notás que es este caso, avisá y preguntá si seguimos igual (creando el Entregable de todos modos, por alguna razón puntual) o si lo dejamos fuera de este árbol para cargarlo como Hábito en la pantalla correspondiente.`;

const NOTA_FASES = `Las Fases NO son un nivel nuevo de la jerarquía (sigue siendo Área → Objetivo → Proyecto → Entregable → Actividad) — son checkpoints OPCIONALES que cuelgan de un Entregable puntual, para partir su meta total en tramos con fecha propia (ej. semanales) y poder revisar cuánto se logró en cada uno. Van anidadas DENTRO del Entregable, en su propio campo "fases" (mismo lugar que "actividades") — nunca en un nivel aparte. Usalas cuando el usuario quiera ir revisando el avance por partes en vez de solo al final: cada Fase lleva título, orden (0, 1, 2...), fecha de inicio, fecha límite, y su propia cantidad objetivo (la porción de la meta total del Entregable que le toca a esa Fase — no repitas el total completo en cada una). Si no hace falta ese nivel de detalle, dejá "fases": [].`;

const INSTRUCCION_PREGUNTAR = `Antes de generar el JSON final, hacé todas las preguntas que necesites para no inventar nada: fechas, cantidades, si algo es recurrente o puntual. Esperá mi respuesta a cada pregunta. NO generes el JSON hasta que confirme que ya tenés todo lo necesario.`;

const NOTA_UNA_AREA = `UN JSON = UNA SOLA ÁREA. "areaTitulo" es un único nombre y todo lo que cuelga del JSON pertenece a esa área. Si lo que pido abarca varias áreas (ej. Agencia y Salud), entregá un JSON POR ÁREA, cada uno en su propio bloque de código y con su "areaTitulo" exacto — nunca los mezcles ni unifiques áreas con nombres compuestos ("Agencia, Finanzas y Salud").`;

const NOTA_MINIMOS = `MÍNIMOS ACEPTABLES — todo nivel lleva un mínimo, para el día que no hay ganas de hacer el 100%. Se define con "bandaAceptable" (0-100: el % de su "cantidadObjetivo" que cuenta como mínimo aceptable) y, opcional, "bandaMejorable" (menor que la aceptable). Va en el Objetivo, el Proyecto, el Entregable y la Fase; y en el "reparto" la "bandaAceptable" es el mínimo de CADA DÍA (si falta, el reparto hereda la de su Fase/Entregable). Ejemplo: Objetivo 200 contactos con bandaAceptable 75 (mínimo 150) → mes de 50 con 60 (mínimo 30) → semana de 10 con 60 (mínimo 6) → día de 2 con 50 (mínimo 1). Preguntame qué mínimo quiero en cada nivel y proponé valores razonables. REGLA DE COHERENCIA: la suma de los mínimos de los tramos tiene que ser IGUAL O MAYOR al mínimo del total — si no, cumpliendo solo el mínimo de cada tramo nunca se llega al mínimo del total. Ej.: 20 semanas con mínimo 6 = 120, pero el mínimo del total es 150 → NO cierra: subí la bandaAceptable de los tramos (a 75) o bajá la del total. Verificalo en la tabla de control (columna "mínimo" y "suma de mínimos vs mínimo del total"). La aplicación después avisa sola cuando cumplir solo los mínimos diarios no alcanzaría para llegar al mínimo del período.`;

const NOTA_METAS_SIN_ACTIVIDADES = `METAS SIN ACTIVIDADES DIARIAS — si el usuario ya planifica su día a día en otra herramienta (ej. contenido en un planificador aparte, o desarrollo de proyectos), NO uses "reparto" ni "actividades": dejá "actividades": [] y expresá la meta con "fases" (tramos con su "cantidadObjetivo" y fechas, SIN reparto) o, si es una sola cantidad, con "cantidadObjetivo" en el Entregable y sin fases. La app muestra esas metas en la vista de la semana y del mes, y el usuario anota lo hecho con un botón "+1". Para una cuota que progresa por mes (ej. semana 1er mes: 3 videos; 2do mes: 4; 3er mes: 5), armá UNA Fase por tramo con semanas completas (lunes a domingo) y "cantidadObjetivo" = cuota semanal × cantidad de semanas del tramo; la app calcula sola cuánto toca por semana. Si se repite un patrón semanal fijo (ej. "Lunes: video, martes: post"), es un Entregable con "recurrencia" (aparece en el calendario los días que toca) y la cantidad va en el Entregable o sus Fases.`;

const NOTA_CONTROL_NUMEROS = `CONTROL DE NÚMEROS — antes de escribir el JSON, mostrame una tabla de control y esperá mi OK. No entregues nada que no cierre exacto:
1. Total: la suma de "cantidadObjetivo" de todas las Fases de un Entregable tiene que ser IGUAL a su "cantidadObjetivo".
2. Reparto entero: para cada Fase con "reparto", contá los días REALES entre "diaInicio" y "diaLimite" que caen en "diasSemana" y verificá que la cantidad se divida en enteros (cantidad ÷ días). Si no da entero (ej. 25 en 10 días = 2,5 por día), ajustá la cantidad al múltiplo más cercano y avisame el cambio; nunca dejes decimales.
3. Sin huecos ni solapes: la primera Fase empieza el "diaInicio" del Entregable, cada Fase empieza al día siguiente del "diaLimite" de la anterior, y la última termina el "diaLimite" del Entregable. Las semanas van de lunes a domingo.
4. Fechas: verificá que cada fecha caiga en el día de la semana que corresponde (0 = domingo … 6 = sábado) y que las fechas de un nivel estén dentro de las de su padre.
5. Sin inventar: si un dato no lo dije (fechas, cuotas, feriados a descontar), preguntalo. Metas en otra unidad que no se calcula desde los Entregables (pesos, clientes) las cargo yo a mano: NO inventes Entregables ni cuentas para "forzar" que coincidan, solo dejá el Objetivo con su cantidad y unidad.
6. Tabla de control (una fila por Fase): título · fechas · días que cuentan · cantidad · cantidad por día. Al final, la suma contra el total del Entregable.`;

/** Árbol completo: Área (nueva o existente) → Objetivo(s) → Proyecto(s) → Entregable(s) → Actividad(es), todo en un JSON. */
function construirPromptArbolCompleto(
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
- Actividad: día a día, hijo de un Entregable. Para metas numéricas, no las escribas una por una: usá "reparto" (ver arriba) y el sistema genera una por día con su cantidad.
</como_funciona_la_jerarquia>

<fases_opcionales>
${NOTA_FASES}
</fases_opcionales>

<hijos_vs_habitos>
${NOTA_HABITO}
</hijos_vs_habitos>

<instrucciones>
${INSTRUCCION_PREGUNTAR} Preguntame primero qué Área es, y si es una de las existentes o una nueva.

${NOTA_UNA_AREA}

${NOTA_MINIMOS}

${NOTA_METAS_SIN_ACTIVIDADES}

${NOTA_CONTROL_NUMEROS}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "areaTitulo": "...",
  "objetivosNuevos": [
    {
      "titulo": "...", "unidad": "...", "cantidadObjetivo": 5, "bandaAceptable": 75, "diaLimite": "YYYY-MM-DD",
      "proyectos": [
        {
          "titulo": "...", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 120, "unidad": "horas", "bandaAceptable": 70,
          "entregables": [
            {
              "titulo": "Contacto en frío — Semana 1", "diaInicio": "YYYY-MM-DD", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 40, "unidad": "contactos", "bandaAceptable": 60,
              "reparto": { "descripcion": "Contactar en frío", "tipo": "mantenimiento", "diasSemana": [1,2,3,4,5], "bandaAceptable": 50 },
              "actividades": [],
              "fases": []
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
function construirPromptObjetivo(
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
Un Objetivo es SMART: cantidad + unidad + fecha límite obligatorias, y pertenece a un Área (existente o nueva). ${NOTA_UNA_AREA} ${INSTRUCCION_PREGUNTAR}
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
function construirPromptProyecto(
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
function construirPromptEntregable(
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
      "titulo": "Semana 1", "diaInicio": "YYYY-MM-DD", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 40, "unidad": "contactos",
      "reparto": { "descripcion": "Contactar en frío", "tipo": "mantenimiento", "diasSemana": [1,2,3,4,5] },
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
function construirPromptAjusteIA(contextoCompleto: string): string {
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
function construirPromptFases(
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
Cada Fase tiene: título, orden (0, 1, 2...), fecha de inicio, fecha límite, cantidad objetivo PROPIA (no el total del Entregable — la parte que le toca a esa Fase) y unidad. Si la cuota va cambiando con el tiempo (ej. "empiezo en 2 por día y subo 1 por semana"), calculá vos la cantidad de cada Fase (días hábiles de esa Fase × la cuota que corresponde en ese momento) — no repitas el mismo número en todas. Opcionalmente, "bandaAceptable"/"bandaMejorable" (0-100, % de la meta de esa Fase) si el usuario quiere margen para no llegar al 100% y aun así avanzar. Opcionalmente, cada Fase puede llevar su "reparto" para que el sistema genere las actividades diarias de esa Fase con su cantidad: { "descripcion": "...", "tipo": "mantenimiento", "diasSemana": [1,2,3,4,5] } — hereda las fechas, la cantidad y la unidad de la propia Fase, así que no las repitas. La suma de las cantidades de todas las Fases tiene que ser igual a la meta del Entregable. ${NOTA_MINIMOS} ${INSTRUCCION_PREGUNTAR}

${NOTA_CONTROL_NUMEROS}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "entregableTitulo": "${entregableTitulo}",
  "fasesNuevas": [
    {
      "titulo": "...", "orden": 0, "diaInicio": "YYYY-MM-DD", "diaLimite": "YYYY-MM-DD",
      "cantidadObjetivo": 10, "unidad": "contactos",
      "bandaAceptable": 80, "bandaMejorable": 60,
      "reparto": { "descripcion": "Contactar en frío", "tipo": "mantenimiento", "diasSemana": [1,2,3,4,5] }
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
function construirPromptPlanificacionEnFases(
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

Etapa 3 — Estructura: recién acá bajá a Proyecto(s) → Entregable(s) → Actividad(es). Si el ritmo es CONSTANTE, armá Entregables (ej. uno por semana) cada uno con su "reparto", sin Fases. Si es PROGRESIVO, el reparto que acordamos en la Etapa 2 va como "fases" ANIDADAS dentro del Entregable que corresponda (no como un nivel aparte), y cada Fase lleva su propio "reparto". ${NOTA_RECURRENCIA}

${NOTA_HABITO}
</flujo_obligatorio>

<instrucciones>
${INSTRUCCION_PREGUNTAR} No generes NINGÚN JSON hasta terminar las 3 etapas — cada etapa se confirma en el chat antes de pasar a la siguiente. Al final se genera UN SOLO JSON POR ÁREA con todo (objetivos, proyectos, entregables, actividades y fases juntos) — no hace falta pegar nada por separado.

${NOTA_UNA_AREA}

${NOTA_MINIMOS}

${NOTA_METAS_SIN_ACTIVIDADES}

${NOTA_CONTROL_NUMEROS}
</instrucciones>

<output_requerido>
Recién al final de la Etapa 3, cuando confirme que todo está listo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional) — TODO en un solo JSON, con "fases" anidadas dentro de cada Entregable que las necesite (el reparto que armamos en la Etapa 2, ya con números concretos por fase):
{
  "areaTitulo": "...",
  "objetivosNuevos": [
    {
      "titulo": "...", "unidad": "...", "cantidadObjetivo": 5, "bandaAceptable": 75, "diaLimite": "YYYY-MM-DD",
      "proyectos": [
        {
          "titulo": "...", "diaLimite": "YYYY-MM-DD", "bandaAceptable": 70,
          "entregables": [
            {
              "titulo": "Contacto en frío", "diaInicio": "YYYY-MM-DD", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 200, "unidad": "contactos", "bandaAceptable": 75,
              "actividades": [],
              "fases": [
                { "titulo": "Semana 1", "orden": 0, "diaInicio": "YYYY-MM-DD", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 10, "unidad": "contactos", "bandaAceptable": 75,
                  "reparto": { "descripcion": "Contactar en frío", "tipo": "mantenimiento", "diasSemana": [1,2,3,4,5], "bandaAceptable": 50 } },
                { "titulo": "Semana 2", "orden": 1, "diaInicio": "YYYY-MM-DD", "diaLimite": "YYYY-MM-DD", "cantidadObjetivo": 15, "unidad": "contactos", "bandaAceptable": 75,
                  "reparto": { "descripcion": "Contactar en frío", "tipo": "mantenimiento", "diasSemana": [1,2,3,4,5], "bandaAceptable": 50 } }
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
function construirPromptActividades(
  entregableTitulo: string,
  entregableRestante: string
): string {
  return `<rol>
Actúa como asistente de planificación personal, ayudando a armar las actividades concretas de un Entregable puntual.
</rol>

<entregable_padre>
Esta/estas Actividad(es) van a pertenecer al Entregable "${entregableTitulo}" (${entregableRestante}). El título tiene que coincidir EXACTO con ese Entregable para que se vinculen bien — no inventes otro entregable.
</entregable_padre>

<instrucciones>
Como guía general, "enfoque" (lo más importante del día) ronda 1 por día y "mantenimiento" ronda 3 por día — tratá de organizar el trabajo cerca de esa cantidad para que un mismo día no termine con 10 actividades encima, pero no es un límite estricto: si genuinamente hace falta más para no dejar nada afuera, no te sientas limitado a esos números. ${NOTA_REPARTO} Acá podés combinar las dos formas: "actividadesNuevas" para tareas puntuales, y "repartos" para metas numéricas repartidas en días (cada reparto hereda fechas, total y unidad del Entregable si no las ponés). ${INSTRUCCION_PREGUNTAR}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "entregableTitulo": "${entregableTitulo}",
  "actividadesNuevas": [
    { "tipo": "enfoque" | "mantenimiento", "descripcion": "...", "diaTarea": "YYYY-MM-DD", "cantidadObjetivo": 3, "unidad": "contactos" }
  ],
  "repartos": [
    { "descripcion": "Contactar en frío", "tipo": "mantenimiento", "diasSemana": [1,2,3,4,5] }
  ]
}
Cualquiera de las dos listas puede quedar vacía ([]), pero no las dos.
</output_requerido>`;
}

export function generarPromptArbolCompleto(
  ...args: Parameters<typeof construirPromptArbolCompleto>
): string {
  return conContextoComun(construirPromptArbolCompleto(...args));
}

export function generarPromptObjetivo(
  ...args: Parameters<typeof construirPromptObjetivo>
): string {
  return conContextoComun(construirPromptObjetivo(...args));
}

export function generarPromptProyecto(
  ...args: Parameters<typeof construirPromptProyecto>
): string {
  return conContextoComun(construirPromptProyecto(...args));
}

export function generarPromptEntregable(
  ...args: Parameters<typeof construirPromptEntregable>
): string {
  return conContextoComun(construirPromptEntregable(...args));
}

export function generarPromptAjusteIA(
  ...args: Parameters<typeof construirPromptAjusteIA>
): string {
  return conContextoComun(construirPromptAjusteIA(...args), "ajustar");
}

export function generarPromptFases(
  ...args: Parameters<typeof construirPromptFases>
): string {
  return conContextoComun(construirPromptFases(...args));
}

export function generarPromptPlanificacionEnFases(
  ...args: Parameters<typeof construirPromptPlanificacionEnFases>
): string {
  return conContextoComun(construirPromptPlanificacionEnFases(...args));
}

export function generarPromptActividades(
  ...args: Parameters<typeof construirPromptActividades>
): string {
  return conContextoComun(construirPromptActividades(...args));
}
