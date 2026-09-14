import type { CatalogoEjercicio } from "../entidades/ejercicio.entity";
import type { BloqueEntrenamiento } from "../entidades/rutina.entity";

/**
 * Prompt para armar rutinas con IA: a diferencia de la plantilla JSON sola
 * (que ya existía), acá se le pasa a la IA el catálogo de ejercicios real de
 * la app (para que no invente nombres que después no matchean al importar)
 * y el equipamiento que el usuario realmente tiene, para que no sugiera
 * ejercicios imposibles de hacer.
 */
export function generarPromptRutina(
  catalogo: CatalogoEjercicio[],
  equipamientoPropio: string[]
): string {
  const listaEjercicios = catalogo
    .map((e) => {
      const equipo =
        e.equipamiento.length > 0 ? e.equipamiento.join("/") : "sin equipo";
      return `- ${e.nombre} (patrón: ${e.patron}, equipo: ${equipo})`;
    })
    .join("\n");

  const equipoTexto =
    equipamientoPropio.length > 0
      ? equipamientoPropio.join(", ")
      : "ninguno registrado (asumí solo peso corporal)";

  return `<rol>
Actúa como entrenador personal senior, diseñando una rutina de entrenamiento.
</rol>

<catalogo_de_ejercicios_disponibles>
Usá EXCLUSIVAMENTE ejercicios de esta lista (nombre EXACTO, no inventes ni traduzcas nombres nuevos — si no hay un ejercicio que se ajuste bien, elegí el más parecido de la lista):
${listaEjercicios}
</catalogo_de_ejercicios_disponibles>

<equipamiento_disponible>
El usuario solo tiene: ${equipoTexto}. No sugieras ejercicios que necesiten equipamiento fuera de esta lista (los que dicen "sin equipo" siempre están permitidos).
</equipamiento_disponible>

<instrucciones>
1. Preguntame lo que necesites antes de armar la rutina: objetivo (fuerza, hipertrofia, resistencia, movilidad), días por semana, tiempo disponible por sesión, y cualquier limitación física. No generes el JSON hasta que te confirme que tenés todo lo necesario.
2. Incluí siempre una entrada en calor (campo "calentamiento", texto breve — ej. "5 min de cinta + movilidad de cadera y hombro"), no forma parte de los sets planificados.
3. Los nombres de ejercicio en el JSON final deben coincidir EXACTO con el catálogo de arriba.
</instrucciones>

<output_requerido>
Cuando ya tengas todo confirmado, devolvé ÚNICAMENTE un array JSON con esta estructura (sin texto adicional, sin bloques de código extra):
[
  {
    "nombre": "Nombre de la rutina",
    "formato": "tradicional" | "piramide" | "superserie" | "circuito" | "tabata" | "emom" | "amrap" | "for_time" | "liss" | "pausa_activa",
    "calentamiento": "Descripción breve de la entrada en calor",
    "ejercicios": [
      { "nombre": "Nombre EXACTO del catálogo", "series": 3, "reps": 10, "pesoKg": null }
    ],
    "numeroRondas": 8,
    "tiempoTrabajoSeg": 20,
    "tiempoDescansoSeg": 10
  }
]
Nota: "ejercicios" para formatos de tiempo (tabata/emom/amrap/for_time/circuito/liss/pausa_activa) puede ser directamente un array de nombres (strings), igual que para formatos de series.
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
