import { z } from "zod";

// ============================================================================
// Objetivo Cuantificable — infraestructura compartida entre Profesional y
// Personal: no se permite un objetivo vago ("hacer contactos en frío"), todo
// objetivo tiene una cantidad y una fecha límite, y el sistema calcula solo
// el ritmo necesario para llegar — recalculado cada vez que se entra,
// reflejando desvíos reales sin obligar a replanificar a mano.
// ============================================================================

export const AREAS_OBJETIVO = ["profesional", "personal", "ambas"] as const;
export type AreaObjetivo = (typeof AREAS_OBJETIVO)[number];

export const ESTADOS_OBJETIVO = [
  "activo",
  "cumplido",
  "vencido",
  "archivado",
] as const;
export type EstadoObjetivo = (typeof ESTADOS_OBJETIVO)[number];

export interface ObjetivoCuantificable {
  id: string;
  titulo: string; // ej. "Contactos en frío"
  unidad: string; // ej. "contactos", "pesos", "kg"
  cantidadObjetivo: number;
  progresoActual: number;
  // Nombrados "diaInicio"/"diaLimite" y no "fechaInicio"/"fechaLimite": la
  // ruta de sync trata "fechaInicio" como timestamp automáticamente
  // (dateFields) — acá son strings YYYY-MM-DD planos.
  diaInicio: string;
  diaLimite: string;
  area: AreaObjetivo;
  estado: EstadoObjetivo;
  // Módulo de origen si el objetivo quedó enganchado a una funcionalidad ya
  // existente (ej. "contacto_frio") — para que ese módulo pueda mostrar su
  // propio ritmo sin que el usuario tenga que ir a buscarlo aparte.
  origenModulo?: string;
  // Etiqueta libre de área (Freelancer, Contenido, Desarrollo...), del
  // catálogo compartido (categoría "area_personal") — distinta de `area`
  // (profesional/personal/ambas), que ya significa otra cosa.
  // @deprecated reemplazada por `areaId` (jerarquía Área→Objetivo→Proyecto→
  // Entregable→Actividad) — se mantiene un release más solo para no romper
  // datos viejos durante la migración, no usar en código nuevo.
  etiquetaArea?: string;
  /** Área real de la jerarquía (area-personal.entity.ts) — reemplaza etiquetaArea. */
  areaId?: string;
  /**
   * true si tiene al menos un ProyectoPersonal activo debajo — mientras sea
   * true, `registrarAvance()` queda inválido (el progreso se recalcula solo
   * sumando los hijos, no se edita a mano) y hay que registrar el avance en
   * la Actividad correspondiente. Denormalizado para no tener que consultar
   * proyecto_personal en cada render. Opcional (no todavía obligatorio en
   * Sprint 1 — se setea desde Sprint 2, cuando existe GestionarProyectosPersonalUseCase);
   * filas sin este campo se tratan como sin hijos (comportamiento actual).
   */
  tieneHijos?: boolean;
  creadoEn: number;
  actualizadoEn: number;
}

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

export const crearObjetivoSchema = z
  .object({
    titulo: z.string().trim().min(1, "Ponele un título al objetivo."),
    unidad: z
      .string()
      .trim()
      .min(1, "Indicá la unidad (contactos, pesos, kg...)."),
    cantidadObjetivo: z
      .number()
      .positive("La cantidad objetivo tiene que ser mayor a 0."),
    diaInicio: fechaISO,
    diaLimite: fechaISO,
    area: z.enum(AREAS_OBJETIVO).default("ambas"),
    origenModulo: z.string().optional(),
    etiquetaArea: z.string().trim().optional(),
    areaId: z.string().optional(),
  })
  .refine((v) => v.diaLimite >= v.diaInicio, {
    message: "La fecha límite no puede ser anterior a la de inicio.",
    path: ["diaLimite"],
  });
export type CrearObjetivoInput = z.input<typeof crearObjetivoSchema>;

export const ajustarObjetivoSchema = z.object({
  id: z.string(),
  cantidadObjetivo: z.number().positive().optional(),
  diaLimite: fechaISO.optional(),
});
export type AjustarObjetivoInput = z.input<typeof ajustarObjetivoSchema>;

