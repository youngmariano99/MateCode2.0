import { z } from "zod";

// ============================================================================
// Bandeja de entrada — captura libre de ideas/pensamientos, sin fricción,
// que se resuelven después promoviéndolas a algo concreto.
// ============================================================================
export const ESTADOS_INBOX = ["pendiente", "promovido", "descartado"] as const;
export type EstadoInboxItem = (typeof ESTADOS_INBOX)[number];

export const TIPOS_PROMOCION_INBOX = [
  "tarea_enfoque",
  "tarea_mantenimiento",
  "pendiente",
] as const;
export type TipoPromocionInbox = (typeof TIPOS_PROMOCION_INBOX)[number];

export interface InboxItem {
  id: string;
  texto: string;
  estado: EstadoInboxItem;
  promovidoATipo?: TipoPromocionInbox;
  promovidoAId?: string;
  creadoEn: number;
  actualizadoEn: number;
}

export const crearInboxItemSchema = z.object({
  texto: z.string().trim().min(1, "Escribí algo antes de guardar."),
});
export type CrearInboxItemInput = z.input<typeof crearInboxItemSchema>;

// ============================================================================
// Búnker del Enfoque — el compromiso diario: como máximo 1 tarea de enfoque
// profundo + 3 de mantenimiento. Se resuelven al cierre: completar, migrar
// a otro día, o cancelar (decisión estratégica, no fracaso).
// ============================================================================
export const TIPOS_TAREA_DIARIA = ["enfoque", "mantenimiento"] as const;
export type TipoTareaDiaria = (typeof TIPOS_TAREA_DIARIA)[number];

export const ESTADOS_TAREA_DIARIA = [
  "pendiente",
  "completada",
  "migrada",
  "cancelada",
] as const;
export type EstadoTareaDiaria = (typeof ESTADOS_TAREA_DIARIA)[number];

export const MAX_TAREAS_ENFOQUE_POR_DIA = 1;
export const MAX_TAREAS_MANTENIMIENTO_POR_DIA = 3;

export interface TareaDiaria {
  id: string;
  // Nombrado "diaTarea" y no "fecha" a propósito: el campo genérico "fecha"
  // en la ruta de sync (dateFields) lo convierte a Date automáticamente, y
  // acá es un string YYYY-MM-DD plano (columna varchar, no timestamp).
  diaTarea: string;
  tipo: TipoTareaDiaria;
  descripcion: string;
  estado: EstadoTareaDiaria;
  fechaMigradaDesde?: string;
  origenInboxId?: string;
  origenPendienteId?: string;
  creadoEn: number;
  actualizadoEn: number;
}

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

/**
 * "Hoy" en huso horario de Buenos Aires, como YYYY-MM-DD — mismo criterio
 * horario que el resto del sistema (ver Planificador de Contenido).
 */
export function obtenerDiaTareaHoy(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

/** Suma (o resta, con negativo) días a un YYYY-MM-DD — para "migrar a mañana". */
export function sumarDias(diaISO: string, dias: number): string {
  const [anio, mes, dia] = diaISO.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export const crearTareaDiariaSchema = z.object({
  diaTarea: fechaISO,
  tipo: z.enum(TIPOS_TAREA_DIARIA),
  descripcion: z.string().trim().min(1, "Describí la tarea."),
  origenInboxId: z.string().optional(),
  origenPendienteId: z.string().optional(),
});
export type CrearTareaDiariaInput = z.input<typeof crearTareaDiariaSchema>;

export const migrarTareaDiariaSchema = z.object({
  id: z.string(),
  nuevoDiaTarea: fechaISO,
});
export type MigrarTareaDiariaInput = z.input<typeof migrarTareaDiariaSchema>;

// ============================================================================
// Pendientes — backlog de todo lo que sí o sí hay que hacer pero no entra
// en el compromiso diario del Búnker. Triage simple de 3 niveles, como en
// una guardia: Urgente (apenas te desocupes), Importante (no ya mismo),
// Puede esperar (próximos días).
// ============================================================================
export const PRIORIDADES_PENDIENTE = [
  "urgente",
  "importante",
  "puede_esperar",
] as const;
export type PrioridadPendiente = (typeof PRIORIDADES_PENDIENTE)[number];

export const AREAS_PENDIENTE = ["profesional", "personal", "ambas"] as const;
export type AreaPendiente = (typeof AREAS_PENDIENTE)[number];

export const ESTADOS_TAREA_PENDIENTE = [
  "pendiente",
  "promovida",
  "completada",
  "descartada",
] as const;
export type EstadoTareaPendiente = (typeof ESTADOS_TAREA_PENDIENTE)[number];

export interface TareaPendiente {
  id: string;
  descripcion: string;
  prioridad: PrioridadPendiente;
  area: AreaPendiente;
  estado: EstadoTareaPendiente;
  origenInboxId?: string;
  creadoEn: number;
  actualizadoEn: number;
}

export const crearTareaPendienteSchema = z.object({
  descripcion: z.string().trim().min(1, "Describí la tarea."),
  prioridad: z.enum(PRIORIDADES_PENDIENTE).default("importante"),
  area: z.enum(AREAS_PENDIENTE).default("ambas"),
  origenInboxId: z.string().optional(),
});
export type CrearTareaPendienteInput = z.input<
  typeof crearTareaPendienteSchema
>;
