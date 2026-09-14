import { z } from "zod";

// ============================================================================
// El Acordeón: hábitos en 3 niveles (MIN/MED/MAX) — nunca se penaliza
// cumplir solo el nivel MIN, la idea es que siempre haya una versión del
// hábito lo bastante chica como para no fallar. Complementa al Búnker (que
// es "qué tengo que hacer hoy"): esto es "qué tengo que sostener siempre".
// ============================================================================

export const AREAS_HABITO = ["profesional", "personal", "ambas"] as const;
export type AreaHabito = (typeof AREAS_HABITO)[number];

export const NIVELES_HABITO = ["MIN", "MED", "MAX", "NO_CUMPLIDO"] as const;
export type NivelHabito = (typeof NIVELES_HABITO)[number];

// Un hábito ya no es siempre diario: "días específicos" es lo mismo que un
// hábito diario en todo (mismo registro, mismo Acordeón MIN/MED/MAX), solo
// que `aplicaHoy` filtra qué días corresponde mostrarlo/exigirlo — así
// "Contacto en frío: Lun-Sáb" no aparece ni cuenta como fallado los domingos.
export const FRECUENCIAS_HABITO = ["diaria", "dias_especificos"] as const;
export type FrecuenciaHabito = (typeof FRECUENCIAS_HABITO)[number];

export interface HabitoDefinicion {
  id: string;
  nombre: string;
  descripcionMin: string;
  descripcionMed: string;
  descripcionMax: string;
  area: AreaHabito;
  activo: boolean;
  frecuencia: FrecuenciaHabito;
  // 0=domingo...6=sábado. Solo tiene sentido cuando frecuencia es
  // "dias_especificos"; se ignora si frecuencia es "diaria".
  diasSemana?: number[];
  // Etiqueta libre de área (Freelancer, Contenido, Desarrollo...) — distinta
  // de `area` (profesional/personal/ambas), que ya significa otra cosa. Es
  // texto de `catalogo_etiquetas` (categoría "area_personal"), no un id.
  etiquetaArea?: string;
  // Si este hábito es el desglose recurrente de un ObjetivoCuantificable.
  objetivoId?: string;
  creadoEn: number;
  actualizadoEn: number;
}

export const crearHabitoSchema = z.object({
  nombre: z.string().trim().min(1, "Ponele un nombre al hábito."),
  descripcionMin: z.string().trim().min(1, "Describí qué es el nivel MIN."),
  descripcionMed: z.string().trim().min(1, "Describí qué es el nivel MED."),
  descripcionMax: z.string().trim().min(1, "Describí qué es el nivel MAX."),
  area: z.enum(AREAS_HABITO).default("ambas"),
  frecuencia: z.enum(FRECUENCIAS_HABITO).default("diaria"),
  diasSemana: z.array(z.number().int().min(0).max(6)).optional(),
  etiquetaArea: z.string().trim().optional(),
  objetivoId: z.string().optional(),
});
export type CrearHabitoInput = z.input<typeof crearHabitoSchema>;

// ============================================================================
// Registro diario — ledger simple: un registro por hábito y día. El id es
// determinístico (habitoId + día) a propósito: corregir el registro de HOY
// (o de cualquier día pasado, para marcar retroactivamente lo que sí se
// hizo) es un upsert trivial, sin necesidad de buscar-y-reemplazar.
// ============================================================================
export interface HabitoRegistro {
  id: string;
  habitoId: string;
  diaTarea: string; // YYYY-MM-DD — mismo criterio que TareaDiaria
  nivelEjecutado: NivelHabito;
  // Motivo del catálogo (categoría "motivo_incumplimiento") cuando
  // nivelEjecutado es "NO_CUMPLIDO" — texto libre, mismo criterio que
  // etiquetaArea.
  motivoIncumplimiento?: string;
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
  motivoIncumplimiento: z.string().trim().optional(),
});
export type RegistrarHabitoInput = z.input<typeof registrarHabitoSchema>;

/**
 * ¿Le toca a este hábito el día `diaISO`? Diario siempre da true; de días
 * específicos depende del día de la semana. La misma función decide tanto
 * qué mostrar en "hábitos de hoy" como qué días contar como "sin registrar"
 * al detectar un desvío — un hábito de días específicos nunca debe figurar
 * como incumplido en un día que ni le correspondía.
 */
export function aplicaHoy(
  habito: Pick<HabitoDefinicion, "frecuencia" | "diasSemana">,
  diaISO: string
): boolean {
  // Retrocompatible: hábitos creados antes de que existiera este campo no
  // tienen `frecuencia` seteada en Dexie — deben seguir tratándose como
  // diarios, no desaparecer del día a día.
  if (habito.frecuencia !== "dias_especificos") return true;
  const [anio, mes, dia] = diaISO.split("-").map(Number);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return (habito.diasSemana || []).includes(diaSemana);
}

/**
 * Regla "No Fallar Dos Veces": si el hábito ya existía y le tocaba ayer, y
 * no hubo ningún registro ayer, hoy queda marcado — el nivel MIN pasa a ser
 * lo mínimo esperable, para no perder la racha dos días seguidos. Un hábito
 * recién creado, o que ayer no le tocaba (ej. domingo en uno de Lun-Sáb),
 * nunca dispara la regla.
 */
export function requiereMinimoObligatorio(
  habito: Pick<HabitoDefinicion, "creadoEn" | "frecuencia" | "diasSemana">,
  registroAyer: HabitoRegistro | undefined,
  ayerISO: string
): boolean {
  const diaCreacionISO = new Date(habito.creadoEn).toISOString().slice(0, 10);
  const existiaAyer = diaCreacionISO <= ayerISO;
  return existiaAyer && aplicaHoy(habito, ayerISO) && !registroAyer;
}
