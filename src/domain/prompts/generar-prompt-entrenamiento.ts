import type { CatalogoEjercicio } from "../entidades/ejercicio.entity";
import type {
  BloqueEntrenamiento,
  PlantillaRutina,
  EstructuraSeries,
  EstructuraTiempo,
} from "../entidades/rutina.entity";

const NOTA_ANTIDUPLICADO = `Antes de crear una Rutina o un Ejercicio nuevo, revisá si ya existe algo con ese nombre EXACTO en las listas de abajo. Si existe: para una Rutina, repetí su nombre tal cual (con la estructura que quieras — se actualiza, no se duplica: es la forma de "mantener igual" si repetís los mismos números, o "ajustar" si los cambiás). Para un Ejercicio, usá directamente ese nombre en "ejercicios", no lo repitas en "ejerciciosNuevos". Solo creá algo nuevo (Rutina o Ejercicio) si genuinamente no existe nada parecido — y en ese caso, un nombre distinto y claro.`;

const NOTA_PESO_CORPORAL = `Un ejercicio de peso corporal (el catálogo lo marca sin equipo y sin carga externa) NUNCA lleva "pesoKg" — omitilo directamente (no pongas 0 ni 1 ni ningún número inventado). Poné "pesoKg" únicamente en ejercicios que sí admiten carga externa (mancuernas, barra, etc.).`;

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
2. Incluí siempre una entrada en calor (campo "calentamiento", texto breve — ej. "5 min de cinta + movilidad de cadera y hombro"), no forma parte de los sets planificados.
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
    "calentamiento": "Descripción breve de la entrada en calor",
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
  resumenProgresoBloqueActivo: string
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

<instrucciones>
1. Preguntame el objetivo de este bloque (qué eje de progresión, cuánto tiempo, qué cambia respecto al bloque anterior) antes de generar nada.
2. Si hay progreso real del bloque activo, usalo para calibrar los números nuevos (ej. si en Sentadilla búlgara se llegó a 22kg, el próximo bloque parte de ahí, no de cero) — NO inventes un número de cero si ya hay historia real.
3. ${NOTA_ANTIDUPLICADO}
4. ${NOTA_PESO_CORPORAL}
5. El Bloque necesita nombre, fecha límite ("diaFin"), y eje de progresión — "diaInicio" es opcional (si no lo das, arranca hoy).
6. Cada Rutina necesita "diasSemana": los días de la semana en que se repite dentro de este bloque, como números (0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado) — preguntame qué días le corresponden a cada una. Si no lo especificás, asumo de lunes a viernes.
</instrucciones>

<output_requerido>
Cuando ya tengas todo confirmado, devolvé ÚNICAMENTE un objeto JSON con esta estructura (sin texto adicional):
{
  "bloque": {
    "nombre": "Bloque 2 — Fuerza",
    "diaInicio": "YYYY-MM-DD",
    "diaFin": "YYYY-MM-DD",
    "ejeProgresionDefault": "carga" | "volumen" | "progresion"
  },
  "rutinas": [
    {
      "nombre": "Empuje A",
      "formato": "tradicional",
      "calentamiento": "...",
      "ejercicios": [
        { "nombre": "Nombre EXACTO (existente o de ejerciciosNuevos)", "series": 4, "reps": 8, "pesoKg": 12 }
      ],
      "diasSemana": [1, 3, 5]
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
      "niveles": []
    }
  ]
}
Nota: "ejercicios" para formatos de tiempo (tabata/emom/amrap/for_time/circuito/liss/pausa_activa) puede ser directamente un array de nombres (strings). "ejerciciosNuevos" puede quedar vacío ([]) si no hace falta ninguno.
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
