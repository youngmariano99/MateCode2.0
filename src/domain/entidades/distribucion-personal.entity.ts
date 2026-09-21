import { z } from "zod";
import { sumarDias } from "./personal.entity";
import { minimoDe } from "./minimos-personal.entity";

// ============================================================================
// Distribución de una meta numérica — el "asistente de dos pasos":
//   1) Proyecto → Entregables (semanas o N partes; cantidades iguales o a medida)
//   2) Entregable (o Fase) → Actividades diarias con cantidad (de tal día a tal
//      día, en los días de la semana elegidos)
// Todo es matemática determinista y pura: la IA decide la ESTRUCTURA (cuántas
// partes, qué días) y el sistema hace la cuenta, sin perder ni inventar
// ninguna unidad (5 en 2 días → 3+2, nunca 2+2).
// ============================================================================

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).");

export const DIAS_HABILES = [1, 2, 3, 4, 5];

/** Lista de días (YYYY-MM-DD) entre dos fechas inclusive, solo los de la semana pedidos (0=domingo...6=sábado). */
export function diasDelRango(
  diaInicio: string,
  diaLimite: string,
  diasSemana: number[] = [0, 1, 2, 3, 4, 5, 6]
): string[] {
  const dias: string[] = [];
  if (diaLimite < diaInicio) return dias;
  let cursor = diaInicio;
  // Tope de seguridad: nada razonable pasa de ~5 años de días.
  for (let i = 0; i < 2000 && cursor <= diaLimite; i++) {
    const [a, m, d] = cursor.split("-").map(Number);
    const diaSemana = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
    if (diasSemana.includes(diaSemana)) dias.push(cursor);
    cursor = sumarDias(cursor, 1);
  }
  return dias;
}

/**
 * Reparte `total` en `n` partes lo más parejas posible, sin perder ni
 * inventar unidades: 40 en 5 → 8 c/u; 41 en 5 → 9,8,8,8,8. El sobrante se
 * distribuye espaciado (no todo al principio) — 3 unidades en 5 días caen en
 * días alternados. Puede devolver ceros si total < n.
 */
export function repartirParejo(total: number, n: number): number[] {
  const partes = Math.max(1, Math.floor(n));
  const entero = Math.floor(total);
  const base = Math.floor(entero / partes);
  const resto = entero - base * partes;
  const conExtra = new Set<number>();
  for (let k = 0; k < resto; k++) {
    conExtra.add(Math.floor((k * partes) / resto));
  }
  return Array.from(
    { length: partes },
    (_, i) => base + (conExtra.has(i) ? 1 : 0)
  );
}

export interface CantidadPorDia {
  dia: string;
  cantidad: number;
  /** Mínimo aceptable de ese día (ver bandaAceptable del reparto). */
  minimo?: number;
}

/** Reparte un total en la lista de días dada (los días con 0 se omiten). */
export function repartirEnListaDeDias(
  total: number,
  dias: string[]
): CantidadPorDia[] {
  if (dias.length === 0 || !(total > 0)) return [];
  const cantidades = repartirParejo(total, dias.length);
  return dias
    .map((dia, i) => ({ dia, cantidad: cantidades[i] }))
    .filter((r) => r.cantidad > 0);
}

// ---------------------------------------------------------------------------
// Paso 1 — dividir un rango en partes (entregables)
// ---------------------------------------------------------------------------

export interface RangoParte {
  diaInicio: string;
  diaLimite: string;
}

export type ModoDivision = "semanas" | "partes";

/** Divide [diaInicio, diaLimite] en partes consecutivas: de 7 días (la última, lo que quede) o en `n` partes de duración pareja. */
export function dividirRangoEnPartes(
  diaInicio: string,
  diaLimite: string,
  modo: ModoDivision,
  n = 1
): RangoParte[] {
  if (diaLimite < diaInicio) return [];
  const totalDias = diasDelRango(diaInicio, diaLimite).length;
  const partes: RangoParte[] = [];
  if (modo === "semanas") {
    let cursor = diaInicio;
    while (cursor <= diaLimite) {
      const fin = sumarDias(cursor, 6);
      partes.push({
        diaInicio: cursor,
        diaLimite: fin > diaLimite ? diaLimite : fin,
      });
      cursor = sumarDias(fin, 1);
    }
    return partes;
  }
  const cantidad = Math.max(1, Math.min(Math.floor(n), totalDias));
  const duraciones = repartirParejo(totalDias, cantidad);
  let cursor = diaInicio;
  for (const dur of duraciones) {
    const fin = sumarDias(cursor, dur - 1);
    partes.push({ diaInicio: cursor, diaLimite: fin });
    cursor = sumarDias(fin, 1);
  }
  return partes;
}

