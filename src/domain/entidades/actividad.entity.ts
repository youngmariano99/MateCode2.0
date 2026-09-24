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
  /** Lo mínimo aceptable de `cantidadObjetivo` para dar el día por cumplido (el día que no hay ganas). Se calcula al generar el reparto. */
  cantidadMinima?: number;
  unidad?: string;
  progresoActual?: number;
  /** Qué voy a hacer / qué hice — para actividades genéricas (ej. "Desarrollo") donde el detalle se decide día a día. Editable en cualquier momento. */
  nota?: string;
  /** Proyecto del módulo Proyectos al que se dedica esta actividad (ej. el sistema de un cliente) — el tiempo y las notas quedan ligados a él. */
  proyectoTrabajoId?: string;
  /**
   * Cuando una misma actividad genérica (ej. "Desarrollo") tocó MÁS de un
   * proyecto en el día (algo frecuente: no siempre conviene abrir una
   * Actividad por cada uno), cada entrada extra se anota acá con su propio
   * "qué hice". `proyectoTrabajoId`/`nota` de arriba siguen siendo la
   * entrada principal; esta lista es lo adicional.
   */
  otrosProyectos?: { proyectoId: string; nota?: string }[];
  /** Lunes (YYYY-MM-DD) de la semana asignada — mismo criterio que TareaPendiente.semanaId. */
  semanaId?: string;
  /** Si esta instancia nació de un Entregable recurrente (ver entregable.entity.ts) — permite rastrear el origen. */
  recurrenciaId?: string;
  origenInboxId?: string;
  /**
   * Fondo de faltantes: una Actividad tipo "backlog" que acumula lo que no se
   * llegó a hacer de una tarea cuantificable (ej. 5 contactos), para
   * repartirlo después en uno o varios días. Una por tarea (Entregable o
   * descripción). Nunca suma progreso mientras está pendiente.
   */
  esFaltante?: boolean;
  creadoEn: number;
  actualizadoEn: number;
}

/**
 * Reparte `total` en `dias` partes lo más parejas posible, sin perder ni
 * inventar ninguna unidad: 5 en 2 días → [3, 2]; 5 en 3 → [2, 2, 1]. Si hay
 * más días que unidades, se usan solo tantos días como unidades haya.
 */
export function repartirEnDias(total: number, dias: number): number[] {
  const n = Math.max(1, Math.min(Math.floor(dias), Math.floor(total)));
  if (!(total > 0)) return [];
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0));
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
    cantidadMinima: z.number().min(0).optional(),
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

// Por qué se cancela o se pasa una tarea a otro día — opcional, un tap, se
// guarda en el historial (personal_historial.campoNuevo.motivo) para poder ver
// patrones de desvío en el repaso semanal ("siempre cancelo por falta de tiempo").
// Es texto libre (no un enum cerrado): estos 5 son solo los sugeridos de
// entrada; el usuario puede agregar los suyos desde el selector, que quedan
// guardados en el catálogo de etiquetas (categoría "motivo_desvio_actividad")
// para elegirlos de nuevo la próxima vez sin escribirlos de cero.
export const MOTIVOS_DESVIO = [
  "sin_tiempo",
  "se_complico",
  "sin_energia",
  "cambio_prioridad",
  "ya_no_aplica",
] as const;
export type MotivoDesvio = string;

export const ETIQUETA_MOTIVO_DESVIO: Record<string, string> = {
  sin_tiempo: "Sin tiempo",
  se_complico: "Se complicó",
  sin_energia: "Sin energía",
  cambio_prioridad: "Cambió la prioridad",
  ya_no_aplica: "Ya no aplica",
};

/** Etiqueta de un motivo: la de los sugeridos de base, o el texto tal cual si es uno agregado por el usuario. */
export function etiquetaMotivoDesvio(motivo: string): string {
  return ETIQUETA_MOTIVO_DESVIO[motivo] ?? motivo;
}

export const migrarActividadSchema = z.object({
  id: z.string(),
  nuevoDiaTarea: fechaISO,
  motivo: z.string().trim().min(1).optional(),
});
export type MigrarActividadInput = z.input<typeof migrarActividadSchema>;

// Cómo se ordena y se distingue una tarea del día, sin campos nuevos:
//  - "prioridad": tipo enfoque (lo más importante — recomendado 1)
//  - "mantenimiento": tipo mantenimiento (lo que hay que hacer sí o sí)
//  - "si_llego": prioridad "puede_esperar" (se hace si sobra tiempo)
export const BUCKETS_DIA = ["prioridad", "mantenimiento", "si_llego"] as const;
export type BucketDia = (typeof BUCKETS_DIA)[number];

export const ETIQUETA_BUCKET: Record<BucketDia, string> = {
  prioridad: "Prioridad",
  mantenimiento: "Mantenimiento",
  si_llego: "Si llego",
};

export function bucketDeActividad(
  a: Pick<Actividad, "tipo" | "prioridad">
): BucketDia {
  if (a.prioridad === "puede_esperar") return "si_llego";
  return a.tipo === "enfoque" ? "prioridad" : "mantenimiento";
}

// Qué hacer con lo que faltó de una tarea cuantificable al cerrarla con menos
// de la meta: pasarlo a mañana (se suma a la tarea de mañana si ya existe),
// dejarlo en el fondo de faltantes para repartirlo después, o descartarlo.
export const DESTINOS_FALTANTE = ["manana", "fondo", "descartar"] as const;
export type DestinoFaltante = (typeof DESTINOS_FALTANTE)[number];

export const cerrarConCantidadSchema = z.object({
  id: z.string(),
  hecha: z.number().min(0, "La cantidad no puede ser negativa."),
  destino: z.enum(DESTINOS_FALTANTE).optional(),
  motivo: z.string().trim().min(1).optional(),
});
export type CerrarConCantidadInput = z.input<typeof cerrarConCantidadSchema>;

export const repartirFondoSchema = z.object({
  fondoId: z.string(),
  reparto: z
    .array(z.object({ dia: fechaISO, cantidad: z.number().positive() }))
    .min(1, "Elegí al menos un día."),
});
export type RepartirFondoInput = z.input<typeof repartirFondoSchema>;

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
