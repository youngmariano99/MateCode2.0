import type { CatalogoEjercicio } from "../entidades/ejercicio.entity";
import type {
  BloqueEntrenamiento,
  PlantillaRutina,
  EstructuraSeries,
  EstructuraTiempo,
} from "../entidades/rutina.entity";

const NOTA_ANTIDUPLICADO = `Antes de crear una Rutina o un Ejercicio nuevo, revisá si ya existe algo con ese nombre EXACTO en las listas de abajo. Si existe: para una Rutina, repetí su nombre tal cual (con la estructura que quieras — se actualiza, no se duplica: es la forma de "mantener igual" si repetís los mismos números, o "ajustar" si los cambiás). Para un Ejercicio, usá directamente ese nombre en "ejercicios", no lo repitas en "ejerciciosNuevos". Solo creá algo nuevo (Rutina o Ejercicio) si genuinamente no existe nada parecido — y en ese caso, un nombre distinto y claro.`;

const NOTA_PESO_CORPORAL = `Un ejercicio de peso corporal (el catálogo lo marca sin equipo y sin carga externa) NUNCA lleva "pesoKg" — omitilo directamente (no pongas 0 ni 1 ni ningún número inventado). Poné "pesoKg" únicamente en ejercicios que sí admiten carga externa (mancuernas, barra, etc.).`;

const NOTA_PROGRESION = `PROGRESIÓN — dentro de un bloque las rutinas NO se repiten iguales todas las semanas: cada ejercicio tiene su propia regla ("progresion") para que el plan cambie semana a semana. La semana 1 (paso 1) son los números base; desde el paso 2 se aplican las reglas. Formas de progresar ("tipo"): "reps", "series", "carga" (kg), "nivel" (subir la DIFICULTAD dentro de la escalera del ejercicio — solo si el ejercicio tiene niveles), "tiempo" (segundos) y "distancia"; para rutinas por tiempo/rondas ("progresionTiempo" a nivel rutina): "rondas", "tiempo_trabajo" y "tiempo_descanso". Una regla es { "tipo", "incremento", "cadaSemanas" (1 = todas las semanas), "desdeSemana" (paso desde el que empieza, por defecto 2), "tope" }. Un ejercicio puede tener varias reglas a la vez (ej. +1 rep por semana hasta 12 y +2 kg cada 3 semanas). CADA EJERCICIO PROGRESA A SU MANERA: los de peso corporal NUNCA llevan "carga" — progresan por reps, series, tiempo o nivel de dificultad; los de carga externa progresan por kg, reps o series. Si un ejercicio no debe progresar, ponele "progresion": "ninguna". Podés agregar una "progresionGeneral" a nivel rutina (aplica a los ejercicios que no tienen la suya, y solo a los que les sirve: los kg a los que llevan carga, el nivel a los que tienen escalera). Los ejercicios que se cuentan por tiempo (ej. plancha, caminata) llevan el número en "reps" como SEGUNDOS y progresan con el tipo "reps". Si el ejercicio ya tiene una escalera de niveles en el catálogo, preferí subir la dificultad ("nivel", con "nivel" base indicado en el ejercicio; 0 = versión base) antes que inventar un ejercicio nuevo. En todo bloque de más de 3 semanas tiene que haber progresión en los ejercicios principales: NO entregues un bloque plano.`;

const NOTA_MINIMOS = `MÍNIMOS — cada ejercicio con progresión lleva "minimo" ({ "series", "reps", "pesoKg", "nivel", "tiempoSeg" }, los que apliquen): es el piso al que el plan nunca baja, ni por una semana de descarga ni por una regla negativa, y lo que cuenta como cumplido en un día flojo. Normalmente es el valor base o un poco menos.`;

const NOTA_DESCARGA = `DESCARGA — en bloques de 4 semanas o más incluí una semana de descarga con "descargas" en el bloque: [{ "paso": 4, "factor": 0.7 }] (paso = semana de progresión; 0,7 = se entrena al 70 % del volumen y la carga, sin bajar de los mínimos).`;

