import type { CatalogoEjercicio } from "./ejercicio.entity";
import {
  aplicaHoyRutina,
  type BloqueEntrenamiento,
  type Descarga,
  type EstructuraSeries,
  type EstructuraTiempo,
  type MinimoEjercicio,
  type ReglaProgresion,
  type RutinaProgramada,
  type SetPlanificado,
  type TipoEstructura,
} from "./rutina.entity";
import type {
  RegistroActividad,
  ResultadoEjercicio,
} from "./registro-actividad.entity";
import { sumarDias } from "./personal.entity";

// ============================================================================
// Progresión de entrenamiento — lógica pura. Tres ideas:
//  1) PASOS: cada semana del bloque tiene un "paso" de progresión (1, 2, 3…).
//     Repetir una semana duplica su paso (el bloque se alarga una semana);
//     avanzar la deja seguir; ajustar el ritmo corre los pasos que faltan.
//  2) REGLAS por ejercicio (o generales de la rutina): cuánto sube cada
//     ejercicio y de qué forma — reps, series, kg, nivel de la escalera,
//     tiempo… — con tope y piso. Un ejercicio de peso corporal no recibe
//     "+2 kg": las reglas que no le sirven se ignoran.
//  3) MÍNIMOS: el plan de un ejercicio nunca baja de su mínimo, ni por una
//     descarga ni por una regla negativa.
// ============================================================================

export type InfoEjercicio = Pick<CatalogoEjercicio, "permiteCarga" | "niveles">;
export type CatalogoInfo = Map<string, InfoEjercicio>;

// ---------------------------------------------------------------------------
// Semanas y pasos del bloque
// ---------------------------------------------------------------------------

function diasEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  return Math.round(
    (Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000
  );
}

export function cantidadSemanasBloque(
  b: Pick<BloqueEntrenamiento, "diaInicio" | "diaFin">
): number {
  return Math.max(1, Math.ceil((diasEntre(b.diaInicio, b.diaFin) + 1) / 7));
}

/** Pasos de cada semana del bloque: los guardados, completados con la secuencia natural si faltan. */
export function pasosDelBloque(
  b: Pick<BloqueEntrenamiento, "diaInicio" | "diaFin" | "pasosSemana">
): number[] {
  const n = cantidadSemanasBloque(b);
  const guardados = (b.pasosSemana ?? []).slice(0, n);
  const pasos = [...guardados];
  while (pasos.length < n) {
    pasos.push((pasos[pasos.length - 1] ?? 0) + 1);
  }
  return pasos;
}

/** Índice (0-based) de la semana del bloque que contiene `dia`, sin salirse del rango del bloque. */
export function indiceSemanaDe(
  b: Pick<BloqueEntrenamiento, "diaInicio" | "diaFin">,
  dia: string
): number {
  const n = cantidadSemanasBloque(b);
  const i = Math.floor(diasEntre(b.diaInicio, dia) / 7);
  return Math.min(Math.max(i, 0), n - 1);
}

export function pasoDelDia(
  b: Pick<BloqueEntrenamiento, "diaInicio" | "diaFin" | "pasosSemana">,
  dia: string
): number {
  return pasosDelBloque(b)[indiceSemanaDe(b, dia)];
}

export function rangoSemanaBloque(
  b: Pick<BloqueEntrenamiento, "diaInicio" | "diaFin">,
  indice: number
): { desde: string; hasta: string } {
  const desde = sumarDias(b.diaInicio, indice * 7);
  const hasta = sumarDias(desde, 6);
  return { desde, hasta: hasta > b.diaFin ? b.diaFin : hasta };
}

export interface CambioCalendarioBloque {
  pasosSemana: number[];
  diaFin: string;
}

const finPara = (diaInicio: string, semanas: number) =>
  sumarDias(diaInicio, semanas * 7 - 1);

