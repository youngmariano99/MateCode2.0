import { z } from "zod";

// ============================================================================
// Ajuste asistido por IA (Sprint 21) — se le pasa a una IA externa todo el
// contexto de un Objetivo (Proyectos → Entregables → Fases, con logrado/
// meta/faltante de cada uno) y devuelve un JSON con la lista de cambios
// sugeridos. Mismo criterio que el resto del módulo: resolver por TÍTULO
// EXACTO (nunca por id — la IA no tiene por qué conocer ids internos),
// nunca aplicar nada sin que el usuario lo revise primero (ver
// ModalImportarJson + renderResumen).
// ============================================================================

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).")
  .optional();

export const NIVELES_AJUSTE_IA = [
  "objetivo",
  "proyecto",
  "entregable",
  "fase",
] as const;
export type NivelAjusteIA = (typeof NIVELES_AJUSTE_IA)[number];

export const itemAjusteIAJsonSchema = z
  .object({
    nivel: z.enum(NIVELES_AJUSTE_IA),
    titulo: z.string().trim().min(1, "Falta el título del elemento a ajustar."),
    cantidadObjetivo: z.number().positive().optional(),
    diaLimite: fechaISO,
    motivo: z.string().trim().min(1, "Falta el motivo del ajuste."),
  })
  .refine(
    (v) => v.cantidadObjetivo !== undefined || v.diaLimite !== undefined,
    {
      message:
        "Cada ajuste necesita al menos una nueva cantidad o una nueva fecha.",
      path: ["cantidadObjetivo"],
    }
  );
export type ItemAjusteIAJson = z.infer<typeof itemAjusteIAJsonSchema>;

export const ajustesIAJsonSchema = z.object({
  ajustes: z
    .array(itemAjusteIAJsonSchema)
    .min(1, "No hay ningún ajuste para aplicar."),
});
export type AjustesIAInput = z.input<typeof ajustesIAJsonSchema>;
