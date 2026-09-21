import { db } from "../../offline/dexie/db";
import type {
  Actividad,
  MotivoDesvio,
} from "../../domain/entidades/actividad.entity";
import {
  agruparCumplimiento,
  contarMotivos,
  diaDeLaSemana,
  generarLecturas,
  moverPeriodo,
  recurrentesSinRegistro,
  resultadoDeActividad,
  resumirActividades,
  resumirHabitos,
  serieDelPeriodo,
  type FilaAgrupada,
  type MotivoContado,
  type Periodo,
  type PuntoSerie,
  type RecurrenteSinRegistro,
  type ResumenActividades,
  type ResumenHabito,
} from "../../domain/entidades/estadisticas-personal.entity";
import { calcularRiesgosMinimos } from "./minimos-personal.service";
import {
  tiempoPorProyecto,
  type ResumenProyectoTrabajo,
} from "./tiempo-por-proyecto.service";

export interface EstadisticasPeriodo {
  periodo: Periodo;
  resumen: ResumenActividades;
  anterior: ResumenActividades;
  serie: PuntoSerie[];
  motivos: MotivoContado[];
  porArea: FilaAgrupada[];
  porDiaSemana: FilaAgrupada[];
  porTipo: FilaAgrupada[];
  /** Actividades con cantidad: cuántas llegaron a la meta, al mínimo, o se quedaron cortas. */
  metaVsMinimo: {
    meta: number;
    minimo: number;
    corto: number;
    sinCerrar: number;
  };
  sinRegistro: RecurrenteSinRegistro[];
  habitos: ResumenHabito[];
  tiempo: {
    totalSegundos: number;
    totalSegundosAnterior: number;
    porArea: { area: string; segundos: number }[];
    porProyecto: ResumenProyectoTrabajo[];
  };
  /** Foto de hoy (no del período): lo que sigue esperando ser asignado. */
  fondo: { backlogSinAsignar: number; faltantesPendientes: number };
  riesgosMinimos: number;
  lecturas: string[];
}

const NOMBRE_TIPO: Record<string, string> = {
  enfoque: "Prioridad",
  mantenimiento: "Mantenimiento",
};

async function actividadesDelPeriodo(
  desde: string,
  hasta: string
): Promise<Actividad[]> {
  return (
    await db.actividad
      .where("diaTarea")
      .between(desde, hasta, true, true)
      .toArray()
  ).filter((a) => a.tipo !== "backlog");
}

async function segundosDeSesiones(desde: string, hasta: string) {
  return db.sesion_trabajo
    .where("diaTarea")
    .between(desde, hasta, true, true)
    .toArray();
}

/**
 * Junta todo lo que hace falta para las estadísticas de un período y de su
 * período anterior (para comparar). Solo lectura.
 */
