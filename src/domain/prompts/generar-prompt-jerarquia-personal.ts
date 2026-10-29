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

const NOTA_REPARTO = `LOS 3 MODOS DE ENTREGABLES Y TAREAS EN LA APP — elegí siempre el que mejor calce con cada trabajo:
1. MODO CUANTIFICABLE (con meta numérica repartida en días, ej. "contactar 200 en frío de lunes a viernes"): NO uses "recurrencia" — usá "reparto" (dentro del Entregable, o dentro de una Fase): { "descripcion": "Contactar en frío", "tipo": "mantenimiento", "diasSemana": [1,2,3,4,5], "cantidadTotal": 40, "diaInicio": "YYYY-MM-DD", "diaLimite": "YYYY-MM-DD", "unidad": "contactos" }. El sistema genera UNA Actividad por día con su cantidad exacta (ej. 40 en 5 días = 8 por día) — vos NO escribas las actividades una por una.
   - Cuota CONSTANTE: Proyecto → Entregables con su "reparto".
   - Cuota PROGRESIVA / RECORRIDO PROYECTADO (ej. Mes 1 a 2/día = 40/mes, Mes 2 proyectado a 4/día = 80/mes): Proyecto → un Entregable con "fases" (cada Fase con su porción y fechas, dejando el recorrido proyectado listo de principio a fin) y un "reparto" DENTRO de cada Fase.
2. MODO CONTINUO / INDEFINIDO (Lun a Vie hasta darlo por terminado, donde el usuario decide en el momento qué hacer y anota en el día qué hizo): usá UN Entregable con "recurrencia": { "frecuencia": "dias_especificos", "diasSemana": [1,2,3,4,5] }, SIN "cantidadObjetivo", con "fases": [] y "actividades": []. La app genera la tarjeta cada día elegido para que el usuario anote en el día qué hizo ("notaCierre") y cuando termine el entregable toque "Terminado (No repetir más)" para que deje de aparecer.
3. MODO DÍA ESPECÍFICO / HITO PUNTUAL (sin cuota repetitiva, en una fecha o días puntuales): Entregables sin "reparto" ni "recurrencia", con "actividades" puntuales (con "diaTarea" YYYY-MM-DD). Una Actividad puntual también puede llevar "cantidadObjetivo" y "unidad" si se cuenta.`;

const NOTA_RECURRENCIA_SIMPLE = `Recurrencia — SOLO para tareas continuas que se repiten en ciertos días de la semana sin una cuota numérica por día que repartir (ej. dedicar bloque a un proyecto de Lun a Vie hasta terminarlo, o revisar bandeja); para metas numéricas divididas en días usá SIEMPRE "reparto" (ver Modo 1 arriba). Si el Entregable se repite en días fijos, agregale "recurrencia": { "frecuencia": "diaria" | "dias_especificos", "diasSemana": [0-6, 0=domingo] }. Si es puntual en fechas concretas (Modo 3), no pongas "recurrencia".

Importante — repetitivo vs. evolutivo: si la actividad se mantiene igual a lo largo del tiempo, es un solo Entregable recurrente (no crees uno nuevo por semana). Pero si la cantidad va escalando por etapas (ej. Mes 1 hago 2 por día, Mes 2 subo a 4 por día), usá UN Entregable con Fases Proyectadas ("fases") donde cada Fase tiene su propio "reparto" y cuota.

MUY IMPORTANTE — "cantidadObjetivo" en un Entregable recurrente (cuando tiene meta numérica) es el TOTAL a acumular en todo el período, NUNCA la cuota de un solo día. Ejemplo: 5 contactos por día, de Lunes a Viernes, durante 4 semanas → "cantidadObjetivo": 100 (el total), NO 5. Si el Entregable es continuo hasta que el usuario lo marque como Terminado (Modo 2), omití "cantidadObjetivo".

Importante — sub-tareas del mismo día: si un procedimiento tiene partes distintas que se hacen el mismo día (ej. "buscar contactos a la mañana" y "escribirles a la tarde"), cada parte es su propio Entregable separado.`;

const NOTA_RECURRENCIA = `${NOTA_REPARTO}

${NOTA_RECURRENCIA_SIMPLE}`;

const NOTA_HABITO = `Antes de crear un Entregable recurrente, preguntate si en realidad es un Hábito: si lo que se describe NO tiene una meta final ni un entregable que se termine algún día, sino que se sostiene toda la vida (ej. "caminar todos los días", "tomar agua", "meditar") — eso encaja mejor como Hábito (módulo aparte con seguimiento MIN/MED/MAX). Si notás que es este caso, avisá y preguntá si lo dejamos fuera de este árbol para cargarlo como Hábito.`;

const NOTA_FASES = `RECORRIDO PROYECTADO EN FASES Y CHECKPOINTS — Las Fases son tramos/escalones opcionales dentro de un Entregable ("fases": [...]) que permiten dejar planificado todo el recorrido proyectado (ej. Mes 1: 40 contactos a 2/día, Mes 2 proyectado: 80 contactos a 4/día) sin perder flexibilidad. La app muestra las fases futuras como "Proyectada (Futuro)" y al cierre de cada semana o fase presenta un Checkpoint estilo videojuego donde el usuario puede en 1 clic: (a) Dejarlo así registrando el motivo del desvío, (b) Distribuir el faltante en días específicos de la próxima semana o guardarlo en la Reserva de Pendientes, o (c) Ajustar el objetivo total o calibrar la siguiente fase (+1/-1 o mantener ritmo anterior). Cada Fase lleva título, orden (0, 1, 2...), diaInicio, diaLimite y su propia cantidadObjetivo (la porción de ese tramo, nunca el total repetido). Si no hace falta dividir en tramos, dejá "fases": [].`;

const INSTRUCCION_PREGUNTAR = `Antes de generar el JSON final, hacé todas las preguntas que necesites para no inventar nada: fechas, cantidades, y cuál de los 3 modos corresponde a cada entregable (1: por cantidad/fases, 2: continua Lun–Vie hasta terminar anotando en el día qué se hizo, o 3: fecha específica). Esperá mi respuesta a cada pregunta. NO generes el JSON hasta que confirme que ya tenés todo lo necesario.`;

const NOTA_UNA_AREA = `UN JSON = UNA SOLA ÁREA. "areaTitulo" es un único nombre y todo lo que cuelga del JSON pertenece a esa área. Si lo que pido abarca varias áreas (ej. Agencia y Salud), entregá un JSON POR ÁREA, cada uno en su propio bloque de código y con su "areaTitulo" exacto — nunca los mezcles ni unifiques áreas con nombres compuestos ("Agencia, Finanzas y Salud").`;

const NOTA_MINIMOS = `MÍNIMOS ACEPTABLES — todo nivel lleva un mínimo, para el día que no hay ganas de hacer el 100%. Se define con "bandaAceptable" (0-100: el % de su "cantidadObjetivo" que cuenta como mínimo aceptable) y, opcional, "bandaMejorable" (menor que la aceptable). Va en el Objetivo, el Proyecto, el Entregable y la Fase; y en el "reparto" la "bandaAceptable" es el mínimo de CADA DÍA (si falta, el reparto hereda la de su Fase/Entregable). Ejemplo: Objetivo 200 contactos con bandaAceptable 75 (mínimo 150) → mes de 50 con 60 (mínimo 30) → semana de 10 con 60 (mínimo 6) → día de 2 con 50 (mínimo 1). Preguntame qué mínimo quiero en cada nivel y proponé valores razonables. REGLA DE COHERENCIA: la suma de los mínimos de los tramos tiene que ser IGUAL O MAYOR al mínimo del total — si no, cumpliendo solo el mínimo de cada tramo nunca se llega al mínimo del total. Verificalo en la tabla de control.`;

