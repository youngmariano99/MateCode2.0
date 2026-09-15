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
  /** Soft-hide, no eliminación — desactivar un área no borra lo que tiene debajo. */
  activa: boolean;
  creadoEn: number;
  actualizadoEn: number;
}

export const crearAreaSchema = z.object({
  nombre: z.string().trim().min(1, "Ponele un nombre al área."),
  descripcion: z.string().trim().optional(),
});
export type CrearAreaInput = z.input<typeof crearAreaSchema>;

export const editarAreaSchema = z.object({
  id: z.string(),
  nombre: z.string().trim().min(1).optional(),
  descripcion: z.string().trim().optional(),
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
