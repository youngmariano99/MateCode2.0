import { db } from "../../offline/dexie/db";
import type {
  BloqueEntrenamiento,
  PlantillaRutina,
  ReglaProgresion,
  RutinaProgramada,
} from "../../domain/entidades/rutina.entity";
import {
  cantidadSemanasBloque,
  indiceSemanaDe,
  pasosDelBloque,
  planParaPaso,
  resumirSemanaBloque,
  type PlanSesion,
} from "../../domain/entidades/progresion-entrenamiento.entity";
import { catalogoInfo } from "../use-cases/personal/gestionar-progresion-bloque.use-case";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function textoRegla(r: ReglaProgresion): string {
  const cada =
    r.cadaSemanas && r.cadaSemanas > 1
      ? ` cada ${r.cadaSemanas} semanas`
      : " por semana";
  const desde =
    r.desdePaso && r.desdePaso !== 2 ? ` desde el paso ${r.desdePaso}` : "";
  const tope = r.tope !== undefined ? ` (tope ${r.tope})` : "";
  const signo = r.incremento > 0 ? "+" : "";
  return `${r.tipo} ${signo}${r.incremento}${cada}${desde}${tope}`;
}

/** Un plan en una línea por ejercicio: "Sentadilla 3x8 @10kg". */
export function textoPlanSesion(
  plan: PlanSesion,
  nombre: (id: string) => string
): string {
  if (plan.tipoEstructura === "tiempo") {
    const t = plan.tiempo ?? {};
    const partes = [
      t.numeroRondas && `${t.numeroRondas} rondas`,
      t.tiempoTrabajoSeg && `${t.tiempoTrabajoSeg}s trabajo`,
      t.tiempoDescansoSeg && `${t.tiempoDescansoSeg}s descanso`,
    ].filter(Boolean);
    return partes.join(", ") || "por tiempo";
  }
  return plan.ejercicios
    .map((e) => {
      const s = e.sets[0] ?? {};
      const cantidad =
        s.reps ??
        (s.tiempoSeg
          ? `${s.tiempoSeg}s`
          : s.distanciaM
            ? `${s.distanciaM}m`
            : "?");
      return `${nombre(e.ejercicioId)} ${e.sets.length}x${cantidad}${s.pesoKg ? ` @${s.pesoKg}kg` : ""}${e.nivel !== undefined ? ` (nivel ${e.nivel})` : ""}`;
    })
    .join(" · ");
}

async function contexto() {
  const [catalogo, plantillas, info] = await Promise.all([
    db.catalogo_ejercicio.toArray(),
    db.plantilla_rutina.toArray(),
    catalogoInfo(),
  ]);
  const nombreEj = new Map(catalogo.map((e) => [e.id, e.nombre]));
  const plantillaPorId = new Map(plantillas.map((p) => [p.id, p]));
  return {
    info,
    plantillaPorId,
    nombre: (id: string) => nombreEj.get(id) ?? id,
  };
}

function planDe(
  b: BloqueEntrenamiento,
  rp: RutinaProgramada,
  p: PlantillaRutina,
  paso: number,
  info: Awaited<ReturnType<typeof contexto>>["info"]
): PlanSesion {
  return planParaPaso({
    tipoEstructura: p.tipoEstructura,
    estructura: rp.estructuraBase ?? p.estructura,
    programada: rp,
    paso,
    descargas: b.descargas,
    catalogo: info,
  });
}

/**
 * Lo último que se planificó en el bloque activo (su última semana): sirve
 * para que el bloque siguiente PARTA de ahí y no de números más bajos.
 */
export async function armarUltimoPlanBloqueActivo(): Promise<string> {
  const activo = (
    await db.bloque_entrenamiento.where("estado").equals("activo").toArray()
  ).find((b) => !b.eliminado);
  if (!activo) return "";
  const { info, plantillaPorId, nombre } = await contexto();
  const pasos = pasosDelBloque(activo);
  const ultimo = pasos[pasos.length - 1];
  const lineas = [
    `Bloque "${activo.nombre}" (termina ${activo.diaFin}), última semana = paso ${ultimo}:`,
  ];
  for (const rp of activo.rutinasProgramadas) {
    const p = plantillaPorId.get(rp.plantillaId);
    if (!p) continue;
    lineas.push(
      `- "${p.nombre}" (${p.formato}, ${rp.diasSemana.map((d) => DIAS[d]).join("/")}): ${textoPlanSesion(planDe(activo, rp, p, ultimo, info), nombre)}`
    );
  }
  return lineas.join("\n");
}

/**
 * Todo lo que la IA necesita para reestructurar: por cada bloque vigente, sus
 * rutinas con su base y reglas, el plan semana por semana, qué se hizo y qué
 * no de cada semana, y las decisiones que ya se tomaron.
 */
