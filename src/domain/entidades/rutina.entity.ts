import { z } from "zod";
import { EJES_PROGRESION, type EjeProgresion } from "./ejercicio.entity";

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

// ============================================================================
// Plantilla de rutina — 2 formas estructurales en vez de un formulario por
// cada uno de los formatos de entrenamiento: "series" (tradicional, pirámide,
// superserie — una lista de sets planificados, tradicional es simplemente el
// caso donde todos los sets son iguales) y "tiempo" (Tabata/EMOM/AMRAP/For
// Time/circuito — un bloque de configuración con campos opcionales, cada
// formato usa los que le corresponden).
// ============================================================================

export const FORMATOS_RUTINA = [
  "tradicional",
  "piramide",
  "superserie",
  "circuito",
  "tabata",
  "emom",
  "amrap",
  "for_time",
  "liss",
  "pausa_activa",
] as const;
export type FormatoRutina = (typeof FORMATOS_RUTINA)[number];

export const TIPOS_ESTRUCTURA = ["series", "tiempo"] as const;
export type TipoEstructura = (typeof TIPOS_ESTRUCTURA)[number];

const FORMATOS_TIEMPO = new Set<FormatoRutina>([
  "circuito",
  "tabata",
  "emom",
  "amrap",
  "for_time",
  "liss",
  "pausa_activa",
]);

/** Tradicional/pirámide/superserie son "series"; el resto se mide por tiempo/rondas. */
export function tipoEstructuraDeFormato(
  formato: FormatoRutina
): TipoEstructura {
  return FORMATOS_TIEMPO.has(formato) ? "tiempo" : "series";
}

export interface SetPlanificado {
  reps?: number;
  tiempoSeg?: number;
  distanciaM?: number;
  pesoKg?: number;
}

export interface BloqueEjercicioPlanificado {
  ejercicioId: string;
  sets: SetPlanificado[];
  descansoSeg?: number;
}

export interface EstructuraSeries {
  bloques: BloqueEjercicioPlanificado[];
}

export interface EstructuraTiempo {
  ejercicioIds: string[];
  numeroRondas?: number;
  tiempoTrabajoSeg?: number;
  tiempoDescansoSeg?: number;
  tiempoLimiteMin?: number;
}

export interface PlantillaRutina {
  id: string;
  nombre: string;
  formato: FormatoRutina;
  tipoEstructura: TipoEstructura;
  estructura: EstructuraSeries | EstructuraTiempo;
  // Instructivo, texto libre — no se resuelve contra el catálogo ni se
  // trackea como sets planificados, es la entrada en calor previa a la
  // rutina (ej. "5 min de cinta + movilidad de cadera y hombro").
  calentamiento?: string;
  eliminado: boolean;
  creadoEn: number;
  actualizadoEn: number;
}

export const crearPlantillaRutinaSchema = z.object({
  nombre: z.string().trim().min(1, "Ponele un nombre a la rutina."),
  formato: z.enum(FORMATOS_RUTINA),
  tipoEstructura: z.enum(TIPOS_ESTRUCTURA),
  estructura: z.record(z.string(), z.unknown()),
  calentamiento: z.string().trim().optional(),
});
export type CrearPlantillaRutinaInput = z.input<
  typeof crearPlantillaRutinaSchema
>;

/**
 * Ajuste in-place de una Rutina existente (Sprint 22) — usado por la
 * resolución-por-nombre del import combinado: si ya existe una Rutina con
 * el nombre que trae el JSON, se actualiza con esto en vez de crear una
 * duplicada (mismo nombre + números nuevos = "ajustar", no "otra rutina").
 */
export const ajustarPlantillaRutinaSchema = z.object({
  id: z.string(),
  formato: z.enum(FORMATOS_RUTINA).optional(),
  tipoEstructura: z.enum(TIPOS_ESTRUCTURA).optional(),
  estructura: z.record(z.string(), z.unknown()).optional(),
  calentamiento: z.string().trim().optional(),
});
export type AjustarPlantillaRutinaInput = z.input<
  typeof ajustarPlantillaRutinaSchema
>;

// ============================================================================
// Bloque de entrenamiento (mesociclo) — declara UN eje de progresión por
// defecto para todo el período; cada ejercicio cae al eje disponible más
// cercano si el suyo no aplica (ver ejeEfectivo en ejercicio.entity.ts).
// Así las estadísticas de un mismo bloque comparan siempre lo mismo, sin
// mezclar kg con repeticiones con nivel de dificultad.
// ============================================================================

// "planificado": un bloque futuro ya cargado (ej. vía importación de una
// secuencia con progresión) pero que todavía no arrancó — al cerrar el
// bloque "activo", el siguiente "planificado" (por diaInicio) se promueve
// solo. Nunca hay más de un bloque "activo" a la vez.
export const ESTADOS_BLOQUE = ["activo", "cerrado", "planificado"] as const;
export type EstadoBloque = (typeof ESTADOS_BLOQUE)[number];

export interface BloqueEntrenamiento {
  id: string;
  nombre: string;
  diaInicio: string;
  diaFin: string;
  ejeProgresionDefault: EjeProgresion;
  estado: EstadoBloque;
  /** Rutinas (PlantillaRutina.id) que se entrenan en este período — array denormalizado, una Rutina puede repetirse en varios Bloques. */
  plantillaIds: string[];
  creadoEn: number;
  actualizadoEn: number;
}

export const crearBloqueSchema = z
  .object({
    nombre: z.string().trim().min(1, "Ponele un nombre al bloque."),
    diaInicio: fechaISO,
    diaFin: fechaISO,
    ejeProgresionDefault: z.enum(EJES_PROGRESION),
    plantillaIds: z.array(z.string()).default([]),
  })
  .refine((v) => v.diaFin >= v.diaInicio, {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["diaFin"],
  });
export type CrearBloqueInput = z.input<typeof crearBloqueSchema>;

/** Un ítem de una secuencia de bloques importada — sin fechas: se encadenan
 * solas a partir de hoy (o del fin del bloque activo, si ya hay uno). */
export const itemSecuenciaBloqueSchema = z.object({
  nombre: z.string().trim().min(1),
  duracionSemanas: z.number().positive().default(4),
  ejeProgresionDefault: z.enum(EJES_PROGRESION),
});
export const importarSecuenciaBloquesSchema = z.array(
  itemSecuenciaBloqueSchema
);
export type ImportarSecuenciaBloquesInput = z.input<
  typeof importarSecuenciaBloquesSchema
>;
