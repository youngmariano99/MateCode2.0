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
  eliminado: boolean;
  creadoEn: number;
  actualizadoEn: number;
}

export const crearPlantillaRutinaSchema = z.object({
  nombre: z.string().trim().min(1, "Ponele un nombre a la rutina."),
  formato: z.enum(FORMATOS_RUTINA),
  tipoEstructura: z.enum(TIPOS_ESTRUCTURA),
  estructura: z.record(z.string(), z.unknown()),
});
export type CrearPlantillaRutinaInput = z.input<
  typeof crearPlantillaRutinaSchema
>;

// ============================================================================
// Bloque de entrenamiento (mesociclo) — declara UN eje de progresión por
// defecto para todo el período; cada ejercicio cae al eje disponible más
// cercano si el suyo no aplica (ver ejeEfectivo en ejercicio.entity.ts).
// Así las estadísticas de un mismo bloque comparan siempre lo mismo, sin
// mezclar kg con repeticiones con nivel de dificultad.
// ============================================================================

export const ESTADOS_BLOQUE = ["activo", "cerrado"] as const;
export type EstadoBloque = (typeof ESTADOS_BLOQUE)[number];

export interface BloqueEntrenamiento {
  id: string;
  nombre: string;
  diaInicio: string;
  diaFin: string;
  ejeProgresionDefault: EjeProgresion;
  estado: EstadoBloque;
  creadoEn: number;
  actualizadoEn: number;
}

export const crearBloqueSchema = z
  .object({
    nombre: z.string().trim().min(1, "Ponele un nombre al bloque."),
    diaInicio: fechaISO,
    diaFin: fechaISO,
    ejeProgresionDefault: z.enum(EJES_PROGRESION),
  })
  .refine((v) => v.diaFin >= v.diaInicio, {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["diaFin"],
  });
export type CrearBloqueInput = z.input<typeof crearBloqueSchema>;
