import { z } from "zod";

// ============================================================================
// Proyecto (Personal) — nivel mediano plazo (~un mes) de la jerarquía
// Área → Objetivo → Proyecto → Entregable → Actividad. Nombre de archivo
// distinto de `proyecto.entity.ts` (CRM/Agencias) a propósito: son conceptos
// no relacionados que comparten palabra, no la misma entidad.
// ============================================================================

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

export const ESTADOS_PROYECTO_PERSONAL = [
  "activo",
  "cumplido",
  "vencido",
  "archivado",
] as const;
export type EstadoProyectoPersonal = (typeof ESTADOS_PROYECTO_PERSONAL)[number];

export interface ProyectoPersonal {
  id: string;
  /** Único padre — Objetivo es la raíz de la jerarquía, no hace falta un id de ancestro aparte. */
  objetivoId: string;
  titulo: string;
  descripcion?: string;
  diaInicio: string;
  diaLimite: string;
  /** Cantidad/unidad opcionales — mediano plazo empuja a cuantificar, no obliga (a diferencia de Objetivo, que sí exige SMART). */
  cantidadObjetivo?: number;
  unidad?: string;
  /** Caché recalculada por recomputarProyecto() a partir de los Entregables — nunca se edita a mano si tieneHijos=true. */
  progresoActual: number;
  estado: EstadoProyectoPersonal;
  tieneHijos: boolean;
  creadoEn: number;
  actualizadoEn: number;
}

export const crearProyectoPersonalSchema = z
  .object({
    objetivoId: z.string().min(1),
    titulo: z.string().trim().min(1, "Ponele un título al proyecto."),
    descripcion: z.string().trim().optional(),
    diaInicio: fechaISO,
    diaLimite: fechaISO,
    cantidadObjetivo: z.number().positive().optional(),
    unidad: z.string().trim().optional(),
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
export type CrearProyectoPersonalInput = z.input<
  typeof crearProyectoPersonalSchema
>;

export const ajustarProyectoPersonalSchema = z.object({
  id: z.string(),
  diaLimite: fechaISO.optional(),
  cantidadObjetivo: z.number().positive().optional(),
});
export type AjustarProyectoPersonalInput = z.input<
  typeof ajustarProyectoPersonalSchema
>;