const NOTA_CALENTAMIENTO = `CALENTAMIENTO → DESARROLLO — toda rutina (menos las de pausa_activa) tiene dos partes bien armadas: "calentamiento" es una LISTA de ejercicios con cantidades ([{ "nombre": "...", "series": 2, "reps": 10 }] o con "tiempoSeg", y "nota" opcional como "por lado") y "ejercicios" es el desarrollo (series, reps, kg, nivel). No uses texto libre para el calentamiento.`;

const NOTA_CONTINUIDAD = `CONTINUIDAD ENTRE BLOQUES — el bloque nuevo parte de donde terminó el anterior: usá el último plan del bloque activo y el progreso real (abajo). No vuelvas a números más bajos salvo que sea una descarga o un cambio de fase que yo pida. Si un ejercicio llegó a su tope, cambiá la forma de progresar (ej. de reps a nivel de dificultad).`;

const NOTA_REUSO = `REUSO — si repetís el nombre exacto de una rutina existente se actualiza, y los bloques anteriores conservan su versión (podés reusar el nombre con números nuevos). Las pausas activas que sean iguales, reusalas por nombre en vez de duplicarlas. No declares "ejerciciosNuevos" que no uses en ninguna rutina. En los formatos de tiempo (circuito, tabata, emom, amrap, for_time, liss) completá siempre "numeroRondas", "tiempoTrabajoSeg" y "tiempoDescansoSeg" cuando corresponda.`;

const FORMATO_BLOQUE = `{
  "bloque": {
    "nombre": "Bloque 2 — Fuerza",
    "diaInicio": "YYYY-MM-DD",
    "diaFin": "YYYY-MM-DD",
    "ejeProgresionDefault": "carga" | "volumen" | "progresion",
    "descargas": [{ "paso": 4, "factor": 0.7 }]
  },
  "rutinas": [
    {
      "nombre": "Empuje A",
      "formato": "tradicional",
      "calentamiento": [
        { "nombre": "Movilidad de hombro con banda", "series": 2, "reps": 10 },
        { "nombre": "Plancha", "series": 2, "tiempoSeg": 20 }
      ],
      "ejercicios": [
        {
          "nombre": "Nombre EXACTO (existente o de ejerciciosNuevos)",
          "series": 4, "reps": 8, "pesoKg": 12,
          "progresion": [
            { "tipo": "carga", "incremento": 2, "cadaSemanas": 2, "tope": 20 },
            { "tipo": "reps", "incremento": 1, "cadaSemanas": 1, "tope": 12 }
          ],
          "minimo": { "series": 3, "reps": 6, "pesoKg": 10 }
        },
        {
          "nombre": "Ejercicio de peso corporal con escalera de niveles",
          "series": 3, "reps": 8, "nivel": 0,
          "progresion": { "tipo": "nivel", "incremento": 1, "cadaSemanas": 2, "tope": 2 },
          "minimo": { "reps": 6, "nivel": 0 }
        },
        { "nombre": "Ejercicio que no progresa", "series": 2, "reps": 20, "progresion": "ninguna" }
      ],
      "progresionGeneral": [{ "tipo": "series", "incremento": 1, "desdeSemana": 4, "tope": 4 }],
      "diasSemana": [1, 3, 5]
    },
    {
      "nombre": "Circuito de piques",
      "formato": "circuito",
      "calentamiento": [{ "nombre": "Trote suave", "tiempoSeg": 300 }],
      "ejercicios": ["Nombre EXACTO del ejercicio"],
      "numeroRondas": 6,
      "tiempoTrabajoSeg": 15,
      "tiempoDescansoSeg": 15,
      "progresionTiempo": [{ "tipo": "rondas", "incremento": 1, "cadaSemanas": 2, "tope": 10 }],
      "diasSemana": [5]
    }
  ],
  "ejerciciosNuevos": [
    {
      "nombre": "...",
      "patron": "empuje" | "tiron" | "dominante_rodilla" | "dominante_cadera" | "core_transporte" | "pausa_movilidad" | "neat",
      "tipoConteo": "repes" | "tiempo" | "distancia",
      "modoConteo": "global" | "por_lado",
      "equipamiento": [],
      "permiteCarga": true,
      "esPausaActiva": false,
      "esNeat": false,
      "niveles": [{ "nivel": 0, "nombre": "Versión base", "detalle": "..." }, { "nivel": 1, "nombre": "Más difícil", "detalle": "..." }]
    }
  ]
}`;

