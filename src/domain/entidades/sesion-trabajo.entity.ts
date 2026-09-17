import { z } from "zod";

// ============================================================================
// Sesión de trabajo enfocado (Oficina) — cronómetro por Actividad. Una sola
// sesión "activa" o "pausada" a la vez, app-wide: mismo criterio de foco
// único que MAX_TAREAS_ENFOQUE_POR_DIA=1 en actividad.entity.ts. "Pausada"
// es el estado mientras se hace una pausa activa (ver GestionarSesionTrabajoUseCase.pausarParaDescanso) —
// no es un descarte, es una interrupción esperada que se retoma con reanudarSesion.
// ============================================================================

export const ESTADOS_SESION_TRABAJO = [
  "activa",
  "pausada",
  "finalizada",
] as const;
export type EstadoSesionTrabajo = (typeof ESTADOS_SESION_TRABAJO)[number];

export interface SesionTrabajo {
  id: string;
  actividadId: string;
  diaTarea: string; // YYYY-MM-DD
  iniciadoEn: number; // ms epoch del tramo corriendo actual
  pausadoEn?: number; // ms epoch, solo mientras estado === "pausada"
  segundosAcumulados: number; // total acumulado de tramos ya cerrados
  estado: EstadoSesionTrabajo;
  creadoEn: number;
  actualizadoEn: number;
}

export const iniciarSesionSchema = z.object({
  actividadId: z.string().trim().min(1, "Falta la actividad."),
});
export type IniciarSesionInput = z.input<typeof iniciarSesionSchema>;
