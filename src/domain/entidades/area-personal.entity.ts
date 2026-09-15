import { z } from "zod";

// ============================================================================
// Área — el paraguas de la jerarquía Área → Objetivo → Proyecto → Entregable
// → Actividad. Entidad real (no texto libre de catalogo_etiquetas como era
// antes vía `etiquetaArea`) para poder tener id estable: breadcrumb, borrado
// en cascada con conteo real, y comparación exacta sin depender de que dos
// strings coincidan letra por letra. Sin fecha ni cantidad — no es cuantificable
// en sí misma, eso empieza en Objetivo.
// ============================================================================

export interface AreaPersonal {
  id: string;
  nombre: string;
  descripcion?: string;
  /** Hex (#RRGGBB) — para distinguir el área de un vistazo en el calendario. undefined = se deriva un color determinístico del id (ver colorDeAreaEfectivo). */
  color?: string;
  /** Soft-hide, no eliminación — desactivar un área no borra lo que tiene debajo. */
  activa: boolean;
  creadoEn: number;
  actualizadoEn: number;
}

// Paleta fija — evita que dos áreas terminen con colores casi idénticos, y
// le da al usuario opciones ya elegidas para que combinen bien en la UI.
export const PALETA_COLORES_AREA = [
  "#F87171", // rojo
  "#FB923C", // naranja
  "#FBBF24", // ámbar
  "#A3E635", // lima
  "#34D399", // esmeralda
  "#22D3EE", // cian
  "#60A5FA", // azul
  "#A78BFA", // violeta
  "#F472B6", // rosa
  "#94A3B8", // gris azulado
] as const;

/** Color determinístico (mismo id → siempre el mismo color) para áreas sin `color` propio asignado — así los datos existentes ya se ven distinguibles sin migración. */
export function colorDeAreaEfectivo(area: {
  id: string;
  color?: string;
}): string {
  if (area.color) return area.color;
  let hash = 0;
  for (let i = 0; i < area.id.length; i++) {
    hash = (hash * 31 + area.id.charCodeAt(i)) >>> 0;
  }
  return PALETA_COLORES_AREA[hash % PALETA_COLORES_AREA.length];
}

const colorHex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido.");

export const crearAreaSchema = z.object({
  nombre: z.string().trim().min(1, "Ponele un nombre al área."),
  descripcion: z.string().trim().optional(),
  color: colorHex.optional(),
});
export type CrearAreaInput = z.input<typeof crearAreaSchema>;

export const editarAreaSchema = z.object({
  id: z.string(),
  nombre: z.string().trim().min(1).optional(),
  descripcion: z.string().trim().optional(),
  color: colorHex.optional(),
});
export type EditarAreaInput = z.input<typeof editarAreaSchema>;

// ============================================================================
// Migración Sprint 5: resuelve el etiquetaArea (texto libre) de un
// ObjetivoCuantificable viejo a un id de Área real, determinístico por
// nombre (mismo texto → mismo id siempre, sin duplicar áreas) — función
// pura para poder testearla directo, el .upgrade() de Dexie solo la llama.
// ============================================================================

export const AREA_SIN_ASIGNAR_ID = "area_sin_asignar";

/** Slug determinístico — mismo nombre de etiqueta siempre da el mismo id. */
export function idAreaDesdeEtiqueta(nombreArea: string): string {
  return `area_tag_${nombreArea
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")}`;
}

export function resolverAreaId(etiquetaArea: string | undefined): string {
  const nombre = (etiquetaArea || "").trim();
  return nombre ? idAreaDesdeEtiqueta(nombre) : AREA_SIN_ASIGNAR_ID;
}