const NOTA_METAS_SIN_ACTIVIDADES = `METAS SIN ACTIVIDADES DIARIAS — si el usuario ya planifica su día a día en otra herramienta (ej. contenido en el Planificador de Contenido), NO uses "reparto" ni "actividades": dejá "actividades": [] y expresá la meta con "fases" (tramos con su "cantidadObjetivo" y fechas, SIN reparto) o con "cantidadObjetivo" en el Entregable. La app muestra esas metas en la vista de la semana y del mes con un botón "+1". CONTENIDO PARA REDES: usá EXACTAMENTE estas unidades — "videos", "posts", "carruseles", "historias" — porque el Planificador de Contenido las reconoce automáticamente.

ACTIVIDADES CONTINUAS / DEDICACIÓN DIARIA DONDE SE ANOTA EN EL DÍA QUÉ SE HIZO (Modo 2, ej. "Desarrollo de proyectos", "Avanzar web cliente X de Lun a Vie hasta terminarla"): si el usuario no quiere prefijar qué va a hacer cada día porque lo ve en el momento, usá UN Entregable con "recurrencia" (frecuencia "dias_especificos", ej. [1,2,3,4,5]) y SIN cantidadObjetivo, con "fases": [] y "actividades": []. En la vista "Hoy" el usuario anota qué hizo ese día en 1 clic, suma el tiempo de sesión en Oficina y el día que termina el entregable toca "Terminado (No repetir más)" para cerrarlo definitivamente.`;

const NOTA_CONTROL_NUMEROS = `CONTROL DE NÚMEROS — antes de escribir el JSON, mostrame una tabla de control y esperá mi OK. No entregues nada que no cierre exacto:
1. Total: la suma de "cantidadObjetivo" de todas las Fases de un Entregable tiene que ser IGUAL a su "cantidadObjetivo".
2. Reparto entero: para cada Fase con "reparto", contá los días REALES entre "diaInicio" y "diaLimite" que caen en "diasSemana" y verificá que la cantidad se divida en enteros (cantidad ÷ días). Si no da entero (ej. 25 en 10 días = 2,5 por día), ajustá la cantidad al múltiplo más cercano y avisame el cambio; nunca dejes decimales.
3. Sin huecos ni solapes: la primera Fase empieza el "diaInicio" del Entregable, cada Fase empieza al día siguiente del "diaLimite" de la anterior, y la última termina el "diaLimite" del Entregable. Las semanas van de lunes a domingo.
4. Fechas: verificá que cada fecha caiga en el día de la semana que corresponde (0 = domingo … 6 = sábado) y que las fechas de un nivel estén dentro de las de su padre.
5. Sin inventar: si un dato no lo dije (fechas, cuotas, feriados a descontar), preguntalo. Metas en otra unidad que no se calcula desde los Entregables (pesos, clientes) las cargo yo a mano: NO inventes Entregables ni cuentas para "forzar" que coincidan, solo dejá el Objetivo con su cantidad y unidad.
6. Tabla de control (una fila por Fase): título · fechas · días que cuentan · cantidad · cantidad por día. Al final, la suma contra el total del Entregable.`;

export const NOTA_CAPACIDAD_DIARIA = `LÍMITES Y CAPACIDAD DIARIA EN LA AGENDA (BÚNKER DEL DÍA):
- En MateCode 2.0 la agenda diaria se cuida estrictamente para evitar parálisis por sobrecarga y burnout.
- Regla de oro de carga diaria: MÁXIMO 1 Actividad de Enfoque (lo crucial que mueve la aguja en el día) y hasta 3 Actividades de Mantenimiento (gestión, tareas operativas, seguimiento).
- NUNCA propongas 10 o 15 actividades para un mismo día. Si hay mucho volumen repetitivo, usá "reparto" en varios días o un "procedimiento" secuencial concentrado en una actividad.`;

export const NOTA_PROCEDIMIENTOS = `PROCEDIMIENTOS Y PROTOCOLOS DE TRABAJO (SOPs):
- Un Procedimiento NO es un entregable ni una actividad suelta en la agenda: es una PLANTILLA de pasos secuenciales atómicos con checkboxes ("checklist") para tareas que se repiten con un protocolo estandarizado (ej. "Contacto en frío", "Despliegue a producción", "Auditoría de cliente", "Estudio con técnica Feynman", "Publicación de contenido").
- Un Procedimiento tiene:
  - "titulo": Nombre claro del protocolo (ej. "Protocolo de Contacto en Frío").
  - "categoria": "general" | "desarrollo" | "prospeccion" | "contenido" | "estudio" | "rutina" (la que mejor aplique).
  - "pasos": Lista secuencial de pasos [{ "orden": 1, "titulo": "...", "duracionEstimadaMin": 15, "esObligatorio": true }].
- En el Búnker diario, la Actividad acompaña a este Procedimiento: el usuario va tildando los pasos y, al completar los obligatorios, finaliza la actividad.`;

const EXPLICACION_JERARQUIA_COMPLETA = `- Área: el paraguas (ej. "Freelancer", "Salud", "Agencia"). Si el nombre coincide EXACTO con una de las áreas existentes, se reusa esa área — si no, se crea una nueva.
- Objetivo: largo plazo (meses/año). SMART: cantidad + unidad + fecha límite obligatorias. Banda aceptable (0-100) para días de baja energía.
- Proyecto: mediano plazo (~un mes), hijo de un Objetivo. Cantidad/unidad opcionales.
- Entregable: corto plazo (~una semana o hito), hijo de un Proyecto.
- Fases: checkpoints opcionales dentro de un Entregable para recorridos proyectados/progresivos (ej. Semana 1, Semana 2).
- Procedimientos (SOPs): plantillas de checklists con pasos atómicos para estandarizar procesos repetitivos.
- Actividad: día a día, hijo de un Entregable. MÁXIMO 1 enfoque y hasta 3 mantenimiento por día. Puede tener vinculado un Procedimiento para seguir sus pasos.`;

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
${EXPLICACION_JERARQUIA_COMPLETA}
</como_funciona_la_jerarquia>

<limites_de_la_app>
${NOTA_CAPACIDAD_DIARIA}
</limites_de_la_app>

<procedimientos_sops>
${NOTA_PROCEDIMIENTOS}
</procedimientos_sops>

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
Un Entregable tiene fecha límite obligatoria; cantidad/unidad son opcionales. ${NOTA_RECURRENCIA} ${NOTA_FASES} ${NOTA_PROCEDIMIENTOS} ${NOTA_HABITO} ${INSTRUCCION_PREGUNTAR}
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

<limites_de_la_app>
${NOTA_CAPACIDAD_DIARIA}
</limites_de_la_app>

<procedimientos_sops>
${NOTA_PROCEDIMIENTOS}
</procedimientos_sops>

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