function listaCatalogo(catalogo: CatalogoEjercicio[]): string {
  return catalogo
    .map((e) => {
      const equipo =
        e.equipamiento.length > 0 ? e.equipamiento.join("/") : "sin equipo";
      return `- ${e.nombre} (patrón: ${e.patron}, equipo: ${equipo}${e.esPausaActiva ? ", pausa activa" : ""})`;
    })
    .join("\n");
}

function textoEquipamiento(equipamientoPropio: string[]): string {
  return equipamientoPropio.length > 0
    ? equipamientoPropio.join(", ")
    : "ninguno registrado (asumí solo peso corporal)";
}

/** Resume la estructura actual de una Rutina en una línea legible, resolviendo ejercicioId -> nombre contra el catálogo. */
function resumenEstructuraRutina(
  rutina: PlantillaRutina,
  catalogo: CatalogoEjercicio[]
): string {
  const nombrePorId = new Map(catalogo.map((e) => [e.id, e.nombre]));
  if (rutina.tipoEstructura === "series") {
    const estructura = rutina.estructura as EstructuraSeries;
    return estructura.bloques
      .map((b) => {
        const nombre = nombrePorId.get(b.ejercicioId) || b.ejercicioId;
        const setsTexto = b.sets
          .map(
            (s) =>
              `${s.reps ?? s.tiempoSeg ?? "?"}${s.pesoKg ? `@${s.pesoKg}kg` : ""}`
          )
          .join("/");
        return `${nombre} (${b.sets.length}x: ${setsTexto})`;
      })
      .join(", ");
  }
  const estructura = rutina.estructura as EstructuraTiempo;
  const nombres = estructura.ejercicioIds
    .map((id) => nombrePorId.get(id) || id)
    .join(", ");
  const detalle = [
    estructura.numeroRondas && `${estructura.numeroRondas} rondas`,
    estructura.tiempoTrabajoSeg && `${estructura.tiempoTrabajoSeg}s trabajo`,
    estructura.tiempoDescansoSeg && `${estructura.tiempoDescansoSeg}s descanso`,
    estructura.tiempoLimiteMin && `límite ${estructura.tiempoLimiteMin}min`,
  ]
    .filter(Boolean)
    .join(", ");
  return `${nombres}${detalle ? ` (${detalle})` : ""}`;
}

function listaRutinasExistentes(
  rutinas: PlantillaRutina[],
  catalogo: CatalogoEjercicio[]
): string {
  if (rutinas.length === 0) return "Sin rutinas todavía.";
  return rutinas
    .map(
      (r) =>
        `- "${r.nombre}" (formato: ${r.formato}) — ${resumenEstructuraRutina(r, catalogo)}`
    )
    .join("\n");
}

/**
 * Prompt para armar rutinas con IA: a diferencia de la plantilla JSON sola
 * (que ya existía), acá se le pasa a la IA el catálogo de ejercicios real de
 * la app (para que no invente nombres que después no matchean al importar),
 * el equipamiento que el usuario realmente tiene, y las Rutinas que ya
 * existen (para no duplicarlas — mismo nombre exacto = se actualiza esa,
 * no se crea una nueva).
 */
