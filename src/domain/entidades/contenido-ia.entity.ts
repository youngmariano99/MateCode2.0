import { z } from "zod";
import {
  PERSONAS_CONTENIDO,
  PILARES_CONTENIDO,
  TIPOS_CONTENIDO,
} from "./contenido.entity";
import { extraerJson } from "./contacto-frio-ia.entity";

// ============================================================================
// Contratos de los 3 JSON de la planificación de contenido con IA (sin IA
// integrada: se copia el prompt, se pega en la IA de preferencia y se pega
// acá lo que devuelve). Cada etapa tiene el suyo:
//   ① Ideas   ② Plan de la semana   ③ Guiones
// Lo que ya se decidió en una etapa vuelve a entrar en el prompt de la
// siguiente (lo arma la app desde lo guardado, no hay que copiar nada).
// ============================================================================

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");
const tipo = z.enum(TIPOS_CONTENIDO);

export const ideasIASchema = z.object({
  ideas: z
    .array(
      z.object({
        texto: z.string().trim().min(1, "Falta el texto de la idea."),
        /** El dolor operativo del comerciante que resuelve. */
        dolorSemana: z.string().trim().optional(),
        pilar: z.enum(PILARES_CONTENIDO).optional(),
        persona: z.enum(PERSONAS_CONTENIDO).optional(),
        /** true = entra ya a esta semana (queda "Seleccionada"); false = va al backlog. */
        seleccionar: z.boolean().default(true),
      })
    )
    .min(1, "No hay ninguna idea."),
});
export type IdeasIA = z.infer<typeof ideasIASchema>;

const planDias = z.object({
  guion: fechaISO.optional(),
  grabacion: fechaISO.optional(),
  edicion: fechaISO.optional(),
  publicacion: fechaISO.optional(),
});

export const planSemanaIASchema = z.object({
  /** Cuántas piezas de cada tipo esta semana. Si viene, reemplaza la mezcla de la semana. */
  mezcla: z
    .object({
      Video: z.number().int().min(0).optional(),
      Post: z.number().int().min(0).optional(),
      Carrusel: z.number().int().min(0).optional(),
      Historia: z.number().int().min(0).optional(),
    })
    .optional(),
  piezas: z
    .array(
      z.object({
        titulo: z.string().trim().min(1, "Falta el título de la pieza."),
        tipoContenido: tipo,
        /** Texto de la idea de origen (se vincula si coincide con una idea cargada). */
        idea: z.string().trim().optional(),
        pilar: z.enum(PILARES_CONTENIDO).optional(),
        persona: z.enum(PERSONAS_CONTENIDO).optional(),
        serie: z.string().trim().optional(),
        modulo: z.string().trim().optional(),
        keyword: z.string().trim().optional(),
        canales: z.array(z.string()).default([]),
        dias: planDias.optional(),
      })
    )
    .min(1, "No hay ninguna pieza."),
});
export type PlanSemanaIA = z.infer<typeof planSemanaIASchema>;

export const guionesIASchema = z.object({
  guiones: z
    .array(
      z.object({
        /** Tiene que coincidir con el título de una pieza ya planificada (si no, se crea una nueva). */
        titulo: z.string().trim().min(1, "Falta el título del guion."),
        tipoContenido: tipo.optional(),
        canales: z.array(z.string()).optional(),
        /** Claves = ids de las secciones de la plantilla (gancho, desarrollo, cierre_cta, seo_audio, texto_pantalla, descripcion, bucle, gancho_visual, hashtags). */
        guion: z.record(z.string(), z.string()),
      })
    )
    .min(1, "No hay ningún guion."),
});
export type GuionesIA = z.infer<typeof guionesIASchema>;

type Parseo<T> = { ok: true; data: T } | { ok: false; error: string };

function parsear<T>(texto: string, schema: z.ZodType<T>): Parseo<T> {
  let crudo: unknown;
  try {
    crudo = extraerJson(texto);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No pude leer el JSON.",
    };
  }
  const res = schema.safeParse(crudo);
  if (!res.success) {
    return {
      ok: false,
      error: res.error.issues
        .map((i) => `${i.path.map(String).join(".") || "(raíz)"}: ${i.message}`)
        .join(" — "),
    };
  }
  return { ok: true, data: res.data };
}

export const parsearIdeasIA = (t: string) => parsear(t, ideasIASchema);
export const parsearPlanSemanaIA = (t: string) =>
  parsear(t, planSemanaIASchema);
export const parsearGuionesIA = (t: string) => parsear(t, guionesIASchema);
