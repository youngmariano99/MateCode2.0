import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarObjetivosUseCase } from "../../application/use-cases/personal/gestionar-objetivos.use-case";
import { GestionarProyectosPersonalUseCase } from "../../application/use-cases/personal/gestionar-proyectos-personal.use-case";
import { GestionarEntregablesUseCase } from "../../application/use-cases/personal/gestionar-entregables.use-case";
import { DistribuirPlanUseCase } from "../../application/use-cases/personal/distribuir-plan.use-case";
import { ImportarArbolPersonalUseCase } from "../../application/use-cases/personal/importar-arbol-personal.use-case";
import {
  diasDelRango,
  dividirRangoEnPartes,
  expandirReparto,
  repartirEnListaDeDias,
  repartirParejo,
  sugerirEntregables,
} from "../../domain/entidades/distribucion-personal.entity";

const objetivos = new GestionarObjetivosUseCase();
const proyectos = new GestionarProyectosPersonalUseCase();
const entregables = new GestionarEntregablesUseCase();
const distribuir = new DistribuirPlanUseCase();
const importar = new ImportarArbolPersonalUseCase();

describe("Distribución (funciones puras)", () => {
  test("repartirParejo no pierde ni inventa unidades y espacia el sobrante", () => {
    assert.deepStrictEqual(repartirParejo(40, 5), [8, 8, 8, 8, 8]);
    const r = repartirParejo(41, 5);
    assert.strictEqual(
      r.reduce((s, x) => s + x, 0),
      41
    );
    assert.deepStrictEqual(
      [...r].sort(),
      [8, 8, 8, 8, 9].map(String).sort().map(Number)
    );
    // 3 unidades en 5 días: nunca los 3 primeros seguidos
    assert.deepStrictEqual(repartirParejo(3, 5), [1, 1, 0, 1, 0]);
  });

  test("diasDelRango respeta los días de la semana elegidos", () => {
    // 2026-03-09 es lunes
    const dias = diasDelRango("2026-03-09", "2026-03-15", [1, 2, 3, 4, 5]);
    assert.strictEqual(dias.length, 5);
    assert.strictEqual(dias[0], "2026-03-09");
    assert.strictEqual(dias[4], "2026-03-13");
    assert.deepStrictEqual(diasDelRango("2026-03-15", "2026-03-09"), []);
  });

  test("dividirRangoEnPartes: por semanas y en N partes cubren el rango completo sin huecos", () => {
    const semanas = dividirRangoEnPartes("2026-03-09", "2026-04-12", "semanas");
    assert.strictEqual(semanas.length, 5);
    assert.strictEqual(semanas[0].diaInicio, "2026-03-09");
    assert.strictEqual(semanas[0].diaLimite, "2026-03-15");
    assert.strictEqual(semanas[4].diaLimite, "2026-04-12");

    const partes = dividirRangoEnPartes(
      "2026-03-01",
      "2026-03-31",
      "partes",
      3
    );
    assert.strictEqual(partes.length, 3);
    assert.strictEqual(partes[0].diaInicio, "2026-03-01");
    assert.strictEqual(partes[2].diaLimite, "2026-03-31");
    for (let i = 1; i < partes.length; i++) {
      const esperado = new Date(
        new Date(`${partes[i - 1].diaLimite}T00:00:00Z`).getTime() + 86400000
      )
        .toISOString()
        .slice(0, 10);
      assert.strictEqual(
        partes[i].diaInicio,
        esperado,
        "sin huecos ni solapes"
      );
    }
  });

  test("sugerirEntregables: 200 en 5 semanas → 5 de 40; a medida reporta la diferencia", () => {
    const iguales = sugerirEntregables({
      diaInicio: "2026-03-09",
      diaLimite: "2026-04-12",
      total: 200,
      modo: "semanas",
      tituloBase: "Contacto en frío",
    });
    assert.strictEqual(iguales.entregables.length, 5);
    assert.ok(iguales.entregables.every((e) => e.cantidad === 40));
    assert.strictEqual(iguales.diferencia, 0);
    assert.strictEqual(
      iguales.entregables[0].titulo,
      "Contacto en frío — Semana 1"
    );

    const aMedida = sugerirEntregables({
      diaInicio: "2026-03-09",
      diaLimite: "2026-04-12",
      total: 200,
      modo: "semanas",
      tituloBase: "X",
      montos: [30, 50, 60, 60, 10],
    });
    assert.strictEqual(aMedida.diferencia, -10, "se pasó por 10");
  });

  test("expandirReparto hereda fechas/total/unidad del padre y reparte parejo", () => {
    const exp = expandirReparto(
      {
        descripcion: "Contactar",
        tipo: "mantenimiento",
        diasSemana: [1, 2, 3, 4, 5],
      },
      {
        diaInicio: "2026-03-09",
        diaLimite: "2026-03-15",
        total: 40,
        unidad: "contactos",
      }
    );
    assert.strictEqual(exp.porDia.length, 5);
    assert.ok(exp.porDia.every((d) => d.cantidad === 8));
    assert.strictEqual(exp.unidad, "contactos");
    assert.deepStrictEqual(repartirEnListaDeDias(0, ["2026-03-09"]), []);
  });
});

