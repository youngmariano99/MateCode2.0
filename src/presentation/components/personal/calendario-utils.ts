import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../offline/dexie/db";
import { colorDeAreaEfectivo } from "../../../domain/entidades/area-personal.entity";
import type { Entregable } from "../../../domain/entidades/entregable.entity";

/** Color neutro para Actividades/Entregables sueltos, sin Objetivo→Área arriba. */
export const COLOR_SIN_AREA = "#71717A";

/**
 * Objetivo→Área es la única cadena que hace falta subir para colorear
 * cualquier nodo de la jerarquía (Entregable/Actividad ya traen `objetivoId`
 * denormalizado) — un solo mapa id→color, recalculado cuando cambian
 * Objetivos o Áreas, resuelve todo el calendario sin ir tabla por tabla.
 */
export function useColorPorObjetivo(): (objetivoId?: string) => string {
  const objetivos = useLiveQuery(() => db.objetivo_cuantificable.toArray());
  const areas = useLiveQuery(() => db.area_personal.toArray());

  const mapaAreaPorObjetivo = new Map<string, string | undefined>();
  (objetivos || []).forEach((o) => mapaAreaPorObjetivo.set(o.id, o.areaId));
  const mapaColorPorArea = new Map<string, string>();
  (areas || []).forEach((a) =>
    mapaColorPorArea.set(a.id, colorDeAreaEfectivo(a))
  );

  return (objetivoId?: string) => {
    if (!objetivoId) return COLOR_SIN_AREA;
    const areaId = mapaAreaPorObjetivo.get(objetivoId);
    if (!areaId) return COLOR_SIN_AREA;
    return mapaColorPorArea.get(areaId) || COLOR_SIN_AREA;
  };
}

/** Entregables recurrentes activos — para proyectar en el calendario lo que "toca" cada día aunque todavía no exista su Actividad. */
export function useEntregablesRecurrentes(): Entregable[] {
  return (
    useLiveQuery(() =>
      db.entregable
        .where("estado")
        .equals("activo")
        .filter((e) => !!e.recurrencia)
        .toArray()
    ) || []
  );
}

export interface AreaDeTarea {
  id: string;
  nombre: string;
  color: string;
}

export const SIN_AREA: AreaDeTarea = {
  id: "sin_area",
  nombre: "Sin área",
  color: COLOR_SIN_AREA,
};

/** Igual que useColorPorObjetivo pero devuelve también el nombre del Área — para distinguir tareas por área con color + etiqueta. */
export function useAreaPorObjetivo(): (objetivoId?: string) => AreaDeTarea {
  const objetivos = useLiveQuery(() => db.objetivo_cuantificable.toArray());
  const areas = useLiveQuery(() => db.area_personal.toArray());

  const areaPorId = new Map<string, AreaDeTarea>();
  (areas || []).forEach((a) =>
    areaPorId.set(a.id, {
      id: a.id,
      nombre: a.nombre,
      color: colorDeAreaEfectivo(a),
    })
  );
  const areaIdPorObjetivo = new Map<string, string | undefined>();
  (objetivos || []).forEach((o) => areaIdPorObjetivo.set(o.id, o.areaId));

  return (objetivoId?: string) => {
    if (!objetivoId) return SIN_AREA;
    const areaId = areaIdPorObjetivo.get(objetivoId);
    return (areaId && areaPorId.get(areaId)) || SIN_AREA;
  };
}

/** Lunes (YYYY-MM-DD) de la semana que contiene `diaISO`, ya existe en personal.entity.ts — se re-exporta acá para no acoplar los componentes de calendario a esa entidad directamente si cambia. */
export {
  lunesDeLaSemana,
  sumarDias,
} from "../../../domain/entidades/personal.entity";

export const NOMBRES_DIA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

/** YYYY-MM-DD → "12 sep" (es-AR, sin año — el calendario nunca muestra más de unos meses de rango). */
export function formatoDiaCorto(diaISO: string): string {
  const [, mes, dia] = diaISO.split("-").map(Number);
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
  return `${dia} ${MESES[mes - 1]}`;
}
