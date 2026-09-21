import { z } from "zod";

export const ESTADOS_CONTENIDO = ["Guion", "Producción", "Publicado"] as const;
export type EstadoContenido = (typeof ESTADOS_CONTENIDO)[number];

export const TIPOS_CONTENIDO = [
  "Video",
  "Post",
  "Carrusel",
  "Historia",
] as const;
export type TipoContenido = (typeof TIPOS_CONTENIDO)[number];

export const ESTADOS_IDEA = ["Backlog", "Seleccionada", "Descartada"] as const;
export type EstadoIdea = (typeof ESTADOS_IDEA)[number];

export const GRUPOS_SECCION = ["principal", "extra"] as const;
export type GrupoSeccion = (typeof GRUPOS_SECCION)[number];

export interface SeccionGuion {
  id: string;
  etiqueta: string;
  grupo: GrupoSeccion;
  orden: number;
}

/**
 * Estructura de guion por defecto (Fase 5.1 — Planificador de Contenido).
 * Vive como JSON/JSONB, no como columnas fijas: si mañana cambia la forma
 * de hacer contenido, se edita esta lista desde la propia interfaz sin
 * tocar código ni romper el contenido ya creado con la estructura vieja.
 */
export const SECCIONES_GUION_DEFAULT: SeccionGuion[] = [
  { id: "gancho", etiqueta: "Gancho", grupo: "principal", orden: 1 },
  { id: "desarrollo", etiqueta: "Desarrollo", grupo: "principal", orden: 2 },
  {
    id: "cierre_cta",
    etiqueta: "Cierre con CTA",
    grupo: "principal",
    orden: 3,
  },
  {
    id: "seo_audio",
    etiqueta: "SEO de audio (frase clave que decís fuerte en los primeros 3 s)",
    grupo: "extra",
    orden: 4,
  },
  {
    id: "texto_pantalla",
    etiqueta: "SEO visual (texto de anclaje que queda fijo arriba)",
    grupo: "extra",
    orden: 5,
  },
  {
    id: "descripcion",
    etiqueta: "Leyenda PEC-CTA (Problema ➔ Empatía ➔ Llamado a la acción)",
    grupo: "extra",
    orden: 6,
  },
  {
    id: "bucle",
    etiqueta: "Bucle: última frase inconclusa ➔ primera frase del gancho",
    grupo: "extra",
    orden: 7,
  },
  {
    id: "gancho_visual",
    etiqueta: "Visual / acción técnica (cortes, zooms, B-roll)",
    grupo: "extra",
    orden: 8,
  },
  { id: "hashtags", etiqueta: "Hashtags", grupo: "extra", orden: 9 },
];

/** Los ids de la plantilla vieja (7 secciones): si la guardada es exactamente esa, se actualiza sola a la del SOP. */
export const IDS_PLANTILLA_VIEJA = [
  "gancho",
  "desarrollo",
  "cierre_cta",
  "descripcion",
  "texto_pantalla",
  "hashtags",
  "gancho_visual",
];

// ---------------------------------------------------------------------------
// Planificación semanal dinámica: la mezcla de tipos y los días de la cinta se
// arman semana a semana — nada está fijo.
// ---------------------------------------------------------------------------

/** Pilares del SOP (sección 3 y 5): Quips = detrás de escena, Tips = educación/hacks, Clips = demo. */
export const PILARES_CONTENIDO = ["Quips", "Tips", "Clips"] as const;
export type PilarContenido = (typeof PILARES_CONTENIDO)[number];
export const DESCRIPCION_PILAR: Record<PilarContenido, string> = {
  Quips: "Detrás de escena",
  Tips: "Educación y hacks (CTA: PACK)",
  Clips: "Demo del software (CTA: DEMO)",
};

export const PERSONAS_CONTENIDO = [
  "Dueño Consolidado",
  "Comerciante Desbordado",
  "Emprendedor de Trinchera",
] as const;
export type PersonaContenido = (typeof PERSONAS_CONTENIDO)[number];

export interface FichaContenido {
  pilar?: PilarContenido;
  persona?: PersonaContenido;
  serie?: string;
  modulo?: string;
  keyword?: string;
}

/** Etapas de la cinta de una pieza, cada una con su propio día. */
export const ETAPAS_CINTA = [
  "guion",
  "grabacion",
  "edicion",
  "publicacion",
] as const;
export type EtapaCinta = (typeof ETAPAS_CINTA)[number];
export const ETIQUETA_ETAPA: Record<EtapaCinta, string> = {
  guion: "Guion",
  grabacion: "Grabar",
  edicion: "Editar y programar",
  publicacion: "Publicar",
};