/** "No lo hice, repito esta semana": la semana siguiente vuelve a tener el mismo paso y el bloque se alarga una semana. */
export function repetirSemana(
  b: Pick<BloqueEntrenamiento, "diaInicio" | "diaFin" | "pasosSemana">,
  indice: number
): CambioCalendarioBloque {
  const pasos = pasosDelBloque(b);
  const i = Math.min(Math.max(indice, 0), pasos.length - 1);
  const nuevos = [...pasos.slice(0, i + 1), pasos[i], ...pasos.slice(i + 1)];
  return { pasosSemana: nuevos, diaFin: finPara(b.diaInicio, nuevos.length) };
}

/** Saca la última semana del bloque (mínimo queda una). */
export function eliminarUltimaSemana(
  b: Pick<BloqueEntrenamiento, "diaInicio" | "diaFin" | "pasosSemana">
): CambioCalendarioBloque | undefined {
  const pasos = pasosDelBloque(b);
  if (pasos.length <= 1) return undefined;
  const nuevos = pasos.slice(0, -1);
  return { pasosSemana: nuevos, diaFin: finPara(b.diaInicio, nuevos.length) };
}

/** Agrega una semana al final, con el paso siguiente. */
export function extenderBloque(
  b: Pick<BloqueEntrenamiento, "diaInicio" | "diaFin" | "pasosSemana">
): CambioCalendarioBloque {
  const pasos = pasosDelBloque(b);
  const nuevos = [...pasos, pasos[pasos.length - 1] + 1];
  return { pasosSemana: nuevos, diaFin: finPara(b.diaInicio, nuevos.length) };
}

/**
 * Corre el ritmo de las semanas que faltan: `delta` > 0 saltea pasos (la
 * progresión va más rápido — "fue muy fácil"), `delta` < 0 los frena ("fue
 * mucho"). Nunca baja del paso 1.
 */
export function ajustarRitmo(
  b: Pick<BloqueEntrenamiento, "diaInicio" | "diaFin" | "pasosSemana">,
  desdeIndice: number,
  delta: number
): number[] {
  return pasosDelBloque(b).map((p, i) =>
    i >= desdeIndice ? Math.max(1, p + delta) : p
  );
}

// ---------------------------------------------------------------------------
// Rutinas de un día (con las movidas)
// ---------------------------------------------------------------------------

/** Rutinas que hay que hacer un día: las del patrón semanal, menos las movidas a otro día, más las movidas a este. */
export function rutinasDelDia(
  b: Pick<
    BloqueEntrenamiento,
    "diaInicio" | "diaFin" | "rutinasProgramadas" | "excepciones"
  >,
  dia: string
): RutinaProgramada[] {
  const excepciones = b.excepciones ?? [];
  const sacadas = new Set(
    excepciones.filter((e) => e.dia === dia).map((e) => e.plantillaId)
  );
  const enVentana = dia >= b.diaInicio && dia <= b.diaFin;
  const patron = enVentana
    ? (b.rutinasProgramadas ?? []).filter(
        (r) => aplicaHoyRutina(r.diasSemana, dia) && !sacadas.has(r.plantillaId)
      )
    : [];
  const ids = new Set(patron.map((r) => r.plantillaId));
  const traidas = excepciones
    .filter((e) => e.aDia === dia && !ids.has(e.plantillaId))
    .map((e) =>
      (b.rutinasProgramadas ?? []).find((r) => r.plantillaId === e.plantillaId)
    )
    .filter((r): r is RutinaProgramada => !!r);
  return [...patron, ...traidas];
}

// ---------------------------------------------------------------------------
// Plan efectivo de un paso
// ---------------------------------------------------------------------------

export interface PlanEjercicio {
  ejercicioId: string;
  sets: SetPlanificado[];
  /** Nivel de la escalera de dificultad para este paso (si el ejercicio tiene). */
  nivel?: number;
  descansoSeg?: number;
  minimo?: MinimoEjercicio;
}