export async function calcularEstadisticas(
  periodo: Periodo,
  hoy: string
): Promise<EstadisticasPeriodo> {
  const anteriorP = moverPeriodo(periodo, -1);
  const [actividades, actividadesAnt] = await Promise.all([
    actividadesDelPeriodo(periodo.desde, periodo.hasta),
    actividadesDelPeriodo(anteriorP.desde, anteriorP.hasta),
  ]);

  // --- área de cada actividad (Objetivo → Área)
  const [objetivos, areas] = await Promise.all([
    db.objetivo_cuantificable.toArray(),
    db.area_personal.toArray(),
  ]);
  const nombreArea = new Map(areas.map((a) => [a.id, a.nombre]));
  const areaDeObjetivo = new Map(
    objetivos.map((o) => [
      o.id,
      (o.areaId && nombreArea.get(o.areaId)) || "Sin área",
    ])
  );
  const areaDe = (a: Actividad) =>
    (a.objetivoId && areaDeObjetivo.get(a.objetivoId)) || "Sin área";

  // --- motivos elegidos al cancelar / pasar a otro día (último por actividad)
  const historial = await db.personal_historial
    .where("entidadTipo")
    .equals("actividad")
    .toArray();
  const motivoPorActividad = new Map<string, MotivoDesvio>();
  for (const h of historial.sort((a, b) => a.creadoEn - b.creadoEn)) {
    const m = (h.campoNuevo as { motivo?: MotivoDesvio } | undefined)?.motivo;
    if (m) motivoPorActividad.set(h.entidadId, m);
  }

  // Datos de antes del cambio: el motivo de un "pasar a otro día" quedaba en la
  // COPIA (con fechaMigradaDesde = día original). Se lo devuelve a la original.
  const migradasSinMotivo = actividades.filter(
    (a) => a.estado === "migrada" && !motivoPorActividad.has(a.id)
  );
  if (migradasSinMotivo.length > 0) {
    const destinos = await db.actividad
      .filter(
        (d) => d.fechaMigradaDesde !== undefined && motivoPorActividad.has(d.id)
      )
      .toArray();
    for (const o of migradasSinMotivo) {
      const d = destinos.find(
        (x) =>
          x.fechaMigradaDesde === o.diaTarea &&
          x.descripcion.trim().toLowerCase() ===
            o.descripcion.trim().toLowerCase()
      );
      const m = d ? motivoPorActividad.get(d.id) : undefined;
      if (m) motivoPorActividad.set(o.id, m);
    }
  }

  // --- meta vs mínimo (solo actividades con cantidad)
  const metaVsMinimo = { meta: 0, minimo: 0, corto: 0, sinCerrar: 0 };
  for (const a of actividades) {
    if (a.cantidadObjetivo === undefined) continue;
    const r = resultadoDeActividad(a, hoy);
    if (r === "hecha") metaVsMinimo.meta++;
    else if (r === "al_minimo") metaVsMinimo.minimo++;
    else if (r === "parcial") metaVsMinimo.corto++;
    else if (r === "vencida") metaVsMinimo.sinCerrar++;
  }

  // --- compromisos recurrentes sin registro
  const entregables = await db.entregable.toArray();
  const sinRegistro = recurrentesSinRegistro(
    entregables,
    actividades,
    periodo,
    hoy
  );

  // --- hábitos
  const [habitosDef, registros] = await Promise.all([
    db.habito_definicion.toArray(),
    db.habito_registro
      .where("diaTarea")
      .between(periodo.desde, periodo.hasta, true, true)
      .toArray(),
  ]);
  const habitos = resumirHabitos(
    habitosDef.filter((h) => h.activo !== false),
    registros,
    periodo,
    hoy
  );

  // --- tiempo (cronómetro de Oficina)
  const [sesiones, sesionesAnt] = await Promise.all([
    segundosDeSesiones(periodo.desde, periodo.hasta),
    segundosDeSesiones(anteriorP.desde, anteriorP.hasta),
  ]);
  const actividadPorId = new Map(actividades.map((a) => [a.id, a]));
  const segundosPorArea = new Map<string, number>();
  for (const s of sesiones) {
    const a = s.actividadId ? actividadPorId.get(s.actividadId) : undefined;
    const area = a ? areaDe(a) : "Sin área (sesión suelta)";
    segundosPorArea.set(
      area,
      (segundosPorArea.get(area) ?? 0) + s.segundosAcumulados
    );
  }
  const suma = (l: typeof sesiones) =>
    l.reduce((s, x) => s + x.segundosAcumulados, 0);

  // --- fondo (foto de hoy)
  const backlog = await db.actividad.where("tipo").equals("backlog").toArray();
  const pendientesBacklog = backlog.filter((a) => a.estado === "pendiente");

  const incluyeHoy = periodo.desde <= hoy && hoy <= periodo.hasta;
  const riesgosMinimos = incluyeHoy
    ? (await calcularRiesgosMinimos(hoy)).length
    : 0;

  const resumen = resumirActividades(actividades, hoy);
  const anterior = resumirActividades(actividadesAnt, hoy);
  const motivos = contarMotivos(actividades, motivoPorActividad);
  const porArea = agruparCumplimiento(actividades, hoy, areaDe).sort(
    (a, b) => a.tasa - b.tasa
  );
  const porDiaSemana = agruparCumplimiento(actividades, hoy, (a) =>
    diaDeLaSemana(a.diaTarea ?? hoy)
  );
  const porTipo = agruparCumplimiento(
    actividades,
    hoy,
    (a) => NOMBRE_TIPO[a.tipo] ?? a.tipo
  );

  return {
    periodo,
    resumen,
    anterior,
    serie: serieDelPeriodo(periodo, actividades, hoy),
    motivos,
    porArea,
    porDiaSemana,
    porTipo,
    metaVsMinimo,
    sinRegistro,
    habitos,
    tiempo: {
      totalSegundos: suma(sesiones),
      totalSegundosAnterior: suma(sesionesAnt),
      porArea: [...segundosPorArea.entries()]
        .map(([area, segundos]) => ({ area, segundos }))
        .sort((a, b) => b.segundos - a.segundos),
      porProyecto: await tiempoPorProyecto(periodo.desde, periodo.hasta),
    },
    fondo: {
      backlogSinAsignar: pendientesBacklog.filter((a) => !a.esFaltante).length,
      faltantesPendientes: pendientesBacklog.filter((a) => a.esFaltante).length,
    },
    riesgosMinimos,
    lecturas: generarLecturas({
      actual: resumen,
      anterior,
      motivos,
      porArea,
      porDiaSemana,
      sinRegistro: sinRegistro.length,
      habitos,
      riesgosMinimos,
    }),
  };
}
