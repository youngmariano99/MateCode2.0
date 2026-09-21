import { z } from "zod";

// ============================================================================
// Sesión de trabajo enfocado (Oficina) — cronómetro. Una sola sesión "activa"
// o "pausada" a la vez, app-wide: mismo criterio de foco único que
// MAX_TAREAS_ENFOQUE_POR_DIA=1 en actividad.entity.ts.
//
// - modo "libre": corre hasta que se cierra. "temporizador": tiene un tiempo
//   planificado (duracionPlanificadaSeg) y avisa al cumplirse — pero si se
//   cierra antes, se guarda lo realmente trabajado, no lo planificado.
// - El tiempo se calcula con timestamps (iniciadoEn + segundosAcumulados), no
//   contando ticks: sigue siendo exacto aunque el celu se bloquee o se cierre
//   la pestaña.
// - "pausada" tiene dos causas (tipoPausa): "manual" (para seguir después) o
//   "pausa_activa" (interrupción para hacer una rutina, se retoma sola).
// - actividadId es opcional: se puede trabajar en algo suelto describiéndolo.
// ============================================================================

export const ESTADOS_SESION_TRABAJO = [
  "activa",
  "pausada",
  "finalizada",
] as const;
export type EstadoSesionTrabajo = (typeof ESTADOS_SESION_TRABAJO)[number];

export const MODOS_SESION_TRABAJO = ["libre", "temporizador"] as const;
export type ModoSesionTrabajo = (typeof MODOS_SESION_TRABAJO)[number];

export type TipoPausaSesion = "manual" | "pausa_activa";

export interface SesionTrabajo {
  id: string;
  actividadId?: string;
  /** Qué se hizo/se hace — obligatorio si no hay actividadId, opcional si la hay. */
  descripcion?: string;
  /** Proyecto del módulo Proyectos al que se dedica la sesión — para las sesiones sueltas (sin actividad) que igual son de un proyecto. Si falta, cuenta el de la actividad. */
  proyectoTrabajoId?: string;
  diaTarea: string; // YYYY-MM-DD
  /** Undefined en sesiones viejas = "libre". */
  modo?: ModoSesionTrabajo;
  duracionPlanificadaSeg?: number;
  iniciadoEn: number; // ms epoch del tramo corriendo actual
  pausadoEn?: number; // ms epoch, solo mientras estado === "pausada"
  tipoPausa?: TipoPausaSesion;
  segundosAcumulados: number; // total acumulado de tramos ya cerrados
  estado: EstadoSesionTrabajo;
  /** Nota al cerrar: qué se logró. */
  nota?: string;
  creadoEn: number;
  actualizadoEn: number;
}

export const iniciarSesionSchema = z
  .object({
    actividadId: z.string().trim().min(1).optional(),
    descripcion: z.string().trim().min(1).optional(),
    proyectoTrabajoId: z.string().trim().min(1).optional(),
    modo: z.enum(MODOS_SESION_TRABAJO).default("libre"),
    duracionMin: z
      .number()
      .positive("El tiempo tiene que ser mayor a 0.")
      .optional(),
  })
  .refine((v) => v.actividadId || v.descripcion, {
    message: "Elegí una actividad o escribí en qué vas a trabajar.",
    path: ["descripcion"],
  })
  .refine((v) => v.modo === "libre" || v.duracionMin !== undefined, {
    message: "Indicá cuántos minutos dura el temporizador.",
    path: ["duracionMin"],
  });
export type IniciarSesionInput = z.input<typeof iniciarSesionSchema>;

/** Segundos trabajados de una sesión a un instante dado (los tramos cerrados + el tramo corriendo si está activa). */
export function segundosTrabajados(s: SesionTrabajo, ahora: number): number {
  const tramoActual =
    s.estado === "activa"
      ? Math.max(0, Math.floor((ahora - s.iniciadoEn) / 1000))
      : 0;
  return s.segundosAcumulados + tramoActual;
}