function construirPromptProcedimiento(contexto: {
  tema: string;
  categoria?: string;
  clienteNombre?: string;
  detallesExtra?: string;
}): string {
  return `<rol>
Sos un especialista en estandarización de procesos de trabajo y diseño de Procedimientos Operativos Estandarizados (SOPs).
</rol>

<contexto>
Procedimiento a definir: "${contexto.tema}".
${contexto.categoria ? `Categoría sugerida: "${contexto.categoria}".` : ""}
${contexto.clienteNombre ? `Cliente asociado: "${contexto.clienteNombre}".` : ""}
${contexto.detallesExtra ? `Detalles adicionales: ${contexto.detallesExtra}` : ""}
</contexto>

<instrucciones>
Diseñá un listado secuencial de pasos claros, atómicos y accionables para este procedimiento que se repite periódicamente (ej. para prospección, desarrollo de features, estudio o entrega de servicios).
- Cada paso debe tener un título conciso e imperativo.
- Indicá "esObligatorio: true" para los pasos críticos y "false" para verificaciones opcionales.
- Estimá "duracionEstimadaMin" en minutos para cada paso.
- El procedimiento debe devolver un JSON con la clave "procedimientosNuevos".
</instrucciones>

<output_requerido>
{
  "procedimientosNuevos": [
    {
      "titulo": "${contexto.tema}",
      "descripcion": "Descripción del objetivo y contexto de este procedimiento...",
      "categoria": "${contexto.categoria ?? "general"}",
      "pasos": [
        {
          "orden": 1,
          "titulo": "Primer paso secuencial a realizar",
          "descripcion": "Detalle operativo opcional...",
          "duracionEstimadaMin": 15,
          "esObligatorio": true
        }
      ]
    }
  ]
}
</output_requerido>`;
}

export function generarPromptProcedimiento(
  ...args: Parameters<typeof construirPromptProcedimiento>
): string {
  return conContextoComun(construirPromptProcedimiento(...args));
}

// ============================================================================
// PROMPTS MODULARES POR ETAPAS (WIZARD ASISTIDO POR IA)
// Permite que la IA planifique paso a paso sin saturar tokens ni alucinar:
// 1. Área + Objetivos SMART (con visión global y límites de capacidad)
// 2. Proyectos del Objetivo seleccionado
// 3. Entregables y Procedimientos (SOPs) del Proyecto seleccionado
// 4. Agenda diaria (Actividades de Enfoque/Mantenimiento y Repartos)
// ============================================================================

/** Etapa 1: Área y Objetivos SMART de largo plazo (con marco global de la app). */
function construirPromptEtapa1Objetivos(
  resumenHistorico: string,
  areasExistentes: string[]
): string {
  const areasTexto =
    areasExistentes.length > 0
      ? areasExistentes.join(", ")
      : "sin áreas todavía";
  return `<rol>
Actúa como un arquitecto senior y asistente de planificación personal, ayudando a definir la Etapa 1 del plan: Área y Objetivos SMART de largo plazo.
</rol>

<contexto_lo_hecho_hasta_ahora>
${resumenHistorico}
</contexto_lo_hecho_hasta_ahora>

<areas_existentes>
${areasTexto}
</areas_existentes>

<vision_general_del_sistema>
${EXPLICACION_JERARQUIA_COMPLETA}
</vision_general_del_sistema>

<limites_de_la_app>
${NOTA_CAPACIDAD_DIARIA}
</limites_de_la_app>

<minimos_aceptables>
${NOTA_MINIMOS}
</minimos_aceptables>

<mision_etapa_1>
En esta PRIMERA ETAPA, tu misión es ÚNICAMENTE definir o elegir el Área y formular el/los Objetivos SMART (de largo plazo: meses/año) con:
- Título conciso y claro.
- Meta numérica realista ("cantidadObjetivo") y su "unidad" (ej. 200 contactos, 15 clientes, 80 horas, $3.000.000 ARS).
- Fecha límite ("diaLimite" YYYY-MM-DD).
- Mínimo aceptable ("bandaAceptable", ej. 75).
NO inventes proyectos, entregables ni actividades en esta etapa; eso se hará paso a paso en las etapas siguientes.
${INSTRUCCION_PREGUNTAR} Preguntame primero qué Área es (si es nueva o una de las existentes) y qué querés lograr.
</mision_etapa_1>

<instrucciones>
${NOTA_UNA_AREA}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "areaTitulo": "...",
  "objetivosNuevos": [
    {
      "titulo": "...",
      "unidad": "...",
      "cantidadObjetivo": 200,
      "bandaAceptable": 75,
      "diaLimite": "YYYY-MM-DD",
      "proyectos": []
    }
  ]
}
Nota: "proyectos" debe quedar vacío ([]), ya que se desglosará en la Etapa 2.
</output_requerido>`;
}

/** Etapa 2: Proyectos de mediano plazo (~un mes) bajo un Objetivo ya definido. */
function construirPromptEtapa2Proyectos(
  objetivoTitulo: string,
  objetivoDetalles: string,
  proyectosExistentes: string[] = [],
  mapaAreasYObjetivos: string = ""
): string {
  const existentesTexto =
    proyectosExistentes.length > 0
      ? `Proyectos que ya existen bajo este objetivo: ${proyectosExistentes.join(", ")}.`
      : "Sin proyectos cargados todavía bajo este objetivo.";

  const bloqueContextoGlobal = mapaAreasYObjetivos.trim()
    ? `<panorama_general_areas_y_objetivos>
Este es el mapa actual de TODAS las Áreas y Objetivos del usuario en la app:
${mapaAreasYObjetivos}

ATENCIÓN AL BALANCE DE VIDA Y ENERGÍA:
El usuario tiene múltiples frentes abiertos en simultáneo. Al diseñar los proyectos para el objetivo seleccionado, considerá este contexto global para que los proyectos sean sostenibles, realistas y no sobrecarguen su capacidad diaria (respetando los límites del Búnker de abajo).
</panorama_general_areas_y_objetivos>

`
    : "";

  return `<rol>
Actúa como asistente de planificación personal, ayudando a definir la Etapa 2: Proyectos de mediano plazo (~un mes cada uno) para alcanzar un Objetivo específico dentro de un marco de vida equilibrado.
</rol>

${bloqueContextoGlobal}<objetivo_padre>
Objetivo a desglosar ahora: "${objetivoTitulo}" (${objetivoDetalles}).
${existentesTexto}
</objetivo_padre>

<limites_de_la_app>
${NOTA_CAPACIDAD_DIARIA}
</limites_de_la_app>

<instrucciones>
Desglosar el Objetivo en 2 a 4 Proyectos claros (frentes de trabajo de mediano plazo):
- Cada Proyecto debe tener un título representativo y fecha límite ("diaLimite" YYYY-MM-DD) dentro del rango del Objetivo padre.
- La cantidad y unidad son opcionales (solo si se reparte la cuota numérica del objetivo entre los proyectos, ej. Proyecto 1: 100 contactos, Proyecto 2: 100 contactos).
- Opcionalmente "bandaAceptable" (ej. 70).
- Ajustá el alcance y la escala de los proyectos teniendo en cuenta los demás objetivos del usuario para no saturar su agenda.
NO entres al detalle de los días o tareas sueltas todavía; eso se definirá en las etapas siguientes.
${INSTRUCCION_PREGUNTAR}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "objetivoTitulo": "${objetivoTitulo}",
  "proyectosNuevos": [
    {
      "titulo": "...",
      "diaLimite": "YYYY-MM-DD",
      "cantidadObjetivo": 100,
      "unidad": "contactos",
      "bandaAceptable": 70,
      "entregables": []
    }
  ]
}
Nota: "entregables" debe quedar vacío ([]), ya que se definirán en la Etapa 3.
</output_requerido>`;
}

