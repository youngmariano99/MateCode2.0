import { z } from "zod";

/**
 * Embudo único de contacto en frío (reemplaza los 4 vocabularios de estado
 * que convivían sin reconciliarse: estadoOutbound, estadoContacto, visitado,
 * y el pipeline de clientes). Se calcula solo a partir de los intentos de
 * contacto registrados — nunca se edita a mano salvo Demo Enviada / Cerrado.
 */
export const ESTADOS_EMBUDO = [
  "Nuevo",
  "Contactado",
  "En Conversación",
  "Demo Enviada",
  "Cliente Cerrado",
  "Rechazado",
] as const;
export type EstadoEmbudo = (typeof ESTADOS_EMBUDO)[number];

export const RESULTADOS_INTENTO = [
  "Sin respuesta",
  "Visto sin responder",
  "Respondió",
  "Pidió más info",
  "Rechazó",
] as const;
export type ResultadoIntento = (typeof RESULTADOS_INTENTO)[number];

export const CATEGORIAS_ETIQUETA = [
  "dolor",
  "motivo_rechazo",
  // Reutilizadas por el módulo Personal (compromisos/objetivos/entrenamiento),
  // no CRM — el catálogo de etiquetas es genérico, viven acá porque este
  // archivo es donde ya está `CATEGORIAS_ETIQUETA`/`EtiquetaCatalogo`, sin
  // duplicarlo.
  "area_personal",
  "motivo_incumplimiento",
  "equipamiento_propio",
] as const;
export type CategoriaEtiqueta = (typeof CATEGORIAS_ETIQUETA)[number];

export const TIENE_WEB_OPCIONES = [
  "no",
  "caida_desactualizada",
  "activa",
] as const;
export type TieneWebOpcion = (typeof TIENE_WEB_OPCIONES)[number];

// ----------------------------------------------------------------------------
// Cinta de contacto en frío (Mom Test): qué se acordó hacer, qué se mandó y
// qué se aprendió en cada intercambio.
// ----------------------------------------------------------------------------

/** Lo que toca hacer con un lead y para cuándo (se guarda en el prospecto: "quedamos en mandar la demo el jueves"). */
export const ACCIONES_PROXIMO_PASO = [
  "seguir",
  "mandar_demo",
  "mandar_pack",
  "pedir_productos",
  "llamar",
  "esperar",
  "otro",
] as const;
export type AccionProximoPaso = (typeof ACCIONES_PROXIMO_PASO)[number];

export const ETIQUETA_ACCION_PROXIMO_PASO: Record<AccionProximoPaso, string> = {
  seguir: "Hacer seguimiento",
  mandar_demo: "Mandar la demo",
  mandar_pack: "Mandar el pack de Excel",
  pedir_productos: "Que me manden los productos",
  llamar: "Llamarlo",
  esperar: "Esperar que escriba",
  otro: "Otra cosa",
};

/** Qué tipo de mensaje MÍO fue — para contar cuántos seguimientos van y no confundirlos con aperturas. */
export const TIPOS_ENVIO = [
  "apertura",
  "seguimiento",
  "respuesta",
  "demo",
  "pack",
  "otro",
] as const;
export type TipoEnvio = (typeof TIPOS_ENVIO)[number];

/** Clasificación Mom Test de lo que dijo el prospecto: un hecho pasado concreto, una opinión, o humo (elogios, "algún día", promesas vagas). */
export const TIPOS_DATO = ["dato_duro", "opinion", "humo"] as const;
export type TipoDato = (typeof TIPOS_DATO)[number];

export const ETIQUETA_TIPO_DATO: Record<TipoDato, string> = {
  dato_duro: "Dato duro",
  opinion: "Opinión",
  humo: "Humo",
};

export const aprendizajeSchema = z.object({
  /** Su frase literal sobre el problema. */
  citaDolor: z.string().optional(),
  /** La última vez concreta que le pasó. */
  casoPasado: z.string().optional(),
  /** Cómo lo resuelve hoy (con qué herramienta o a mano). */
  comoLoResuelve: z.string().optional(),
  /** Cuánto le cuesta en tiempo o plata. */
  costo: z.string().optional(),
  tipoDato: z.enum(TIPOS_DATO).optional(),
  /** Qué puso en juego (tiempo, plata, reputación): aceptar la demo, mandar productos, presentar a alguien. */
  compromiso: z.string().optional(),
});
export type Aprendizaje = z.infer<typeof aprendizajeSchema>;

export const crearProspectoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  rubro: z.string().optional(),
  prioridad: z.enum(["Alta", "Media", "Baja"]).default("Media"),
});
export type CrearProspectoInput = z.input<typeof crearProspectoSchema>;

export interface PotencialCliente {
  id: string;
  nombre: string;
  rubro?: string;
  prioridad: "Alta" | "Media" | "Baja";
  estado: EstadoEmbudo;
  fechaUltimoContacto?: number;
  esHistoricoLegacy?: boolean;
  /** Qué toca hacer con este lead y para cuándo (ms epoch). Vacío = todavía no hay nada acordado. */
  proximoPasoAccion?: AccionProximoPaso;
  proximoPasoFecha?: number;
  proximoPasoNota?: string;
  /** Cliente del CRM en que se convirtió (estado "Cliente Cerrado"). */
  clienteId?: string;
  creadoEn: number;
  actualizadoEn: number;
}

export const calificarFichaDigitalSchema = z.object({
  instagram: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  facebook: z.string().optional(),
  nombreDueño: z.string().optional(),
  dolorTags: z.array(z.string()).default([]),
  tieneWeb: z.enum(TIENE_WEB_OPCIONES).default("no"),
  usaCatalogoNativoWhatsapp: z.boolean().default(false),
  notasExtra: z.string().optional(),
  referenciaPosteo: z.string().optional(),
});
export type CalificarFichaDigitalInput = z.infer<
  typeof calificarFichaDigitalSchema
