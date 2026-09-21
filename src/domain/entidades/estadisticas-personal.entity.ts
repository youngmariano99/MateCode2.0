import type { Actividad, MotivoDesvio } from "./actividad.entity";
import { ETIQUETA_MOTIVO_DESVIO } from "./actividad.entity";
import {
  aplicaHoyEntregable,
  idInstanciaEntregableRecurrente,
} from "./entregable.entity";
import type { Entregable } from "./entregable.entity";
import { aplicaHoy } from "./habitos.entity";
import type { HabitoDefinicion, HabitoRegistro } from "./habitos.entity";
import { lunesDeLaSemana, sumarDias } from "./personal.entity";

// ============================================================================
// Estadísticas del área Personal — lógica pura. Reglas para que las cifras
// sean confiables:
//  · Cada actividad cae en UN solo resultado (ver ResultadoActividad): nada
//    queda sin clasificar ni se cuenta dos veces.
//  · Las abiertas (de hoy o futuras) y las descartadas (sacadas del plan a
//    propósito) no entran en el porcentaje, pero se muestran aparte.
//  · Lo que quedó sin cerrar de un día que ya pasó cuenta como NO cumplido.
//  · Lo que "tocaba" (recurrentes, hábitos) y no tiene registro se muestra
//    como "sin registro": no se cuenta como hecho ni como fallo, pero se avisa
//    de que la información de ese período está incompleta.
// ============================================================================

export type TipoPeriodo = "semana" | "mes" | "anio";