/** Etapa 2: Proyectos de mediano plazo (~un mes) bajo TODOS los Objetivos pendientes de un Área. */
function construirPromptEtapa2ProyectosPorArea(
  areaNombre: string,
  objetivosPendientes: {
    titulo: string;
    cantidadObjetivo?: number;
    unidad?: string;
    diaLimite?: string;
  }[],
  objetivosYaPlanificados: { titulo: string; proyectos: string[] }[] = [],
  mapaOtrasAreas: string = ""
): string {
  const bloqueContextoGlobal = mapaOtrasAreas.trim()
    ? `<panorama_general_de_vida>
Este es el mapa de las DEMÁS Áreas y Objetivos del usuario en la app:
${mapaOtrasAreas}

ATENCIÓN AL BALANCE DE VIDA Y ENERGÍA:
El usuario tiene compromisos activos en paralelo en otras áreas. Al diseñar los proyectos para los objetivos del área "${areaNombre}", considerá este panorama general para que los frentes de trabajo sean realistas, equilibrados y no sobrecarguen la capacidad de la agenda diaria (máximo 1 actividad de enfoque y hasta 3 de mantenimiento por día).
</panorama_general_de_vida>

`
    : "";

  const bloqueYaPlanificados =
    objetivosYaPlanificados.length > 0
      ? `<objetivos_ya_planificados_no_repetir>
ATENCIÓN — Los siguientes ${objetivosYaPlanificados.length} objetivos del área "${areaNombre}" YA TIENEN proyectos cargados (fueron planificados antes o de forma individual).
NO generes proyectos para ellos, NO inventes nuevos y NO los incluyas en tu JSON de salida:
${objetivosYaPlanificados
  .map(
    (o) =>
      `• "${o.titulo}" (Ya cubierto con: ${
        o.proyectos.length > 0 ? o.proyectos.join(", ") : "proyectos existentes"
      })`
  )
  .join("\n")}
</objetivos_ya_planificados_no_repetir>

`
      : "";

  const listaPendientesTexto =
    objetivosPendientes.length > 0
      ? objetivosPendientes
          .map((o) => {
            const meta = o.cantidadObjetivo
              ? ` · Meta: ${o.cantidadObjetivo} ${o.unidad ?? ""}`
              : "";
            const limite = o.diaLimite ? ` · Vence: ${o.diaLimite}` : "";
            return `- [Objetivo] "${o.titulo}"${meta}${limite}`;
          })
          .join("\n")
      : "- Sin objetivos pendientes en esta área.";

  return `<rol>
Actúa como asistente de planificación personal, ayudando a definir la Etapa 2: Proyectos de mediano plazo (~un mes cada uno) para los Objetivos pendientes del Área "${areaNombre}".
</rol>

${bloqueContextoGlobal}${bloqueYaPlanificados}<objetivos_a_desglosar_ahora>
Área objetivo: "${areaNombre}".
Generá proyectos ÚNICAMENTE para los siguientes ${objetivosPendientes.length} objetivo(s) pendientes de esta área:
${listaPendientesTexto}
</objetivos_a_desglosar_ahora>

<limites_de_la_app>
${NOTA_CAPACIDAD_DIARIA}
</limites_de_la_app>

<instrucciones>
Para CADA uno de los objetivos pendientes listados arriba:
- Proponé entre 2 y 3 Proyectos clave de mediano plazo (~un mes cada uno).
- Cada Proyecto debe tener un título representativo y fecha límite ("diaLimite" YYYY-MM-DD) dentro del plazo de su Objetivo padre.
- La cantidad y unidad son opcionales (solo si se reparte la cuota numérica del objetivo).
- Opcionalmente "bandaAceptable" (ej. 70).
- NO incluyas ni dupliques proyectos para los objetivos ya planificados indicados en <objetivos_ya_planificados_no_repetir>.
- Mantené los títulos de los objetivos EXACTAMENTE como están escritos.
NO entres al detalle de los días o tareas sueltas todavía; eso se definirá en las etapas siguientes.
${INSTRUCCION_PREGUNTAR}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "areaTitulo": "${areaNombre}",
  "objetivos": [
    {
      "objetivoTitulo": "Título exacto del objetivo",
      "proyectosNuevos": [
        {
          "titulo": "...",
          "diaLimite": "YYYY-MM-DD",
          "cantidadObjetivo": 100,
          "unidad": "contactos",
          "bandaAceptable": 70,
          "entregables": []
        }
      ]
    }
  ]
}
Nota: "entregables" debe quedar vacío ([]), ya que se definirán en la Etapa 3.
</output_requerido>`;
}

/** Etapa 3: Entregables semanales y Procedimientos Operativos Estandarizados (SOPs). */
function construirPromptEtapa3EntregablesYSOPs(
  proyectoTitulo: string,
  proyectoDetalles: string,
  entregablesExistentes: string[] = []
): string {
  const existentesTexto =
    entregablesExistentes.length > 0
      ? `Entregables que ya existen bajo este proyecto: ${entregablesExistentes.join(", ")}.`
      : "Sin entregables cargados todavía bajo este proyecto.";
  return `<rol>
Actúa como asistente de planificación personal y estandarización de procesos, ayudando a definir la Etapa 3: Entregables semanales y Procedimientos Operativos Estandarizados (SOPs).
</rol>

<proyecto_padre>
Proyecto: "${proyectoTitulo}" (${proyectoDetalles}).
${existentesTexto}
</proyecto_padre>

<modos_de_entregables>
${NOTA_REPARTO}
</modos_de_entregables>

<procedimientos_sops>
${NOTA_PROCEDIMIENTOS}
Si el entregable requiere seguir un proceso repetitivo o paso a paso (ej. contacto en frío, onboarding de clientes, desarrollo de feature, estudio, servicio continuo), definí el bloque "procedimiento" dentro del entregable con sus pasos secuenciales y tiempos estimados.
</procedimientos_sops>

<instrucciones>
Definir los Entregables de este Proyecto:
- Cada Entregable dura típicamente ~1 semana o representa un hito concreto.
- Si involucra un proceso o protocolo a seguir, agregá su "procedimiento" con la lista de pasos secuenciales y duraciones.
- Si el entregable se desglosa en bloques semanales, podés incluir sus "fases" opcionales.
- SEPARACIÓN DE FASES: En esta Etapa 3 NO definas actividades diarias ni agendas concretas del día a día; eso se resuelve en la Etapa 4 (Agenda Diaria y Reparto).
${INSTRUCCION_PREGUNTAR}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "proyectoTitulo": "${proyectoTitulo}",
  "entregablesNuevos": [
    {
      "titulo": "Semana 1: Prospección activa",
      "diaInicio": "YYYY-MM-DD",
      "diaLimite": "YYYY-MM-DD",
      "cantidadObjetivo": 40,
      "unidad": "contactos",
      "bandaAceptable": 75,
      "procedimiento": {
        "titulo": "Protocolo de Contacto en Frío",
        "categoria": "prospeccion",
        "pasos": [
          { "orden": 1, "titulo": "Filtrar 10 perfiles calificados en LinkedIn", "duracionEstimadaMin": 15, "esObligatorio": true },
          { "orden": 2, "titulo": "Personalizar mensaje con gancho de dolor", "duracionEstimadaMin": 20, "esObligatorio": true },
          { "orden": 3, "titulo": "Registrar contactos en CRM", "duracionEstimadaMin": 10, "esObligatorio": true }
        ]
      },
      "fases": []
    }
  ]
}
Nota: "procedimiento" es opcional (solo si el entregable tiene un checklist repetitivo). "fases" puede quedar vacío o no incluirse. NO incluyas actividades diarias acá.
</output_requerido>`;
}

