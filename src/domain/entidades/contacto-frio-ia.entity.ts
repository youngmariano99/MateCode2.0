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

export const FILTROS_UNIVERSALES = [
  "pulso_comercial_activo",
  "complejidad_de_datos",
  "friccion_operativa_visible",
  "espalda_o_escala",
] as const;
export type FiltroUniversal = (typeof FILTROS_UNIVERSALES)[number];

export interface DetalleFiltro {
  clave: string;
  nombre: string;
  subtitulo: string;
  descripcion: string;
}

export const DETALLE_FILTROS_UNIVERSALES: Record<
  FiltroUniversal,
  DetalleFiltro
> = {
  pulso_comercial_activo: {
    clave: "pulso_comercial_activo",
    nombre: "Pulso Comercial Activo",
    subtitulo: "Filtro Anti-Fantasmas",
    descripcion:
      "Tiene actividad real reciente (posteos en los últimos 30–60 días, reseñas nuevas en Google Maps, flota de reparto o local con movimiento). Evita perder tiempo con comercios cerrados o de subsistencia mínima.",
  },
  complejidad_de_datos: {
    clave: "complejidad_de_datos",
    nombre: "Complejidad de Datos",
    subtitulo: "Filtro de Volumen",
    descripcion:
      "Maneja una cantidad significativa de artículos (SKUs), insumos, combinaciones de recetas, múltiples listas de proveedores o cuentas corrientes (fiados/acopios) que generan trabajo administrativo repetitivo.",
  },
  friccion_operativa_visible: {
    clave: "friccion_operativa_visible",
    nombre: "Fricción Operativa Visible",
    subtitulo: "Filtro de Desorden Manual",
    descripcion:
      "Muestra señales de procesos manuales en sus canales: toma pedidos o presupuestos por WhatsApp a mano, tiene web en mantenimiento/desactualizada, publica listas en fotos/PDF o aclara demoras en entregas y cotizaciones.",
  },
  espalda_o_escala: {
    clave: "espalda_o_escala",
    nombre: "Espalda o Escala",
    subtitulo: "Filtro de Capacidad de Pago",
    descripcion:
      "Tiene más de un local/sucursal, depósito propio, venta mayorista/a empresas, vehículos de reparto o estructura de empleados. Garantiza que tienen flujo de caja para pagar un servicio sin regatear cada peso.",
  },
};

export interface FiltroDinamicoRubro {
  clave: string;
  nombreRubro: string;
  descripcion: string;
}

export const PRESETS_FILTRO_DINAMICO: FiltroDinamicoRubro[] = [
  {
    clave: "dependencia_listas_proveedor",
    nombreRubro:
      "Comercios de Alto SKU (Ferreterías, Pinturerías, Repuesteras, Corralones)",
    descripcion:
      "Trabaja con marcas o distribuidores mayoristas que actualizan precios y bonificaciones periódicamente en PDF o Excel.",
  },
  {
    clave: "cuello_botella_comandas_o_recetas",
    nombreRubro: "Gastronomía / Rotiserías / Panaderías",
    descripcion:
      "Tiene picos de pedidos por WhatsApp en horarios clave (fines de semana/mediodía) o elabora productos con múltiples insumos sensibles a la inflación.",
  },
  {
    clave: "conciliacion_de_campo",
    nombreRubro: "Distribuidoras / Mayoristas / Preventa",
    descripcion:
      "Maneja viajantes/preventistas, remitos con entregas parciales, cobranzas en calle o múltiples medios de pago (cheques, transferencias, Mercado Pago).",
  },
  {
    clave: "gestion_de_turnos_o_seguimiento",
    nombreRubro: "Talleres / Servicios Técnicos / Veterinarias / Estética",
    descripcion:
      "Depende de agendas manuales por mensaje, historial de clientes/equipos o recordatorios de mantenimiento recurrentes.",
  },
];

export const FILTROS_CALIFICACION = [
  ...FILTROS_UNIVERSALES,
  "dependencia_listas_proveedor",
  "cuello_botella_comandas_o_recetas",
  "conciliacion_de_campo",
  "gestion_de_turnos_o_seguimiento",
  // Legacy
  "friccion_catalogo",
  "barrera_compra",
  "respuesta_lenta",
  "rubro_variantes",
] as const;
export type FiltroCalificacion = (typeof FILTROS_CALIFICACION)[number];

export const ETIQUETA_FILTRO: Record<string, string> = {
  pulso_comercial_activo: "Pulso comercial activo (Anti-fantasmas)",
  complejidad_de_datos: "Complejidad de datos (Volumen)",
  friccion_operativa_visible: "Fricción operativa (Desorden manual)",
  espalda_o_escala: "Espalda o escala (Capacidad de pago)",
  dependencia_listas_proveedor: "Dependencia de listas de proveedor",
  cuello_botella_comandas_o_recetas: "Cuello de botella en comandas/recetas",
  conciliacion_de_campo: "Conciliación de campo / preventa",
  gestion_de_turnos_o_seguimiento: "Gestión de turnos / seguimiento",
  // Legacy
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
  filtrosQueCumple: z.array(z.string()).default([]),
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
