import { db } from "../../offline/dexie/db";
import { QueueService } from "../../offline/services/queue.service";
import type { Actividad } from "../../domain/entidades/actividad.entity";

/**
 * Recalcula `progresoActual` de cada nivel sumando el de sus hijos, subiendo
 * la cadena hasta el Objetivo — nunca hay que "sincronizar" nada a mano, el
 * número que se ve siempre refleja el estado real de los hijos (ver
 * Decisión C del plan). Deliberadamente NO toca `cantidadObjetivo` en
 * ningún nivel: la meta la declara el usuario y no se recalcula sola (sumar
 * las metas de los hijos podría pisar silenciosamente un número que el
 * usuario puso a propósito, ej. un Objetivo de "5 clientes" con un solo
 * Proyecto sin meta propia no debe terminar mostrando "0 clientes").
 *
 * Escape hatch: si NINGÚN hijo tiene una métrica declarada (cantidadObjetivo
 * propio), el nivel actual no se toca — queda como estaba (0 por defecto, o
 * lo que el usuario haya cargado a mano) en vez de forzarse a 0. Esto cubre
 * ramas genuinamente no cuantificables sin romper el resto del árbol.
 */

/** Progreso "efectivo" de una Actividad hacia el total de su Entregable. */
function progresoEfectivoActividad(a: Actividad): number {
  if (a.estado === "cancelada" || a.estado === "descartada") return 0;
  if (a.progresoActual !== undefined) return a.progresoActual;
  // Completada sin registro incremental propio (ej. "contactar 5 clientes"
  // marcada de una vez, no sumada de a uno): cuenta el total declarado.
  if (a.estado === "completada" && a.cantidadObjetivo !== undefined) {
    return a.cantidadObjetivo;
  }
  return 0;
}

export async function recomputarEntregable(
  entregableId: string
): Promise<void> {
  const entregable = await db.entregable.get(entregableId);
  if (!entregable) return;

  const actividades = await db.actividad
    .where("entregableId")
    .equals(entregableId)
    .toArray();
  // "Con métrica" acá es más amplio que en Proyecto/Objetivo: además de una
  // cantidadObjetivo declarada, cuenta un progresoActual ya registrado a
  // mano (ej. una instancia diaria de un Entregable recurrente, sin meta
  // fija por día — ver GestionarActividadesUseCase.registrarAvance).
  const conMetrica = actividades.filter(
    (a) =>
      (a.cantidadObjetivo !== undefined || a.progresoActual !== undefined) &&
      a.estado !== "cancelada" &&
      a.estado !== "descartada"
  );

  if (conMetrica.length > 0) {
    const progresoActual = conMetrica.reduce(
      (s, a) => s + progresoEfectivoActividad(a),
      0
    );
    const actualizadoEn = Date.now();
    const estado =
      entregable.cantidadObjetivo !== undefined &&
      progresoActual >= entregable.cantidadObjetivo &&
      entregable.estado === "activo"
        ? ("cumplido" as const)
        : entregable.estado;
    await db.entregable.update(entregableId, {
      progresoActual,
      estado,
      actualizadoEn,
    });
    await QueueService.encolar("entregable", "editar", entregableId, {
      id: entregableId,
      progresoActual,
      estado,
      actualizadoEn,
    });
  }

  await recomputarProyecto(entregable.proyectoId);
}

export async function recomputarProyecto(proyectoId: string): Promise<void> {
  const proyecto = await db.proyecto_personal.get(proyectoId);
  if (!proyecto) return;

  const entregables = await db.entregable
    .where("proyectoId")
    .equals(proyectoId)
    .toArray();
  // "Con métrica" incluye tanto al Entregable con meta propia como al que
  // no tiene meta propia pero sí hijos cuantificados debajo (su
  // progresoActual ya viene sumado por recomputarEntregable) — si solo se
  // exigiera cantidadObjetivo propia, un Proyecto puramente organizativo
  // (ej. "Prospección", sin meta propia, agrupando un Entregable recurrente
  // que sí la tiene) nunca sumaría nada hacia arriba.
  const conMetrica = entregables.filter(
    (e) =>
      (e.cantidadObjetivo !== undefined || e.tieneHijos) &&
      e.estado !== "archivado"
  );

  if (conMetrica.length > 0) {
    const progresoActual = conMetrica.reduce((s, e) => s + e.progresoActual, 0);
    const actualizadoEn = Date.now();
    const estado =
      proyecto.cantidadObjetivo !== undefined &&
      progresoActual >= proyecto.cantidadObjetivo &&
      proyecto.estado === "activo"
        ? ("cumplido" as const)
        : proyecto.estado;
    await db.proyecto_personal.update(proyectoId, {
      progresoActual,
      estado,
      actualizadoEn,
    });
    await QueueService.encolar("proyecto_personal", "editar", proyectoId, {
      id: proyectoId,
      progresoActual,
      estado,
      actualizadoEn,
    });
  }

  await recomputarObjetivo(proyecto.objetivoId);
}

export async function recomputarObjetivo(objetivoId: string): Promise<void> {
  const objetivo = await db.objetivo_cuantificable.get(objetivoId);
  if (!objetivo) return;

  const proyectos = await db.proyecto_personal
    .where("objetivoId")
    .equals(objetivoId)
    .toArray();
  // Mismo criterio que en recomputarProyecto: cuenta el Proyecto con meta
  // propia O con hijos cuantificados debajo (ver comentario ahí).
  const conMetrica = proyectos.filter(
    (p) =>
      (p.cantidadObjetivo !== undefined || p.tieneHijos) &&
      p.estado !== "archivado"
  );
  if (conMetrica.length === 0) return;

  const progresoActual = conMetrica.reduce((s, p) => s + p.progresoActual, 0);
  const actualizadoEn = Date.now();
  const estado =
    progresoActual >= objetivo.cantidadObjetivo && objetivo.estado === "activo"
      ? ("cumplido" as const)
      : objetivo.estado;
  await db.objetivo_cuantificable.update(objetivoId, {
    progresoActual,
    estado,
    actualizadoEn,
  });
  await QueueService.encolar("objetivo_cuantificable", "editar", objetivoId, {
    id: objetivoId,
    progresoActual,
    estado,
    actualizadoEn,
  });
}