describe("Asistente de dos pasos: use-case e import con IA", () => {
  beforeEach(async () => {
    await db.area_personal.clear();
    await db.objetivo_cuantificable.clear();
    await db.proyecto_personal.clear();
    await db.entregable.clear();
    await db.actividad.clear();
    await db.fase_personal.clear();
    await db.personal_historial.clear();
  });

  async function proyectoBase() {
    const objetivo = await objetivos.crearObjetivo({
      titulo: "200 contactos",
      unidad: "contactos",
      cantidadObjetivo: 200,
      diaInicio: "2026-03-09",
      diaLimite: "2026-04-12",
    });
    const proyecto = await proyectos.crearProyecto({
      objetivoId: objetivo.valor,
      titulo: "Contacto en frío",
      diaInicio: "2026-03-09",
      diaLimite: "2026-04-12",
      cantidadObjetivo: 200,
      unidad: "contactos",
    });
    return { proyectoId: proyecto.valor!, objetivoId: objetivo.valor! };
  }

  test("Proyecto → 5 entregables semanales de 40 → 40 actividades de 8, de lunes a viernes", async () => {
    const { proyectoId } = await proyectoBase();
    const { entregables: partes } = sugerirEntregables({
      diaInicio: "2026-03-09",
      diaLimite: "2026-04-12",
      total: 200,
      modo: "semanas",
      tituloBase: "Contacto en frío",
    });
    const res = await distribuir.crearEntregablesDesdeProyecto({
      proyectoId,
      partes,
      unidad: "contactos",
      reparto: {
        descripcion: "Contactar en frío",
        tipo: "mantenimiento",
        diasSemana: [1, 2, 3, 4, 5],
      },
    });
    assert.strictEqual(res.ok, true, res.ok ? "" : res.error!.mensaje);

    const es = await db.entregable
      .where("proyectoId")
      .equals(proyectoId)
      .toArray();
    assert.strictEqual(es.length, 5);
    const acts = await db.actividad.toArray();
    assert.strictEqual(acts.length, 25, "5 semanas × 5 días hábiles");
    assert.ok(
      acts.every((a) => a.cantidadObjetivo === 8 && a.unidad === "contactos")
    );
    assert.strictEqual(
      acts.reduce((s, a) => s + (a.cantidadObjetivo ?? 0), 0),
      200,
      "no se pierde ni se inventa ninguna unidad"
    );
  });

  test("repartirEnDias sobre un entregable existente crea las actividades, y rechaza rangos sin días válidos", async () => {
    const { proyectoId, objetivoId } = await proyectoBase();
    const e = await entregables.crearEntregable({
      proyectoId,
      objetivoId,
      titulo: "Semana suelta",
      diaInicio: "2026-03-09",
      diaLimite: "2026-03-15",
      cantidadObjetivo: 12,
      unidad: "contactos",
    });
    const res = await distribuir.repartirEnDias({
      entregableId: e.valor!,
      descripcion: "Contactar",
      tipo: "mantenimiento",
      unidad: "contactos",
      diaInicio: "2026-03-09",
      diaLimite: "2026-03-15",
      diasSemana: [1, 3, 5],
      total: 12,
    });
    assert.strictEqual(res.ok, true);
    const acts = await db.actividad
      .where("entregableId")
      .equals(e.valor!)
      .toArray();
    assert.deepStrictEqual(
      acts.map((a) => a.cantidadObjetivo).sort(),
      [4, 4, 4]
    );

    const sinDias = await distribuir.repartirEnDias({
      entregableId: e.valor!,
      descripcion: "Contactar",
      tipo: "mantenimiento",
      diaInicio: "2026-03-14", // sábado
      diaLimite: "2026-03-15", // domingo
      diasSemana: [1, 2, 3, 4, 5],
      total: 5,
    });
    assert.strictEqual(sinDias.ok, false);
  });

  test("la IA puede mandar un 'reparto' compacto dentro del entregable y el import lo expande", async () => {
    await proyectoBase();
    const res = await importar.importarEntregable([
      {
        proyectoTitulo: "Contacto en frío",
        entregablesNuevos: [
          {
            titulo: "Semana 1",
            diaInicio: "2026-03-09",
            diaLimite: "2026-03-15",
            cantidadObjetivo: 40,
            unidad: "contactos",
            reparto: {
              descripcion: "Contactar en frío",
              tipo: "mantenimiento",
              diasSemana: [1, 2, 3, 4, 5],
            },
          },
        ],
      },
    ]);
    assert.strictEqual(res.ok, true, res.ok ? "" : res.error!.mensaje);
    const acts = await db.actividad.toArray();
    assert.strictEqual(acts.length, 5);
    assert.ok(acts.every((a) => a.cantidadObjetivo === 8));
  });

  test("un reparto dentro de una Fase usa el rango y la meta de ESA fase (cuota progresiva)", async () => {
    await proyectoBase();
    const res = await importar.importarEntregable([
      {
        proyectoTitulo: "Contacto en frío",
        entregablesNuevos: [
          {
            titulo: "Contacto progresivo",
            diaInicio: "2026-03-09",
            diaLimite: "2026-03-22",
            cantidadObjetivo: 75,
            unidad: "contactos",
            fases: [
              {
                titulo: "Semana 1",
                orden: 0,
                diaInicio: "2026-03-09",
                diaLimite: "2026-03-15",
                cantidadObjetivo: 25,
                unidad: "contactos",
                reparto: {
                  descripcion: "Contactar",
                  tipo: "mantenimiento",
                  diasSemana: [1, 2, 3, 4, 5],
                },
              },
              {
                titulo: "Semana 2",
                orden: 1,
                diaInicio: "2026-03-16",
                diaLimite: "2026-03-22",
                cantidadObjetivo: 50,
                unidad: "contactos",
                reparto: {
                  descripcion: "Contactar",
                  tipo: "mantenimiento",
                  diasSemana: [1, 2, 3, 4, 5],
                },
              },
            ],
          },
        ],
      },
    ]);
    assert.strictEqual(res.ok, true, res.ok ? "" : res.error!.mensaje);
    const semana1 = await db.actividad
      .where("diaTarea")
      .between("2026-03-09", "2026-03-15", true, true)
      .toArray();
    const semana2 = await db.actividad
      .where("diaTarea")
      .between("2026-03-16", "2026-03-22", true, true)
      .toArray();
    assert.deepStrictEqual(
      semana1.map((a) => a.cantidadObjetivo),
      [5, 5, 5, 5, 5]
    );
    assert.deepStrictEqual(
      semana2.map((a) => a.cantidadObjetivo),
      [10, 10, 10, 10, 10]
    );
    // Cada Fase suma lo suyo
    const fases = await db.fase_personal.toArray();
    assert.strictEqual(fases.length, 2);
  });

  test("actividades bajo un entregable existente: 'repartos' hereda fechas, total y unidad del entregable", async () => {
    const { proyectoId, objetivoId } = await proyectoBase();
    await entregables.crearEntregable({
      proyectoId,
      objetivoId,
      titulo: "Semana X",
      diaInicio: "2026-03-09",
      diaLimite: "2026-03-13",
      cantidadObjetivo: 10,
      unidad: "contactos",
    });
    const res = await importar.importarActividades([
      {
        entregableTitulo: "Semana X",
        repartos: [{ descripcion: "Contactar", diasSemana: [1, 2, 3, 4, 5] }],
      },
    ]);
    assert.strictEqual(res.ok, true, res.ok ? "" : res.error!.mensaje);
    const acts = await db.actividad.toArray();
    assert.strictEqual(acts.length, 5);
    assert.ok(
      acts.every((a) => a.cantidadObjetivo === 2 && a.unidad === "contactos")
    );

    const vacio = await importar.importarActividades([
      { entregableTitulo: "Semana X" },
    ]);
    assert.strictEqual(
      vacio.ok,
      false,
      "sin actividades ni repartos no hay nada que crear"
    );
  });

  test("importar dos veces el mismo JSON no duplica nada (idempotente)", async () => {
    await proyectoBase();
    const json = [
      {
        proyectoTitulo: "Contacto en frío",
        entregablesNuevos: [
          {
            titulo: "Semana 1",
            diaInicio: "2026-03-09",
            diaLimite: "2026-03-15",
            cantidadObjetivo: 40,
            unidad: "contactos",
            reparto: {
              descripcion: "Contactar en frío",
              tipo: "mantenimiento",
              diasSemana: [1, 2, 3, 4, 5],
            },
            actividades: [
              {
                tipo: "enfoque",
                descripcion: "Preparar guion",
                diaTarea: "2026-03-09",
              },
            ],
            fases: [
              {
                titulo: "Tramo A",
                orden: 0,
                diaInicio: "2026-03-09",
                diaLimite: "2026-03-15",
                cantidadObjetivo: 40,
                unidad: "contactos",
              },
            ],
          },
        ],
      },
    ];
    const primera = await importar.importarEntregable(json);
    assert.strictEqual(primera.ok, true);
    const estado1 = {
      e: await db.entregable.count(),
      a: await db.actividad.count(),
      f: await db.fase_personal.count(),
    };
    assert.deepStrictEqual(estado1, { e: 1, a: 6, f: 1 });

    const segunda = await importar.importarEntregable(json);
    assert.strictEqual(
      segunda.ok,
      true,
      "no es un error, solo no hay nada nuevo"
    );
    assert.match(segunda.valor!, /Nada nuevo/);
    assert.match(segunda.valor!, /ya existían/);
    assert.deepStrictEqual(
      {
        e: await db.entregable.count(),
        a: await db.actividad.count(),
        f: await db.fase_personal.count(),
      },
      estado1,
      "la segunda vez no crea nada"
    );
  });

  test("re-importar un árbol con un entregable NUEVO agrega solo ese y reusa lo demás", async () => {
    const base = (extra: object[]) => [
      {
        areaTitulo: "Freelancer",
        objetivosNuevos: [
          {
            titulo: "200 contactos",
            unidad: "contactos",
            cantidadObjetivo: 200,
            diaLimite: "2027-04-12",
            proyectos: [
              {
                titulo: "Contacto en frío",
                diaLimite: "2027-04-12",
                entregables: [
                  { titulo: "Semana 1", diaLimite: "2027-03-15" },
                  ...extra,
                ],
              },
            ],
          },
        ],
      },
    ];
    const r1 = await importar.importarArbol(base([]));
    assert.strictEqual(r1.ok, true);
    const r2 = await importar.importarArbol(
      base([{ titulo: "Semana 2", diaLimite: "2027-03-22" }])
    );
    assert.strictEqual(r2.ok, true);

    assert.strictEqual(await db.area_personal.count(), 1);
    assert.strictEqual(await db.objetivo_cuantificable.count(), 1);
    assert.strictEqual(await db.proyecto_personal.count(), 1);
    const titulos = (await db.entregable.toArray()).map((e) => e.titulo).sort();
    assert.deepStrictEqual(titulos, ["Semana 1", "Semana 2"]);
  });

  test("el asistente manual también es idempotente: repetir el reparto omite los días que ya existen", async () => {
    const { proyectoId } = await proyectoBase();
    const { entregables: partes } = sugerirEntregables({
      diaInicio: "2026-03-09",
      diaLimite: "2026-03-22",
      total: 100,
      modo: "semanas",
      tituloBase: "Contacto en frío",
    });
    const entrada = {
      proyectoId,
      partes,
      unidad: "contactos",
      reparto: {
        descripcion: "Contactar",
        tipo: "mantenimiento" as const,
        diasSemana: [1, 2, 3, 4, 5],
      },
    };
    await distribuir.crearEntregablesDesdeProyecto(entrada);
    assert.strictEqual(await db.actividad.count(), 10);
    const otra = await distribuir.crearEntregablesDesdeProyecto(entrada);
    assert.strictEqual(otra.ok, true);
    assert.strictEqual(
      await db.entregable.count(),
      2,
      "no duplica entregables"
    );
    assert.strictEqual(await db.actividad.count(), 10, "ni actividades");
  });
});