export function generarPromptRutina(
  catalogo: CatalogoEjercicio[],
  equipamientoPropio: string[],
  rutinasExistentes: PlantillaRutina[]
): string {
  return `<rol>
Actúa como entrenador personal senior, diseñando una rutina de entrenamiento.
</rol>

<catalogo_de_ejercicios_disponibles>
Usá EXCLUSIVAMENTE ejercicios de esta lista (nombre EXACTO, no inventes ni traduzcas nombres nuevos — si no hay un ejercicio que se ajuste bien, elegí el más parecido de la lista):
${listaCatalogo(catalogo)}
</catalogo_de_ejercicios_disponibles>

<equipamiento_disponible>
El usuario solo tiene: ${textoEquipamiento(equipamientoPropio)}. No sugieras ejercicios que necesiten equipamiento fuera de esta lista (los que dicen "sin equipo" siempre están permitidos).
</equipamiento_disponible>

<rutinas_existentes>
${listaRutinasExistentes(rutinasExistentes, catalogo)}
</rutinas_existentes>

<instrucciones>
1. Preguntame lo que necesites antes de armar la rutina: objetivo (fuerza, hipertrofia, resistencia, movilidad), días por semana, tiempo disponible por sesión, y cualquier limitación física. No generes el JSON hasta que te confirme que tenés todo lo necesario.
2. ${NOTA_CALENTAMIENTO} La entrada en calor no forma parte de los sets planificados del desarrollo.
3. Los nombres de ejercicio en el JSON final deben coincidir EXACTO con el catálogo de arriba.
4. ${NOTA_ANTIDUPLICADO}
5. ${NOTA_PESO_CORPORAL}
</instrucciones>

<output_requerido>
Cuando ya tengas todo confirmado, devolvé ÚNICAMENTE un array JSON con esta estructura (sin texto adicional, sin bloques de código extra):
[
  {
    "nombre": "Nombre de la rutina",
    "formato": "tradicional" | "piramide" | "superserie" | "circuito" | "tabata" | "emom" | "amrap" | "for_time" | "liss" | "pausa_activa",
    "calentamiento": [{ "nombre": "Movilidad de cadera", "series": 2, "reps": 10, "nota": "por lado" }, { "nombre": "Trote suave", "tiempoSeg": 300 }],
    "ejercicios": [
      { "nombre": "Ejercicio de peso corporal", "series": 3, "reps": 10 },
      { "nombre": "Ejercicio con carga externa", "series": 3, "reps": 10, "pesoKg": 12 }
    ],
    "numeroRondas": 8,
    "tiempoTrabajoSeg": 20,
    "tiempoDescansoSeg": 10
  }
]
Nota: "ejercicios" para formatos de tiempo (tabata/emom/amrap/for_time/circuito/liss/pausa_activa) puede ser directamente un array de nombres (strings), igual que para formatos de series. Fijate arriba: al ejercicio de peso corporal directamente no se le puso "pesoKg" — así tiene que ser.
</output_requerido>`;
}

/**
 * Prompt para armar una secuencia de bloques con progresión (mesociclos
 * encadenados) — a diferencia de crear un bloque a la vez a mano.
 */
export function generarPromptSecuenciaBloques(
  bloqueActivo: BloqueEntrenamiento | null
): string {
  const contextoActivo = bloqueActivo
    ? `Ya hay un bloque activo: "${bloqueActivo.nombre}" (eje: ${bloqueActivo.ejeProgresionDefault}, termina ${bloqueActivo.diaFin}). La secuencia que armes va a empezar DESPUÉS de que termine ese.`
    : "No hay ningún bloque activo todavía — la secuencia arranca hoy.";

  return `<rol>
Actúa como entrenador personal senior, planificando la periodización de varios mesociclos (bloques) consecutivos.
</rol>

<contexto>
${contextoActivo}
Los 3 ejes de progresión posibles son: "carga" (kg), "volumen" (reps/series), "progresion" (nivel de dificultad del ejercicio).
</contexto>

<instrucciones>
Preguntame el objetivo general (ej. "quiero pasar de volumen a fuerza en 3 meses"), cuántos bloques querés y cuánto dura cada uno en semanas, antes de responder. No generes el JSON hasta confirmar.
</instrucciones>

<output_requerido>
Cuando ya tengas todo confirmado, devolvé ÚNICAMENTE un array JSON con esta estructura, en el orden en que deben ejecutarse (sin fechas — se calculan solas a partir de cuándo termine el bloque anterior):
[
  {
    "nombre": "Bloque 1 — Volumen",
    "duracionSemanas": 4,
    "ejeProgresionDefault": "volumen" | "carga" | "progresion"
  }
]
</output_requerido>`;
}

