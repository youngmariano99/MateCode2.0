import { z } from "zod";

export const TIPOS_RECURSO_OFICINA = [
  "link_util",
  "acceso_directo",
  "hito_fecha",
  "nota_rapida",
] as const;

export type TipoRecursoOficina = (typeof TIPOS_RECURSO_OFICINA)[number];

export interface RecursoOficina {
  id: string;
  tipo: TipoRecursoOficina;
  titulo: string;
  url?: string;
  icono?: string;
  etiquetas: string[];
  /** Para hitos o fechas clave: YYYY-MM-DD */
  fechaLimite?: string;
  /** Cantidad de días previos para activar el aviso visual en el banner (0 = solo el mismo día) */
  diasAvisoPrevio?: number;
  descripcion?: string;
  /** Posición de orden para accesos directos personalizados */
  orden?: number;
  creadoEn: number;
  actualizadoEn: number;
}

export const crearRecursoOficinaSchema = z.object({
  tipo: z.enum(TIPOS_RECURSO_OFICINA),
  titulo: z.string().trim().min(1, "El título es obligatorio."),
  url: z
    .string()
    .trim()
    .url("Debe ser una URL válida.")
    .optional()
    .or(z.literal("")),
  icono: z.string().trim().optional(),
  etiquetas: z.array(z.string().trim()).default([]),
  fechaLimite: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD.")
    .optional(),
  diasAvisoPrevio: z.number().int().min(0).max(30).default(0),
  descripcion: z.string().trim().optional(),
  orden: z.number().int().default(0),
});

export type CrearRecursoOficinaInput = z.input<
  typeof crearRecursoOficinaSchema
>;

export const actualizarRecursoOficinaSchema =
  crearRecursoOficinaSchema.partial();
export type ActualizarRecursoOficinaInput = z.input<
  typeof actualizarRecursoOficinaSchema
>;

export interface EstadoAlertaHito {
  diasRestantes: number;
  debeAvisar: boolean;
  estado: "vencido" | "hoy" | "proximo" | "futuro";
  mensajeAlerta: string;
}

/**
 * Calcula si un hito debe disparar una alerta en el banner de la Oficina
 * según la fecha de hoy y los días de aviso previo configurados.
 */
export function calcularEstadoHito(
  recurso: Pick<RecursoOficina, "tipo" | "fechaLimite" | "diasAvisoPrevio">,
  hoyISO: string
): EstadoAlertaHito | null {
  if (recurso.tipo !== "hito_fecha" || !recurso.fechaLimite) {
    return null;
  }

  const msPorDia = 86400000;
  const hoyMs = new Date(`${hoyISO}T00:00:00Z`).getTime();
  const limiteMs = new Date(`${recurso.fechaLimite}T00:00:00Z`).getTime();
  const diasRestantes = Math.round((limiteMs - hoyMs) / msPorDia);
  const diasAviso = recurso.diasAvisoPrevio ?? 0;

  if (diasRestantes < 0) {
    return {
      diasRestantes,
      debeAvisar: false,
      estado: "vencido",
      mensajeAlerta: `Venció hace ${Math.abs(diasRestantes)} día(s)`,
    };
  }

  if (diasRestantes === 0) {
    return {
      diasRestantes: 0,
      debeAvisar: true,
      estado: "hoy",
      mensajeAlerta: "¡Es hoy!",
    };
  }

  const debeAvisar = diasRestantes <= diasAviso;
  return {
    diasRestantes,
    debeAvisar,
    estado: debeAvisar ? "proximo" : "futuro",
    mensajeAlerta: diasRestantes === 1 ? "Mañana" : `En ${diasRestantes} días`,
  };
}
