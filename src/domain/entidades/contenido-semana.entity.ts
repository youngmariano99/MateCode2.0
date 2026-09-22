import { lunesDeLaSemana, sumarDias } from "./personal.entity";
import {
  DIAS_CINTA_DEFAULT,
  ETAPAS_CINTA,
  TIPOS_CONTENIDO,
  type CicloSemanal,
  type Contenido,
  type DiasCinta,
  type EtapaCinta,
  type MezclaSemanal,
  type PlanPieza,
  type TipoContenido,
} from "./contenido.entity";

// ============================================================================
// Planificación semanal del contenido — lógica pura. Nada está fijo: la mezcla
// de tipos (cuántos videos/posts/historias) y el día de cada etapa de cada
// pieza se arman semana a semana; los días por defecto son solo un punto de
// partida.
// ============================================================================

/** YYYY-MM-DD (hora de Buenos Aires) de un epoch en ms. */
export function diaISODeMs(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(ms));
}

/** Lunes de la semana que planifica un ciclo (los ciclos viejos, sin `semanaInicio`, se derivan de cuándo se crearon). */
export function semanaDeCiclo(
  ciclo: Pick<CicloSemanal, "semanaInicio" | "fechaInicio">
): string {
  return ciclo.semanaInicio ?? lunesDeLaSemana(diaISODeMs(ciclo.fechaInicio));
}