/**
 * Prompt unificado "Armar Bloque con IA" (Sprint 22) — un solo prompt/JSON
 * arma el Bloque completo: sus Rutinas (reusando o ajustando las que ya
 * existen por nombre, o creando nuevas) y los Ejercicios que hagan falta
 * (respetando SIEMPRE el equipamiento real, nunca inventándolo). Incluye el
 * progreso REAL del bloque activo (armado por el caller vía
 * calcularMejoraEjercicio sobre RegistroActividad) para que la progresión
 * del bloque nuevo se base en desempeño real, no en la plantilla teórica.
 */
export function generarPromptBloqueCompleto(
  catalogo: CatalogoEjercicio[],
  equipamientoPropio: string[],
  rutinasExistentes: PlantillaRutina[],
  bloquesExistentes: BloqueEntrenamiento[],
  resumenProgresoBloqueActivo: string,
  ultimoPlanBloqueActivo = ""
): string {
  const bloquesTexto =
    bloquesExistentes.length > 0
      ? bloquesExistentes
          .map(
            (b) =>
              `- "${b.nombre}" (${b.estado}, eje: ${b.ejeProgresionDefault}) — ${b.diaInicio} → ${b.diaFin}`
          )
          .join("\n")
      : "Sin bloques todavía.";

  return `<rol>
Actúa como entrenador personal senior, armando un Bloque de entrenamiento (mesociclo) completo: sus Rutinas y, si hace falta, Ejercicios nuevos.
</rol>

<catalogo_de_ejercicios_disponibles>
Usá EXCLUSIVAMENTE ejercicios de esta lista para lo que ya existe (nombre EXACTO) — si necesitás algo que genuinamente no está, declaralo en "ejerciciosNuevos" (ver output):
${listaCatalogo(catalogo)}
</catalogo_de_ejercicios_disponibles>

<equipamiento_disponible>
El usuario solo tiene: ${textoEquipamiento(equipamientoPropio)}. Ni las Rutinas ni los Ejercicios nuevos pueden necesitar equipamiento fuera de esta lista — no lo inventes ni lo amplíes, es fijo. Los ejercicios "sin equipo" siempre están permitidos.
</equipamiento_disponible>

<rutinas_existentes>
${listaRutinasExistentes(rutinasExistentes, catalogo)}
</rutinas_existentes>

<bloques_existentes>
${bloquesTexto}
</bloques_existentes>

<progreso_real_del_bloque_activo>
${resumenProgresoBloqueActivo || "No hay bloque activo, o todavía no hay sesiones registradas."}
</progreso_real_del_bloque_activo>

<ultimo_plan_del_bloque_activo>
${ultimoPlanBloqueActivo || "No hay bloque activo: el primer bloque arranca desde los números base que elijamos."}
</ultimo_plan_del_bloque_activo>

<como_funciona_el_plan>
Un Bloque dura varias semanas. Cada semana tiene un "paso" de progresión (1, 2, 3…). Las rutinas se repiten los mismos días todas las semanas, pero sus números CAMBIAN según las reglas de progresión de cada ejercicio. Si una semana no se puede hacer, la app la repite (mismo paso) y alarga el bloque; el usuario puede adelantar o frenar la progresión y reestructurar los bloques. Por eso el plan tiene que tener la progresión escrita, no solo números fijos.
</como_funciona_el_plan>

<instrucciones>
1. Preguntame el objetivo de este bloque (qué eje de progresión, cuánto tiempo, qué cambia respecto al bloque anterior) y cómo quiero progresar en cada tipo de ejercicio, antes de generar nada.
2. ${NOTA_CONTINUIDAD}
3. ${NOTA_PROGRESION}
4. ${NOTA_MINIMOS}
5. ${NOTA_DESCARGA}
6. ${NOTA_CALENTAMIENTO}
7. ${NOTA_ANTIDUPLICADO}
8. ${NOTA_PESO_CORPORAL}
9. ${NOTA_REUSO}
10. El Bloque necesita nombre, fecha límite ("diaFin"), y eje de progresión — "diaInicio" es opcional (si no lo das, arranca hoy). Usá semanas completas (lunes a domingo).
11. Cada Rutina necesita "diasSemana": los días de la semana en que se repite dentro de este bloque, como números (0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado) — preguntame qué días le corresponden a cada una. Si no lo especificás, asumo de lunes a viernes.
12. Si pido varios Bloques encadenados de una sola vez (ej. "planificame los próximos 3 meses"), cada uno con su propio "diaInicio"/"diaFin" consecutivo (el siguiente arranca el día después de que termina el anterior) y cada uno con su progresión, continuando desde donde terminó el anterior — ver "output_requerido" para el formato con varios.
13. ANTES del JSON mostrame un resumen por bloque: qué progresa cada ejercicio y cómo (semana 1 → última semana), los mínimos y la descarga, para que yo lo confirme.
</instrucciones>

<output_requerido>
Cuando ya tengas todo confirmado, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
${FORMATO_BLOQUE}
Notas: "ejercicios" para formatos de tiempo (tabata/emom/amrap/for_time/circuito/liss/pausa_activa) puede ser directamente un array de nombres (strings). "ejerciciosNuevos" puede quedar vacío ([]) si no hace falta ninguno. "progresion", "minimo", "progresionGeneral", "progresionTiempo" y "descargas" son opcionales por sintaxis pero OBLIGATORIOS por criterio en los bloques de más de 3 semanas (ver instrucciones).
Si pedí varios Bloques a la vez, devolvé un ARRAY de objetos con esta misma estructura (uno por Bloque, en orden): [ { "bloque": {...}, "rutinas": [...], "ejerciciosNuevos": [...] }, { ... } ] — cada uno se crea como un Bloque independiente.
</output_requerido>`;
}