// ============================================================================
// Contrato del JSON de "Planificar objetivos con IA" — valida estrictamente
// la estructura pedida en generarPromptPlanObjetivos antes de aplicar nada,
// para reportar un JSON mal formado como error claro en vez de ignorarlo en
// silencio (mismo criterio que importarPlanSemanalSchema en personal.entity).
// ============================================================================
export const importarPlanObjetivosSchema = z.object({
  objetivosNuevos: z
    .array(
      z.object({
        titulo: z.string().trim().min(1, "Falta el título del objetivo."),
        unidad: z.string().trim().min(1, "Falta la unidad del objetivo."),
        cantidadObjetivo: z
          .number()
          .positive("La cantidad objetivo tiene que ser mayor a 0."),
        diaLimite: fechaISO,
        etiquetaArea: z.string().trim().optional(),
      })
    )
    .default([]),
  ajustes: z
    .array(
      z.object({
        titulo: z
          .string()
          .trim()
          .min(1, "Falta el título del objetivo a ajustar."),
        cantidadObjetivo: z.number().positive().optional(),
        diaLimite: fechaISO.optional(),
      })
    )
    .default([]),
});
export type ImportarPlanObjetivosInput = z.input<
  typeof importarPlanObjetivosSchema
>;

// ============================================================================
// Cálculo de ritmo — función pura, sin acceso a la base: dado un objetivo y
// "hoy", dice cuánto falta, cuánto hay que hacer por día para llegar, y
// hacia dónde vas si seguís al ritmo actual.
// ============================================================================
export type EstadoRitmoObjetivo =
  "cumplido" | "vencido" | "al_dia" | "atrasado" | "adelantado";

export interface RitmoObjetivo {
  restante: number;
  diasRestantes: number;
  /** Cuánto hay que hacer por día, desde hoy, para llegar a tiempo. */
  porDiaNecesario: number;
  estado: EstadoRitmoObjetivo;
  /** Si seguís exactamente al ritmo promedio actual, a cuánto llegás. */
  proyeccionAlRitmoActual: number;
  /**
   * Cuánto deberías llevar hecho a esta altura si repartís el objetivo
   * uniformemente en el tiempo transcurrido — es el número que explica el
   * "por qué" de estado="atrasado"/"adelantado" (ej. "llevás 40, deberías
   * llevar 62"), no solo la etiqueta.
   */
  ritmoEsperadoHastaHoy: number;
}

function diferenciaDias(desdeISO: string, hastaISO: string): number {
  const [a1, m1, d1] = desdeISO.split("-").map(Number);
  const [a2, m2, d2] = hastaISO.split("-").map(Number);
  const desde = Date.UTC(a1, m1 - 1, d1);
  const hasta = Date.UTC(a2, m2 - 1, d2);
  return Math.round((hasta - desde) / (1000 * 60 * 60 * 24));
}

export function calcularRitmoObjetivo(
  objetivo: Pick<
    ObjetivoCuantificable,
    "cantidadObjetivo" | "progresoActual" | "diaInicio" | "diaLimite"
  >,
  hoy: string
): RitmoObjetivo {
  const { cantidadObjetivo, progresoActual, diaInicio, diaLimite } = objetivo;
  const restante = Math.max(0, cantidadObjetivo - progresoActual);

  if (progresoActual >= cantidadObjetivo) {
    return {
      restante: 0,
      diasRestantes: Math.max(0, diferenciaDias(hoy, diaLimite)),
      porDiaNecesario: 0,
      estado: "cumplido",
      proyeccionAlRitmoActual: progresoActual,
      ritmoEsperadoHastaHoy: cantidadObjetivo,
    };
  }

  const diasTotales = Math.max(1, diferenciaDias(diaInicio, diaLimite));
  const diasTranscurridos = Math.min(
    diasTotales,
    Math.max(0, diferenciaDias(diaInicio, hoy))
  );
  const diasRestantes = Math.max(0, diferenciaDias(hoy, diaLimite));

  const ritmoEsperadoHastaHoy =
    cantidadObjetivo * (diasTranscurridos / diasTotales);

  const proyeccionAlRitmoActual =
    diasTranscurridos > 0
      ? Math.round((progresoActual / diasTranscurridos) * diasTotales)
      : progresoActual;

  if (diasRestantes <= 0) {
    return {
      restante,
      diasRestantes: 0,
      porDiaNecesario: restante,
      estado: "vencido",
      proyeccionAlRitmoActual,
      ritmoEsperadoHastaHoy: cantidadObjetivo,
    };
  }

  const porDiaNecesario = restante / diasRestantes;
  const estado: EstadoRitmoObjetivo =
    progresoActual < ritmoEsperadoHastaHoy
      ? "atrasado"
      : progresoActual > ritmoEsperadoHastaHoy
        ? "adelantado"
        : "al_dia";

  return {
    restante,
    diasRestantes,
    porDiaNecesario,
    estado,
    proyeccionAlRitmoActual,
    ritmoEsperadoHastaHoy,
  };
}
