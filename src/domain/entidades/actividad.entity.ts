import { z } from "zod";
import {
  MAX_TAREAS_ENFOQUE_POR_DIA,
  MAX_TAREAS_MANTENIMIENTO_POR_DIA,
  AREAS_PENDIENTE,
  type AreaPendiente,
} from "./personal.entity";

// ============================================================================
// Actividad — nivel día a día de la jerarquía Área → Objetivo → Proyecto →
// Entregable → Actividad. Reemplaza a TareaDiaria + TareaPendiente (ver
// Decisión A del plan): "enfoque"/"mantenimiento" son la agenda de HOY (con
// el mismo tope duro que tenía el Búnker), "backlog" es lo que no tiene
// fecha asignada todavía (lo que antes era TareaPendiente). `entregableId`
// es opcional a propósito — una Actividad suelta, sin jerarquía arriba,
// sigue siendo válida.
//
// Nota de migración (Sprint 5): hasta que se migren los datos existentes,
// esta tabla convive vacía junto a tarea_diaria/tarea_pendiente, que siguen
// siendo la fuente real para el Búnker/Pendientes actuales.
// ============================================================================

export { MAX_TAREAS_ENFOQUE_POR_DIA, MAX_TAREAS_MANTENIMIENTO_POR_DIA };

export const TIPOS_ACTIVIDAD = ["enfoque", "mantenimiento", "backlog"] as const;
export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

export const ESTADOS_ACTIVIDAD = [
  "pendiente",
  "completada",
  "migrada",
  "cancelada",
  "descartada",
] as const;
export type EstadoActividad = (typeof ESTADOS_ACTIVIDAD)[number];

export const PRIORIDADES_ACTIVIDAD = [
  "urgente",
  "importante",
  "puede_esperar",
] as const;
export type PrioridadActividad = (typeof PRIORIDADES_ACTIVIDAD)[number];

export interface Actividad {
  id: string;
  /** Padre opcional — una actividad suelta (sin Entregable) sigue siendo válida. */
  entregableId?: string;
  /** Ancestros denormalizados, solo seteados si entregableId lo está. */
  proyectoId?: string;
  objetivoId?: string;
  tipo: TipoActividad;
  descripcion: string;
  /** Seteado para enfoque/mantenimiento (agendadas); undefined para backlog. */
  diaTarea?: string;
  /** Relevante sobre todo para tipo="backlog" (triage tipo guardia). */
  prioridad?: PrioridadActividad;
  /** Migrado de TareaPendiente.area — relevante sobre todo para tipo="backlog", que no siempre tiene un objetivoId de donde derivar el área. */
  area?: AreaPendiente;
  estado: EstadoActividad;
  fechaMigradaDesde?: string;
  cantidadObjetivo?: number;
  unidad?: string;
  progresoActual?: number;
  /** Lunes (YYYY-MM-DD) de la semana asignada — mismo criterio que TareaPendiente.semanaId. */
  semanaId?: string;
  /** Si esta instancia nació de un Entregable recurrente (ver entregable.entity.ts) — permite rastrear el origen. */
  recurrenciaId?: string;
  origenInboxId?: string;
  creadoEn: number;
  actualizadoEn: number;
}

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

export const crearActividadSchema = z
  .object({
    entregableId: z.string().optional(),
    proyectoId: z.string().optional(),
    objetivoId: z.string().optional(),
    tipo: z.enum(TIPOS_ACTIVIDAD),
    descripcion: z.string().trim().min(1, "Describí la actividad."),
    diaTarea: fechaISO.optional(),
    prioridad: z.enum(PRIORIDADES_ACTIVIDAD).optional(),
    area: z.enum(AREAS_PENDIENTE).optional(),
    cantidadObjetivo: z.number().positive().optional(),
    unidad: z.string().trim().optional(),
    semanaId: fechaISO.optional(),
    recurrenciaId: z.string().optional(),
    origenInboxId: z.string().optional(),
  })
  .refine((v) => v.tipo === "backlog" || !!v.diaTarea, {
    message: "Las actividades de enfoque/mantenimiento necesitan una fecha.",
    path: ["diaTarea"],
  });
export type CrearActividadInput = z.input<typeof crearActividadSchema>;

export const migrarActividadSchema = z.object({
  id: z.string(),
  nuevoDiaTarea: fechaISO,
});
export type MigrarActividadInput = z.input<typeof migrarActividadSchema>;

// ============================================================================
// Migración Sprint 5 (jerarquía Personal): funciones puras de mapeo,
// separadas del .upgrade() de Dexie (db.ts) para poder testearlas
// directamente — no hay forma establecida en este proyecto de testear una
// transición de versión de Dexie de punta a punta, así que la lógica real
// vive acá como funciones puras y el .upgrade() solo orquesta (lee, llama,
// escribe, encola).
// ============================================================================

interface TareaDiariaOrigen {
  id: string;
  tipo: TipoActividad;
  descripcion: string;
  diaTarea: string;
  estado: string;
  fechaMigradaDesde?: string;
  origenInboxId?: string;
  creadoEn: number;
  actualizadoEn: number;
}

/** Mapea 1:1 — mismo id, mismos campos, conserva estado/fechas tal cual. */
export function mapearTareaDiariaAActividad(t: TareaDiariaOrigen): Actividad {
  return {
    id: t.id,
    tipo: t.tipo,
    descripcion: t.descripcion,
    diaTarea: t.diaTarea,
    estado: t.estado as EstadoActividad,
    fechaMigradaDesde: t.fechaMigradaDesde,
    origenInboxId: t.origenInboxId,
    creadoEn: t.creadoEn,
    actualizadoEn: t.actualizadoEn,
  };
}

interface TareaPendienteOrigen {
  id: string;
  descripcion: string;
  prioridad: PrioridadActividad;
  area: AreaPendiente;
  estado: string;
  semanaId?: string;
  origenInboxId?: string;
  creadoEn: number;
  actualizadoEn: number;
}

/**
 * "promovida" (ya se convirtió en una tarea_diaria) mapea a "completada" —
 * cumplió su función; Actividad no tiene un estado "promovida" propio.
 */
const ESTADO_PENDIENTE_A_ACTIVIDAD: Record<string, EstadoActividad> = {
  pendiente: "pendiente",
  promovida: "completada",
  completada: "completada",
  descartada: "descartada",
};

export function mapearTareaPendienteAActividad(
  p: TareaPendienteOrigen
): Actividad {
  return {
    id: p.id,
    tipo: "backlog",
    descripcion: p.descripcion,
    prioridad: p.prioridad,
    area: p.area,
    estado: ESTADO_PENDIENTE_A_ACTIVIDAD[p.estado] || "pendiente",
    semanaId: p.semanaId,
    origenInboxId: p.origenInboxId,
    creadoEn: p.creadoEn,
    actualizadoEn: p.actualizadoEn,
  };
}
