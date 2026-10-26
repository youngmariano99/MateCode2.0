import { z } from "zod";
import { TIPOS_ACTIVIDAD, type TipoActividad } from "./actividad.entity";

// ============================================================================
// Procedimiento (SOP / Protocolo de Trabajo) — Definición y Ejecución.
//
// 1. Procedimiento (Plantilla / Definición):
//    Conjunto ordenado de pasos en checks que representan una forma estándar
//    de trabajar repetible (ej. Contacto en frío, Estudio, Desarrollo de Feature).
//    Puede vincularse a Área, Objetivo, Proyecto Personal, Entregable o a un
//    Cliente (opcional, para servicios de agencia).
//
// 2. EjecucionProcedimiento (Corrida / Instancia Activa):
//    Instancia con estado viva que acompaña a una Actividad o se ejecuta de
//    forma autónoma. Permite ir tildando checks a lo largo del día (o en
//    partes: mañana/tarde) sin saturar la agenda con múltiples mini-actividades.
// ============================================================================

export const CATEGORIAS_PROCEDIMIENTO = [
  "contacto_frio",
  "estudio",
  "desarrollo",
  "servicio_cliente",
  "operaciones",
  "personal",
  "general",
] as const;
export type CategoriaProcedimiento = (typeof CATEGORIAS_PROCEDIMIENTO)[number];

export const ESTADOS_EJECUCION_PROCEDIMIENTO = [
  "en_progreso",
  "pausado",
  "completado",
  "cancelado",
] as const;
export type EstadoEjecucionProcedimiento =
  (typeof ESTADOS_EJECUCION_PROCEDIMIENTO)[number];

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

// ----------------------------------------------------------------------------
// 1. Definición del Paso (Checklist en la Plantilla)
// ----------------------------------------------------------------------------
export interface PasoProcedimientoDefinicion {
  id: string;
  orden: number;
  titulo: string;
  descripcion?: string;
  duracionEstimadaMin?: number;
  tipoSugerido?: TipoActividad;
  esObligatorio: boolean;
}

export const pasoProcedimientoDefinicionSchema = z.object({
  id: z.string().optional(),
  orden: z.number().int().min(0).optional(),
  titulo: z.string().trim().min(1, "El paso debe tener un título."),
  descripcion: z.string().trim().optional(),
  duracionEstimadaMin: z.number().positive().optional(),
  tipoSugerido: z.enum(TIPOS_ACTIVIDAD).optional(),
  esObligatorio: z.boolean().default(true),
});

// ----------------------------------------------------------------------------
// 2. Plantilla de Procedimiento
// ----------------------------------------------------------------------------
export interface Procedimiento {
  id: string;
  titulo: string;
  descripcion?: string;
  categoria: CategoriaProcedimiento;
  icono?: string;
  color?: string;
  tags: string[];

  // Vínculos Opcionales a la Jerarquía Personal
  areaId?: string;
  objetivoId?: string;
  proyectoPersonalId?: string;
  entregableId?: string;

  // Vínculos Opcionales con CRM / Clientes
  clienteId?: string;
  proyectoTrabajoId?: string;
  servicioId?: string;

  // Pasos configurados
  pasos: PasoProcedimientoDefinicion[];
  tiempoEstimadoTotalMin?: number;
  documentacionUrl?: string;

  activo: boolean;
  vecesEjecutado: number;
  ultimoEjecutadoEn?: number;

  creadoEn: number;
  actualizadoEn: number;
  eliminadoEn?: number;
}

export const crearProcedimientoSchema = z.object({
  titulo: z.string().trim().min(1, "Ponele un título al procedimiento."),
  descripcion: z.string().trim().optional(),
  categoria: z.enum(CATEGORIAS_PROCEDIMIENTO).default("general"),
  icono: z.string().trim().optional(),
  color: z.string().trim().optional(),
  tags: z.array(z.string().trim()).default([]),

  areaId: z.string().optional(),
  objetivoId: z.string().optional(),
  proyectoPersonalId: z.string().optional(),
  entregableId: z.string().optional(),

  clienteId: z.string().optional(),
  proyectoTrabajoId: z.string().optional(),
  servicioId: z.string().optional(),

  pasos: z
    .array(pasoProcedimientoDefinicionSchema)
    .min(1, "El procedimiento debe tener al menos un paso a seguir."),
  tiempoEstimadoTotalMin: z.number().positive().optional(),
  documentacionUrl: z.string().trim().url().optional(),
});
export type CrearProcedimientoInput = z.input<typeof crearProcedimientoSchema>;

export const editarProcedimientoSchema = z.object({
  id: z.string(),
  titulo: z.string().trim().min(1).optional(),
  descripcion: z.string().trim().optional(),
  categoria: z.enum(CATEGORIAS_PROCEDIMIENTO).optional(),
  icono: z.string().trim().optional(),
  color: z.string().trim().optional(),
  tags: z.array(z.string().trim()).optional(),

  areaId: z.string().nullable().optional(),
  objetivoId: z.string().nullable().optional(),
  proyectoPersonalId: z.string().nullable().optional(),
  entregableId: z.string().nullable().optional(),

  clienteId: z.string().nullable().optional(),
  proyectoTrabajoId: z.string().nullable().optional(),
  servicioId: z.string().nullable().optional(),

  pasos: z.array(pasoProcedimientoDefinicionSchema).min(1).optional(),
  tiempoEstimadoTotalMin: z.number().positive().nullable().optional(),
  documentacionUrl: z.string().trim().nullable().optional(),
  activo: z.boolean().optional(),
});
export type EditarProcedimientoInput = z.input<
  typeof editarProcedimientoSchema
