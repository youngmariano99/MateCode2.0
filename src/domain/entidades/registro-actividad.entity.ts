import { z } from "zod";
import type { EjeProgresion } from "./ejercicio.entity";

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

// ============================================================================
// Registro de sesión (ledger) — fricción cero: "Hice lo planificado" es un
// solo tap que copia la plantilla tal cual a resultados; "Edición por
// excepción" solo pide lo que cambió. Pensado para completarse durante o
// justo después de entrenar, con cansancio incorporado — nada de formularios
// largos.
// ============================================================================

export interface ResultadoSet {
  reps?: number;
  tiempoSeg?: number;
  distanciaM?: number;
  pesoKg?: number;
  potenciaW?: number;
  rpe?: number; // 1-10, opcional
}

export interface ResultadoEjercicio {
  ejercicioId: string;
  /** Nivel de la escalera de regresión/progresión usado esta sesión (si aplica). */
  nivelUsado?: number;
  sets: ResultadoSet[];
  /** Para formato "tiempo" (AMRAP/EMOM/etc). */
  rondasCompletadas?: number;
  tiempoResultadoSeg?: number;
}

export interface RegistroActividad {
  id: string;
  plantillaId: string;
  bloqueId?: string;
  diaTarea: string; // YYYY-MM-DD
  comoPlanificado: boolean;
  resultados: ResultadoEjercicio[];
  notas?: string;
  creadoEn: number;
}

const resultadoSetSchema = z.object({
  reps: z.number().optional(),
  tiempoSeg: z.number().optional(),
  distanciaM: z.number().optional(),
  pesoKg: z.number().optional(),
  potenciaW: z.number().optional(),
  rpe: z.number().min(1).max(10).optional(),
});

const resultadoEjercicioSchema = z.object({
  ejercicioId: z.string(),
  nivelUsado: z.number().optional(),
  sets: z.array(resultadoSetSchema).default([]),
  rondasCompletadas: z.number().optional(),
  tiempoResultadoSeg: z.number().optional(),
});

export const registrarActividadSchema = z.object({
  plantillaId: z.string(),
  bloqueId: z.string().optional(),
  diaTarea: fechaISO,
  comoPlanificado: z.boolean(),
  resultados: z.array(resultadoEjercicioSchema).default([]),
  notas: z.string().optional(),
});
export type RegistrarActividadInput = z.input<typeof registrarActividadSchema>;

// ============================================================================
// Mejora por eje — nunca mezcla unidades: si el eje es "progresion" compara
// nivel de la escalera, si es "carga" compara el peso máximo usado, si es
// "volumen" compara reps/tiempo/distancia acumulada. Primera sesión del
// rango vs. última.
// ============================================================================

export interface ResumenMejoraEjercicio {
  eje: EjeProgresion;
  valorInicial: number;
  valorFinal: number;
  mejoro: boolean;
  sesiones: number;
}

function valorSegunEje(res: ResultadoEjercicio, eje: EjeProgresion): number {
  if (eje === "progresion") return res.nivelUsado ?? 0;
  if (eje === "carga") {
    return res.sets.reduce((max, s) => Math.max(max, s.pesoKg ?? 0), 0);
  }
  // volumen: acumulado de reps, o si no hay reps, tiempo o distancia.
  return res.sets.reduce(
    (acc, s) => acc + (s.reps ?? s.tiempoSeg ?? s.distanciaM ?? 0),
    0
  );
}

/**
 * `registros` debe venir ya filtrado por bloque + ordenado por diaTarea
 * ascendente — esta función no conoce fechas, solo compara primero vs
 * último dentro de lo que se le pasó.
 */
export function calcularMejoraEjercicio(
  registros: RegistroActividad[],
  ejercicioId: string,
  eje: EjeProgresion
): ResumenMejoraEjercicio | undefined {
  const relevantes = registros
    .map((r) => r.resultados.find((res) => res.ejercicioId === ejercicioId))
    .filter((r): r is ResultadoEjercicio => !!r);

  if (relevantes.length === 0) return undefined;

  const valorInicial = valorSegunEje(relevantes[0], eje);
  const valorFinal = valorSegunEje(relevantes[relevantes.length - 1], eje);

  return {
    eje,
    valorInicial,
    valorFinal,
    mejoro: valorFinal > valorInicial,
    sesiones: relevantes.length,
  };
}
