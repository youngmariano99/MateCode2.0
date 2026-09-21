// ============================================================================
// Mínimos aceptables — pensados para el día que no hay ganas de hacer el
// 100%: en cada nivel (Objetivo, Proyecto, Entregable, Fase, Actividad) hay
// un mínimo que "cuenta como cumplido". Todo es lógica pura. El mínimo de un
// nodo sale de su `bandaAceptable` (% de la meta); en la Actividad se guarda
// ya calculado en `cantidadMinima`.
//
// Lo que más importa: que los mínimos de abajo alcancen para el mínimo de
// arriba. Si cumplir SOLO el mínimo de cada día lleva a un total por debajo
// del mínimo del período, hay que enterarse antes de llegar al final.
// ============================================================================

const EPS = 1e-9;

/** Mínimo absoluto de una meta según su banda (% de la meta). Redondea para arriba: nunca queda un mínimo de 0,4. */
export function minimoDe(
  meta: number,
  bandaAceptable: number | undefined
): number | undefined {
  if (bandaAceptable === undefined || !(meta > 0)) return undefined;
  return Math.ceil((meta * bandaAceptable) / 100 - EPS);
}

export type EstadoMinimo =
  /** Sin banda definida: no hay nada que vigilar. */
  | "sin_minimo"
  /** El mínimo ya está alcanzado. */
  | "logrado"
  /** Cumpliendo solo los mínimos que quedan, se llega al mínimo. */
  | "en_camino"
  /** Aunque se cumplan los mínimos que quedan, NO se llega: hay que hacer más que el mínimo en algún día. */
  | "en_riesgo"
  /** Ni haciendo el 100% de todo lo que queda se llega al mínimo. */
  | "perdido";

export interface EntradaEvaluarMinimo {
  meta: number;
  bandaAceptable?: number;
  progreso: number;
  /** Suma de las cantidades completas de lo pendiente que queda (lo máximo que todavía puede sumarse). */
  potencialRestante: number;
  /** Suma de los mínimos de lo pendiente que queda (lo que se suma haciendo lo justo). */
  minimosRestantes: number;
}

export interface EvaluacionMinimo {
  estado: EstadoMinimo;
  minimo?: number;
  /** Total al que se llega si de acá en más se hace solo el mínimo de cada día. */
  proyeccionAlMinimo?: number;
  /** Cuánto falta para el mínimo del período (0 si ya está). */
  faltaParaMinimo?: number;
  /** Cuánto faltaría de más (por encima de los mínimos diarios) para llegar al mínimo del período. */
  deficit?: number;
}

export function evaluarMinimo(e: EntradaEvaluarMinimo): EvaluacionMinimo {
  const minimo = minimoDe(e.meta, e.bandaAceptable);
  if (minimo === undefined) return { estado: "sin_minimo" };
  const faltaParaMinimo = Math.max(minimo - e.progreso, 0);
  const proyeccionAlMinimo = e.progreso + e.minimosRestantes;
  if (faltaParaMinimo === 0) {
    return { estado: "logrado", minimo, proyeccionAlMinimo, faltaParaMinimo };
  }
  if (e.progreso + e.potencialRestante < minimo) {
    return {
      estado: "perdido",
      minimo,
      proyeccionAlMinimo,
      faltaParaMinimo,
      deficit: minimo - (e.progreso + e.potencialRestante),
    };
  }
  if (proyeccionAlMinimo < minimo) {
    return {
      estado: "en_riesgo",
      minimo,
      proyeccionAlMinimo,
      faltaParaMinimo,
      deficit: minimo - proyeccionAlMinimo,
    };
  }
  return { estado: "en_camino", minimo, proyeccionAlMinimo, faltaParaMinimo };
}

export interface MinimoHijo {
  titulo: string;
  meta: number;
  bandaAceptable?: number;
}

export interface AvisoCoherencia {
  /** Mínimo del padre. */
  minimoPadre: number;
  /** Suma de los mínimos de los hijos (los que no tienen banda cuentan con su meta completa). */
  sumaMinimosHijos: number;
  mensaje: string;
}

/**
 * Chequeo estático (al importar/planificar): ¿los mínimos de los tramos
 * alcanzan para el mínimo del total? Ej.: 200 con mínimo 75% = 150, pero 20
 * semanas de 10 con mínimo 60% = 120 → aunque cumplas el mínimo de todas las
 * semanas, no llegás al mínimo total.
 */
export function chequearCoherenciaMinimos(
  tituloPadre: string,
  metaPadre: number,
  bandaPadre: number | undefined,
  hijos: MinimoHijo[]
): AvisoCoherencia | undefined {
  const minimoPadre = minimoDe(metaPadre, bandaPadre);
  if (minimoPadre === undefined || hijos.length === 0) return undefined;
  const sumaMinimosHijos = hijos.reduce(
    (s, h) => s + (minimoDe(h.meta, h.bandaAceptable) ?? h.meta),
    0
  );
  if (sumaMinimosHijos >= minimoPadre) return undefined;
  return {
    minimoPadre,
    sumaMinimosHijos,
    mensaje: `"${tituloPadre}": el mínimo es ${minimoPadre}, pero cumpliendo solo el mínimo de cada tramo se llega a ${sumaMinimosHijos}. Subí el mínimo de los tramos o bajá el del total.`,
  };
}
