import { z } from "zod";

// ============================================================================
// Fase — checkpoint periódico (semana/mes/lo que sea) de un Entregable, con
// meta propia. Resuelve el pedido del usuario: "trabajar por partes,
// revisando al cierre de cada una cuánto logré vs. cuánto faltó, y decidir
// qué hago con lo que no llegué a hacer". Cuelga SOLO de Entregable (no de
// Objetivo/Proyecto) en esta primera vuelta — su progreso se calcula
// sumando las Actividades del Entregable cuyo diaTarea cae en su rango de
// fechas (reusa progresoEfectivoActividad(), no duplica lógica), y eso solo
// es limpio en el nivel donde hay Actividades con fecha concreta.
// ============================================================================

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

export const ESTADOS_FASE = ["abierta", "cerrada"] as const;
export type EstadoFase = (typeof ESTADOS_FASE)[number];

// "reestructurar_restantes" solo aplica cuando el nivel de logro (ver
// calcularNivelLogro en objetivo-cuantificable.entity.ts) es "mejorable" o
// "bajo" — las otras 4 son ajuste fino de un faltante chico.
export const DECISIONES_CIERRE_FASE = [
  "trasladar_siguiente",
  "repartir_restantes",
  "descartar",
  "parcial",
  "reestructurar_restantes",
] as const;
export type DecisionCierreFase = (typeof DECISIONES_CIERRE_FASE)[number];

export interface CierreFase {
  fecha: number;
  logrado: number;
  meta: number;
  faltante: number;
  decision: DecisionCierreFase;
  /** Cuánto del faltante terminó viajando a otra(s) Fase(s) — 0 si se descartó todo. */
  cantidadTrasladada: number;
  notas?: string;
}

export interface FasePersonal {
  id: string;
  entregableId: string;
  titulo: string;
  /** Orden entre las Fases del mismo Entregable — resuelve cuál es "la siguiente" al cerrar. */
  orden: number;
  diaInicio: string;
  diaLimite: string;
  cantidadObjetivo: number;
  unidad: string;
  /** Caché recalculada por recomputarFasesDeEntregable() — nunca se edita a mano. */
  progresoActual: number;
  /** % de cantidadObjetivo — a diferencia de Objetivo/Proyecto/Entregable, acá SÍ decide el flujo de cierre (ver DECISIONES_CIERRE_FASE). */
  bandaAceptable?: number;
  bandaMejorable?: number;
  estado: EstadoFase;
  cierre?: CierreFase;
  creadoEn: number;
  actualizadoEn: number;
}

function refineBandas<
  T extends { bandaAceptable?: number; bandaMejorable?: number },
>(v: T): boolean {
  if (v.bandaAceptable === undefined || v.bandaMejorable === undefined)
    return true;
  return v.bandaMejorable < v.bandaAceptable;
}
const MENSAJE_BANDAS = "La banda mejorable tiene que ser menor a la aceptable.";

export const crearFaseSchema = z
  .object({
    entregableId: z.string().min(1),
    titulo: z.string().trim().min(1, "Ponele un título a la fase."),
    orden: z.number().int().min(0),
    diaInicio: fechaISO,
    diaLimite: fechaISO,
    cantidadObjetivo: z
      .number()
      .positive("La cantidad tiene que ser mayor a 0."),
    unidad: z.string().trim().min(1, "Indicá la unidad."),
    bandaAceptable: z.number().min(0).max(100).optional(),
    bandaMejorable: z.number().min(0).max(100).optional(),
  })
  .refine((v) => v.diaLimite >= v.diaInicio, {
    message: "La fecha límite no puede ser anterior a la de inicio.",
    path: ["diaLimite"],
  })
  .refine(refineBandas, { message: MENSAJE_BANDAS, path: ["bandaMejorable"] });
export type CrearFaseInput = z.input<typeof crearFaseSchema>;

export const ajustarFaseSchema = z
  .object({
    id: z.string(),
    diaLimite: fechaISO.optional(),
    cantidadObjetivo: z.number().positive().optional(),
    bandaAceptable: z.number().min(0).max(100).optional(),
    bandaMejorable: z.number().min(0).max(100).optional(),
  })
  .refine(refineBandas, { message: MENSAJE_BANDAS, path: ["bandaMejorable"] });
export type AjustarFaseInput = z.input<typeof ajustarFaseSchema>;