export interface Periodo {
  tipo: TipoPeriodo;
  desde: string;
  hasta: string;
  etiqueta: string;
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function corto(dia: string): string {
  const [, m, d] = dia.split("-").map(Number);
  return `${d} ${MESES_CORTOS[m - 1]}`;
}

function ultimoDiaDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** El período (semana lunes-domingo, mes o año calendario) que contiene `dia`. */
export function periodoDe(tipo: TipoPeriodo, dia: string): Periodo {
  const [a, m] = dia.split("-").map(Number);
  if (tipo === "semana") {
    const desde = lunesDeLaSemana(dia);
    const hasta = sumarDias(desde, 6);
    return {
      tipo,
      desde,
      hasta,
      etiqueta: `${corto(desde)} – ${corto(hasta)} ${hasta.slice(0, 4)}`,
    };
  }
  if (tipo === "mes") {
    const mm = String(m).padStart(2, "0");
    return {
      tipo,
      desde: `${a}-${mm}-01`,
      hasta: `${a}-${mm}-${String(ultimoDiaDelMes(a, m)).padStart(2, "0")}`,
      etiqueta: `${MESES[m - 1]} ${a}`,
    };
  }
  return { tipo, desde: `${a}-01-01`, hasta: `${a}-12-31`, etiqueta: `${a}` };
}

/** Se mueve `delta` períodos hacia adelante (o atrás, si es negativo). */
export function moverPeriodo(p: Periodo, delta: number): Periodo {
  if (p.tipo === "semana")
    return periodoDe("semana", sumarDias(p.desde, 7 * delta));
  const [a, m] = p.desde.split("-").map(Number);
  if (p.tipo === "mes") {
    const f = new Date(Date.UTC(a, m - 1 + delta, 1));
    return periodoDe("mes", f.toISOString().slice(0, 10));
  }
  return periodoDe("anio", `${a + delta}-01-01`);
}

export function diasDelPeriodo(p: Periodo): string[] {
  const dias: string[] = [];
  for (let d = p.desde; d <= p.hasta && dias.length < 400; d = sumarDias(d, 1))
    dias.push(d);
  return dias;
}

// ---------------------------------------------------------------------------
// Resultado de cada actividad
// ---------------------------------------------------------------------------

export type ResultadoActividad =
  /** Se hizo (a la meta, o sin meta numérica). */
  | "hecha"
  /** Llegó al mínimo aceptable pero no a la meta. */
  | "al_minimo"
  /** Se hizo algo, pero por debajo del mínimo (o no había mínimo). */
  | "parcial"
  /** Quedó pendiente de un día que ya pasó: no se cerró. */
  | "vencida"
  /** Se pasó a otro día. */
  | "migrada"
  | "cancelada"
  /** Sacada del plan a propósito (ej. faltante descartado): no penaliza. */
  | "descartada"
  /** Pendiente de hoy o de un día futuro: todavía no se puede juzgar. */
  | "abierta";

export const ETIQUETA_RESULTADO: Record<ResultadoActividad, string> = {
  hecha: "Hechas",
  al_minimo: "Al mínimo",
  parcial: "Parciales",
  vencida: "Sin cerrar",
  migrada: "Pasadas a otro día",
  cancelada: "Canceladas",
  descartada: "Descartadas",
  abierta: "Abiertas",
};

export function resultadoDeActividad(
  a: Actividad,
  hoy: string
): ResultadoActividad {
  switch (a.estado) {
    case "pendiente":
      return (a.diaTarea ?? hoy) < hoy ? "vencida" : "abierta";
    case "migrada":
      return "migrada";
    case "cancelada":
      return "cancelada";
    case "descartada":
      return "descartada";
    case "completada": {
      if (a.cantidadObjetivo === undefined) return "hecha";
      // Completada sin registro incremental cuenta la meta entera (misma regla que el progreso).
      const hecho = a.progresoActual ?? a.cantidadObjetivo;
      if (hecho >= a.cantidadObjetivo) return "hecha";
      if (a.cantidadMinima !== undefined && hecho >= a.cantidadMinima)
        return "al_minimo";
      return "parcial";
    }
  }
}

export interface ResumenActividades {
  hechas: number;
  alMinimo: number;
  parciales: number;
  vencidas: number;
  migradas: number;
  canceladas: number;
  descartadas: number;
  abiertas: number;
  /** Actividades que se pueden juzgar: todo menos abiertas y descartadas. */
  juzgables: number;
  /** % de juzgables que se cumplieron a la meta o al mínimo aceptable. */
  cumplimiento: number;
  /** % de juzgables cumplidas a la meta completa. */
  cumplimientoPleno: number;
}

export function resumirActividades(
  actividades: Actividad[],
  hoy: string
): ResumenActividades {
  const c: Record<ResultadoActividad, number> = {
    hecha: 0,
    al_minimo: 0,
    parcial: 0,
    vencida: 0,
    migrada: 0,
    cancelada: 0,
    descartada: 0,
    abierta: 0,
  };
  for (const a of actividades) c[resultadoDeActividad(a, hoy)]++;
  const juzgables =
    c.hecha + c.al_minimo + c.parcial + c.vencida + c.migrada + c.cancelada;
  const pct = (n: number) =>
    juzgables === 0 ? 0 : Math.round((n / juzgables) * 100);
  return {
    hechas: c.hecha,
    alMinimo: c.al_minimo,
    parciales: c.parcial,
    vencidas: c.vencida,
    migradas: c.migrada,
    canceladas: c.cancelada,
    descartadas: c.descartada,
    abiertas: c.abierta,
    juzgables,
    cumplimiento: pct(c.hecha + c.al_minimo),
    cumplimientoPleno: pct(c.hecha),
  };
}

// ---------------------------------------------------------------------------
// Series (para las barras) y agrupaciones
// ---------------------------------------------------------------------------

export interface PuntoSerie {
  etiqueta: string;
  juzgables: number;
  cumplidas: number;
}

const cuentaComoCumplida = (r: ResultadoActividad) =>
  r === "hecha" || r === "al_minimo";
const cuentaComoJuzgable = (r: ResultadoActividad) =>
  r !== "abierta" && r !== "descartada";

/** Cumplimiento a lo largo del período: por día (semana/mes) o por mes (año). */
export function serieDelPeriodo(
  p: Periodo,
  actividades: Actividad[],
  hoy: string
): PuntoSerie[] {
  const clave = (dia: string) => (p.tipo === "anio" ? dia.slice(0, 7) : dia);
  const mapa = new Map<string, PuntoSerie>();
  for (const dia of diasDelPeriodo(p)) {
    const k = clave(dia);
    if (!mapa.has(k)) {
      mapa.set(k, {
        etiqueta:
          p.tipo === "anio"
            ? MESES_CORTOS[Number(k.split("-")[1]) - 1]
            : String(Number(dia.split("-")[2])),
        juzgables: 0,
        cumplidas: 0,
      });
    }
  }
  for (const a of actividades) {
    if (!a.diaTarea) continue;
    const r = resultadoDeActividad(a, hoy);
    if (!cuentaComoJuzgable(r)) continue;
    const punto = mapa.get(clave(a.diaTarea));
    if (!punto) continue;
    punto.juzgables++;
    if (cuentaComoCumplida(r)) punto.cumplidas++;
  }
  return [...mapa.values()];
}

export interface FilaAgrupada {
  clave: string;
  juzgables: number;
  cumplidas: number;
  tasa: number;
}

/** Cumplimiento agrupado por lo que devuelva `claveDe` (área, día de la semana, tipo…). */
export function agruparCumplimiento(
  actividades: Actividad[],
  hoy: string,
  claveDe: (a: Actividad) => string
): FilaAgrupada[] {
  const mapa = new Map<string, { juzgables: number; cumplidas: number }>();
  for (const a of actividades) {
    const r = resultadoDeActividad(a, hoy);
    if (!cuentaComoJuzgable(r)) continue;
    const k = claveDe(a);
    const f = mapa.get(k) ?? { juzgables: 0, cumplidas: 0 };
    f.juzgables++;
    if (cuentaComoCumplida(r)) f.cumplidas++;
    mapa.set(k, f);
  }
  return [...mapa.entries()].map(([clave, f]) => ({
    clave,
    ...f,
    tasa: Math.round((f.cumplidas / f.juzgables) * 100),
  }));
}

const NOMBRE_DIA_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
export function diaDeLaSemana(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  return NOMBRE_DIA_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
}

// ---------------------------------------------------------------------------
// Motivos de lo que no se hizo
// ---------------------------------------------------------------------------

export const SIN_MOTIVO = "sin_motivo";

export interface MotivoContado {
  motivo: MotivoDesvio | typeof SIN_MOTIVO;
  etiqueta: string;
  cantidad: number;
}

/**
 * Por qué se cortó o se postergó lo que no se hizo: canceladas y migradas,
 * con el motivo elegido en el momento (o "sin motivo" si se omitió — nunca se
 * pierden del conteo).
 */
export function contarMotivos(
  actividades: Actividad[],
  motivoPorActividad: Map<string, MotivoDesvio>
): MotivoContado[] {
  const conteo = new Map<string, number>();
  for (const a of actividades) {
    if (a.estado !== "cancelada" && a.estado !== "migrada") continue;
    const m = motivoPorActividad.get(a.id) ?? SIN_MOTIVO;
    conteo.set(m, (conteo.get(m) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .map(([motivo, cantidad]) => ({
      motivo: motivo as MotivoContado["motivo"],
      etiqueta:
        motivo === SIN_MOTIVO
          ? "Sin motivo"
          : ETIQUETA_MOTIVO_DESVIO[motivo as MotivoDesvio],
      cantidad,
    }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

// ---------------------------------------------------------------------------
// Lo que tocaba y no tiene registro
// ---------------------------------------------------------------------------

export interface RecurrenteSinRegistro {
  dia: string;
  titulo: string;
  entregableId: string;
}

/**
 * Días en que un Entregable recurrente "tocaba" pero no existe su actividad
 * (las instancias se crean al abrir la app ese día: si no se abrió, no hay
 * registro). No se cuentan como hechas ni como fallidas — se avisan aparte.
 */
export function recurrentesSinRegistro(
  entregables: Entregable[],
  actividades: Actividad[],
  p: Periodo,
  hoy: string
): RecurrenteSinRegistro[] {
  const ids = new Set(actividades.map((a) => a.id));
  const faltantes: RecurrenteSinRegistro[] = [];
  for (const e of entregables) {
    if (!e.recurrencia || e.estado === "archivado") continue;
    const ini = e.diaInicio > p.desde ? e.diaInicio : p.desde;
    const finTope = sumarDias(hoy, -1); // hoy todavía se puede cumplir
    let fin = e.diaLimite < p.hasta ? e.diaLimite : p.hasta;
    if (fin > finTope) fin = finTope;
    for (let d = ini; d <= fin; d = sumarDias(d, 1)) {
      if (!aplicaHoyEntregable(e.recurrencia, d)) continue;
      if (!ids.has(idInstanciaEntregableRecurrente(e.id, d))) {
        faltantes.push({ dia: d, titulo: e.titulo, entregableId: e.id });
      }
    }
  }
  return faltantes;
}

// ---------------------------------------------------------------------------
// Hábitos
// ---------------------------------------------------------------------------

export interface ResumenHabito {
  habitoId: string;
  nombre: string;
  /** Días en que le tocaba dentro del período (hasta hoy). */
  tocaba: number;
  min: number;
  med: number;
  max: number;
  noCumplido: number;
  sinRegistro: number;
  /** % de los días con registro que se cumplieron (cualquier nivel). */
  cumplimiento: number;
  motivoTop?: string;
}

export function resumirHabitos(
  habitos: HabitoDefinicion[],
  registros: HabitoRegistro[],
  p: Periodo,
  hoy: string
): ResumenHabito[] {
  const fin = p.hasta < hoy ? p.hasta : hoy;
  const dias = diasDelPeriodo({ ...p, hasta: fin });
  const resultado: ResumenHabito[] = [];
  for (const h of habitos) {
    const propios = new Map(
      registros.filter((r) => r.habitoId === h.id).map((r) => [r.diaTarea, r])
    );
    const creado = new Date(h.creadoEn).toISOString().slice(0, 10);
    const r: ResumenHabito = {
      habitoId: h.id,
      nombre: h.nombre,
      tocaba: 0,
      min: 0,
      med: 0,
      max: 0,
      noCumplido: 0,
      sinRegistro: 0,
      cumplimiento: 0,
    };
    const motivos = new Map<string, number>();
    for (const dia of dias) {
      if (dia < creado || !aplicaHoy(h, dia)) continue;
      r.tocaba++;
      const reg = propios.get(dia);
      if (!reg) {
        r.sinRegistro++;
        continue;
      }
      if (reg.nivelEjecutado === "MIN") r.min++;
      else if (reg.nivelEjecutado === "MED") r.med++;
      else if (reg.nivelEjecutado === "MAX") r.max++;
      else {
        r.noCumplido++;
        if (reg.motivoIncumplimiento)
          motivos.set(
            reg.motivoIncumplimiento,
            (motivos.get(reg.motivoIncumplimiento) ?? 0) + 1
          );
      }
    }
    const conRegistro = r.min + r.med + r.max + r.noCumplido;
    r.cumplimiento =
      conRegistro === 0
        ? 0
        : Math.round(((r.min + r.med + r.max) / conRegistro) * 100);
    r.motivoTop = [...motivos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (r.tocaba > 0) resultado.push(r);
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Lecturas: frases cortas para saber qué mejorar
// ---------------------------------------------------------------------------

export interface DatosParaLecturas {
  actual: ResumenActividades;
  anterior?: ResumenActividades;
  motivos: MotivoContado[];
  porArea: FilaAgrupada[];
  porDiaSemana: FilaAgrupada[];
  sinRegistro: number;
  habitos: ResumenHabito[];
  riesgosMinimos: number;
}

const MIN_MUESTRA = 4;

export function generarLecturas(d: DatosParaLecturas): string[] {
  const l: string[] = [];
  const { actual, anterior } = d;

  if (actual.juzgables === 0) {
    l.push("Todavía no hay actividades para evaluar en este período.");
  } else {
    l.push(
      `Cumpliste ${actual.cumplimiento}% de lo planificado (${actual.hechas} a la meta${actual.alMinimo ? `, ${actual.alMinimo} al mínimo` : ""}).`
    );
    if (anterior && anterior.juzgables > 0) {
      const dif = actual.cumplimiento - anterior.cumplimiento;
      if (Math.abs(dif) >= 5) {
        l.push(
          `Respecto del período anterior ${dif > 0 ? "subiste" : "bajaste"} ${Math.abs(dif)} puntos (${anterior.cumplimiento}% → ${actual.cumplimiento}%).`
        );
      } else {
        l.push(
          `Estás parejo con el período anterior (${anterior.cumplimiento}%).`
        );
      }
    }
  }

  if (actual.vencidas > 0) {
    l.push(
      `Hay ${actual.vencidas} actividad(es) que quedaron sin cerrar de días que ya pasaron: resolvelas (hecha, a hoy o cancelar) para que la estadística sea real.`
    );
  }
  if (
    actual.migradas >= MIN_MUESTRA &&
    actual.juzgables > 0 &&
    actual.migradas / actual.juzgables >= 0.2
  ) {
    l.push(
      `Pasaste ${actual.migradas} actividades a otro día (${Math.round((actual.migradas / actual.juzgables) * 100)}%): probablemente estás planificando más de lo que entra.`
    );
  }

  const motivo = d.motivos[0];
  if (motivo && motivo.cantidad >= 2) {
    if (motivo.motivo === SIN_MOTIVO) {
      l.push(
        `${motivo.cantidad} actividades se cortaron o postergaron sin indicar el motivo: anotarlo te va a mostrar el patrón.`
      );
    } else {
      l.push(
        `El motivo más repetido de lo que no se hizo es "${motivo.etiqueta.toLowerCase()}" (${motivo.cantidad} veces).`
      );
    }
  }

  const areas = d.porArea
    .filter((f) => f.juzgables >= MIN_MUESTRA)
    .sort((a, b) => a.tasa - b.tasa);
  if (areas.length >= 2 && areas[0].tasa < areas[areas.length - 1].tasa - 15) {
    l.push(
      `El área con menos cumplimiento es ${areas[0].clave} (${areas[0].tasa}%); la mejor, ${areas[areas.length - 1].clave} (${areas[areas.length - 1].tasa}%).`
    );
  }

  const dias = d.porDiaSemana
    .filter((f) => f.juzgables >= MIN_MUESTRA)
    .sort((a, b) => a.tasa - b.tasa);
  if (dias.length >= 2 && dias[0].tasa < dias[dias.length - 1].tasa - 20) {
    l.push(
      `Los ${dias[0].clave.toLowerCase()}s son tu día más flojo (${dias[0].tasa}%); los ${dias[dias.length - 1].clave.toLowerCase()}s, el mejor (${dias[dias.length - 1].tasa}%).`
    );
  }

  if (d.riesgosMinimos > 0) {
    l.push(
      `${d.riesgosMinimos} mínimo(s) están en riesgo: revisalos en Hoy antes de que se cierre el período.`
    );
  }
  if (d.sinRegistro > 0) {
    l.push(
      `Faltan ${d.sinRegistro} registro(s) de compromisos recurrentes de días en que no abriste la app: no cuentan como hechos ni como fallos, así que este período puede estar incompleto.`
    );
  }
  const habitoFlojo = d.habitos
    .filter((h) => h.tocaba - h.sinRegistro >= MIN_MUESTRA)
    .sort((a, b) => a.cumplimiento - b.cumplimiento)[0];
  if (habitoFlojo && habitoFlojo.cumplimiento < 60) {
    l.push(
      `El hábito "${habitoFlojo.nombre}" está en ${habitoFlojo.cumplimiento}%${habitoFlojo.motivoTop ? ` (motivo más repetido: ${habitoFlojo.motivoTop})` : ""}.`
    );
  }
  return l;
}
