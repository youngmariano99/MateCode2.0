import { db } from "../../offline/dexie/db";
import {
  chequearCoherenciaMinimos,
  evaluarMinimo,
  minimoDe,
  type EvaluacionMinimo,
} from "../../domain/entidades/minimos-personal.entity";
import { diasDelRango } from "../../domain/entidades/distribucion-personal.entity";
import { sumarDias } from "../../domain/entidades/personal.entity";
import type { Actividad } from "../../domain/entidades/actividad.entity";

export interface RiesgoMinimo {
  tipo: "fase" | "entregable" | "coherencia";
  id: string;
  titulo: string;
  /** Dónde vive (el Entregable de una Fase). */
  contexto?: string;
  unidad?: string;
  diaLimite?: string;
  evaluacion: EvaluacionMinimo;
  /** Texto listo para mostrar. */
  mensaje: string;
}

/** Lo que falta hacer de una actividad pendiente con cantidad, y el mínimo de eso. */
function restanteDe(a: Actividad): { pleno: number; minimo: number } {
  const meta = a.cantidadObjetivo ?? 0;
  const hecho = a.progresoActual ?? 0;
  const pleno = Math.max(meta - hecho, 0);
  const minimoDia = a.cantidadMinima ?? meta;
  return { pleno, minimo: Math.min(Math.max(minimoDia - hecho, 0), pleno) };
}

function sumarRestante(actividades: Actividad[]) {
  return actividades.reduce(
    (s, a) => {
      const r = restanteDe(a);
      return { pleno: s.pleno + r.pleno, minimo: s.minimo + r.minimo };
    },
    { pleno: 0, minimo: 0 }
  );
}

interface NodoVigilado {
  id: string;
  titulo: string;
  contexto?: string;
  unidad?: string;
  meta: number;
  banda: number;
  progreso: number;
  diaInicio: string;
  diaLimite: string;
  /** Actividades pendientes con cantidad que caen dentro del nodo. */
  pendientes: Actividad[];
}

function evaluarNodo(n: NodoVigilado, hoy: string): EvaluacionMinimo {
  if (n.pendientes.length > 0) {
    const r = sumarRestante(n.pendientes);
    return evaluarMinimo({
      meta: n.meta,
      bandaAceptable: n.banda,
      progreso: n.progreso,
      potencialRestante: r.pleno,
      minimosRestantes: r.minimo,
    });
  }
  // Sin actividades diarias que proyectar (se anota a mano): ritmo mínimo
  // lineal — cuánto debería llevarse hoy para llegar justo al mínimo.
  const minimo = minimoDe(n.meta, n.banda)!;
  const faltaParaMinimo = Math.max(minimo - n.progreso, 0);
  if (faltaParaMinimo === 0)
    return { estado: "logrado", minimo, faltaParaMinimo };
  if (hoy > n.diaLimite) {
    return {
      estado: "perdido",
      minimo,
      faltaParaMinimo,
      deficit: faltaParaMinimo,
    };
  }
  const total = Math.max(diasDelRango(n.diaInicio, n.diaLimite).length, 1);
  // Días ya vividos ANTES de hoy: el día de hoy todavía se puede cumplir.
  const transcurridos = Math.min(
    diasDelRango(n.diaInicio, sumarDias(hoy, -1)).length,
    total
  );
  const debiaLlevar = Math.floor((minimo * transcurridos) / total);
  if (n.progreso < debiaLlevar) {
    return {
      estado: "en_riesgo",
      minimo,
      faltaParaMinimo,
      proyeccionAlMinimo: n.progreso,
      deficit: debiaLlevar - n.progreso,
    };
  }
  return { estado: "en_camino", minimo, faltaParaMinimo };
}

function mensajeDe(
  nombre: string,
  unidad: string | undefined,
  e: EvaluacionMinimo,
  conProyeccion: boolean
): string {
  const u = unidad ? ` ${unidad}` : "";
  if (e.estado === "perdido") {
    return conProyeccion
      ? `${nombre}: ni haciendo todo lo que queda llegás al mínimo (${e.minimo}${u}). Faltarían ${e.deficit}${u}.`
      : `${nombre}: ya pasó la fecha y no llegaste al mínimo (${e.minimo}${u}).`;
  }
  return conProyeccion
    ? `${nombre}: si de acá en más hacés solo el mínimo de cada día, llegás a ${e.proyeccionAlMinimo}${u} y el mínimo es ${e.minimo}${u}. Te faltarían ${e.deficit}${u} por encima del mínimo diario.`
    : `${nombre}: vas ${e.deficit}${u} por debajo del ritmo mínimo (mínimo total ${e.minimo}${u}).`;
}

