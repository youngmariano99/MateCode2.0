import { z } from "zod";

// ============================================================================
// El Acordeón: hábitos en 3 niveles (MIN/MED/MAX) — nunca se penaliza
// cumplir solo el nivel MIN, la idea es que siempre haya una versión del
// hábito lo bastante chica como para no fallar. Complementa al Búnker (que
// es "qué tengo que hacer hoy"): esto es "qué tengo que sostener siempre".
// ============================================================================

export const AREAS_HABITO = ["profesional", "personal", "ambas"] as const;
export type AreaHabito = (typeof AREAS_HABITO)[number];

export const NIVELES_HABITO = ["MIN", "MED", "MAX"] as const;
export type NivelHabito = (typeof NIVELES_HABITO)[number];

export interface HabitoDefinicion {
  id: string;
  nombre: string;
  descripcionMin: string;
  descripcionMed: string;
  descripcionMax: string;
  area: AreaHabito;
  activo: boolean;
  creadoEn: number;
  actualizadoEn: number;
}

export const crearHabitoSchema = z.object({
  nombre: z.string().trim().min(1, "Ponele un nombre al hábito."),
  descripcionMin: z.string().trim().min(1, "Describí qué es el nivel MIN."),
  descripcionMed: z.string().trim().min(1, "Describí qué es el nivel MED."),
  descripcionMax: z.string().trim().min(1, "Describí qué es el nivel MAX."),
  area: z.enum(AREAS_HABITO).default("ambas"),
});
export type CrearHabitoInput = z.input<typeof crearHabitoSchema>;

// ============================================================================
// Registro diario — ledger simple: un registro por hábito y día. El id es
// determinístico (habitoId + día) a propósito: corregir el registro de HOY
// es un upsert trivial, sin necesidad de buscar-y-reemplazar.
// ============================================================================
export interface HabitoRegistro {
  id: string;
  habitoId: string;
  diaTarea: string; // YYYY-MM-DD — mismo criterio que TareaDiaria
  nivelEjecutado: NivelHabito;
  creadoEn: number;
}

export function idRegistroHabito(habitoId: string, diaTarea: string): string {
  return `${habitoId}_${diaTarea}`;
}

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

export const registrarHabitoSchema = z.object({
  habitoId: z.string(),
  diaTarea: fechaISO,
  nivelEjecutado: z.enum(NIVELES_HABITO),
});
export type RegistrarHabitoInput = z.input<typeof registrarHabitoSchema>;

/**
 * Regla "No Fallar Dos Veces": si el hábito ya existía ayer y no hubo
 * ningún registro ayer, hoy queda marcado — el nivel MIN pasa a ser lo
 * mínimo esperable, para no perder la racha dos días seguidos. Un hábito
 * recién creado nunca dispara la regla el primer día (no había "ayer").
 */
export function requiereMinimoObligatorio(
  habito: Pick<HabitoDefinicion, "creadoEn">,
  registroAyer: HabitoRegistro | undefined,
  ayerISO: string
): boolean {
  const diaCreacionISO = new Date(habito.creadoEn).toISOString().slice(0, 10);
  const existiaAyer = diaCreacionISO <= ayerISO;
  return existiaAyer && !registroAyer;
}