export interface PlanSesion {
  paso: number;
  esDescarga: boolean;
  tipoEstructura: TipoEstructura;
  ejercicios: PlanEjercicio[];
  tiempo?: {
    numeroRondas?: number;
    tiempoTrabajoSeg?: number;
    tiempoDescansoSeg?: number;
    tiempoLimiteMin?: number;
  };
}

/** Cuántas veces se aplicó la regla hasta este paso. */
export function vecesAplicada(regla: ReglaProgresion, paso: number): number {
  const desde = regla.desdePaso ?? 2;
  const cada = Math.max(1, regla.cadaSemanas ?? 1);
  return paso >= desde ? Math.floor((paso - desde) / cada) + 1 : 0;
}

function limitar(valor: number, regla: ReglaProgresion): number {
  if (regla.tope === undefined) return valor;
  return regla.incremento >= 0
    ? Math.min(valor, regla.tope)
    : Math.max(valor, regla.tope);
}

function aplicarValor(
  base: number,
  regla: ReglaProgresion,
  paso: number
): number {
  return limitar(base + regla.incremento * vecesAplicada(regla, paso), regla);
}

const redondear = (n: number, decimales = 2) => {
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
};

/** ¿Tiene sentido esta regla para este ejercicio? Un ejercicio de peso corporal no recibe "+kg"; uno sin escalera no recibe "+nivel". */
export function reglaSirve(
  regla: ReglaProgresion,
  sets: SetPlanificado[],
  info: InfoEjercicio | undefined
): boolean {
  switch (regla.tipo) {
    case "series":
      return true;
    case "reps":
      return sets.some((s) => s.reps !== undefined);
    case "carga":
      return !!info?.permiteCarga && sets.some((s) => s.pesoKg !== undefined);
    case "tiempo":
      return sets.some((s) => s.tiempoSeg !== undefined);
    case "distancia":
      return sets.some((s) => s.distanciaM !== undefined);
    case "nivel":
      return (info?.niveles.length ?? 0) > 0;
    default:
      return false; // rondas / tiempo_trabajo / tiempo_descanso: solo rutinas por tiempo
  }
}

function aplicarRegla(
  regla: ReglaProgresion,
  plan: PlanEjercicio,
  info: InfoEjercicio | undefined,
  paso: number
): void {
  if (vecesAplicada(regla, paso) === 0) return;
  switch (regla.tipo) {
    case "series": {
      const n = Math.max(
        1,
        Math.round(aplicarValor(plan.sets.length, regla, paso))
      );
      const ultimo = plan.sets[plan.sets.length - 1] ?? {};
      plan.sets = Array.from({ length: n }, (_, i) => ({
        ...(plan.sets[i] ?? ultimo),
      }));
      break;
    }
    case "reps":
      plan.sets.forEach((s) => {
        if (s.reps !== undefined)
          s.reps = Math.max(1, Math.round(aplicarValor(s.reps, regla, paso)));
      });
      break;
    case "carga":
      plan.sets.forEach((s) => {
        if (s.pesoKg !== undefined)
          s.pesoKg = redondear(
            Math.max(0, aplicarValor(s.pesoKg, regla, paso))
          );
      });
      break;
    case "tiempo":
      plan.sets.forEach((s) => {
        if (s.tiempoSeg !== undefined)
          s.tiempoSeg = Math.max(
            1,
            Math.round(aplicarValor(s.tiempoSeg, regla, paso))
          );
      });
      break;
    case "distancia":
      plan.sets.forEach((s) => {
        if (s.distanciaM !== undefined)
          s.distanciaM = Math.max(
            1,
            Math.round(aplicarValor(s.distanciaM, regla, paso))
          );
      });
      break;
    case "nivel": {
      const niveles = (info?.niveles ?? []).map((n) => n.nivel);
      if (niveles.length === 0) break;
      const objetivo = aplicarValor(plan.nivel ?? 0, regla, paso);
      plan.nivel = Math.min(
        Math.max(objetivo, Math.min(...niveles)),
        Math.max(...niveles)
      );
      break;
    }
  }
}

