import React from "react";
import {
  importarBloqueCompletoSchema,
  importarPausasActivasSchema,
  type ItemRutinaJson,
  type ItemEjercicioNuevoJson,
} from "../../../../domain/entidades/planificacion-entrenamiento.entity";

/**
 * Resúmenes legibles del JSON combinado de Entrenamiento (Sprint 21) — se
 * usan como `renderResumen` de `ModalImportarJson`. No consultan la base
 * (esta función es síncrona): la resolución real "reusa/actualiza/crea" pasa
 * en `ImportarBloqueEntrenamientoUseCase` al confirmar — acá solo se
 * muestra qué trae el JSON, con la nota de que los nombres repetidos se
 * reusan/actualizan en vez de duplicarse.
 */

function mensajeDeIssues(
  issues: { path: PropertyKey[]; message: string }[]
): string {
  return issues
    .map((i) => `${i.path.map(String).join(".") || "(raíz)"}: ${i.message}`)
    .join(" — ");
}

const Fila: React.FC<{ nivel: number; children: React.ReactNode }> = ({
  nivel,
  children,
}) => (
  <div
    style={{ marginLeft: nivel * 16 }}
    className="border-l border-[#2A2A2E] py-0.5 pl-2 text-xs text-zinc-300"
  >
    {children}
  </div>
);

function textoEjercicios(ejercicios: ItemRutinaJson["ejercicios"]): string {
  return ejercicios
    .map((ej) =>
      typeof ej === "string"
        ? ej
        : `${ej.nombre}${ej.series ? ` (${ej.series}x${ej.reps ?? "?"})` : ""}`
    )
    .join(", ");
}

const NOMBRES_DIA = ["D", "L", "M", "M", "J", "V", "S"];

function textoDias(diasSemana?: number[]): string {
  if (!diasSemana || diasSemana.length === 0) return "";
  return ` · días: ${diasSemana
    .slice()
    .sort((a, b) => a - b)
    .map((d) => NOMBRES_DIA[d])
    .join("")}`;
}

const ResumenRutina: React.FC<{ r: ItemRutinaJson; nivel: number }> = ({
  r,
  nivel,
}) => (
  <Fila nivel={nivel}>
    <span className="font-bold text-zinc-100">{r.nombre}</span> ({r.formato}) —{" "}
    {textoEjercicios(r.ejercicios)}
    {textoDias(r.diasSemana)}
  </Fila>
);

const ResumenEjercicioNuevo: React.FC<{
  e: ItemEjercicioNuevoJson;
  nivel: number;
}> = ({ e, nivel }) => (
  <Fila nivel={nivel}>
    <span className="text-amber-400">◆ Ejercicio nuevo:</span>{" "}
    <span className="font-bold text-zinc-100">{e.nombre}</span> (patrón:{" "}
    {e.patron}, equipo:{" "}
    {e.equipamiento.length > 0 ? e.equipamiento.join("/") : "sin equipo"})
  </Fila>
);

/** Un JSON pegado puede traer uno o varios Bloques a la vez (array) — se muestran todos, en el mismo orden en que se van a crear. */
export function resumenBloqueCompleto(items: unknown[]): React.ReactNode {
  const parseados = items.map((item) =>
    importarBloqueCompletoSchema.safeParse(item ?? {})
  );
  const primerError = parseados.find((p) => !p.success);
  if (primerError && !primerError.success) {
    throw new Error(mensajeDeIssues(primerError.error.issues));
  }
  return (
    <div className="flex flex-col gap-2">
      {parseados.map((p, idx) => {
        if (!p.success) return null;
        const parsed = p.data;
        return (
          <div
            key={idx}
            className="flex flex-col gap-1 border-b border-[#2A2A2E] pb-2 last:border-b-0 last:pb-0"
          >
            <Fila nivel={0}>
              <span className="font-bold text-emerald-400">
                Bloque: {parsed.bloque.nombre}
              </span>{" "}
              — {parsed.bloque.diaInicio ?? "hoy"} → {parsed.bloque.diaFin} ·
              eje: {parsed.bloque.ejeProgresionDefault}
            </Fila>
            {parsed.rutinas.map((r, i) => (
              <ResumenRutina key={i} r={r} nivel={1} />
            ))}
            {parsed.ejerciciosNuevos.map((e, i) => (
              <ResumenEjercicioNuevo key={i} e={e} nivel={1} />
            ))}
          </div>
        );
      })}
      <p className="pl-2 text-[11px] text-zinc-600">
        Las Rutinas y Ejercicios con un nombre que ya existe se reusan o
        actualizan — no se duplican.
      </p>
    </div>
  );
}

function resumenRutinasSinBloque(
  items: unknown[],
  notaFinal: string
): React.ReactNode {
  const parsed = importarPausasActivasSchema.safeParse(items[0] ?? {});
  if (!parsed.success) throw new Error(mensajeDeIssues(parsed.error.issues));
  return (
    <div className="flex flex-col gap-1">
      {parsed.data.rutinasNuevas.map((r, i) => (
        <ResumenRutina key={i} r={r} nivel={0} />
      ))}
      {parsed.data.ejerciciosNuevos.map((e, i) => (
        <ResumenEjercicioNuevo key={i} e={e} nivel={0} />
      ))}
      <p className="pl-2 text-[11px] text-zinc-600">{notaFinal}</p>
    </div>
  );
}

/** Mismo shape ({ rutinasNuevas, ejerciciosNuevos }), sin Bloque — usado tanto para pausas activas como para el alta standalone de rutinas sueltas. */
export function resumenPausasActivas(items: unknown[]): React.ReactNode {
  return resumenRutinasSinBloque(
    items,
    "No se crea ningún Bloque — solo Rutinas de pausa activa."
  );
}

export function resumenRutinasStandalone(items: unknown[]): React.ReactNode {
  return resumenRutinasSinBloque(
    items,
    "No se crea ningún Bloque — las Rutinas y Ejercicios con nombre repetido se reusan/actualizan."
  );
}
