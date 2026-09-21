import { aplicaHoyEntregable } from "./entregable.entity";
import type { Entregable } from "./entregable.entity";
import type { FasePersonal } from "./fase-personal.entity";
import type { Actividad } from "./actividad.entity";
import { diasDelRango } from "./distribucion-personal.entity";
import { minimoDe } from "./minimos-personal.entity";

// ============================================================================
// "Metas del período" — lo que hay que cumplir en una semana o un mes, aunque
// no haya actividades día por día que lo digan (ej. "3 videos por semana",
// con el planificador de contenido aparte): las Fases (tramos con meta propia)
// y los Entregables con cantidad que se solapan con el período. Lógica pura.
// ============================================================================

export interface MetaPeriodo {
  tipo: "fase" | "entregable";
  id: string;
  titulo: string;
  /** El Entregable dueño de una Fase. */
  contexto?: string;
  objetivoId?: string;
  unidad?: string;
  meta: number;
  progreso: number;
  minimo?: number;
  /** Cuánto toca por semana (solo si el tramo dura más de una semana). */
  cuotaSemanal?: number;
  diaInicio: string;
  diaLimite: string;
  /** Si el tramo tiene actividades diarias con cantidad que ya se ven en el día: no hace falta "anotar avance" a mano. */
  tieneActividadesDiarias: boolean;
}

/** Cuánto toca por semana de una meta repartida en [inicio, fin] (redondeo hacia arriba, mínimo 1 semana). */
export function cuotaSemanalDe(
  meta: number,
  diaInicio: string,
  diaLimite: string
): number | undefined {
  const dias = diasDelRango(diaInicio, diaLimite).length;
  if (dias <= 7) return undefined;
  return Math.ceil((meta * 7) / dias - 1e-9);
}

function seSolapan(
  aIni: string,
  aFin: string,
  bIni: string,
  bFin: string
): boolean {
  return aIni <= bFin && bIni <= aFin;
}

export function metasDelPeriodo(
  entregables: Entregable[],
  fases: FasePersonal[],
  actividades: Actividad[],
  desde: string,
  hasta: string
): MetaPeriodo[] {
  const conActividadesDiarias = (
    entregableId: string,
    ini: string,
    fin: string
  ) =>
    actividades.some(
      (a) =>
        a.entregableId === entregableId &&
        a.cantidadObjetivo !== undefined &&
        a.diaTarea !== undefined &&
        a.diaTarea >= ini &&
        a.diaTarea <= fin
    );

  const porId = new Map(entregables.map((e) => [e.id, e]));
  const entregablesConFases = new Set(fases.map((f) => f.entregableId));
  const metas: MetaPeriodo[] = [];

  for (const f of fases) {
    if (f.estado !== "abierta") continue;
    if (!seSolapan(f.diaInicio, f.diaLimite, desde, hasta)) continue;
    const e = porId.get(f.entregableId);
    metas.push({
      tipo: "fase",
      id: f.id,
      titulo: f.titulo,
      contexto: e?.titulo,
      objetivoId: e?.objetivoId,
      unidad: f.unidad,
      meta: f.cantidadObjetivo,
      progreso: f.progresoActual,
      minimo: minimoDe(f.cantidadObjetivo, f.bandaAceptable),
      cuotaSemanal: cuotaSemanalDe(
        f.cantidadObjetivo,
        f.diaInicio,
        f.diaLimite
      ),
      diaInicio: f.diaInicio,
      diaLimite: f.diaLimite,
      tieneActividadesDiarias: conActividadesDiarias(
        f.entregableId,
        f.diaInicio,
        f.diaLimite
      ),
    });
  }

  for (const e of entregables) {
    if (e.estado !== "activo") continue;
    if (e.cantidadObjetivo === undefined || entregablesConFases.has(e.id))
      continue;
    if (!seSolapan(e.diaInicio, e.diaLimite, desde, hasta)) continue;
    metas.push({
      tipo: "entregable",
      id: e.id,
      titulo: e.titulo,
      objetivoId: e.objetivoId,
      unidad: e.unidad,
      meta: e.cantidadObjetivo,
      progreso: e.progresoActual,
      minimo: minimoDe(e.cantidadObjetivo, e.bandaAceptable),
      cuotaSemanal: cuotaSemanalDe(
        e.cantidadObjetivo,
        e.diaInicio,
        e.diaLimite
      ),
      diaInicio: e.diaInicio,
      diaLimite: e.diaLimite,
      tieneActividadesDiarias: conActividadesDiarias(
        e.id,
        e.diaInicio,
        e.diaLimite
      ),
    });
  }
  return metas.sort((a, b) => a.diaLimite.localeCompare(b.diaLimite));
}

/**
 * Entregables recurrentes que "tocan" un día concreto y todavía no tienen su
 * Actividad materializada (eso solo pasa el día de hoy): sirve para mostrar
 * en el calendario lo que viene, sin generar filas a futuro.
 */
export function recurrentesDelDia(
  entregables: Entregable[],
  actividadesDelDia: Actividad[],
  dia: string
): Entregable[] {
  return entregables.filter(
    (e) =>
      e.estado === "activo" &&
      !!e.recurrencia &&
      e.diaInicio <= dia &&
      dia <= e.diaLimite &&
      aplicaHoyEntregable(e.recurrencia, dia) &&
      !actividadesDelDia.some(
        (a) => a.recurrenciaId === e.id && a.diaTarea === dia
      )
  );
}
