import { db } from "../../offline/dexie/db";

export interface RegistroProyecto {
  dia: string;
  texto: string;
}

export interface ResumenProyectoTrabajo {
  proyectoId: string;
  nombre: string;
  /** Tiempo real dedicado (sesiones del cronómetro ligadas a actividades de este proyecto). */
  segundos: number;
  /** Días distintos con actividad en este proyecto. */
  dias: number;
  /** Lo que se anotó: "voy a hacer / hice" de las actividades y lo logrado al cerrar cada sesión. */
  registros: RegistroProyecto[];
}

/**
 * Cuánto tiempo y qué se hizo en cada proyecto de trabajo (módulo Proyectos)
 * entre dos días, a partir de las actividades ligadas a un proyecto
 * (`proyectoTrabajoId`), sus sesiones de cronómetro y las notas.
 */
export async function tiempoPorProyecto(
  desde: string,
  hasta: string
): Promise<ResumenProyectoTrabajo[]> {
  const actividades = (
    await db.actividad
      .where("diaTarea")
      .between(desde, hasta, true, true)
      .toArray()
  ).filter((a) => a.estado !== "cancelada" && a.estado !== "descartada");
  const porActividad = new Map(actividades.map((a) => [a.id, a]));

  // El proyecto de una sesión: el suyo, o si no el de su actividad.
  const sesiones = (
    await db.sesion_trabajo
      .where("diaTarea")
      .between(desde, hasta, true, true)
      .toArray()
  )
    .map((s) => ({
      s,
      actividad: s.actividadId ? porActividad.get(s.actividadId) : undefined,
      proyecto:
        s.proyectoTrabajoId ??
        (s.actividadId
          ? porActividad.get(s.actividadId)?.proyectoTrabajoId
          : undefined),
    }))
    .filter((x) => !!x.proyecto);
  const actividadesDeProyecto = actividades.filter(
    (a) => !!a.proyectoTrabajoId
  );
  if (actividadesDeProyecto.length === 0 && sesiones.length === 0) return [];

  const proyectos = new Map(
    (await db.proyectos.toArray()).map((p) => [
      p.id as string,
      (typeof p.nombre === "string" && p.nombre) || "Proyecto sin nombre",
    ])
  );

  const resumen = new Map<
    string,
    ResumenProyectoTrabajo & { _dias: Set<string> }
  >();
  const de = (id: string) => {
    let r = resumen.get(id);
    if (!r) {
      r = {
        proyectoId: id,
        nombre: proyectos.get(id) ?? "Proyecto eliminado",
        segundos: 0,
        dias: 0,
        registros: [],
        _dias: new Set(),
      };
      resumen.set(id, r);
    }
    return r;
  };

  for (const a of actividadesDeProyecto) {
    const r = de(a.proyectoTrabajoId!);
    if (a.diaTarea) r._dias.add(a.diaTarea);
    if (a.nota) r.registros.push({ dia: a.diaTarea ?? "", texto: a.nota });
  }
  for (const { s, actividad, proyecto } of sesiones) {
    const r = de(proyecto!);
    r.segundos += s.segundosAcumulados;
    r._dias.add(s.diaTarea);
    // Lo que se anota al cerrar la sesión (o el título de una sesión suelta si no hubo nota).
    const texto = s.nota ?? (!actividad ? s.descripcion : undefined);
    if (texto && texto !== actividad?.nota)
      r.registros.push({ dia: s.diaTarea, texto });
  }

  return [...resumen.values()]
    .map(({ _dias, ...r }) => ({
      ...r,
      dias: _dias.size,
      registros: r.registros.sort((x, y) => y.dia.localeCompare(x.dia)),
    }))
    .sort((a, b) => b.segundos - a.segundos);
}