/**
 * Prompt para armar una tanda de Rutinas de pausa activa (Sprint 22) — sin
 * Bloque ni fechas, es una biblioteca que se arma de a poco: cada vez que
 * se usa, agrega variedad nueva sin duplicar lo que ya existe.
 */
export function generarPromptPausasActivas(
  catalogo: CatalogoEjercicio[],
  equipamientoPropio: string[],
  rutinasPausaActivaExistentes: PlantillaRutina[]
): string {
  const catalogoPausaActiva = catalogo.filter((e) => e.esPausaActiva);
  return `<rol>
Actúa como entrenador personal senior, armando una tanda de rutinas de PAUSA ACTIVA (micro-rutinas cortas para cortar el sedentarismo durante el día — no son sesiones de entrenamiento completas).
</rol>

<ejercicios_de_pausa_activa_disponibles>
Usá EXCLUSIVAMENTE ejercicios marcados como pausa activa (nombre EXACTO) — si necesitás uno que no está, declaralo en "ejerciciosNuevos" con "esPausaActiva": true:
${listaCatalogo(catalogoPausaActiva)}
</ejercicios_de_pausa_activa_disponibles>

<equipamiento_disponible>
El usuario solo tiene: ${textoEquipamiento(equipamientoPropio)}. No sugieras nada que necesite equipamiento fuera de esta lista.
</equipamiento_disponible>

<rutinas_de_pausa_activa_existentes>
${listaRutinasExistentes(rutinasPausaActivaExistentes, catalogo)}
</rutinas_de_pausa_activa_existentes>

<instrucciones>
1. Preguntame cuántas rutinas de pausa activa querés armar esta vez y si hay alguna zona del cuerpo o necesidad puntual (hombros, cadera, vista, movilidad general).
2. Cada rutina tiene que ser corta (2-5 minutos), formato "pausa_activa" siempre.
3. ${NOTA_ANTIDUPLICADO}
</instrucciones>

<output_requerido>
Cuando ya tengas todo confirmado, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "rutinasNuevas": [
    {
      "nombre": "Pausa hombros",
      "formato": "pausa_activa",
      "ejercicios": ["Nombre EXACTO del catálogo de pausa activa"]
    }
  ],
  "ejerciciosNuevos": []
}
</output_requerido>`;
}

