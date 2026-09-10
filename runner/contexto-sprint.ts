import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Ruta relativa (dentro del repo del ticket) al archivo donde el runner deja
 * documentado qué construyeron los tickets anteriores del sprint actual —
 * reemplaza pegar ese contexto directo en el prompt (Estrategia 7.1:
 * "pull" en vez de "push" — el agente lo lee con sus propias herramientas
 * solo si lo necesita, en vez de cargarlo siempre, entero, en cada ticket).
 * Se reescribe en cada ticket nuevo del sprint y nunca se commitea — ver
 * el `git reset` explícito sobre esta ruta en git-pr.ts.
 */
export const ARCHIVO_CONTEXTO_SPRINT = "docs/SPRINT_CONTEXTO.md";

export interface ItemContextoSprint {
  ticket: string;
  archivos: string[];
  firmas: string[];
}

/**
 * Escribe (o borra, si no hay contexto todavía) el archivo de contexto del
 * sprint en el repo del ticket. Devuelve la ruta relativa si escribió algo
 * — para pasársela al generador del prompt — o `undefined` si no había
 * contexto previo (primer ticket del sprint).
 */
export function escribirContextoSprint(
  rutaRepo: string,
  contexto: ItemContextoSprint[]
): string | undefined {
  const rutaAbsoluta = path.join(rutaRepo, ARCHIVO_CONTEXTO_SPRINT);
  if (contexto.length === 0) {
    fs.rmSync(rutaAbsoluta, { force: true });
    return undefined;
  }

  const contenido = `# Contexto del sprint actual

Generado automáticamente por el runner de automatización — NO editar a mano,
se reescribe en cada ticket nuevo del sprint y nunca se commitea. Lista lo
que ya construyeron los tickets anteriores de este mismo sprint (archivos
tocados y firmas exportadas), para que un ticket nuevo no duplique trabajo
ni rompa contratos ya existentes.

${contexto
  .map(
    (t) =>
      `## ${t.ticket}\n- Archivos: ${t.archivos.join(", ") || "(ninguno)"}\n- Firmas: ${t.firmas.join(", ") || "(ninguna)"}`
  )
  .join("\n\n")}
`;

  fs.mkdirSync(path.dirname(rutaAbsoluta), { recursive: true });
  fs.writeFileSync(rutaAbsoluta, contenido, "utf-8");
  return ARCHIVO_CONTEXTO_SPRINT;
}