export async function armarContextoReestructuracion(
  hoy: string
): Promise<string> {
  const bloques = (await db.bloque_entrenamiento.toArray())
    .filter((b) => !b.eliminado && b.estado !== "cerrado")
    .sort((a, b) => a.diaInicio.localeCompare(b.diaInicio));
  if (bloques.length === 0) return "";
  const { info, plantillaPorId, nombre } = await contexto();
  const registros = await db.registro_actividad.toArray();
  const historial = await db.personal_historial.toArray();

  const salida: string[] = [];
  for (const b of bloques) {
    const pasos = pasosDelBloque(b);
    const n = cantidadSemanasBloque(b);
    const actual =
      hoy >= b.diaInicio && hoy <= b.diaFin
        ? indiceSemanaDe(b, hoy)
        : undefined;
    salida.push(
      `### Bloque "${b.nombre}" (${b.estado}) — ${b.diaInicio} → ${b.diaFin} · eje: ${b.ejeProgresionDefault} · ${n} semanas · pasos de progresión: ${pasos.join(",")}` +
        (b.descargas?.length
          ? ` · descargas: ${b.descargas.map((d) => `paso ${d.paso} ×${d.factor}`).join(", ")}`
          : "") +
        (actual !== undefined
          ? ` · HOY: semana ${actual + 1} de ${n}`
          : hoy > b.diaFin
            ? " · ya pasó su fecha de fin"
            : " · todavía no empezó")
    );
    for (const rp of b.rutinasProgramadas) {
      const p = plantillaPorId.get(rp.plantillaId);
      if (!p) continue;
      salida.push(
        `Rutina "${p.nombre}" (${p.formato}) — días: ${rp.diasSemana.map((d) => DIAS[d]).join(", ")}`
      );
      const cal = rp.calentamientoBase ?? p.calentamiento;
      if (cal) salida.push(`  Calentamiento: ${cal}`);
      const reglas: string[] = [];
      for (const pr of rp.progresiones ?? []) {
        reglas.push(
          `${nombre(pr.ejercicioId)}: ${pr.sinProgresion ? "sin progresión" : pr.reglas.map(textoRegla).join(" + ") || "usa la general"}` +
            (pr.minimo ? ` [mínimo ${JSON.stringify(pr.minimo)}]` : "")
        );
      }
      if (rp.progresionGeneral?.length)
        reglas.push(
          `General: ${rp.progresionGeneral.map(textoRegla).join(" + ")}`
        );
      if (rp.progresionTiempo?.length)
        reglas.push(
          `Por tiempo: ${rp.progresionTiempo.map(textoRegla).join(" + ")}`
        );
      salida.push(
        `  Progresión: ${reglas.length > 0 ? reglas.join(" | ") : "NINGUNA (plan plano)"}`
      );
      const vistos = new Set<number>();
      for (const paso of pasos) {
        if (vistos.has(paso)) continue;
        vistos.add(paso);
        salida.push(
          `  Paso ${paso}: ${textoPlanSesion(planDe(b, rp, p, paso, info), nombre)}`
        );
      }
    }
    // Qué pasó semana por semana
    const filas: string[] = [];
    for (let i = 0; i < n; i++) {
      const r = resumirSemanaBloque(b, i, registros);
      if (r.planificadas === 0 && r.hechas === 0) continue;
      const pasada = r.hasta < hoy;
      const estado = pasada ? "" : i === actual ? " (en curso)" : " (futura)";
      if (!pasada && i !== actual) continue;
      filas.push(
        `  Semana ${i + 1} (paso ${r.paso}, ${r.desde} → ${r.hasta})${estado}: hechas ${r.hechas}/${r.planificadas} sesiones (${r.cumplimiento}%)` +
          (r.logro !== undefined
            ? `, logro ${r.logro}% de lo planificado`
            : "") +
          (r.extras > 0 ? `, ${r.extras} extra(s)` : "") +
          (r.nadaHecho && pasada ? " — NO SE HIZO NADA" : "")
      );
    }
    salida.push(
      filas.length > 0
        ? "Lo que pasó:\n" + filas.join("\n")
        : "Lo que pasó: todavía no hay semanas evaluables."
    );
    const decisiones = historial
      .filter((h) => h.entidadTipo === "bloque" && h.entidadId === b.id)
      .sort((x, y) => y.creadoEn - x.creadoEn)
      .slice(0, 8);
    if (decisiones.length > 0) {
      salida.push(
        "Decisiones ya tomadas:\n" +
          decisiones
            .map(
              (d) =>
                `  - ${new Date(d.creadoEn).toISOString().slice(0, 10)}: ${d.descripcion ?? d.accion}${(d.campoNuevo as { nota?: string } | undefined)?.nota ? ` (nota: ${(d.campoNuevo as { nota: string }).nota})` : ""}`
            )
            .join("\n")
      );
    }
    salida.push("");
  }
  return salida.join("\n");
}

export interface PlanPorPaso {
  plantillaId: string;
  nombre: string;
  filas: { paso: number; texto: string; esDescarga: boolean }[];
}

/** El plan de cada rutina del bloque en cada paso de progresión (para verlo semana a semana y revisar que la progresión tenga sentido). */
export async function planesDelBloque(
  bloque: BloqueEntrenamiento
): Promise<PlanPorPaso[]> {
  const { info, plantillaPorId, nombre } = await contexto();
  const pasosUnicos = [...new Set(pasosDelBloque(bloque))];
  const salida: PlanPorPaso[] = [];
  for (const rp of bloque.rutinasProgramadas) {
    const p = plantillaPorId.get(rp.plantillaId);
    if (!p) continue;
    salida.push({
      plantillaId: p.id,
      nombre: p.nombre,
      filas: pasosUnicos.map((paso) => {
        const plan = planDe(bloque, rp, p, paso, info);
        return {
          paso,
          texto: textoPlanSesion(plan, nombre),
          esDescarga: plan.esDescarga,
        };
      }),
    });
  }
  return salida;
}