function aplicarDescarga(plan: PlanEjercicio, factor: number): void {
  plan.sets = Array.from(
    { length: Math.max(1, Math.round(plan.sets.length * factor)) },
    (_, i) => ({ ...plan.sets[Math.min(i, plan.sets.length - 1)] })
  );
  plan.sets.forEach((s) => {
    if (s.reps !== undefined) s.reps = Math.max(1, Math.round(s.reps * factor));
    if (s.pesoKg !== undefined)
      s.pesoKg = Math.round(s.pesoKg * factor * 2) / 2;
    if (s.tiempoSeg !== undefined)
      s.tiempoSeg = Math.max(1, Math.round(s.tiempoSeg * factor));
    if (s.distanciaM !== undefined)
      s.distanciaM = Math.max(1, Math.round(s.distanciaM * factor));
  });
}

/** El plan de un ejercicio nunca queda por debajo de su mínimo. */
export function aplicarMinimo(
  plan: PlanEjercicio,
  minimo: MinimoEjercicio | undefined
): void {
  if (!minimo) return;
  if (minimo.series !== undefined && plan.sets.length < minimo.series) {
    const ultimo = plan.sets[plan.sets.length - 1] ?? {};
    plan.sets = Array.from({ length: minimo.series }, (_, i) => ({
      ...(plan.sets[i] ?? ultimo),
    }));
  }
  plan.sets.forEach((s) => {
    if (minimo.reps !== undefined && s.reps !== undefined)
      s.reps = Math.max(s.reps, minimo.reps);
    if (minimo.pesoKg !== undefined && s.pesoKg !== undefined)
      s.pesoKg = Math.max(s.pesoKg, minimo.pesoKg);
    if (minimo.tiempoSeg !== undefined && s.tiempoSeg !== undefined)
      s.tiempoSeg = Math.max(s.tiempoSeg, minimo.tiempoSeg);
    if (minimo.distanciaM !== undefined && s.distanciaM !== undefined)
      s.distanciaM = Math.max(s.distanciaM, minimo.distanciaM);
  });
  if (minimo.nivel !== undefined && plan.nivel !== undefined)
    plan.nivel = Math.max(plan.nivel, minimo.nivel);
}

export interface EntradaPlan {
  tipoEstructura: TipoEstructura;
  estructura: EstructuraSeries | EstructuraTiempo;
  programada?: Pick<
    RutinaProgramada,
    "progresiones" | "progresionGeneral" | "progresionTiempo"
  >;
  paso: number;
  descargas?: Descarga[];
  catalogo: CatalogoInfo;
}