export const cerrarFaseSchema = z.object({
  id: z.string(),
  decision: z.enum(DECISIONES_CIERRE_FASE),
  /** Solo para decision="parcial": cuánto SUMAR a cada Fase futura elegida (la suma no puede superar el faltante). */
  distribucionManual: z
    .array(z.object({ faseId: z.string(), cantidad: z.number().positive() }))
    .optional(),
  /**
   * Solo para decision="reestructurar_restantes": el nuevo `cantidadObjetivo`
   * ABSOLUTO de cada Fase futura abierta, ya calculado por la UI con
   * `calcularDistribucionProgresiva` y confirmado en el preview — cerrarFase
   * no recalcula nada solo, solo aplica lo que ya se mostró.
   */
  nuevasCantidadesRestantes: z
    .array(
      z.object({ faseId: z.string(), cantidadObjetivo: z.number().positive() })
    )
    .optional(),
});
export type CerrarFaseInput = z.input<typeof cerrarFaseSchema>;

// ============================================================================
// Motor de distribución progresiva — arma Fases por vos cuando la cuota
// diaria cambia con el tiempo (pirámide: "empiezo en 2 por día y subo 1 por
// semana hasta un tope de 10"), o con incrementoPorFase=0, un reparto
// constante. Función pura, sin acceso a DB, misma familia que
// calcularRitmoObjetivo: nunca inventa un número silenciosamente — si el
// total proyectado no coincide con el pedido, lo reporta en `diferencia`
// para que el usuario ajuste un parámetro.
// ============================================================================

export interface ParametrosDistribucionProgresiva {
  diaInicio: string;
  diaLimite: string;
  /** 0=domingo...6=sábado — días que cuentan como "hábiles" para esta actividad. */
  diasSemana: number[];
  /** Duración de cada Fase en días (7 = semanal, ~30 = mensual, o lo que corresponda). */
  duracionFaseDias: number;
  cantidadPorDiaInicial: number;
  /** Cuánto sube la cuota por día en cada Fase sucesiva — 0 = reparto constante. */
  incrementoPorFase: number;
  /** Tope opcional de cuota por día — una vez alcanzado, las Fases siguientes se quedan en ese tope. */
  topePorDia?: number;
  cantidadObjetivoTotal: number;
}

export interface FaseSugerida {
  orden: number;
  diaInicio: string;
  diaLimite: string;
  diasHabiles: number;
  cantidadPorDia: number;
  cantidadObjetivo: number;
}

export interface ResultadoDistribucionProgresiva {
  fases: FaseSugerida[];
  totalProyectado: number;
  /** cantidadObjetivoTotal - totalProyectado — positivo = te quedaste corto, negativo = te pasaste. */
  diferencia: number;
}

function sumarDiasISO(diaISO: string, dias: number): string {
  const [anio, mes, dia] = diaISO.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function diferenciaDiasISO(desdeISO: string, hastaISO: string): number {
  const [a1, m1, d1] = desdeISO.split("-").map(Number);
  const [a2, m2, d2] = hastaISO.split("-").map(Number);
  const desde = Date.UTC(a1, m1 - 1, d1);
  const hasta = Date.UTC(a2, m2 - 1, d2);
  return Math.round((hasta - desde) / (1000 * 60 * 60 * 24));
}

function contarDiasHabiles(
  diaInicio: string,
  diaLimite: string,
  diasSemana: number[]
): number {
  let cuenta = 0;
  const total = diferenciaDiasISO(diaInicio, diaLimite);
  for (let i = 0; i <= total; i++) {
    const dia = sumarDiasISO(diaInicio, i);
    const [anio, mes, d] = dia.split("-").map(Number);
    const diaSemana = new Date(Date.UTC(anio, mes - 1, d)).getUTCDay();
    if (diasSemana.includes(diaSemana)) cuenta++;
  }
  return cuenta;
}

export function calcularDistribucionProgresiva(
  params: ParametrosDistribucionProgresiva
): ResultadoDistribucionProgresiva {
  const fases: FaseSugerida[] = [];
  let cursor = params.diaInicio;
  let orden = 0;
  let cantidadPorDia = params.cantidadPorDiaInicial;

  while (cursor <= params.diaLimite) {
    const finTentativo = sumarDiasISO(cursor, params.duracionFaseDias - 1);
    const fin =
      finTentativo > params.diaLimite ? params.diaLimite : finTentativo;
    const diasHabiles = contarDiasHabiles(cursor, fin, params.diasSemana);
    const cuotaEfectiva =
      params.topePorDia !== undefined
        ? Math.min(cantidadPorDia, params.topePorDia)
        : cantidadPorDia;
    fases.push({
      orden,
      diaInicio: cursor,
      diaLimite: fin,
      diasHabiles,
      cantidadPorDia: cuotaEfectiva,
      cantidadObjetivo: Math.round(diasHabiles * cuotaEfectiva),
    });
    orden++;
    cantidadPorDia += params.incrementoPorFase;
    cursor = sumarDiasISO(fin, 1);
  }

  const totalProyectado = fases.reduce((s, f) => s + f.cantidadObjetivo, 0);
  return {
    fases,
    totalProyectado,
    diferencia: params.cantidadObjetivoTotal - totalProyectado,
  };
}