/** Semana ISO (1-53) de un día — para decir "Semana 39". */
export function numeroSemanaISO(diaISO: string): number {
  const [a, m, d] = diaISO.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  const diaSemana = fecha.getUTCDay() || 7;
  fecha.setUTCDate(fecha.getUTCDate() + 4 - diaSemana);
  const inicioAnio = new Date(Date.UTC(fecha.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((fecha.getTime() - inicioAnio.getTime()) / 86_400_000 + 1) / 7
  );
}

const MESES = [
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
function diaMes(diaISO: string): string {
  const [, m, d] = diaISO.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

/** "Semana 39 · 21 sep – 27 sep". */
export function etiquetaSemana(lunes: string): string {
  return `Semana ${numeroSemanaISO(lunes)} · ${diaMes(lunes)} – ${diaMes(sumarDias(lunes, 6))}`;
}

/** Fecha (YYYY-MM-DD) del día de la semana `diaSemana` (0=domingo…6=sábado) dentro de la semana que arranca el `lunes`. */
export function fechaDeDiaSemana(lunes: string, diaSemana: number): string {
  return sumarDias(lunes, diaSemana === 0 ? 6 : diaSemana - 1);
}

export function totalMezcla(mezcla: MezclaSemanal | undefined): number {
  return Object.values(mezcla ?? {}).reduce((s, n) => s + (n || 0), 0);
}

// ---------------------------------------------------------------------------
// ¿Está planificada la semana?
// ---------------------------------------------------------------------------

export interface EstadoPlanificacion {
  estado: "planificado" | "no_planificado";
  /** Por qué no — texto listo para mostrar. Vacío si está planificada. */
  motivos: string[];
  /** Cuántas piezas de cada tipo faltan crear. */
  faltanPorTipo: MezclaSemanal;
  /** Piezas de la semana sin día de publicación. */
  sinDiaDePublicacion: number;
}

/**
 * Planificada = hay un ciclo de ESTA semana, con una mezcla definida, todas
 * las piezas de esa mezcla creadas, y cada una con su día de publicación.
 */
export function estadoPlanificacion(
  ciclo: CicloSemanal | undefined,
  contenidos: Contenido[],
  hoy: string
): EstadoPlanificacion {
  const lunes = lunesDeLaSemana(hoy);
  const vacio = { faltanPorTipo: {}, sinDiaDePublicacion: 0 };
  if (!ciclo || semanaDeCiclo(ciclo) !== lunes) {
    return {
      estado: "no_planificado",
      motivos: ["Todavía no armaste la semana."],
      ...vacio,
    };
  }
  const mezcla =
    ciclo.mezcla ??
    (ciclo.objetivoVideos ? { Video: ciclo.objetivoVideos } : {});
  if (totalMezcla(mezcla) === 0) {
    return {
      estado: "no_planificado",
      motivos: ["No definiste cuántas piezas hacen falta esta semana."],
      ...vacio,
    };
  }
  const delCiclo = contenidos.filter((c) => c.cicloId === ciclo.id);
  const faltanPorTipo: MezclaSemanal = {};
  const motivos: string[] = [];
  for (const tipo of TIPOS_CONTENIDO) {
    const objetivo = mezcla[tipo] ?? 0;
    const hay = delCiclo.filter((c) => c.tipoContenido === tipo).length;
    if (hay < objetivo) {
      faltanPorTipo[tipo] = objetivo - hay;
      motivos.push(
        `Faltan ${objetivo - hay} ${tipo.toLowerCase()}(s) por crear.`
      );
    }
  }
  const sinDia = delCiclo.filter(
    (c) => !c.plan?.publicacion && !c.diaEstimado
  ).length;
  if (sinDia > 0) {
    motivos.push(`${sinDia} pieza(s) sin día de publicación.`);
  }
  return {
    estado: motivos.length === 0 ? "planificado" : "no_planificado",
    motivos,
    faltanPorTipo,
    sinDiaDePublicacion: sinDia,
  };
}

// ---------------------------------------------------------------------------
// Días de la cinta
// ---------------------------------------------------------------------------

/** Plan inicial de una pieza nueva: cada etapa cae en el día por defecto de la semana (editable pieza por pieza). */
export function planInicial(
  lunes: string,
  diasCinta: DiasCinta | undefined
): PlanPieza {
  const dias = { ...DIAS_CINTA_DEFAULT, ...(diasCinta ?? {}) };
  const plan: PlanPieza = {};
  for (const etapa of ["guion", "grabacion", "edicion"] as const) {
    const d = dias[etapa];
    if (d !== undefined) plan[etapa] = fechaDeDiaSemana(lunes, d);
  }
  return plan;
}

export interface PiezaParaDistribuir {
  id: string;
  tipo: TipoContenido;
}

/**
 * Reparte los días de PUBLICACIÓN entre las piezas, tipo por tipo, rotando
 * entre los días que se permitan para ese tipo (ej. videos lunes/miércoles/
 * viernes, posts martes/jueves/sábado). Varias piezas pueden caer el mismo
 * día si hay más piezas que días.
 */
export function distribuirPublicaciones(
  piezas: PiezaParaDistribuir[],
  diasPorTipo: Partial<Record<TipoContenido, number[]>>,
  lunes: string
): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const tipo of TIPOS_CONTENIDO) {
    const dias = (diasPorTipo[tipo] ?? [])
      .slice()
      .sort((a, b) => (a || 7) - (b || 7));
    if (dias.length === 0) continue;
    piezas
      .filter((p) => p.tipo === tipo)
      .forEach((p, i) => {
        resultado[p.id] = fechaDeDiaSemana(lunes, dias[i % dias.length]);
      });
  }
  return resultado;
}

export interface TareaDelDia {
  contenido: Contenido;
  etapa: EtapaCinta;
}

/** Piezas que tienen alguna etapa agendada para `dia` y todavía no se publicaron. */
export function tareasDelDia(
  contenidos: Contenido[],
  dia: string
): TareaDelDia[] {
  const tareas: TareaDelDia[] = [];
  for (const c of contenidos) {
    if (c.estado === "Publicado") continue;
    const plan: PlanPieza = { ...(c.plan ?? {}) };
    if (!plan.publicacion && c.diaEstimado) plan.publicacion = c.diaEstimado;
    for (const etapa of ETAPAS_CINTA) {
      if (plan[etapa] !== dia) continue;
      // Lo que ya se hizo no vuelve a aparecer como pendiente del día, y
      // nada aparece como tarea de una estación donde todavía no se puede
      // resolver (mismo filtro que usa cada estación para listar piezas).
      if (etapa === "guion" && c.estado !== "Guion") continue;
      if (
        etapa === "grabacion" &&
        (!necesitaGrabacion(c.tipoContenido) || estaGrabado(c))
      )
        continue;
      if (
        (etapa === "edicion" || etapa === "publicacion") &&
        c.estado !== "Producción"
      )
        continue;
      tareas.push({ contenido: c, etapa });
    }
  }
  return tareas;
}

// ---------------------------------------------------------------------------
// Sugerencia de mezcla desde las metas del plan
// ---------------------------------------------------------------------------

const TIPO_POR_UNIDAD: Record<string, TipoContenido> = {
  video: "Video",
  videos: "Video",
  post: "Post",
  posts: "Post",
  carrusel: "Carrusel",
  carruseles: "Carrusel",
  historia: "Historia",
  historias: "Historia",
};

export function tipoDeUnidad(
  unidad: string | undefined
): TipoContenido | undefined {
  return unidad ? TIPO_POR_UNIDAD[unidad.trim().toLowerCase()] : undefined;
}

export interface MetaSemanalSimple {
  unidad?: string;
  cuotaSemanal?: number;
  meta: number;
}

/** Mezcla sugerida para la semana a partir de las metas del plan (unidad "videos", "posts"…). Solo una sugerencia: se edita libremente. */
export function sugerirMezcla(metas: MetaSemanalSimple[]): MezclaSemanal {
  const mezcla: MezclaSemanal = {};
  for (const m of metas) {
    const tipo = tipoDeUnidad(m.unidad);
    if (!tipo) continue;
    const cuota = m.cuotaSemanal ?? m.meta;
    mezcla[tipo] = (mezcla[tipo] ?? 0) + cuota;
  }
  return mezcla;
}

// ---------------------------------------------------------------------------
// Grabación y edición como dos momentos separados (SOP sección 4): se graba
// todo el lote de un tirón y después se edita y programa.
// ---------------------------------------------------------------------------

/** Nombre de la tarea del checklist que marca "ya grabé esto" (la primera del checklist por defecto). */
export const TAREA_GRABAR = "Grabar";

/**
 * Solo el Video pasa por la sesión de grabación en lote; Historia se graba
 * "en el momento" (sin sesión aparte, ver generar-prompt-contenido.ts) y
 * Post/Carrusel se diseñan — las tres saltan directo a edición.
 */
export function necesitaGrabacion(tipo: TipoContenido): boolean {
  return tipo === "Video";
}

export function estaGrabado(c: Pick<Contenido, "tareasPendientes">): boolean {
  return (c.tareasPendientes ?? []).some(
    (t) => t.texto === TAREA_GRABAR && t.hecha
  );
}

/** Falta grabarla: todavía no se publicó, hay que grabarla y no está marcada como grabada. */
export function pendienteDeGrabar(c: Contenido): boolean {
  return (
    c.estado !== "Publicado" &&
    necesitaGrabacion(c.tipoContenido) &&
    !estaGrabado(c)
  );
}

/**
 * Lista para editar y programar: ya está en Producción y, si se graba, ya se
 * grabó. (Lo que sigue pendiente del checklist se ve en la propia estación.)
 */
export function pendienteDeEdicion(c: Contenido): boolean {
  if (c.estado !== "Producción") return false;
  return !necesitaGrabacion(c.tipoContenido) || estaGrabado(c);
}

/** Ordena por el día agendado de una etapa: las de hoy o atrasadas primero, después las próximas, y al final las sin día. */
export function ordenarPorEtapa<T extends Contenido>(
  piezas: T[],
  etapa: EtapaCinta
): T[] {
  const dia = (c: T) => c.plan?.[etapa] ?? "9999-99-99";
  return piezas.slice().sort((a, b) => dia(a).localeCompare(dia(b)));
}

// ---------------------------------------------------------------------------
// La cinta de planificación: qué se hizo y qué falta, paso por paso
// ---------------------------------------------------------------------------

/** Título genérico que crea la app ("Video 1", "Post 2"…): una pieza así, vacía, todavía no tiene contenido propio y puede ser completada por el plan. */
export function esPiezaGenerica(
  c: Pick<Contenido, "titulo" | "tipoContenido" | "guion" | "ideaId">
): boolean {
  return (
    new RegExp(`^${c.tipoContenido} \\d+$`, "i").test(c.titulo.trim()) &&
    !c.ideaId &&
    Object.values(c.guion ?? {}).every((v) => !v?.trim())
  );
}

export interface IdeaParaEstado {
  id: string;
  estado: "Backlog" | "Seleccionada" | "Descartada";
  cicloId?: string;
}

export type EstadoPaso = "hecho" | "en_curso" | "pendiente";

export interface PasoPlanificacion {
  id: "ideas" | "piezas" | "guiones";
  titulo: string;
  estado: EstadoPaso;
  /** Lo que ya hay, en una línea: "3 ideas elegidas · 1 sin usar". */
  hecho: string;
  /** Lo que falta, en una línea. Vacío si no falta nada. */
  falta: string;
}

export interface EstadoPasosPlanificacion {
  pasos: PasoPlanificacion[];
  /** Qué conviene hacer ahora, en una frase. */
  siguiente: string;
  ideasDeLaSemana: number;
  ideasSinUsar: number;
  piezas: number;
  piezasConGuion: number;
}

const plural = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`;

/**
 * Qué se hizo y qué falta de la planificación de la semana, en los 3 pasos:
 * ① ideas (opcional, pero recomendadas), ② piezas y días, ③ guiones. Es lo
 * que se muestra siempre, para saber por dónde seguir y no repetir nada.
 */
export function estadoPasosPlanificacion(
  ciclo: CicloSemanal | undefined,
  ideas: IdeaParaEstado[],
  contenidos: Contenido[],
  hoy: string
): EstadoPasosPlanificacion {
  const delCiclo = ciclo
    ? contenidos.filter((c) => c.cicloId === ciclo.id)
    : [];
  const deLaSemana = ciclo
    ? ideas.filter((i) => i.cicloId === ciclo.id && i.estado === "Seleccionada")
    : [];
  const usadas = new Set(delCiclo.map((c) => c.ideaId).filter(Boolean));
  const sinUsar = deLaSemana.filter((i) => !usadas.has(i.id)).length;
  const plan = estadoPlanificacion(ciclo, contenidos, hoy);
  const conGuion = delCiclo.filter((c) =>
    Object.values(c.guion ?? {}).some((v) => v?.trim())
  ).length;
  const backlog = ideas.filter((i) => i.estado === "Backlog").length;

  const ideasPaso: PasoPlanificacion = {
    id: "ideas",
    titulo: "Ideas",
    estado: deLaSemana.length > 0 || usadas.size > 0 ? "hecho" : "pendiente",
    hecho:
      deLaSemana.length > 0
        ? `${plural(deLaSemana.length, "idea elegida", "ideas elegidas")} para esta semana${sinUsar > 0 ? ` · ${sinUsar} sin usar todavía` : ""}`
        : "Ninguna idea elegida para esta semana",
    falta:
      deLaSemana.length === 0
        ? backlog > 0
          ? `Tenés ${plural(backlog, "idea", "ideas")} en el backlog para elegir, o cargá nuevas`
          : "Cargá o pedile ideas a la IA (podés seguir sin ideas, pero conviene tenerlas)"
        : "",
  };

  const totalObjetivo = Object.values(ciclo?.mezcla ?? {}).reduce(
    (s, n) => s + (n || 0),
    0
  );
  const piezasFaltan = Object.values(plan.faltanPorTipo).reduce(
    (s, n) => s + (n || 0),
    0
  );
  const faltasPiezas: string[] = [];
  if (!ciclo) faltasPiezas.push("Armá la semana");
  else if (totalObjetivo === 0)
    faltasPiezas.push("Definí cuántas piezas de cada tipo");
  if (piezasFaltan > 0) faltasPiezas.push(`faltan crear ${piezasFaltan}`);
  if (plan.sinDiaDePublicacion > 0)
    faltasPiezas.push(`${plan.sinDiaDePublicacion} sin día de publicación`);
  const piezasPaso: PasoPlanificacion = {
    id: "piezas",
    titulo: "Piezas y días",
    estado:
      plan.estado === "planificado"
        ? "hecho"
        : delCiclo.length > 0
          ? "en_curso"
          : "pendiente",
    hecho: `${plural(delCiclo.length, "pieza", "piezas")}${totalObjetivo > 0 ? ` de ${totalObjetivo} planificadas` : ""}`,
    falta: faltasPiezas.join(" · "),
  };

  const guionesPaso: PasoPlanificacion = {
    id: "guiones",
    titulo: "Guiones",
    estado:
      delCiclo.length > 0 && conGuion === delCiclo.length
        ? "hecho"
        : conGuion > 0
          ? "en_curso"
          : "pendiente",
    hecho: `${conGuion} de ${delCiclo.length} con guion`,
    falta:
      delCiclo.length === 0
        ? "Primero armá las piezas"
        : conGuion < delCiclo.length
          ? `Faltan ${delCiclo.length - conGuion} guion(es)`
          : "",
  };

  const pasos = [ideasPaso, piezasPaso, guionesPaso];
  let siguiente: string;
  if (!ciclo)
    siguiente =
      "Arrancá la semana: elegí qué semana es y cuántas piezas querés.";
  else if (ideasPaso.estado === "pendiente" && delCiclo.length === 0)
    siguiente =
      "Paso 1: elegí o cargá las ideas de la semana (a mano o con IA).";
  else if (piezasPaso.estado !== "hecho")
    siguiente =
      "Paso 2: armá las piezas y su día de cada etapa (a mano o con IA).";
  else if (guionesPaso.estado !== "hecho")
    siguiente =
      "Paso 3: escribí los guiones (con IA, o uno por uno en la estación Guion).";
  else
    siguiente =
      "La semana está planificada. Seguí con la estación Grabar cuando toque.";

  return {
    pasos,
    siguiente,
    ideasDeLaSemana: deLaSemana.length,
    ideasSinUsar: sinUsar,
    piezas: delCiclo.length,
    piezasConGuion: conGuion,
  };
}