/** El plan de UNA sesión de una rutina en un paso de progresión: base + reglas + descarga + mínimos. */
export function planParaPaso(e: EntradaPlan): PlanSesion {
  const descarga = (e.descargas ?? []).find((d) => d.paso === e.paso);
  const reglasDe = (ejercicioId: string) => {
    const propia = e.programada?.progresiones?.find(
      (p) => p.ejercicioId === ejercicioId
    );
    if (propia) {
      // Una entrada solo con mínimo o nivel base no anula la progresión general de la rutina.
      const reglas = propia.sinProgresion
        ? []
        : propia.reglas.length > 0
          ? propia.reglas
          : (e.programada?.progresionGeneral ?? []);
      return { reglas, propia };
    }
    return { reglas: e.programada?.progresionGeneral ?? [], propia: undefined };
  };

  const armar = (
    ejercicioId: string,
    sets: SetPlanificado[],
    nivelBase: number | undefined,
    descansoSeg?: number
  ): PlanEjercicio => {
    const info = e.catalogo.get(ejercicioId);
    const { reglas, propia } = reglasDe(ejercicioId);
    const plan: PlanEjercicio = {
      ejercicioId,
      sets: sets.map((s) => ({ ...s })),
      nivel: nivelBase ?? propia?.nivelBase,
      descansoSeg,
      minimo: propia?.minimo,
    };
    if (plan.nivel === undefined && (info?.niveles.length ?? 0) > 0) {
      // Sin nivel indicado se usa la versión base (nivel 0) de la escalera.
      const niveles = info!.niveles.map((n) => n.nivel);
      plan.nivel = niveles.includes(0) ? 0 : Math.min(...niveles);
    }
    for (const r of reglas) {
      if (reglaSirve(r, plan.sets, info)) aplicarRegla(r, plan, info, e.paso);
    }
    if (descarga) aplicarDescarga(plan, descarga.factor);
    aplicarMinimo(plan, propia?.minimo);
    return plan;
  };

  if (e.tipoEstructura === "series") {
    const estructura = e.estructura as EstructuraSeries;
    return {
      paso: e.paso,
      esDescarga: !!descarga,
      tipoEstructura: "series",
      ejercicios: estructura.bloques.map((b) =>
        armar(b.ejercicioId, b.sets, b.nivel, b.descansoSeg)
      ),
    };
  }

  const estructura = e.estructura as EstructuraTiempo;
  const tiempo = {
    numeroRondas: estructura.numeroRondas,
    tiempoTrabajoSeg: estructura.tiempoTrabajoSeg,
    tiempoDescansoSeg: estructura.tiempoDescansoSeg,
    tiempoLimiteMin: estructura.tiempoLimiteMin,
  };
  const claves = {
    rondas: "numeroRondas",
    tiempo_trabajo: "tiempoTrabajoSeg",
    tiempo_descanso: "tiempoDescansoSeg",
  } as const;
  for (const r of e.programada?.progresionTiempo ?? []) {
    const clave = claves[r.tipo as keyof typeof claves];
    if (!clave || tiempo[clave] === undefined) continue;
    tiempo[clave] = Math.max(
      1,
      Math.round(aplicarValor(tiempo[clave]!, r, e.paso))
    );
  }
  if (descarga) {
    if (tiempo.numeroRondas !== undefined)
      tiempo.numeroRondas = Math.max(
        1,
        Math.round(tiempo.numeroRondas * descarga.factor)
      );
  }
  return {
    paso: e.paso,
    esDescarga: !!descarga,
    tipoEstructura: "tiempo",
    tiempo,
    ejercicios: estructura.ejercicioIds.map((id) => armar(id, [], undefined)),
  };
}

/** Valores "tal cual el plan" como resultados de una sesión (lo que copia "Hice lo planificado"). */
export function resultadosDePlan(plan: PlanSesion): ResultadoEjercicio[] {
  return plan.ejercicios.map((ej) => ({
    ejercicioId: ej.ejercicioId,
    nivelUsado: ej.nivel,
    sets: ej.sets.map((s) => ({
      reps: s.reps,
      tiempoSeg: s.tiempoSeg,
      distanciaM: s.distanciaM,
      pesoKg: s.pesoKg,
    })),
    rondasCompletadas:
      plan.tipoEstructura === "tiempo" ? plan.tiempo?.numeroRondas : undefined,
  }));
}

/** Avisos sobre reglas que no le sirven al ejercicio (ej. "+kg" a uno de peso corporal): se ignoran al calcular el plan, pero conviene enterarse. */
export function avisosDeProgresion(
  estructura: EstructuraSeries,
  programada: Pick<RutinaProgramada, "progresiones" | "progresionGeneral">,
  catalogo: CatalogoInfo,
  nombreDe: (id: string) => string
): string[] {
  const avisos: string[] = [];
  for (const p of programada.progresiones ?? []) {
    const bloque = estructura.bloques.find(
      (b) => b.ejercicioId === p.ejercicioId
    );
    if (!bloque) {
      avisos.push(
        `La progresión de "${nombreDe(p.ejercicioId)}" no corresponde a ningún ejercicio de la rutina.`
      );
      continue;
    }
    for (const r of p.reglas) {
      if (!reglaSirve(r, bloque.sets, catalogo.get(p.ejercicioId))) {
        avisos.push(
          `"${nombreDe(p.ejercicioId)}" no admite una progresión de tipo "${r.tipo}" (se ignora).`
        );
      }
    }
  }
  return avisos;
}

