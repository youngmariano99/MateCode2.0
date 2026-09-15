import { z } from "zod";
import { TIPOS_ACTIVIDAD } from "./actividad.entity";
import { FRECUENCIAS_RECURRENCIA } from "./entregable.entity";

// ============================================================================
// Contratos del JSON de "armar la jerarquía con IA" — un solo set de
// schemas reusado por los 5 prompts (árbol completo / objetivo / proyecto /
// entregable / actividades), cada uno "entrando" a un nivel distinto y
// anidando los niveles de abajo (mismo criterio de nesting que el import
// viejo de Proyectos, sin necesidad de temp-ids: los hijos nuevos van
// adentro del JSON de su padre). Todo opcional a partir de diaInicio (si no
// viene, se usa "hoy" al importar) para minimizar lo que la IA tiene que
// completar bien.
// ============================================================================

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

export const itemActividadJsonSchema = z.object({
  tipo: z.enum(TIPOS_ACTIVIDAD).default("mantenimiento"),
  descripcion: z
    .string()
    .trim()
    .min(1, "Falta la descripción de la actividad."),
  diaTarea: fechaISO.optional(),
  cantidadObjetivo: z.number().positive().optional(),
  unidad: z.string().trim().optional(),
});
export type ItemActividadJson = z.infer<typeof itemActividadJsonSchema>;

export const itemEntregableJsonSchema = z.object({
  titulo: z.string().trim().min(1, "Falta el título del entregable."),
  diaInicio: fechaISO.optional(),
  diaLimite: fechaISO,
  cantidadObjetivo: z.number().positive().optional(),
  unidad: z.string().trim().optional(),
  recurrencia: z
    .object({
      frecuencia: z.enum(FRECUENCIAS_RECURRENCIA),
      diasSemana: z.array(z.number().int().min(0).max(6)).optional(),
    })
    .optional(),
  actividades: z.array(itemActividadJsonSchema).default([]),
});
export type ItemEntregableJson = z.infer<typeof itemEntregableJsonSchema>;

export const itemProyectoJsonSchema = z.object({
  titulo: z.string().trim().min(1, "Falta el título del proyecto."),
  diaInicio: fechaISO.optional(),
  diaLimite: fechaISO,
  cantidadObjetivo: z.number().positive().optional(),
  unidad: z.string().trim().optional(),
  entregables: z.array(itemEntregableJsonSchema).default([]),
});
export type ItemProyectoJson = z.infer<typeof itemProyectoJsonSchema>;

export const itemObjetivoJsonSchema = z.object({
  titulo: z.string().trim().min(1, "Falta el título del objetivo."),
  unidad: z.string().trim().min(1, "Falta la unidad del objetivo."),
  cantidadObjetivo: z
    .number()
    .positive("La cantidad objetivo tiene que ser mayor a 0."),
  diaInicio: fechaISO.optional(),
  diaLimite: fechaISO,
  proyectos: z.array(itemProyectoJsonSchema).default([]),
});
export type ItemObjetivoJson = z.infer<typeof itemObjetivoJsonSchema>;

/** Árbol completo — también sirve para "solo Objetivo" (proyectos queda vacío). */
export const importarArbolPersonalSchema = z.object({
  areaTitulo: z.string().trim().min(1, "Falta el título del área."),
  objetivosNuevos: z
    .array(itemObjetivoJsonSchema)
    .min(1, "No hay ningún objetivo para crear."),
});
export type ImportarArbolPersonalInput = z.input<
  typeof importarArbolPersonalSchema
>;

export const importarProyectoBajoObjetivoSchema = z.object({
  objetivoTitulo: z
    .string()
    .trim()
    .min(1, "Falta el título del objetivo padre."),
  proyectosNuevos: z
    .array(itemProyectoJsonSchema)
    .min(1, "No hay ningún proyecto para crear."),
});
export type ImportarProyectoBajoObjetivoInput = z.input<
  typeof importarProyectoBajoObjetivoSchema
>;

export const importarEntregableBajoProyectoSchema = z.object({
  proyectoTitulo: z
    .string()
    .trim()
    .min(1, "Falta el título del proyecto padre."),
  entregablesNuevos: z
    .array(itemEntregableJsonSchema)
    .min(1, "No hay ningún entregable para crear."),
});
export type ImportarEntregableBajoProyectoInput = z.input<
  typeof importarEntregableBajoProyectoSchema
>;

export const importarActividadesBajoEntregableSchema = z.object({
  entregableTitulo: z
    .string()
    .trim()
    .min(1, "Falta el título del entregable padre."),
  actividadesNuevas: z
    .array(itemActividadJsonSchema)
    .min(1, "No hay ninguna actividad para crear."),
});
export type ImportarActividadesBajoEntregableInput = z.input<
  typeof importarActividadesBajoEntregableSchema
>;