/** Etapa 3: Entregables semanales y Procedimientos Operativos Estandarizados (SOPs) por Área. */
function construirPromptEtapa3EntregablesPorArea(
  areaNombre: string,
  proyectosPendientes: {
    titulo: string;
    objetivoTitulo?: string;
    cantidadObjetivo?: number;
    unidad?: string;
    diaLimite?: string;
  }[],
  proyectosYaPlanificados: { titulo: string; entregables: string[] }[] = [],
  mapaOtrasAreas: string = "",
  proyectosPospuestos: { titulo: string; objetivoTitulo?: string }[] = []
): string {
  const bloqueContextoGlobal = mapaOtrasAreas.trim()
    ? `<panorama_general_de_vida>
Este es el mapa de las DEMÁS Áreas y Objetivos del usuario en la app:
${mapaOtrasAreas}

ATENCIÓN AL BALANCE DE VIDA Y ENERGÍA:
El usuario tiene múltiples frentes en otras áreas. Al definir los entregables de los proyectos de "${areaNombre}", considerá este panorama general para que la carga semanal y diaria sea realista y sostenible.
</panorama_general_de_vida>

`
    : "";

  const bloqueYaPlanificados =
    proyectosYaPlanificados.length > 0
      ? `<proyectos_ya_planificados_no_repetir>
ATENCIÓN — Los siguientes ${proyectosYaPlanificados.length} proyectos del área "${areaNombre}" YA TIENEN entregables cargados (fueron planificados antes o de forma individual).
NO generes entregables para ellos, NO inventes nuevos y NO los incluyas en tu JSON de salida:
${proyectosYaPlanificados
  .map(
    (p) =>
      `• "${p.titulo}" (Ya cubierto con: ${
        p.entregables.length > 0
          ? p.entregables.join(", ")
          : "entregables existentes"
      })`
  )
  .join("\n")}
</proyectos_ya_planificados_no_repetir>

`
      : "";

  const bloquePospuestos =
    proyectosPospuestos.length > 0
      ? `<proyectos_pospuestos_o_futuros_no_desglosar>
ATENCIÓN — Los siguientes ${proyectosPospuestos.length} proyectos del área "${areaNombre}" arrancarán en una etapa posterior o el usuario decidió NO desglosarlos en esta tanda.
NO generes entregables para ellos en este momento y NO los incluyas en el JSON de salida:
${proyectosPospuestos
  .map(
    (p) =>
      `• [Pospuesto] "${p.titulo}"${p.objetivoTitulo ? ` (Objetivo: ${p.objetivoTitulo})` : ""}`
  )
  .join("\n")}
</proyectos_pospuestos_o_futuros_no_desglosar>

`
      : "";

  const listaProyectosTexto =
    proyectosPendientes.length > 0
      ? proyectosPendientes
          .map((p) => {
            const padre = p.objetivoTitulo
              ? ` [Objetivo padre: "${p.objetivoTitulo}"]`
              : "";
            const meta = p.cantidadObjetivo
              ? ` · Meta: ${p.cantidadObjetivo} ${p.unidad ?? ""}`
              : "";
            const limite = p.diaLimite ? ` · Vence: ${p.diaLimite}` : "";
            return `- [Proyecto] "${p.titulo}"${padre}${meta}${limite}`;
          })
          .join("\n")
      : "- Sin proyectos seleccionados para desglosar en esta tanda.";

  return `<rol>
Actúa como asistente de planificación personal y estandarización de procesos, ayudando a definir la Etapa 3: Entregables semanales y Procedimientos Operativos Estandarizados (SOPs) para los Proyectos seleccionados del Área "${areaNombre}".
</rol>

${bloqueContextoGlobal}${bloqueYaPlanificados}${bloquePospuestos}<proyectos_a_desglosar_ahora>
Área objetivo: "${areaNombre}".
Proyectos seleccionados para evaluar y definir entregables:
${listaProyectosTexto}
</proyectos_a_desglosar_ahora>

<procedimientos_sops>
${NOTA_PROCEDIMIENTOS}
Si el entregable requiere seguir un proceso repetitivo o paso a paso (ej. contacto en frío, desarrollo de feature, estudio con técnica, publicación), definí el bloque "procedimiento" dentro del entregable con sus pasos secuenciales y tiempos estimados.
</procedimientos_sops>

<instrucciones>
Definir los Entregables y SOPs de los proyectos listados en <proyectos_a_desglosar_ahora>:
- REGLA DE ORO DE OPCIONALIDAD: NO todos los proyectos necesitan entregables. Si un proyecto es simple, representa un hito directo o no necesita división semanal/SOP, dejá su lista de entregables vacía ("entregablesNuevos": []) o no lo incluyas en la salida. Solo definí entregables para los proyectos que realmente se beneficien de una estructura semanal, meta cuantificable repartida o un procedimiento estándar.
- Cada Entregable dura típicamente ~1 semana o representa una entrega/hito concreto.
- Si involucra un proceso o protocolo a seguir, agregá su "procedimiento" con la lista de pasos secuenciales y duraciones.
- Si el entregable se desglosa en bloques semanales, podés incluir sus "fases" opcionales.
- SEPARACIÓN DE FASES: En esta Etapa 3 NO definas actividades diarias ni agendas concretas del día a día; eso se resuelve en la Etapa 4 (Agenda Diaria y Reparto).
- NO dupliques ni incluyas los proyectos ya planificados ni los pospuestos.
- Mantené los títulos de los proyectos EXACTAMENTE como están escritos.
${INSTRUCCION_PREGUNTAR}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "areaTitulo": "${areaNombre}",
  "proyectos": [
    {
      "proyectoTitulo": "Título exacto del proyecto",
      "entregablesNuevos": [
        {
          "titulo": "Semana 1: Prospección activa",
          "diaInicio": "YYYY-MM-DD",
          "diaLimite": "YYYY-MM-DD",
          "cantidadObjetivo": 40,
          "unidad": "contactos",
          "bandaAceptable": 75,
          "procedimiento": {
            "titulo": "Protocolo de Contacto en Frío",
            "categoria": "prospeccion",
            "pasos": [
              { "orden": 1, "titulo": "Filtrar 10 perfiles calificados en LinkedIn", "duracionEstimadaMin": 15, "esObligatorio": true },
              { "orden": 2, "titulo": "Personalizar mensaje con gancho de dolor", "duracionEstimadaMin": 20, "esObligatorio": true }
            ]
          },
          "fases": []
        }
      ]
    }
  ]
}
Nota: Si un proyecto no necesita entregables, dejá "entregablesNuevos": [] o no lo incluyas en "proyectos". "procedimiento" y "fases" son opcionales. NO incluyas actividades diarias acá.
</output_requerido>`;
}

