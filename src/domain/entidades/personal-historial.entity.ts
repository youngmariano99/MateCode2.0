// ============================================================================
// Historial de la jerarquía Personal — registro append-only real (nunca se
// borra, ni local ni al sincronizar), a diferencia de cola_eventos que es un
// buzón de salida que se consume y descarta al sincronizar. No reutiliza la
// tabla `historial` de schema.ts (pensada para el mundo multi-tenant del
// CRM, con uuid/agenciaId) — este es un shape propio, más simple, mono-
// usuario: sin creadoPor/actualizadoPor, sin eliminadoEn (es permanente).
// ============================================================================

export const TIPOS_ENTIDAD_HISTORIAL = [
  "area",
  "objetivo",
  "proyecto",
  "entregable",
  "actividad",
  "habito",
] as const;
export type TipoEntidadHistorial = (typeof TIPOS_ENTIDAD_HISTORIAL)[number];

export const ACCIONES_HISTORIAL = [
  "crear",
  "editar",
  "eliminar",
  "ajustar_fecha",
  "ajustar_cantidad",
  "registrar_avance",
] as const;
export type AccionHistorial = (typeof ACCIONES_HISTORIAL)[number];

export interface PersonalHistorialRow {
  id: string;
  entidadTipo: TipoEntidadHistorial;
  entidadId: string;
  accion: AccionHistorial;
  descripcion?: string;
  campoAnterior?: Record<string, unknown>;
  campoNuevo?: Record<string, unknown>;
  creadoEn: number;
}