/**
 * Recorre Entregables y Fases con mínimo (bandaAceptable) y devuelve los que
 * están en riesgo o perdidos, más los planes donde los mínimos de los tramos
 * NO alcanzan para el mínimo del total (incoherencia). Solo lectura.
 */
export async function calcularRiesgosMinimos(
  hoy: string
): Promise<RiesgoMinimo[]> {
  const riesgos: RiesgoMinimo[] = [];
  const entregables = (
    await db.entregable.where("estado").equals("activo").toArray()
  ).filter((e) => e.cantidadObjetivo !== undefined && e.cantidadObjetivo > 0);
  const fasesAbiertas = await db.fase_personal
    .where("estado")
    .equals("abierta")
    .toArray();
  const fasesPorEntregable = new Map<string, typeof fasesAbiertas>();
  for (const f of fasesAbiertas) {
    const lista = fasesPorEntregable.get(f.entregableId) ?? [];
    lista.push(f);
    fasesPorEntregable.set(f.entregableId, lista);
  }

  for (const e of entregables) {
    const fases = fasesPorEntregable.get(e.id) ?? [];
    const pendientes = (
      await db.actividad.where("entregableId").equals(e.id).toArray()
    ).filter(
      (a) => a.estado === "pendiente" && a.cantidadObjetivo !== undefined
    );

    // Coherencia estática: ¿los mínimos de las fases alcanzan para el mínimo del entregable?
    if (fases.length > 0 && e.bandaAceptable !== undefined) {
      const aviso = chequearCoherenciaMinimos(
        e.titulo,
        e.cantidadObjetivo!,
        e.bandaAceptable,
        fases.map((f) => ({
          titulo: f.titulo,
          meta: f.cantidadObjetivo,
          bandaAceptable: f.bandaAceptable,
        }))
      );
      if (aviso) {
        riesgos.push({
          tipo: "coherencia",
          id: e.id,
          titulo: e.titulo,
          unidad: e.unidad,
          diaLimite: e.diaLimite,
          evaluacion: {
            estado: "en_riesgo",
            minimo: aviso.minimoPadre,
            proyeccionAlMinimo: aviso.sumaMinimosHijos,
            deficit: aviso.minimoPadre - aviso.sumaMinimosHijos,
          },
          mensaje: aviso.mensaje,
        });
      }
    }

    // Nivel Entregable: solo si no delega en Fases (para no avisar dos veces lo mismo).
    if (fases.length === 0 && e.bandaAceptable !== undefined) {
      const ev = evaluarNodo(
        {
          id: e.id,
          titulo: e.titulo,
          unidad: e.unidad,
          meta: e.cantidadObjetivo!,
          banda: e.bandaAceptable,
          progreso: e.progresoActual,
          diaInicio: e.diaInicio,
          diaLimite: e.diaLimite,
          pendientes,
        },
        hoy
      );
      if (ev.estado === "en_riesgo" || ev.estado === "perdido") {
        riesgos.push({
          tipo: "entregable",
          id: e.id,
          titulo: e.titulo,
          unidad: e.unidad,
          diaLimite: e.diaLimite,
          evaluacion: ev,
          mensaje: mensajeDe(
            `"${e.titulo}"`,
            e.unidad,
            ev,
            pendientes.length > 0
          ),
        });
      }
    }

    for (const f of fases) {
      if (f.bandaAceptable === undefined) continue;
      // Una fase que todavía no empezó solo se evalúa si tiene actividades que proyectar.
      const enRango = pendientes.filter(
        (a) =>
          a.diaTarea !== undefined &&
          a.diaTarea >= f.diaInicio &&
          a.diaTarea <= f.diaLimite
      );
      if (f.diaInicio > hoy && enRango.length === 0) continue;
      const ev = evaluarNodo(
        {
          id: f.id,
          titulo: f.titulo,
          contexto: e.titulo,
          unidad: f.unidad,
          meta: f.cantidadObjetivo,
          banda: f.bandaAceptable,
          progreso: f.progresoActual,
          diaInicio: f.diaInicio,
          diaLimite: f.diaLimite,
          pendientes: enRango,
        },
        hoy
      );
      if (ev.estado === "en_riesgo" || ev.estado === "perdido") {
        riesgos.push({
          tipo: "fase",
          id: f.id,
          titulo: f.titulo,
          contexto: e.titulo,
          unidad: f.unidad,
          diaLimite: f.diaLimite,
          evaluacion: ev,
          mensaje: mensajeDe(
            `${e.titulo} · ${f.titulo}`,
            f.unidad,
            ev,
            enRango.length > 0
          ),
        });
      }
    }
  }
  return riesgos.sort((a, b) =>
    (a.diaLimite ?? "").localeCompare(b.diaLimite ?? "")
  );
}
