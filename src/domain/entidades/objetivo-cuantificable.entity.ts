import { z } from "zod";

// ============================================================================
// Objetivo Cuantificable — infraestructura compartida entre Profesional y
// Personal: no se permite un objetivo vago ("hacer contactos en frío"), todo
// objetivo tiene una cantidad y una fecha límite, y el sistema calcula solo
// el ritmo necesario para llegar — recalculado cada vez que se entra,
// reflejando desvíos reales sin obligar a replanificar a mano.
// ============================================================================

export const AREAS_OBJETIVO = ["profesional", "personal", "ambas"] as const;
export type AreaObjetivo = (typeof AREAS_OBJETIVO)[number];

export const ESTADOS_OBJETIVO = [
  "activo",
  "cumplido",
  "vencido",
  "archivado",
] as const;
export type EstadoObjetivo = (typeof ESTADOS_OBJETIVO)[number];

export interface ObjetivoCuantificable {
  id: string;
  titulo: string; // ej. "Contactos en frío"
  unidad: string; // ej. "contactos", "pesos", "kg"
  cantidadObjetivo: number;
  progresoActual: number;
  // Nombrados "diaInicio"/"diaLimite" y no "fechaInicio"/"fechaLimite": la
  // ruta de sync trata "fechaInicio" como timestamp automáticamente
  // (dateFields) — acá son strings YYYY-MM-DD planos.
  diaInicio: string;
  diaLimite: string;
  area: AreaObjetivo;
  estado: EstadoObjetivo;
  // Módulo de origen si el objetivo quedó enganchado a una funcionalidad ya
  // existente (ej. "contacto_frio") — para que ese módulo pueda mostrar su
  // propio ritmo sin que el usuario tenga que ir a buscarlo aparte.
  origenModulo?: string;
  creadoEn: number;
  actualizadoEn: number;
}

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

export const crearObjetivoSchema = z
  .object({
    titulo: z.string().trim().min(1, "Ponele un título al objetivo."),
    unidad: z
      .string()
      .trim()
      .min(1, "Indicá la unidad (contactos, pesos, kg...)."),
    cantidadObjetivo: z
      .number()
      .positive("La cantidad objetivo tiene que ser mayor a 0."),
    diaInicio: fechaISO,
    diaLimite: fechaISO,
    area: z.enum(AREAS_OBJETIVO).default("ambas"),
    origenModulo: z.string().optional(),
  })
  .refine((v) => v.diaLimite >= v.diaInicio, {
    message: "La fecha límite no puede ser anterior a la de inicio.",
    path: ["diaLimite"],
  });
export type CrearObjetivoInput = z.input<typeof crearObjetivoSchema>;

export const ajustarObjetivoSchema = z.object({
  id: z.string(),
  cantidadObjetivo: z.number().positive().optional(),
  diaLimite: fechaISO.optional(),
});
export type AjustarObjetivoInput = z.input<typeof ajustarObjetivoSchema>;

// ============================================================================
// Cálculo de ritmo — función pura, sin acceso a la base: dado un objetivo y
// "hoy", dice cuánto falta, cuánto hay que hacer por día para llegar, y
// hacia dónde vas si seguís al ritmo actual.
// ============================================================================
export type EstadoRitmoObjetivo =
  "cumplido" | "vencido" | "al_dia" | "atrasado" | "adelantado";

export interface RitmoObjetivo {
  restante: number;
  diasRestantes: number;
  /** Cuánto hay que hacer por día, desde hoy, para llegar a tiempo. */
  porDiaNecesario: number;
  estado: EstadoRitmoObjetivo;
  /** Si seguís exactamente al ritmo promedio actual, a cuánto llegás. */
  proyeccionAlRitmoActual: number;
}

function diferenciaDias(desdeISO: string, hastaISO: string): number {
  const [a1, m1, d1] = desdeISO.split("-").map(Number);
  const [a2, m2, d2] = hastaISO.split("-").map(Number);
  const desde = Date.UTC(a1, m1 - 1, d1);
  const hasta = Date.UTC(a2, m2 - 1, d2);
  return Math.round((hasta - desde) / (1000 * 60 * 60 * 24));
}

export function calcularRitmoObjetivo(
  objetivo: Pick<
    ObjetivoCuantificable,
    "cantidadObjetivo" | "progresoActual" | "diaInicio" | "diaLimite"
  >,
  hoy: string
): RitmoObjetivo {
  const { cantidadObjetivo, progresoActual, diaInicio, diaLimite } = objetivo;
  const restante = Math.max(0, cantidadObjetivo - progresoActual);

  if (progresoActual >= cantidadObjetivo) {
    return {
      restante: 0,
      diasRestantes: Math.max(0, diferenciaDias(hoy, diaLimite)),
      porDiaNecesario: 0,
      estado: "cumplido",
      proyeccionAlRitmoActual: progresoActual,
    };
  }

  const diasTotales = Math.max(1, diferenciaDias(diaInicio, diaLimite));
  const diasTranscurridos = Math.min(
    diasTotales,
    Math.max(0, diferenciaDias(diaInicio, hoy))
  );
  const diasRestantes = Math.max(0, diferenciaDias(hoy, diaLimite));

  const ritmoEsperadoHastaHoy =
    cantidadObjetivo * (diasTranscurridos / diasTotales);

  const proyeccionAlRitmoActual =
    diasTranscurridos > 0
      ? Math.round((progresoActual / diasTranscurridos) * diasTotales)
      : progresoActual;

  if (diasRestantes <= 0) {
    return {
      restante,
      diasRestantes: 0,
      porDiaNecesario: restante,
      estado: "vencido",
      proyeccionAlRitmoActual,
    };
  }

  const porDiaNecesario = restante / diasRestantes;
  const estado: EstadoRitmoObjetivo =
    progresoActual < ritmoEsperadoHastaHoy
      ? "atrasado"
      : progresoActual > ritmoEsperadoHastaHoy
        ? "adelantado"
        : "al_dia";

  return {
    restante,
    diasRestantes,
    porDiaNecesario,
    estado,
    proyeccionAlRitmoActual,
  };
}
