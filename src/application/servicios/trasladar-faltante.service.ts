import { db } from "../../offline/dexie/db";
import { QueueService } from "../../offline/services/queue.service";
import type {
  Actividad,
  TipoActividad,
} from "../../domain/entidades/actividad.entity";

function idActividadNueva(): string {
  return `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/** ¿Es "la misma tarea"? Por Entregable si lo tiene; si no, por descripción exacta (sin Entregable). */
function mismaTarea(a: Actividad, ref: Actividad): boolean {
  return ref.entregableId
    ? a.entregableId === ref.entregableId
    : !a.entregableId && a.descripcion === ref.descripcion;
}

/**
 * Lleva `cantidad` de una tarea cuantificable a un día: si ese día YA hay una
 * pendiente de la misma tarea con meta, se le suma (2 + 1 = 3); si no, se
 * crea una nueva con solo esa cantidad — sin arrastrar el avance ya hecho de
 * la original (eso sumaba dos veces al Entregable).
 * Debe llamarse dentro de una transacción sobre actividad + cola_eventos.
 */
export async function sumarOCrearEnDia(
  origen: Actividad,
  cantidad: number,
  diaDestino: string,
  tipoDestino: TipoActividad
): Promise<{ id: string; sumada: boolean }> {
  const ahora = Date.now();
  const candidatas = await db.actividad
    .where("diaTarea")
    .equals(diaDestino)
    .and(
      (a) =>
        a.estado === "pendiente" &&
        a.tipo !== "backlog" &&
        a.cantidadObjetivo !== undefined &&
        mismaTarea(a, origen)
    )
    .toArray();
  const existente = candidatas[0];
  if (existente) {
    const cantidadObjetivo = (existente.cantidadObjetivo ?? 0) + cantidad;
    await db.actividad.update(existente.id, {
      cantidadObjetivo,
      actualizadoEn: ahora,
    });
    await QueueService.encolar("actividad", "editar", existente.id, {
      id: existente.id,
      cantidadObjetivo,
      actualizadoEn: ahora,
    });
    return { id: existente.id, sumada: true };
  }

  const id = idActividadNueva();
  const copia: Actividad = {
    ...origen,
    id,
    tipo: tipoDestino,
    diaTarea: diaDestino,
    estado: "pendiente",
    cantidadObjetivo: cantidad,
    progresoActual: undefined,
    esFaltante: undefined,
    semanaId: undefined,
    fechaMigradaDesde: origen.diaTarea,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
  await db.actividad.add(copia);
  await QueueService.encolar("actividad", "crear", id, { ...copia });
  return { id, sumada: false };
}

/**
 * Suma `cantidad` al fondo de faltantes de esa tarea (una fila "backlog" por
 * tarea, ver Actividad.esFaltante) o crea el fondo si todavía no existe.
 * Debe llamarse dentro de una transacción sobre actividad + cola_eventos.
 */
export async function agregarAlFondo(
  origen: Actividad,
  cantidad: number
): Promise<string> {
  const ahora = Date.now();
  const fondos = await db.actividad
    .filter(
      (a) =>
        a.esFaltante === true &&
        a.estado === "pendiente" &&
        mismaTarea(a, origen)
    )
    .toArray();
  const fondo = fondos[0];
  if (fondo) {
    const cantidadObjetivo = (fondo.cantidadObjetivo ?? 0) + cantidad;
    await db.actividad.update(fondo.id, {
      cantidadObjetivo,
      actualizadoEn: ahora,
    });
    await QueueService.encolar("actividad", "editar", fondo.id, {
      id: fondo.id,
      cantidadObjetivo,
      actualizadoEn: ahora,
    });
    return fondo.id;
  }

  const id = idActividadNueva();
  const nuevo: Actividad = {
    id,
    entregableId: origen.entregableId,
    proyectoId: origen.proyectoId,
    objetivoId: origen.objetivoId,
    tipo: "backlog",
    descripcion: origen.descripcion,
    prioridad: "importante",
    area: origen.area,
    estado: "pendiente",
    cantidadObjetivo: cantidad,
    unidad: origen.unidad,
    esFaltante: true,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
  await db.actividad.add(nuevo);
  await QueueService.encolar("actividad", "crear", id, { ...nuevo });
  return id;
}