export interface EntregableSugerido {
  orden: number;
  titulo: string;
  diaInicio: string;
  diaLimite: string;
  cantidad: number;
}

export interface ParametrosSugerirEntregables {
  diaInicio: string;
  diaLimite: string;
  total: number;
  modo: ModoDivision;
  /** Solo para modo "partes". */
  n?: number;
  /** Cantidades a medida (una por parte); si no viene, se reparte parejo. */
  montos?: number[];
  tituloBase: string;
}

export interface ResultadoSugerirEntregables {
  entregables: EntregableSugerido[];
  /** total pedido - suma de lo repartido: ≠ 0 solo con "montos" a medida que no cierran. */
  diferencia: number;
}

export function sugerirEntregables(
  p: ParametrosSugerirEntregables
): ResultadoSugerirEntregables {
  const rangos = dividirRangoEnPartes(p.diaInicio, p.diaLimite, p.modo, p.n);
  if (rangos.length === 0) return { entregables: [], diferencia: p.total };
  const cantidades =
    p.montos && p.montos.length > 0
      ? rangos.map((_, i) => p.montos![i] ?? 0)
      : repartirParejo(p.total, rangos.length);
  const entregables = rangos
    .map((r, i) => ({
      orden: i,
      titulo:
        p.modo === "semanas"
          ? `${p.tituloBase} — Semana ${i + 1}`
          : `${p.tituloBase} — Parte ${i + 1}`,
      diaInicio: r.diaInicio,
      diaLimite: r.diaLimite,
      cantidad: cantidades[i],
    }))
    .filter((e) => e.cantidad > 0);
  const repartido = entregables.reduce((s, e) => s + e.cantidad, 0);
  return { entregables, diferencia: p.total - repartido };
}

// ---------------------------------------------------------------------------
// Paso 2 — reparto de un total en Actividades diarias
// ---------------------------------------------------------------------------

export const TIPOS_ACTIVIDAD_REPARTO = ["enfoque", "mantenimiento"] as const;

/**
 * Compacto a propósito (para que una IA no tenga que escribir 40 actividades a
 * mano): el sistema lo expande a una Actividad por día con su cantidad.
 * Todo opcional salvo la descripción — lo que falte se toma del Entregable o
 * de la Fase donde va anidado (fechas, total, unidad).
 */
export const repartoJsonSchema = z.object({
  descripcion: z.string().trim().min(1, "Falta la descripción del reparto."),
  tipo: z.enum(TIPOS_ACTIVIDAD_REPARTO).default("mantenimiento"),
  diaInicio: fechaISO.optional(),
  diaLimite: fechaISO.optional(),
  /** 0=domingo...6=sábado. Por defecto, lunes a viernes. */
  diasSemana: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Elegí al menos un día de la semana.")
    .default(DIAS_HABILES),
  cantidadTotal: z.number().positive().optional(),
  unidad: z.string().trim().optional(),
  /** % de la cantidad de CADA DÍA que alcanza como mínimo (ej. 50 → si toca 2, con 1 vale). Si falta, hereda la banda de la Fase/Entregable donde va. */
  bandaAceptable: z.number().min(0).max(100).optional(),
});
export type RepartoJson = z.infer<typeof repartoJsonSchema>;

export interface ContextoReparto {
  diaInicio: string;
  diaLimite: string;
  total?: number;
  unidad?: string;
  /** Banda mínima del padre (Fase/Entregable), si el reparto no trae la suya. */
  bandaAceptable?: number;
}

export interface RepartoExpandido {
  descripcion: string;
  tipo: "enfoque" | "mantenimiento";
  unidad?: string;
  porDia: CantidadPorDia[];
}

/** Convierte un reparto compacto en Actividades concretas (una por día con cantidad), usando el contexto del padre para lo que falte. */
export function expandirReparto(
  reparto: RepartoJson,
  contexto: ContextoReparto
): RepartoExpandido {
  const inicio = reparto.diaInicio ?? contexto.diaInicio;
  const fin = reparto.diaLimite ?? contexto.diaLimite;
  const total = reparto.cantidadTotal ?? contexto.total ?? 0;
  const dias = diasDelRango(inicio, fin, reparto.diasSemana);
  const banda = reparto.bandaAceptable ?? contexto.bandaAceptable;
  return {
    descripcion: reparto.descripcion,
    tipo: reparto.tipo,
    unidad: reparto.unidad ?? contexto.unidad,
    porDia: repartirEnListaDeDias(total, dias).map((r) => ({
      ...r,
      minimo: banda === undefined ? undefined : minimoDe(r.cantidad, banda),
    })),
  };
}
