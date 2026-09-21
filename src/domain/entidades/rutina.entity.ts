import { z } from "zod";
import { EJES_PROGRESION, type EjeProgresion } from "./ejercicio.entity";

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

// ============================================================================
// Plantilla de rutina — 2 formas estructurales en vez de un formulario por
// cada uno de los formatos de entrenamiento: "series" (tradicional, pirámide,
// superserie — una lista de sets planificados, tradicional es simplemente el
// caso donde todos los sets son iguales) y "tiempo" (Tabata/EMOM/AMRAP/For
// Time/circuito — un bloque de configuración con campos opcionales, cada
// formato usa los que le corresponden).
// ============================================================================

export const FORMATOS_RUTINA = [
  "tradicional",
  "piramide",
  "superserie",
  "circuito",
  "tabata",
  "emom",
  "amrap",
  "for_time",
  "liss",
  "pausa_activa",
] as const;
export type FormatoRutina = (typeof FORMATOS_RUTINA)[number];

export const TIPOS_ESTRUCTURA = ["series", "tiempo"] as const;
export type TipoEstructura = (typeof TIPOS_ESTRUCTURA)[number];

const FORMATOS_TIEMPO = new Set<FormatoRutina>([
  "circuito",
  "tabata",
  "emom",
  "amrap",
  "for_time",
  "liss",
  "pausa_activa",
]);

/** Tradicional/pirámide/superserie son "series"; el resto se mide por tiempo/rondas. */
export function tipoEstructuraDeFormato(
  formato: FormatoRutina
): TipoEstructura {
  return FORMATOS_TIEMPO.has(formato) ? "tiempo" : "series";
}

export interface SetPlanificado {
  reps?: number;
  tiempoSeg?: number;
  distanciaM?: number;
  pesoKg?: number;
}

export interface BloqueEjercicioPlanificado {
  ejercicioId: string;
  sets: SetPlanificado[];
  descansoSeg?: number;
  /** Nivel de dificultad de la escalera del ejercicio con el que arranca (si tiene escalera). */
  nivel?: number;
}

export interface EstructuraSeries {
  bloques: BloqueEjercicioPlanificado[];
}

export interface EstructuraTiempo {
  ejercicioIds: string[];
  numeroRondas?: number;
  tiempoTrabajoSeg?: number;
  tiempoDescansoSeg?: number;
  tiempoLimiteMin?: number;
}

/** Un ejercicio de la entrada en calor, con su cantidad — la rutina es siempre Calentamiento → Desarrollo. */
export interface ItemCalentamiento {
  nombre: string;
  /** Si el nombre coincide con el catálogo, se guarda su id. */
  ejercicioId?: string;
  series?: number;
  reps?: number;
  tiempoSeg?: number;
  /** ej. "por lado". */
  nota?: string;
}

export interface PlantillaRutina {
  id: string;
  nombre: string;
  formato: FormatoRutina;
  tipoEstructura: TipoEstructura;
  estructura: EstructuraSeries | EstructuraTiempo;
  // Instructivo, texto libre — no se resuelve contra el catálogo ni se
  // trackea como sets planificados, es la entrada en calor previa a la
  // rutina (ej. "5 min de cinta + movilidad de cadera y hombro").
  calentamiento?: string;
  /** Entrada en calor armada con ejercicios y cantidades (el texto de `calentamiento` es su resumen legible). */
  calentamientoEstructura?: ItemCalentamiento[];
  eliminado: boolean;
  creadoEn: number;
  actualizadoEn: number;
}

export const crearPlantillaRutinaSchema = z.object({
  nombre: z.string().trim().min(1, "Ponele un nombre a la rutina."),
  formato: z.enum(FORMATOS_RUTINA),
  tipoEstructura: z.enum(TIPOS_ESTRUCTURA),
  estructura: z.record(z.string(), z.unknown()),
  calentamiento: z.string().trim().optional(),
  calentamientoEstructura: z
    .array(z.record(z.string(), z.unknown()))
    .optional(),
});
export type CrearPlantillaRutinaInput = z.input<
  typeof crearPlantillaRutinaSchema
>;

/**
 * Ajuste in-place de una Rutina existente (Sprint 22) — usado por la
 * resolución-por-nombre del import combinado: si ya existe una Rutina con
 * el nombre que trae el JSON, se actualiza con esto en vez de crear una
 * duplicada (mismo nombre + números nuevos = "ajustar", no "otra rutina").
 */
