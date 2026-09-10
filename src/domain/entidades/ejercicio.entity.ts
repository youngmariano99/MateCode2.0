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
