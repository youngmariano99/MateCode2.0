import { z } from "zod";
import { FORMATOS_RUTINA } from "./rutina.entity";
import { EJES_PROGRESION, crearEjercicioSchema } from "./ejercicio.entity";

// ============================================================================
// Contrato del JSON de "armar Bloque con IA" (Sprint 22) — un solo prompt le
// da a la IA TODO el contexto (catálogo de ejercicios, equipamiento propio,
// Rutinas y Bloques existentes, progreso real del bloque activo) y devuelve
// un JSON anidado: Bloque → Rutinas (existentes reusadas por nombre exacto,
// o nuevas) → Ejercicios (existentes o nuevos, declarados aparte en
// "ejerciciosNuevos"). Mismo criterio de nesting-sin-temp-ids que
// planificacion-jerarquica.entity.ts en el módulo Personal.
// ============================================================================

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

/** Ejercicio nuevo a crear — mismo shape que crearEjercicioSchema, reusado tal cual. */
export const itemEjercicioNuevoJsonSchema = crearEjercicioSchema;
export type ItemEjercicioNuevoJson = z.infer<
  typeof itemEjercicioNuevoJsonSchema
>;

/**
 * Un ejercicio DENTRO de una rutina: puede venir como string (solo el
 * nombre — formatos "tiempo") o como objeto con series/reps/peso (formatos
 * "series"). El nombre, en cualquiera de las 2 formas, tiene que coincidir
 * EXACTO con el catálogo existente o con algo declarado en "ejerciciosNuevos".
 */
export const itemEjercicioEnRutinaJsonSchema = z.union([
  z.string().trim().min(1),
  z.object({
    nombre: z.string().trim().min(1),
    series: z.number().int().positive().optional(),
    reps: z.number().positive().optional(),
    pesoKg: z.number().positive().optional(),
  }),
]);
export type ItemEjercicioEnRutinaJson = z.infer<
  typeof itemEjercicioEnRutinaJsonSchema
>;

/**
 * Una Rutina — si ya existe una PlantillaRutina con este "nombre" EXACTO, se
 * ACTUALIZA con esta definición (nunca se duplica); si no existe, se crea.
 * "diasSemana" solo tiene sentido dentro de un Bloque (0=domingo...6=sábado)
 * — en el import de Rutinas sueltas o pausas activas se ignora.
 */
export const itemRutinaJsonSchema = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre de la rutina."),
  formato: z.enum(FORMATOS_RUTINA),
  calentamiento: z.string().trim().optional(),
  ejercicios: z
    .array(itemEjercicioEnRutinaJsonSchema)
    .min(1, "La rutina necesita al menos un ejercicio."),
  numeroRondas: z.number().positive().optional(),
  tiempoTrabajoSeg: z.number().positive().optional(),
  tiempoDescansoSeg: z.number().positive().optional(),
  tiempoLimiteMin: z.number().positive().optional(),
  diasSemana: z.array(z.number().int().min(0).max(6)).optional(),
});
export type ItemRutinaJson = z.infer<typeof itemRutinaJsonSchema>;

export const itemBloqueJsonSchema = z
  .object({
    nombre: z.string().trim().min(1, "Falta el nombre del bloque."),
    /** Opcional — si no viene, arranca hoy (mismo criterio que diaInicio en el módulo Personal). */
    diaInicio: fechaISO.optional(),
    diaFin: fechaISO,
    ejeProgresionDefault: z.enum(EJES_PROGRESION),
  })
  .refine((v) => v.diaInicio === undefined || v.diaFin >= v.diaInicio, {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["diaFin"],
  });
export type ItemBloqueJson = z.infer<typeof itemBloqueJsonSchema>;

export const importarBloqueCompletoSchema = z.object({
  bloque: itemBloqueJsonSchema,
  rutinas: z.array(itemRutinaJsonSchema).default([]),
  ejerciciosNuevos: z.array(itemEjercicioNuevoJsonSchema).default([]),
});
export type ImportarBloqueCompletoInput = z.input<
  typeof importarBloqueCompletoSchema
>;

/** Pausas activas: mismo shape de Rutina, sin Bloque — confirmado con el usuario que no llevan fecha ni período. */
export const importarPausasActivasSchema = z.object({
  rutinasNuevas: z
    .array(itemRutinaJsonSchema)
    .min(1, "No hay ninguna rutina de pausa activa para crear."),
  ejerciciosNuevos: z.array(itemEjercicioNuevoJsonSchema).default([]),
});
export type ImportarPausasActivasInput = z.input<
  typeof importarPausasActivasSchema
>;