export const ajustarPlantillaRutinaSchema = z.object({
  id: z.string(),
  formato: z.enum(FORMATOS_RUTINA).optional(),
  tipoEstructura: z.enum(TIPOS_ESTRUCTURA).optional(),
  estructura: z.record(z.string(), z.unknown()).optional(),
  calentamiento: z.string().trim().optional(),
  calentamientoEstructura: z
    .array(z.record(z.string(), z.unknown()))
    .optional(),
});
export type AjustarPlantillaRutinaInput = z.input<
  typeof ajustarPlantillaRutinaSchema
>;

// ============================================================================
// Bloque de entrenamiento (mesociclo) — declara UN eje de progresión por
// defecto para todo el período; cada ejercicio cae al eje disponible más
// cercano si el suyo no aplica (ver ejeEfectivo en ejercicio.entity.ts).
// Así las estadísticas de un mismo bloque comparan siempre lo mismo, sin
// mezclar kg con repeticiones con nivel de dificultad.
// ============================================================================

// "planificado": un bloque futuro ya cargado (ej. vía importación de una
// secuencia con progresión) pero que todavía no arrancó — al cerrar el
// bloque "activo", el siguiente "planificado" (por diaInicio) se promueve
// solo. Nunca hay más de un bloque "activo" a la vez.
export const ESTADOS_BLOQUE = ["activo", "cerrado", "planificado"] as const;
export type EstadoBloque = (typeof ESTADOS_BLOQUE)[number];

/**
 * Una Rutina programada dentro de un Bloque — a qué días de la semana se
 * repite (0=domingo...6=sábado), mismo criterio que `RecurrenciaEntregable`
 * en el módulo Personal. El patrón se repite todas las semanas del Bloque;
 * "moverla" un día puntual no cambia el patrón — simplemente se registra la
 * sesión ese otro día (ver GestionarRegistroActividadUseCase), el patrón es
 * una guía, no un candado.
 */
// ----------------------------------------------------------------------------
// Progresión: cada ejercicio (o la rutina entera) puede subir de forma
// distinta — más repeticiones, más series, más kg, un nivel más difícil de la
// escalera, más tiempo… — y con su propio ritmo. Los "pasos" son las semanas
// de progresión del bloque (ver progresion-entrenamiento.entity.ts): repetir
// una semana no avanza el paso, saltear una sí.
// ----------------------------------------------------------------------------

export const TIPOS_PROGRESION = [
  "reps",
  "series",
  "carga",
  "nivel",
  "tiempo",
  "distancia",
  // Solo para rutinas por tiempo/rondas (van en progresionTiempo):
  "rondas",
  "tiempo_trabajo",
  "tiempo_descanso",
] as const;
export type TipoProgresion = (typeof TIPOS_PROGRESION)[number];

export interface ReglaProgresion {
  tipo: TipoProgresion;
  /** Cuánto sube (o baja, si es negativo) cada vez: +1 rep, +2 kg, +1 nivel, +1 serie… */
  incremento: number;
  /** Cada cuántas semanas de progresión se aplica (1 = todas las semanas). */
  cadaSemanas?: number;
  /** Desde qué paso empieza a subir (por defecto 2: el paso 1 es la base). */
  desdePaso?: number;
  /** Techo (o piso, si el incremento es negativo): no pasa de acá aunque siga la regla. */
  tope?: number;
}

/** Piso por ejercicio: aunque falle la progresión o haya descarga, el plan nunca baja de esto. */
export interface MinimoEjercicio {
  series?: number;
  reps?: number;
  pesoKg?: number;
  nivel?: number;
  tiempoSeg?: number;
  distanciaM?: number;
}

export interface ProgresionEjercicio {
  ejercicioId: string;
  /** Puede haber varias a la vez (ej. +1 rep por semana y +2 kg cada 3). */
  reglas: ReglaProgresion[];
  minimo?: MinimoEjercicio;
  /** true = este ejercicio NO progresa aunque la rutina tenga una progresión general. */
  sinProgresion?: boolean;
  /** Nivel de escalera con el que arranca, si no lo trae la estructura. */
  nivelBase?: number;
}

/** Una semana de descarga: el volumen y la carga se multiplican por `factor` en ese paso (nunca por debajo de los mínimos). */
export interface Descarga {
  paso: number;
  factor: number;
}

