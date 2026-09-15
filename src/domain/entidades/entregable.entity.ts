import { z } from "zod";

// ============================================================================
// Entregable — nivel corto plazo (~una semana) de la jerarquía Área →
// Objetivo → Proyecto → Entregable → Actividad. Dos formas de armarlo:
// puntual ("terminar el diseño esta semana", sin recurrencia) o recurrente
// hasta cumplir un objetivo acumulado ("Contacto en frío, Lun-Vie, hasta
// 200/año" — ver RecurrenciaEntregable). La recurrencia vive acá y no en
// Actividad porque una Actividad siempre es una instancia concreta; el
// patrón vive un nivel arriba.
// ============================================================================

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

export const ESTADOS_ENTREGABLE = [
  "activo",
  "cumplido",
  "vencido",
  "archivado",
] as const;
export type EstadoEntregable = (typeof ESTADOS_ENTREGABLE)[number];

// Mismos valores que FrecuenciaHabito en habitos.entity.ts a propósito —
// mismo concepto, misma función aplicaHoy/aplicaHoyEntregable.
export const FRECUENCIAS_RECURRENCIA = ["diaria", "dias_especificos"] as const;
export type FrecuenciaRecurrencia = (typeof FRECUENCIAS_RECURRENCIA)[number];

/**
 * Con qué frecuencia se genera una instancia (Actividad) nueva — la
 * cantidad/fecha límite acumuladas viven en el Entregable mismo
 * (cantidadObjetivo/diaLimite), no acá, para no duplicar el número.
 */
export interface RecurrenciaEntregable {
  frecuencia: FrecuenciaRecurrencia;
  /** 0=domingo...6=sábado. Solo si frecuencia="dias_especificos". */
  diasSemana?: number[];
}

export interface Entregable {
  id: string;
  proyectoId: string;
  /** Ancestro denormalizado (mismo patrón que Tarea con historiaId+proyectoId en el módulo Proyectos) — evita tener que subir la cadena para "todos los entregables de este Objetivo". */
  objetivoId: string;
  titulo: string;
  descripcion?: string;
  diaInicio: string;
  diaLimite: string;
  cantidadObjetivo?: number;
  unidad?: string;
  /** Caché recalculada por recomputarEntregable() a partir de las Actividades. */
  progresoActual: number;
  estado: EstadoEntregable;
  tieneHijos: boolean;
  /** undefined = puntual (una sola vez, sin repetirse). */
  recurrencia?: RecurrenciaEntregable;
  creadoEn: number;
  actualizadoEn: number;
}

export const crearEntregableSchema = z
  .object({
    proyectoId: z.string().min(1),
    objetivoId: z.string().min(1),
    titulo: z.string().trim().min(1, "Ponele un título al entregable."),
    descripcion: z.string().trim().optional(),
    diaInicio: fechaISO,
    diaLimite: fechaISO,
    cantidadObjetivo: z.number().positive().optional(),
    unidad: z.string().trim().optional(),
    recurrencia: z
      .object({
        frecuencia: z.enum(FRECUENCIAS_RECURRENCIA),
        diasSemana: z.array(z.number().int().min(0).max(6)).optional(),
      })
      .optional(),
  })
  .refine((v) => v.diaLimite >= v.diaInicio, {
    message: "La fecha límite no puede ser anterior a la de inicio.",
    path: ["diaLimite"],
  })
  .refine(
    (v) => (v.cantidadObjetivo === undefined) === (v.unidad === undefined),
    {
      message: "Si indicás cantidad, indicá también la unidad (y viceversa).",
      path: ["unidad"],
    }
  );
export type CrearEntregableInput = z.input<typeof crearEntregableSchema>;

export const ajustarEntregableSchema = z.object({
  id: z.string(),
  diaLimite: fechaISO.optional(),
  cantidadObjetivo: z.number().positive().optional(),
});
export type AjustarEntregableInput = z.input<typeof ajustarEntregableSchema>;

/**
 * ¿Le toca a este Entregable recurrente generar una instancia (Actividad)
 * el día `diaISO`? Misma lógica exacta que aplicaHoy() en habitos.entity.ts
 * — mismo concepto, dos entidades distintas por diseño (ver Decisión A del
 * plan: Hábitos y Actividades no se unifican).
 */
export function aplicaHoyEntregable(
  recurrencia: RecurrenciaEntregable,
  diaISO: string
): boolean {
  if (recurrencia.frecuencia !== "dias_especificos") return true;
  const [anio, mes, dia] = diaISO.split("-").map(Number);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return (recurrencia.diasSemana || []).includes(diaSemana);
}

/**
 * Id determinístico de la instancia (Actividad) de un día para un Entregable
 * recurrente — mismo criterio que idRegistroHabito: abrir la vista del día
 * dos veces nunca duplica, es upsert-si-falta.
 */
export function idInstanciaEntregableRecurrente(
  entregableId: string,
  diaISO: string
): string {
  return `${entregableId}_${diaISO}`;
}