>;

// ----------------------------------------------------------------------------
// 3. Ejecución / Corrida del Procedimiento (Instancia Viva)
// ----------------------------------------------------------------------------
export interface PasoEjecutado {
  pasoId: string;
  orden: number;
  titulo: string;
  descripcion?: string;
  duracionEstimadaMin?: number;
  esObligatorio: boolean;
  completado: boolean;
  completadoEn?: number;
  nota?: string;
}

export const pasoEjecutadoSchema = z.object({
  pasoId: z.string(),
  orden: z.number().int().min(0),
  titulo: z.string().trim().min(1),
  descripcion: z.string().trim().optional(),
  duracionEstimadaMin: z.number().positive().optional(),
  esObligatorio: z.boolean(),
  completado: z.boolean(),
  completadoEn: z.number().optional(),
  nota: z.string().trim().optional(),
});

export interface EjecucionProcedimiento {
  id: string;
  procedimientoId: string;
  tituloProcedimiento: string;

  diaTarea: string; // YYYY-MM-DD
  estado: EstadoEjecucionProcedimiento;

  // Vínculos Operativos
  actividadId?: string; // Actividad que acompaña
  clienteId?: string; // Cliente específico
  proyectoTrabajoId?: string; // Proyecto CRM

  // Checks vivos y métricas
  pasos: PasoEjecutado[];
  totalPasos: number;
  pasosCompletados: number;
  porcentajeAvance: number; // 0 - 100
  todoObligatorioListo: boolean;

  iniciadoEn: number;
  actualizadoEn: number;
  finalizadoEn?: number;
  eliminadoEn?: number;
}

export const iniciarEjecucionProcedimientoSchema = z.object({
  procedimientoId: z.string().min(1, "Falta el ID del procedimiento base."),
  diaTarea: fechaISO,
  actividadId: z.string().optional(),
  clienteId: z.string().optional(),
  proyectoTrabajoId: z.string().optional(),
});
export type IniciarEjecucionProcedimientoInput = z.input<
  typeof iniciarEjecucionProcedimientoSchema
>;

export const tildarPasoSchema = z.object({
  ejecucionId: z.string().min(1),
  pasoId: z.string().min(1),
  completado: z.boolean(),
  nota: z.string().trim().optional(),
});
export type TildarPasoInput = z.input<typeof tildarPasoSchema>;

// ----------------------------------------------------------------------------
// 4. Funciones Auxiliares Puras de Negocio
// ----------------------------------------------------------------------------

export interface MetricasProgresoProcedimiento {
  totalPasos: number;
  pasosCompletados: number;
  porcentajeAvance: number;
  todoObligatorioListo: boolean;
}

/**
 * Calcula el progreso de los pasos de una ejecución.
 * Porcentaje redondeado entero (0 a 100).
 */
export function calcularProgresoProcedimiento(
  pasos: PasoEjecutado[]
): MetricasProgresoProcedimiento {
  const totalPasos = pasos.length;
  if (totalPasos === 0) {
    return {
      totalPasos: 0,
      pasosCompletados: 0,
      porcentajeAvance: 0,
      todoObligatorioListo: true,
    };
  }

  const pasosCompletados = pasos.filter((p) => p.completado).length;
  const porcentajeAvance = Math.round((pasosCompletados / totalPasos) * 100);

  const obligatorios = pasos.filter((p) => p.esObligatorio);
  const todoObligatorioListo =
    obligatorios.length === 0 || obligatorios.every((p) => p.completado);

  return {
    totalPasos,
    pasosCompletados,
    porcentajeAvance,
    todoObligatorioListo,
  };
}

/**
 * Clona los pasos de una plantilla para iniciar una nueva ejecución.
 */
export function clonarPasosParaEjecucion(
  definiciones: PasoProcedimientoDefinicion[]
): PasoEjecutado[] {
  return definiciones
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((d, index) => ({
      pasoId: d.id || `paso_${index + 1}`,
      orden: d.orden,
      titulo: d.titulo,
      descripcion: d.descripcion,
      duracionEstimadaMin: d.duracionEstimadaMin,
      esObligatorio: d.esObligatorio,
      completado: false,
    }));
}

/**
 * Aplica el cambio de un check a una ejecución devolviendo una copia inmutable actualizada.
 */
export function aplicarTildadoPaso(
  ejecucion: EjecucionProcedimiento,
  pasoId: string,
  completado: boolean,
  nota?: string,
  ahora: number = Date.now()
): EjecucionProcedimiento {
  const nuevosPasos = ejecucion.pasos.map((p) => {
    if (p.pasoId !== pasoId) return p;
    return {
      ...p,
      completado,
      completadoEn: completado ? ahora : undefined,
      nota: nota !== undefined ? nota : p.nota,
    };
  });

  const metricas = calcularProgresoProcedimiento(nuevosPasos);

  return {
    ...ejecucion,
    pasos: nuevosPasos,
    totalPasos: metricas.totalPasos,
    pasosCompletados: metricas.pasosCompletados,
    porcentajeAvance: metricas.porcentajeAvance,
    todoObligatorioListo: metricas.todoObligatorioListo,
    estado:
      ejecucion.estado === "pausado" && !completado
        ? "pausado"
        : metricas.todoObligatorioListo
          ? "completado"
          : "en_progreso",
    actualizadoEn: ahora,
    finalizadoEn: metricas.todoObligatorioListo ? ahora : undefined,
  };
}