/** Día (YYYY-MM-DD) en que toca cada etapa de ESTA pieza — se puede repetir el mismo día para varias piezas o varias etapas. */
export type PlanPieza = Partial<Record<EtapaCinta, string>>;

/** Cuántas piezas de cada tipo tiene esta semana (ej. 3 videos + 3 posts + 5 historias). Cambia semana a semana. */
export type MezclaSemanal = Partial<Record<TipoContenido, number>>;

/** Día de la semana (0=domingo…6=sábado) por defecto para cada etapa de las piezas nuevas de la semana. */
export type DiasCinta = Partial<Record<EtapaCinta | "ideas", number>>;
export const DIAS_CINTA_DEFAULT: DiasCinta = {
  ideas: 0,
  guion: 1,
  grabacion: 2,
  edicion: 3,
};

export interface PlantillaGuion {
  id: string;
  nombre: string;
  secciones: SeccionGuion[];
  activa: boolean;
  creadoEn: number;
}

export interface TareaPendiente {
  id: string;
  texto: string;
  hecha: boolean;
}

export interface CicloSemanal {
  id: string;
  /** Lunes de la semana, epoch ms en horario de Buenos Aires. */
  fechaInicio: number;
  /** Legacy: hoy el objetivo real es `mezcla`. Se mantiene igual a mezcla.Video. */
  objetivoVideos: number;
  /** Lunes (YYYY-MM-DD) de la semana que planifica este ciclo. */
  semanaInicio?: string;
  mezcla?: MezclaSemanal;
  diasCinta?: DiasCinta;
  estado: "activo" | "cerrado";
  creadoEn: number;
}

export const crearIdeaSchema = z.object({
  texto: z.string().min(1, "La idea no puede estar vacía."),
  dolorSemana: z.string().optional(),
});
export type CrearIdeaInput = z.input<typeof crearIdeaSchema>;

export interface IdeaContenido {
  id: string;
  texto: string;
  dolorSemana?: string;
  estado: EstadoIdea;
  cicloId?: string;
  creadoEn: number;
}

export const guardarGuionSchema = z.object({
  titulo: z.string().min(1, "El título es obligatorio."),
  tipoContenido: z.enum(TIPOS_CONTENIDO),
  canales: z.array(z.string()).default([]),
  guion: z.record(z.string(), z.string()).default({}),
});
export type GuardarGuionInput = z.input<typeof guardarGuionSchema>;

export const registrarMetricaSchema = z.object({
  kpiId: z.string().min(1),
  valor: z.number(),
});
export type RegistrarMetricaInput = z.infer<typeof registrarMetricaSchema>;

export interface Contenido {
  id: string;
  ideaId?: string;
  cicloId?: string;
  titulo: string;
  tipoContenido: TipoContenido;
  canales: string[];
  estado: EstadoContenido;
  guion: Record<string, string>;
  plantillaGuionId?: string;
  /** Día de publicación (YYYY-MM-DD) — igual a plan.publicacion. */
  diaEstimado?: string;
  plan?: PlanPieza;
  ficha?: FichaContenido;
  tareasPendientes: TareaPendiente[];
  fechaPublicacion?: number;
  metricas: Record<string, number>;
  creadoEn: number;
  actualizadoEn: number;
}

export interface CatalogoKpiContenido {
  id: string;
  nombre: string;
  descripcion?: string;
  meta?: number;
  unidad?: string;
  esDelUsuario: boolean;
  creadoEn: number;
}

/** Semilla: los 3 KPIs definidos en NODEXA-SOP-MKT-01, sección 6. */
export const KPIS_CONTENIDO_DEFAULT: CatalogoKpiContenido[] = [
  {
    id: "kpi_retencion_3s",
    nombre: "Retención en el segundo 3",
    descripcion:
      "(Visualizaciones de más de 3s / Visualizaciones totales) * 100",
    meta: 45,
    unidad: "%",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "kpi_valor_compartido",
    nombre: "Valor compartido",
    descripcion: "(Guardados + Compartidos / Visualizaciones totales) * 100",
    meta: 2,
    unidad: "%",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "kpi_leads_keyword",
    nombre: "Leads por keyword",
    descripcion: "Comentarios con palabra clave (DEMO / PACK / MATRIZ)",
    meta: 5,
    unidad: "leads/semana",
    esDelUsuario: false,
    creadoEn: 0,
  },
];

/** Checklist por defecto de la estación Producción — editable desde la interfaz. */
export const TAREAS_PRODUCCION_DEFAULT = [
  "Grabar",
  "Subtítulos dinámicos",
  "Resaltar palabras clave en verde Nodexa",
  "Efectos de sonido semánticos",
  "Programar publicación",
];