>;

export interface FichaDigital extends CalificarFichaDigitalInput {
  potencialClienteId: string;
  actualizadoEn: number;
}

export const agregarFichaFisicaSchema = z.object({
  direccionCalle: z.string().min(1, "La dirección es obligatoria."),
  direccionCiudad: z.string().optional(),
  direccionProvincia: z.string().optional(),
  latitud: z.number().optional(),
  longitud: z.number().optional(),
});
export type AgregarFichaFisicaInput = z.infer<typeof agregarFichaFisicaSchema>;

export interface FichaFisica extends AgregarFichaFisicaInput {
  potencialClienteId: string;
  visitado: boolean;
  motivoNoVisita?: string;
  volverFecha?: number;
  actualizadoEn: number;
}

export const registrarIntentoSchema = z.object({
  potencialClienteId: z.string().min(1),
  canal: z.enum(["Instagram", "WhatsApp", "Email", "Facebook", "Presencial"]),
  mensajeEnviado: z.string().optional(),
  resultado: z.enum(RESULTADOS_INTENTO),
  respuestaTexto: z.string().optional(),
  tagsResultado: z.array(z.string()).default([]),
  proximoSeguimientoFecha: z.number().optional(),
  /** Solo si el intento es un mensaje mío. */
  tipoEnvio: z.enum(TIPOS_ENVIO).optional(),
  /** Lo aprendido en este intercambio (Mom Test). */
  aprendizaje: aprendizajeSchema.optional(),
});
export type RegistrarIntentoInput = z.infer<typeof registrarIntentoSchema>;

export interface IntentoContacto extends RegistrarIntentoInput {
  id: string;
  fecha: number;
  creadoEn: number;
}

export interface EtiquetaCatalogo {
  id: string;
  etiqueta: string;
  categoria: CategoriaEtiqueta;
  esDelUsuario: boolean;
  creadoEn: number;
}

/**
 * Semilla del catálogo de etiquetas de "dolor detectado", cubriendo las
 * áreas que más impactan a un comerciante hoy. Editable/ampliable desde la
 * propia interfaz — esto es solo el punto de partida.
 */
export const ETIQUETAS_DOLOR_DEFAULT: EtiquetaCatalogo[] = [
  {
    id: "dolor_sin_catalogo_online",
    etiqueta: "Sin catálogo online",
    categoria: "dolor",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "dolor_web_caida",
    etiqueta: "Web caída o desactualizada",
    categoria: "dolor",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "dolor_catalogo_nativo_wsp",
    etiqueta: "Solo catálogo nativo de WhatsApp",
    categoria: "dolor",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "dolor_sin_link_bio",
    etiqueta: "Sin link en la biografía",
    categoria: "dolor",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "dolor_responde_tarde",
    etiqueta: "Responde tarde (+2hs)",
    categoria: "dolor",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "dolor_consulta_manual_precio",
    etiqueta: "Consulta manual de precio y stock por privado",
    categoria: "dolor",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "dolor_sin_stock_tiempo_real",
    etiqueta: "Sin control de stock en tiempo real",
    categoria: "dolor",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "dolor_matriz_variantes",
    etiqueta: "Alta matriz de variantes (talle/color)",
    categoria: "dolor",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "dolor_vende_sin_stock_real",
    etiqueta: "Vende sin stock real actualizado",
    categoria: "dolor",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "dolor_fiado_sin_control",
    etiqueta: "Fiado sin control (cuaderno)",
    categoria: "dolor",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "dolor_caja_sin_arqueo",
    etiqueta: "Caja sin arqueo",
    categoria: "dolor",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "dolor_envios_a_mano",
    etiqueta: "Envíos gestionados a mano",
    categoria: "dolor",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "dolor_sin_seguimiento_pedido",
    etiqueta: "Sin seguimiento de pedido",
    categoria: "dolor",
    esDelUsuario: false,
    creadoEn: 0,
  },
];

export const ETIQUETAS_RECHAZO_DEFAULT: EtiquetaCatalogo[] = [
  {
    id: "rechazo_precio",
    etiqueta: "Precio",
    categoria: "motivo_rechazo",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "rechazo_timing",
    etiqueta: "No es el momento (timing)",
    categoria: "motivo_rechazo",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "rechazo_no_interesa",
    etiqueta: "No le interesa",
    categoria: "motivo_rechazo",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "rechazo_desconfianza",
    etiqueta: "Desconfianza / miedo técnico",
    categoria: "motivo_rechazo",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "rechazo_otro",
    etiqueta: "Otro",
    categoria: "motivo_rechazo",
    esDelUsuario: false,
    creadoEn: 0,
  },
];

/** Motivos rápidos al marcar un día de un hábito/compromiso como no cumplido. */
export const ETIQUETAS_INCUMPLIMIENTO_DEFAULT: EtiquetaCatalogo[] = [
  {
    id: "incumplimiento_me_olvide",
    etiqueta: "Me olvidé",
    categoria: "motivo_incumplimiento",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "incumplimiento_no_tuve_tiempo",
    etiqueta: "No tuve tiempo",
    categoria: "motivo_incumplimiento",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "incumplimiento_imprevisto",
    etiqueta: "Imprevisto",
    categoria: "motivo_incumplimiento",
    esDelUsuario: false,
    creadoEn: 0,
  },
  {
    id: "incumplimiento_ya_no_aplica",
    etiqueta: "Ya no aplica",
    categoria: "motivo_incumplimiento",
    esDelUsuario: false,
    creadoEn: 0,
  },
];