/** Etapa 4: Fases, Repartos en Días y Actividades concretas (Agenda Diaria Búnker). */
function construirPromptEtapa4Actividades(
  entregableTitulo: string,
  entregableDetalles: string,
  procedimientoNombre?: string
): string {
  return `<rol>
Actúa como asistente de planificación personal, ayudando a definir la Etapa 4: La agenda diaria concreta (Actividades de Enfoque y Mantenimiento) y Fases/Repartos en días.
</rol>

<entregable_padre>
Entregable: "${entregableTitulo}" (${entregableDetalles}).
${procedimientoNombre ? `Procedimiento vinculado: "${procedimientoNombre}".` : ""}
</entregable_padre>

<limites_de_la_app>
${NOTA_CAPACIDAD_DIARIA}
</limites_de_la_app>

<instrucciones>
Organizá el trabajo diario cuidando no sobrecargar ningún día:
- Recordá la regla: MÁXIMO 1 actividad de tipo "enfoque" y hasta 3 de tipo "mantenimiento" por día.
- Para metas numéricas repartidas, usá "repartos" (se expande solo a los días elegidos).
- Para actividades puntuales con fecha, usá "actividadesNuevas". Si acompañan a un procedimiento, indicalo en la descripción.
${INSTRUCCION_PREGUNTAR}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "entregableTitulo": "${entregableTitulo}",
  "actividadesNuevas": [
    { "tipo": "enfoque", "descripcion": "Diseñar propuesta comercial", "diaTarea": "YYYY-MM-DD" },
    { "tipo": "mantenimiento", "descripcion": "Seguimiento de leads pendientes", "diaTarea": "YYYY-MM-DD", "cantidadObjetivo": 5, "unidad": "contactos" }
  ],
  "repartos": [
    { "descripcion": "Contactar en frío", "tipo": "mantenimiento", "diasSemana": [1,2,3,4,5] }
  ]
}
Nota: Podés incluir "actividadesNuevas", "repartos" o ambos.
</output_requerido>`;
}

/** Etapa 4: Planificar Agenda Diaria y Reparto en días para los Entregables de un Área. */
function construirPromptEtapa4ActividadesPorArea(
  areaNombre: string,
  entregablesPendientes: {
    titulo: string;
    proyectoTitulo?: string;
    cantidadObjetivo?: number;
    unidad?: string;
    diaLimite?: string;
    procedimientoNombre?: string;
  }[],
  entregablesYaAgendados: { titulo: string; actividadesCount: number }[] = [],
  mapaOtrasAreas: string = "",
  entregablesPospuestos: { titulo: string; proyectoTitulo?: string }[] = []
): string {
  const bloqueContextoGlobal = mapaOtrasAreas.trim()
    ? `<panorama_general_de_vida>
Este es el mapa de las DEMÁS Áreas y Objetivos del usuario en la app:
${mapaOtrasAreas}

ATENCIÓN AL BALANCE DE VIDA Y ENERGÍA:
El usuario tiene múltiples frentes en otras áreas. Al agendar actividades diarias para "${areaNombre}", cuidá estrictamente no saturar la semana ni duplicar compromisos.
</panorama_general_de_vida>

`
    : "";

  const bloqueYaAgendados =
    entregablesYaAgendados.length > 0
      ? `<entregables_ya_agendados_no_repetir>
ATENCIÓN — Los siguientes ${entregablesYaAgendados.length} entregables del área "${areaNombre}" YA TIENEN actividades agendadas en el calendario.
NO generes actividades para ellos y NO los incluyas en tu JSON de salida:
${entregablesYaAgendados
  .map(
    (e) => `• "${e.titulo}" (${e.actividadesCount} actividades ya agendadas)`
  )
  .join("\n")}
</entregables_ya_agendados_no_repetir>

`
      : "";

  const bloquePospuestos =
    entregablesPospuestos.length > 0
      ? `<entregables_pospuestos_no_agendar>
ATENCIÓN — Los siguientes ${entregablesPospuestos.length} entregables del área "${areaNombre}" se agendarán más adelante.
NO generes actividades para ellos en este momento y NO los incluyas en el JSON de salida:
${entregablesPospuestos
  .map(
    (e) =>
      `• [Pospuesto] "${e.titulo}"${
        e.proyectoTitulo ? ` (Proyecto: "${e.proyectoTitulo}")` : ""
      }`
  )
  .join("\n")}
</entregables_pospuestos_no_agendar>

`
      : "";

  const listaEntregablesTexto =
    entregablesPendientes.length > 0
      ? entregablesPendientes
          .map((e) => {
            const proy = e.proyectoTitulo
              ? ` [Proyecto: "${e.proyectoTitulo}"]`
              : "";
            const meta = e.cantidadObjetivo
              ? ` · Meta: ${e.cantidadObjetivo} ${e.unidad ?? ""}`
              : "";
            const limite = e.diaLimite ? ` · Vence: ${e.diaLimite}` : "";
            const sop = e.procedimientoNombre
              ? ` · SOP vinculado: "${e.procedimientoNombre}"`
              : "";
            return `- [Entregable] "${e.titulo}"${proy}${meta}${limite}${sop}`;
          })
          .join("\n")
      : "- Sin entregables seleccionados para agendar en esta tanda.";

  return `<rol>
Actúa como asistente de planificación personal y diseño de agenda diaria, ayudando a definir la Etapa 4: Actividades concretas de Enfoque y Mantenimiento y Repartos en días para los Entregables del Área "${areaNombre}".
</rol>

${bloqueContextoGlobal}${bloqueYaAgendados}${bloquePospuestos}<entregables_a_agendar_ahora>
Área objetivo: "${areaNombre}".
Entregables seleccionados para planificar su agenda diaria:
${listaEntregablesTexto}
</entregables_a_agendar_ahora>

<limites_de_la_app>
${NOTA_CAPACIDAD_DIARIA}
</limites_de_la_app>

<instrucciones>
Organizar la agenda diaria de los entregables listados arriba cuidando no sobrecargar ningún día:
- Recordá la regla de oro: MÁXIMO 1 actividad de tipo "enfoque" y hasta 3 de tipo "mantenimiento" por día. Si varias actividades caen en la misma semana, distribuilas en días distintos.
- Para metas numéricas que se reparten en días, usá "repartos" (ej. Lun a Vie, 10 por día).
- Para actividades puntuales con fecha, usá "actividadesNuevas".
- Si un entregable tiene SOP vinculado, la actividad debe hacer referencia a ejecutar ese protocolo.
- NO dupliques ni incluyas los entregables ya agendados ni los pospuestos.
${INSTRUCCION_PREGUNTAR}
</instrucciones>

<output_requerido>
Cuando confirme que está todo, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "areaTitulo": "${areaNombre}",
  "entregables": [
    {
      "entregableTitulo": "Título exacto del entregable",
      "actividadesNuevas": [
        { "tipo": "enfoque", "descripcion": "Bloque de trabajo profundo: Prospección", "diaTarea": "YYYY-MM-DD", "minutosEstimados": 60 },
        { "tipo": "mantenimiento", "descripcion": "Seguimiento de mensajes enviados", "diaTarea": "YYYY-MM-DD", "cantidadObjetivo": 10, "unidad": "contactos" }
      ],
      "repartos": [
        { "descripcion": "Contactar en frío (Lun a Vie)", "tipo": "mantenimiento", "diasSemana": [1,2,3,4,5], "cantidadTotal": 50, "unidad": "contactos" }
      ]
    }
  ]
}
Nota: Podés incluir "actividadesNuevas", "repartos" o ambos dentro de cada entregable.
</output_requerido>`;
}