/**
 * Prompt para REESTRUCTURAR los bloques vigentes: la IA recibe todo el
 * contexto (planes, reglas, qué se hizo y qué no, decisiones anteriores) más
 * lo que el usuario quiere cambiar, y devuelve los bloques con sus cambios.
 * Al importarlo, los bloques con el mismo nombre se REEMPLAZAN (sin perder
 * las sesiones ya registradas, y dejando el estado anterior en el historial).
 */
export function generarPromptReestructurar(
  catalogo: CatalogoEjercicio[],
  equipamientoPropio: string[],
  contextoBloques: string,
  pedidoUsuario: string
): string {
  return `<rol>
Actúa como entrenador personal senior, REESTRUCTURANDO los bloques de entrenamiento que ya están en marcha a partir de lo que realmente pasó (qué se hizo, qué no, qué resultó fácil o difícil) y de lo que quiero cambiar.
</rol>

<catalogo_de_ejercicios_disponibles>
Usá EXCLUSIVAMENTE ejercicios de esta lista (nombre EXACTO) — si necesitás algo que no está, declaralo en "ejerciciosNuevos":
${listaCatalogo(catalogo)}
</catalogo_de_ejercicios_disponibles>

<equipamiento_disponible>
El usuario solo tiene: ${textoEquipamiento(equipamientoPropio)}. No sugieras nada que necesite equipamiento fuera de esta lista (los ejercicios "sin equipo" siempre están permitidos).
</equipamiento_disponible>

<bloques_vigentes_y_lo_que_paso>
${contextoBloques || "No hay bloques vigentes."}
</bloques_vigentes_y_lo_que_paso>

<lo_que_quiero_cambiar>
${pedidoUsuario.trim() || "(No escribí nada: proponé los ajustes que veas necesarios según lo que pasó y preguntame antes de generar.)"}
</lo_que_quiero_cambiar>

<como_funciona_el_plan>
Cada bloque tiene semanas con un "paso" de progresión (1, 2, 3…); las rutinas se repiten los mismos días y sus números cambian según las reglas de progresión de cada ejercicio. Las semanas que ya pasaron y las sesiones ya registradas NO se pueden cambiar: tu plan reemplaza lo que falta. Al importar tu JSON, los bloques que se llamen IGUAL que uno vigente lo REEMPLAZAN (mantené el nombre exacto para reemplazarlo), y los que tengan otro nombre se crean nuevos; los bloques vigentes que no incluyas quedan como están.
</como_funciona_el_plan>

<instrucciones>
1. Analizá primero: qué se cumplió, dónde se falló y por qué puede ser (mirá el cumplimiento por semana, lo hecho vs lo planificado y las decisiones registradas). Decime tu diagnóstico en pocas líneas y preguntame lo que necesites confirmar. No generes el JSON hasta que yo confirme.
2. Si algo fue muy fácil, agregá progresión (más rápida, otro tipo de progresión, otro ejercicio más difícil). Si fue mucho, bajá el ritmo: menos progresión, más semanas por paso, descarga, mínimos más conservadores.
3. Los bloques que reestructures parten de las semanas que faltan: las semanas ya hechas no se repiten. Mantené la continuidad con lo que ya se hizo (mismos números de partida que el último plan).
4. ${NOTA_PROGRESION}
5. ${NOTA_MINIMOS}
6. ${NOTA_DESCARGA}
7. ${NOTA_CALENTAMIENTO}
8. ${NOTA_ANTIDUPLICADO}
9. ${NOTA_PESO_CORPORAL}
10. ${NOTA_REUSO}
11. Usá semanas completas (lunes a domingo) y fechas consecutivas entre bloques. Cada rutina lleva "diasSemana" (0=domingo … 6=sábado).
12. ANTES del JSON mostrame qué cambia en cada bloque (antes → después) para que yo lo confirme.
</instrucciones>

<output_requerido>
Cuando ya tengas todo confirmado, devolvé ÚNICAMENTE un ARRAY JSON con un objeto por bloque (los vigentes que cambien, con su nombre EXACTO, y los nuevos si hacen falta), con esta estructura (sin texto adicional):
[
${FORMATO_BLOQUE}
]
</output_requerido>`;
}
