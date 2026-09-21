import { z } from "zod";
import {
  ACCIONES_PROXIMO_PASO,
  TIENE_WEB_OPCIONES,
  TIPOS_DATO,
  aprendizajeSchema,
} from "./contacto-frio.entity";

// ============================================================================
// Contratos de lo que la IA devuelve para pegar de vuelta en la cinta. No hay
// IA integrada: se copia un prompt, se pega en la IA de preferencia, y se
// pega la respuesta acá — estos schemas validan esa respuesta antes de tocar
// nada, con mensajes que se pueden mostrar tal cual.
// ============================================================================

/** Saca el primer objeto/array JSON de un texto, aunque venga envuelto en ```json … ``` o con texto alrededor. */
export function extraerJson(texto: string): unknown {
  const sinCercas = texto.replace(/```(?:json)?/gi, "").trim();
  const inicio = sinCercas.search(/[{[]/);
  if (inicio === -1) {
    throw new Error("No encontré ningún JSON en lo que pegaste.");
  }
  const apertura = sinCercas[inicio];
  const cierre = apertura === "{" ? "}" : "]";
  let profundidad = 0;
  let enTexto = false;
  let escape = false;
  for (let i = inicio; i < sinCercas.length; i++) {
    const c = sinCercas[i];
    if (enTexto) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') enTexto = false;
      continue;
    }
    if (c === '"') enTexto = true;
    else if (c === apertura) profundidad++;
    else if (c === cierre) {
      profundidad--;
      if (profundidad === 0) {
        try {
          return JSON.parse(sinCercas.slice(inicio, i + 1));
        } catch {
          throw new Error(
            "El JSON no es válido — revisá que esté copiado completo."
          );
        }
      }
    }
  }
  throw new Error("El JSON está cortado — copialo completo.");
}

export const respuestaIASchema = z.object({
  lectura: z.string().optional(),
  tipoDato: z.enum(TIPOS_DATO).optional(),
  borradorRespuesta: z
    .string()
    .trim()
    .min(1, "Falta el borrador de respuesta (borradorRespuesta)."),
  aprendizaje: aprendizajeSchema.default({}),
  proximoPaso: z
    .object({
      accion: z.enum(ACCIONES_PROXIMO_PASO),
      dias: z.number().int().min(0).max(90).optional(),
      nota: z.string().optional(),
    })
    .optional(),
});
export type RespuestaIA = z.infer<typeof respuestaIASchema>;

export const FILTROS_CALIFICACION = [
  "friccion_catalogo",
  "barrera_compra",
  "respuesta_lenta",
  "rubro_variantes",
] as const;
export type FiltroCalificacion = (typeof FILTROS_CALIFICACION)[number];

export const ETIQUETA_FILTRO: Record<FiltroCalificacion, string> = {
  friccion_catalogo: "Fricción de catálogo",
  barrera_compra: "Barrera de compra directa",
  respuesta_lenta: "Responde lento",
  rubro_variantes: "Rubro con muchas variantes",
};

export const prospectoIASchema = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre del comercio."),
  rubro: z.string().optional(),
  instagram: z.string().optional(),
  whatsapp: z.string().optional(),
  facebook: z.string().optional(),
  email: z.string().optional(),
  nombreDueño: z.string().optional(),
  dolorTags: z.array(z.string()).default([]),
  tieneWeb: z.enum(TIENE_WEB_OPCIONES).default("no"),
  usaCatalogoNativoWhatsapp: z.boolean().default(false),
  referenciaPosteo: z.string().optional(),
  notasExtra: z.string().optional(),
  filtrosQueCumple: z.array(z.enum(FILTROS_CALIFICACION)).default([]),
  califica: z.boolean().default(true),
});
export type ProspectoIA = z.infer<typeof prospectoIASchema>;

export const calificarIASchema = z.object({
  prospectos: z.array(prospectoIASchema).min(1, "No hay ningún prospecto."),
});
export type CalificarIA = z.infer<typeof calificarIASchema>;

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

export function parsearRespuestaIA(texto: string): Parseo<RespuestaIA> {
  return parsear(texto, respuestaIASchema);
}

/** Acepta {"prospectos":[…]} o directamente un array de prospectos. */
export function parsearCalificacionIA(texto: string): Parseo<CalificarIA> {
  let crudo: unknown;
  try {
    crudo = extraerJson(texto);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No pude leer el JSON.",
    };
  }
  const normalizado = Array.isArray(crudo) ? { prospectos: crudo } : crudo;
  const res = calificarIASchema.safeParse(normalizado);
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