export function generarPromptEtapa1Objetivos(
  ...args: Parameters<typeof construirPromptEtapa1Objetivos>
): string {
  return conContextoComun(construirPromptEtapa1Objetivos(...args));
}

export function generarPromptEtapa2Proyectos(
  ...args: Parameters<typeof construirPromptEtapa2Proyectos>
): string {
  return conContextoComun(construirPromptEtapa2Proyectos(...args));
}

export function generarPromptEtapa2ProyectosPorArea(
  ...args: Parameters<typeof construirPromptEtapa2ProyectosPorArea>
): string {
  return conContextoComun(construirPromptEtapa2ProyectosPorArea(...args));
}

export function generarPromptEtapa3EntregablesYSOPs(
  ...args: Parameters<typeof construirPromptEtapa3EntregablesYSOPs>
): string {
  return conContextoComun(construirPromptEtapa3EntregablesYSOPs(...args));
}

export function generarPromptEtapa3EntregablesPorArea(
  ...args: Parameters<typeof construirPromptEtapa3EntregablesPorArea>
): string {
  return conContextoComun(construirPromptEtapa3EntregablesPorArea(...args));
}

export function generarPromptEtapa4Actividades(
  ...args: Parameters<typeof construirPromptEtapa4Actividades>
): string {
  return conContextoComun(construirPromptEtapa4Actividades(...args));
}

export function generarPromptEtapa4ActividadesPorArea(
  ...args: Parameters<typeof construirPromptEtapa4ActividadesPorArea>
): string {
  return conContextoComun(construirPromptEtapa4ActividadesPorArea(...args));
}

/**
 * Formatea de forma legible y compacta todas las áreas con sus objetivos
 * para que la IA tenga el mapa global de compromisos al desglosar proyectos o entregables.
 */
export function formatearMapaAreasYObjetivos(
  areas: { id: string; nombre: string }[],
  objetivos: {
    id: string;
    areaId?: string;
    titulo: string;
    cantidadObjetivo?: number;
    unidad?: string;
    diaLimite?: string;
  }[]
): string {
  if (objetivos.length === 0) return "Sin objetivos definidos todavía.";

  const lineas: string[] = [];

  for (const area of areas) {
    const objsDeEstaArea = objetivos.filter((o) => o.areaId === area.id);
    if (objsDeEstaArea.length > 0) {
      lineas.push(
        `• Área: "${area.nombre}" (${objsDeEstaArea.length} objetivo${
          objsDeEstaArea.length > 1 ? "s" : ""
        }):`
      );
      for (const o of objsDeEstaArea) {
        const meta = o.cantidadObjetivo
          ? ` · Meta: ${o.cantidadObjetivo} ${o.unidad ?? ""}`
          : "";
        const limite = o.diaLimite ? ` · Vence: ${o.diaLimite}` : "";
        lineas.push(`   - [Objetivo] "${o.titulo}"${meta}${limite}`);
      }
    }
  }

  const sinArea = objetivos.filter(
    (o) => !o.areaId || !areas.some((a) => a.id === o.areaId)
  );
  if (sinArea.length > 0) {
    lineas.push(
      `• Área General / Sin clasificar (${sinArea.length} objetivo${
        sinArea.length > 1 ? "s" : ""
      }):`
    );
    for (const o of sinArea) {
      const meta = o.cantidadObjetivo
        ? ` · Meta: ${o.cantidadObjetivo} ${o.unidad ?? ""}`
        : "";
      const limite = o.diaLimite ? ` · Vence: ${o.diaLimite}` : "";
      lineas.push(`   - [Objetivo] "${o.titulo}"${meta}${limite}`);
    }
  }

  return lineas.join("\n");
}

export interface ObjetivoAuditoriaInput {
  id: string;
  titulo: string;
  cantidadObjetivo?: number;
  unidad?: string;
  diaLimite?: string;
}

export interface ProyectoAuditoriaInput {
  id: string;
  objetivoId: string;
  titulo: string;
  cantidadObjetivo?: number;
  unidad?: string;
  diaLimite?: string;
}

export interface EntregableAuditoriaInput {
  id: string;
  proyectoId: string;
  titulo: string;
  cantidadObjetivo?: number;
  unidad?: string;
  diaLimite?: string;
}

export interface ActividadAuditoriaInput {
  id: string;
  entregableId?: string;
  procedimientoId?: string;
}

/**
 * Genera un prompt estructurado de auditoría/revisión para que una IA externa
 * evalúe la solidez, viabilidad y consistencia de toda la planificación de un Área
 * (Área → Objetivos → Proyectos → Entregables y SOPs).
 */
export function generarPromptAuditoriaArea(
  areaNombre: string,
  objetivos: ObjetivoAuditoriaInput[],
  proyectos: ProyectoAuditoriaInput[],
  entregables: EntregableAuditoriaInput[],
  actividades: ActividadAuditoriaInput[] = []
): string {
  const lineasJerarquia: string[] = [];

  if (objetivos.length === 0) {
    lineasJerarquia.push("- Sin objetivos configurados en esta área todavía.");
  } else {
    for (const obj of objetivos) {
      const metaObj = obj.cantidadObjetivo
        ? ` · Meta: ${obj.cantidadObjetivo} ${obj.unidad ?? ""}`
        : "";
      const limiteObj = obj.diaLimite ? ` · Vence: ${obj.diaLimite}` : "";
      lineasJerarquia.push(
        `📁 [Objetivo] "${obj.titulo}"${metaObj}${limiteObj}`
      );

      const proysDelObj = proyectos.filter((p) => p.objetivoId === obj.id);
      if (proysDelObj.length === 0) {
        lineasJerarquia.push(
          `   └─ ⚠️ [Sin proyectos cargados bajo este objetivo]`
        );
      } else {
        for (const proy of proysDelObj) {
          const metaProy = proy.cantidadObjetivo
            ? ` · Meta: ${proy.cantidadObjetivo} ${proy.unidad ?? ""}`
            : "";
          const limiteProy = proy.diaLimite
            ? ` · Vence: ${proy.diaLimite}`
            : "";
          const entsDelProy = entregables.filter(
            (e) => e.proyectoId === proy.id
          );

          lineasJerarquia.push(
            `   └─ 🚀 [Proyecto] "${proy.titulo}"${metaProy}${limiteProy}`
          );

          if (entsDelProy.length === 0) {
            lineasJerarquia.push(
              `        └─ ℹ️ (Proyecto simple/directo sin entregables — Opcional)`
            );
          } else {
            for (const ent of entsDelProy) {
              const metaEnt = ent.cantidadObjetivo
                ? ` · Meta: ${ent.cantidadObjetivo} ${ent.unidad ?? ""}`
                : "";
              const limiteEnt = ent.diaLimite
                ? ` · Vence: ${ent.diaLimite}`
                : "";
              const tieneSop = actividades.some(
                (a) => a.entregableId === ent.id && Boolean(a.procedimientoId)
              );
              const sopTexto = tieneSop ? " [📋 Con Procedimiento/SOP]" : "";

              lineasJerarquia.push(
                `        ├─ 📦 [Entregable] "${ent.titulo}"${sopTexto}${metaEnt}${limiteEnt}`
              );
            }
          }
        }
      }
    }
  }

  const resumenJerarquia = lineasJerarquia.join("\n");

  return `<rol>
Actúa como consultor senior en productividad, planificación estratégica personal y diseño de sistemas de ejecución.
Tu misión es auditar y revisar en profundidad la configuración del Área "${areaNombre}" que el usuario ha diseñado en MateCode 2.0 (Etapas 1, 2 y 3).
</rol>

<area_a_auditar>
Área: "${areaNombre}"
Total Objetivos: ${objetivos.length}
Total Proyectos: ${proyectos.length}
Total Entregables definidos: ${entregables.length}
</area_a_auditar>

<mapa_de_planificacion_actual>
${resumenJerarquia}
</mapa_de_planificacion_actual>

<criterios_de_auditoria_a_evaluar>
Analizá críticamente los siguientes 5 puntos:
1. **Alineación y Claridad**: ¿Los objetivos son realmente medibles y cuantificables? ¿Los proyectos atacan directamente lo que mueve la aguja o hay proyectos redundantes/distractores?
2. **Suficiencia de Entregables**: ¿Los entregables cubren el alcance de los proyectos o hay vacíos evidentes? Recordá que algunos proyectos simples son directos y es correcto que no tengan entregables.
3. **Estandarización (SOPs)**: ¿Las tareas repetitivas o técnicas tienen su SOP/procedimiento para ejecutarse sin fricción?
4. **Viabilidad Temporal y Sobrecarga**: ¿Las fechas límite tienen una secuencia lógica o hay demasiados proyectos compitiendo al mismo tiempo?
5. **Recomendaciones Concretas**: Da 3 a 5 sugerencias puntuales (mejoras de redacción, metas numéricas más precisas, o simplificaciones) para que este plan sea 100% accionable.
</criterios_de_auditoria_a_evaluar>

Por favor, comenzá tu respuesta con un diagnóstico general (Semáforo: 🟢 Excelente / 🟡 Requiere ajustes menores / 🔴 Riesgo de sobrecarga o desalineación), seguido del análisis detallado punto por punto.`;
}

