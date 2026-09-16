import { z } from "zod";

// ============================================================================
// Catálogo de ejercicios — patrón de movimiento + escalera de regresión y
// progresión por ejercicio (nivel 0 = versión base, negativos = más fácil,
// positivos = más difícil). El seed real vive en ejercicio-catalogo-seed.ts,
// generado desde la matriz de referencia del usuario.
// ============================================================================

export const PATRONES_MOVIMIENTO = [
  "empuje",
  "tiron",
  "dominante_rodilla",
  "dominante_cadera",
  "core_transporte",
  "pausa_movilidad",
  "neat",
] as const;
export type PatronMovimiento = (typeof PATRONES_MOVIMIENTO)[number];

export const TIPOS_CONTEO = ["repes", "tiempo", "distancia"] as const;
export type TipoConteo = (typeof TIPOS_CONTEO)[number];

export const MODOS_CONTEO = ["global", "por_lado"] as const;
export type ModoConteo = (typeof MODOS_CONTEO)[number];

/**
 * Eje de progresión: en qué dimensión se mide si un ejercicio mejoró.
 * Nunca se mezclan entre sí en una estadística — kg, repeticiones y nivel
 * de dificultad biomecánica no son comparables entre sí.
 */
export const EJES_PROGRESION = ["carga", "volumen", "progresion"] as const;
export type EjeProgresion = (typeof EJES_PROGRESION)[number];

export interface NivelEjercicio {
  nivel: number; // 0 = base, negativo = regresión (más fácil), positivo = progresión (más difícil)
  nombre: string;
  detalle: string;
}

export interface CatalogoEjercicio {
  id: string;
  patron: PatronMovimiento;
  nombre: string;
  tipoConteo: TipoConteo;
  modoConteo: ModoConteo;
  equipamiento: string[];
  esPausaActiva: boolean;
  esNeat: boolean;
  /** Si tiene sentido registrar carga externa (mancuernas, kettlebell, etc). */
  permiteCarga: boolean;
  /** Escalera de regresión/progresión, ordenada. Vacía = no tiene escalera. */
  niveles: NivelEjercicio[];
  creadoEn: number;
}

/** Ejes que tienen sentido para este ejercicio puntual. */
export function ejesDisponibles(
  ejercicio: Pick<CatalogoEjercicio, "permiteCarga" | "niveles">
): EjeProgresion[] {
  const ejes: EjeProgresion[] = ["volumen"]; // siempre disponible
  if (ejercicio.permiteCarga) ejes.push("carga");
  if (ejercicio.niveles.length > 0) ejes.push("progresion");
  return ejes;
}

/**
 * El eje que declaró el bloque, ajustado a lo que este ejercicio puntual
 * soporta — así el bloque pide UN solo dato (su eje por defecto) y cada
 * ejercicio cae solo al más cercano disponible, sin pedir nada ejercicio
 * por ejercicio.
 */
export function ejeEfectivo(
  ejeBloque: EjeProgresion,
  ejercicio: Pick<CatalogoEjercicio, "permiteCarga" | "niveles">
): EjeProgresion {
  const disponibles = ejesDisponibles(ejercicio);
  if (disponibles.includes(ejeBloque)) return ejeBloque;
  if (disponibles.includes("progresion")) return "progresion";
  return "volumen";
}

// ============================================================================
// Creación de Ejercicio (Sprint 22) — hasta acá el catálogo solo se sembraba
// una vez; esto permite agregar ejercicios nuevos vía UI o import JSON con
// IA. El `equipamiento` se valida contra lo que el usuario tiene de verdad
// en GestionarEjerciciosUseCase.crearEjercicio (acá solo se valida la forma,
// no el contenido — la entidad no tiene acceso a la lista de equipamiento
// real del usuario).
// ============================================================================

const nivelEjercicioSchema = z.object({
  nivel: z.number().int(),
  nombre: z.string().trim().min(1),
  detalle: z.string().trim().min(1),
});

export const crearEjercicioSchema = z.object({
  patron: z.enum(PATRONES_MOVIMIENTO),
  nombre: z.string().trim().min(1, "Ponele un nombre al ejercicio."),
  tipoConteo: z.enum(TIPOS_CONTEO),
  modoConteo: z.enum(MODOS_CONTEO),
  equipamiento: z.array(z.string().trim()).default([]),
  esPausaActiva: z.boolean().default(false),
  esNeat: z.boolean().default(false),
  permiteCarga: z.boolean().default(false),
  niveles: z.array(nivelEjercicioSchema).default([]),
});
export type CrearEjercicioInput = z.input<typeof crearEjercicioSchema>;