/** Una rutina movida de día dentro del bloque: no tocaba/no se hizo el `dia`, se hace `aDia`. */
export interface ExcepcionDia {
  plantillaId: string;
  dia: string;
  aDia: string;
}

export interface RutinaProgramada {
  plantillaId: string;
  diasSemana: number[];
  /**
   * Estructura base (paso 1) de esta rutina EN ESTE BLOQUE. Si falta (bloques
   * viejos), se usa la de la plantilla. Se guarda para que cambiar una rutina
   * en un bloque nuevo no altere los bloques anteriores.
   */
  estructuraBase?: EstructuraSeries | EstructuraTiempo;
  calentamientoBase?: string;
  calentamientoEstructuraBase?: ItemCalentamiento[];
  /** Reglas por ejercicio (tienen prioridad sobre la general). */
  progresiones?: ProgresionEjercicio[];
  /** Reglas que se aplican a todos los ejercicios de la rutina a los que les sirvan (kg solo a los que llevan carga, nivel solo a los que tienen escalera…). */
  progresionGeneral?: ReglaProgresion[];
  /** Para rutinas por tiempo/rondas: rondas, tiempo de trabajo, tiempo de descanso. */
  progresionTiempo?: ReglaProgresion[];
}

export interface BloqueEntrenamiento {
  id: string;
  nombre: string;
  diaInicio: string;
  diaFin: string;
  ejeProgresionDefault: EjeProgresion;
  estado: EstadoBloque;
  /** Rutinas de este Bloque con sus días — una Rutina puede repetirse en varios Bloques con días distintos. */
  rutinasProgramadas: RutinaProgramada[];
  /**
   * Paso de progresión de cada semana del bloque (semana calendario i → paso
   * pasosSemana[i]). Por defecto 1,2,3… Repetir una semana duplica su paso;
   * avanzar/saltear lo deja seguir; ajustar el ritmo lo corre hacia adelante.
   */
  pasosSemana?: number[];
  /** Semanas de descarga (por paso de progresión). */
  descargas?: Descarga[];
  /** Rutinas movidas de un día a otro. */
  excepciones?: ExcepcionDia[];
  /** Soft delete — nunca hard-delete: un Bloque puede tener RegistroActividad reales encima, y esos nunca se tocan. */
  eliminado: boolean;
  creadoEn: number;
  actualizadoEn: number;
}

const rutinaProgramadaSchema = z
  .object({
    plantillaId: z.string().min(1),
    diasSemana: z.array(z.number().int().min(0).max(6)).min(1),
  })
  .passthrough();

export const crearBloqueSchema = z
  .object({
    nombre: z.string().trim().min(1, "Ponele un nombre al bloque."),
    diaInicio: fechaISO,
    diaFin: fechaISO,
    ejeProgresionDefault: z.enum(EJES_PROGRESION),
    rutinasProgramadas: z.array(rutinaProgramadaSchema).default([]),
    descargas: z
      .array(
        z.object({
          paso: z.number().int().min(1),
          factor: z.number().positive().max(1),
        })
      )
      .optional(),
  })
  .refine((v) => v.diaFin >= v.diaInicio, {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["diaFin"],
  });
export type CrearBloqueInput = z.input<typeof crearBloqueSchema>;

export const programarRutinaSchema = z.object({
  bloqueId: z.string(),
  plantillaId: z.string(),
  diasSemana: z.array(z.number().int().min(0).max(6)).min(1),
});
export type ProgramarRutinaInput = z.input<typeof programarRutinaSchema>;

/** ¿Toca esta Rutina hoy? Mismo criterio que aplicaHoyEntregable en el módulo Personal. */
export function aplicaHoyRutina(diasSemana: number[], diaISO: string): boolean {
  const [anio, mes, dia] = diaISO.split("-").map(Number);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return diasSemana.includes(diaSemana);
}

/** Un ítem de una secuencia de bloques importada — sin fechas: se encadenan
 * solas a partir de hoy (o del fin del bloque activo, si ya hay uno). */
export const itemSecuenciaBloqueSchema = z.object({
  nombre: z.string().trim().min(1),
  duracionSemanas: z.number().positive().default(4),
  ejeProgresionDefault: z.enum(EJES_PROGRESION),
});
export const importarSecuenciaBloquesSchema = z.array(
  itemSecuenciaBloqueSchema
);
export type ImportarSecuenciaBloquesInput = z.input<
  typeof importarSecuenciaBloquesSchema
>;