export interface AreaCompletaAuditoriaInput {
  id: string;
  nombre: string;
}

/**
 * Genera un reporte exhaustivo de TODO el sistema (todas las Áreas, Objetivos, Proyectos,
 * Entregables con SOPs y Actividades/Fases agendadas) listo para copiar o auditar con una IA.
 */
export function generarPromptPlanificacionCompleta(
  areas: AreaCompletaAuditoriaInput[],
  objetivos: (ObjetivoAuditoriaInput & { areaId?: string })[],
  proyectos: ProyectoAuditoriaInput[],
  entregables: EntregableAuditoriaInput[],
  actividades: (ActividadAuditoriaInput & {
    descripcion?: string;
    diaTarea?: string;
    tipo?: string;
  })[] = [],
  fases: { entregableId: string; titulo: string }[] = []
): string {
  const lineas: string[] = [];

  for (const a of areas) {
    lineas.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lineas.push(`🌐 ÁREA: "${a.nombre}"`);
    lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const objsArea = objetivos.filter((o) => o.areaId === a.id);
    if (objsArea.length === 0) {
      lineas.push(`  (Sin objetivos configurados)`);
      continue;
    }

    for (const obj of objsArea) {
      const metaObj = obj.cantidadObjetivo
        ? ` · Meta: ${obj.cantidadObjetivo} ${obj.unidad ?? ""}`
        : "";
      const limiteObj = obj.diaLimite ? ` · Vence: ${obj.diaLimite}` : "";
      lineas.push(`  📁 [Objetivo] "${obj.titulo}"${metaObj}${limiteObj}`);

      const proysObj = proyectos.filter((p) => p.objetivoId === obj.id);
      if (proysObj.length === 0) {
        lineas.push(`     └─ ⚠️ [Sin proyectos definidos]`);
        continue;
      }

      for (const proy of proysObj) {
        const metaProy = proy.cantidadObjetivo
          ? ` · Meta: ${proy.cantidadObjetivo} ${proy.unidad ?? ""}`
          : "";
        const limiteProy = proy.diaLimite ? ` · Vence: ${proy.diaLimite}` : "";
        lineas.push(
          `     └─ 🚀 [Proyecto] "${proy.titulo}"${metaProy}${limiteProy}`
        );

        const entsProy = entregables.filter((e) => e.proyectoId === proy.id);
        if (entsProy.length === 0) {
          lineas.push(
            `          └─ ℹ️ (Proyecto directo / sin entregables — Opcional)`
          );
          continue;
        }

        for (const ent of entsProy) {
          const metaEnt = ent.cantidadObjetivo
            ? ` · Meta: ${ent.cantidadObjetivo} ${ent.unidad ?? ""}`
            : "";
          const limiteEnt = ent.diaLimite ? ` · Vence: ${ent.diaLimite}` : "";
          const actsEnt = actividades.filter(
            (act) => act.entregableId === ent.id
          );
          const fasesEnt = fases.filter((f) => f.entregableId === ent.id);
          const tieneSop = actsEnt.some((act) => Boolean(act.procedimientoId));
          const sopTag = tieneSop ? " [📋 Con SOP]" : "";

          lineas.push(
            `          ├─ 📦 [Entregable] "${ent.titulo}"${sopTag}${metaEnt}${limiteEnt}`
          );

          if (fasesEnt.length > 0) {
            lineas.push(
              `               ├─ 📅 Fases: ${fasesEnt.map((f) => f.titulo).join(" · ")}`
            );
          }

          if (actsEnt.length > 0) {
            lineas.push(
              `               └─ ⚡ ${actsEnt.length} actividad(es) agendada(s) en el Búnker`
            );
          } else {
            lineas.push(
              `               └─ ○ Sin agenda diaria cargada todavía`
            );
          }
        }
      }
    }
  }

  const mapaTexto = lineas.join("\n");

  return `<rol>
Actúa como consultor senior en productividad, estrategia y arquitectura de sistemas de vida y negocio.
A continuación tenés el mapa COMPLETO de planificación de MateCode 2.0 (todas las Áreas, Objetivos, Proyectos, Entregables y Actividades).
</rol>

<sistema_completo_matecode>
Total Áreas: ${areas.length}
Total Objetivos: ${objetivos.length}
Total Proyectos: ${proyectos.length}
Total Entregables: ${entregables.length}
Total Actividades agendadas: ${actividades.length}

${mapaTexto}
</sistema_completo_matecode>

<instrucciones_de_auditoria_integral>
Realizá un análisis integral del sistema completo:
1. **Balance de Vida y Focos Concurrentes**: ¿El balance entre las áreas es sostenible o hay una concentración desmedida en un solo frente en detrimento de la salud o el descanso?
2. **Coherencia Vertical**: ¿Cada entregable y proyecto realmente mueve la aguja de su objetivo superior?
3. **Factibilidad Operativa**: ¿La carga diaria y semanal es realista considerando los límites de energía del Búnker?
4. **Resumen Ejecutivo**: Destacá los 3 principales frentes que darán el 80% de los resultados en las próximas 4 semanas.
</instrucciones_de_auditoria_integral>`;
}