// ---------------------------------------------------------------------------
// Resumen de una semana del bloque
// ---------------------------------------------------------------------------

export interface FilaRutinaSemana {
  plantillaId: string;
  planificadas: number;
  hechas: number;
  /** Días (YYYY-MM-DD) en que tocaba y todavía no hay registro. */
  pendientes: string[];
}

export interface ResumenSemanaBloque {
  indice: number;
  paso: number;
  desde: string;
  hasta: string;
  planificadas: number;
  hechas: number;
  /** Sesiones hechas de rutinas que no estaban planificadas esa semana (se cuentan aparte). */
  extras: number;
  /** % de lo planificado que se hizo (0-100). */
  cumplimiento: number;
  nadaHecho: boolean;
  filas: FilaRutinaSemana[];
  /** Repeticiones/tiempo hechos vs planificados en las sesiones con plan guardado (0-100), si hay. */
  logro?: number;
}

function total(res: ResultadoEjercicio[]): number {
  return res.reduce(
    (a, r) =>
      a +
      r.sets.reduce(
        (s, x) => s + (x.reps ?? x.tiempoSeg ?? x.distanciaM ?? 0),
        0
      ),
    0
  );
}

export function resumirSemanaBloque(
  b: BloqueEntrenamiento,
  indice: number,
  registros: Pick<
    RegistroActividad,
    "plantillaId" | "diaTarea" | "bloqueId" | "resultados" | "planificado"
  >[]
): ResumenSemanaBloque {
  const { desde, hasta } = rangoSemanaBloque(b, indice);
  const delRango = registros.filter(
    (r) =>
      r.diaTarea >= desde &&
      r.diaTarea <= hasta &&
      (!r.bloqueId || r.bloqueId === b.id)
  );
  const filas = new Map<string, FilaRutinaSemana>();
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) {
    for (const r of rutinasDelDia(b, d)) {
      const f = filas.get(r.plantillaId) ?? {
        plantillaId: r.plantillaId,
        planificadas: 0,
        hechas: 0,
        pendientes: [],
      };
      f.planificadas++;
      f.pendientes.push(d);
      filas.set(r.plantillaId, f);
    }
  }
  let extras = 0;
  const porPlantilla = new Map<string, number>();
  for (const r of delRango)
    porPlantilla.set(r.plantillaId, (porPlantilla.get(r.plantillaId) ?? 0) + 1);
  for (const [plantillaId, hechas] of porPlantilla) {
    const f = filas.get(plantillaId);
    if (!f) {
      extras += hechas;
      continue;
    }
    f.hechas = Math.min(hechas, f.planificadas);
    extras += Math.max(0, hechas - f.planificadas);
    // Los días pendientes son los últimos sin cubrir: se consumen desde el principio.
    f.pendientes = f.pendientes.slice(f.hechas);
  }
  const lista = [...filas.values()];
  const planificadas = lista.reduce((s, f) => s + f.planificadas, 0);
  const hechas = lista.reduce((s, f) => s + f.hechas, 0);

  const conPlan = delRango.filter(
    (r) => r.planificado && r.planificado.length > 0
  );
  const planeado = conPlan.reduce((s, r) => s + total(r.planificado!), 0);
  const logrado = conPlan.reduce((s, r) => s + total(r.resultados), 0);

  return {
    indice,
    paso: pasosDelBloque(b)[indice],
    desde,
    hasta,
    planificadas,
    hechas,
    extras,
    cumplimiento:
      planificadas === 0 ? 0 : Math.round((hechas / planificadas) * 100),
    nadaHecho: planificadas > 0 && hechas === 0,
    filas: lista,
    logro: planeado > 0 ? Math.round((logrado / planeado) * 100) : undefined,
  };
}
