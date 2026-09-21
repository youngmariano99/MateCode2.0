import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarActividadesUseCase } from "../../application/use-cases/personal/gestionar-actividades.use-case";
import { calcularEstadisticas } from "../../application/servicios/estadisticas-personal.service";
import {
  contarMotivos,
  diasDelPeriodo,
  generarLecturas,
  moverPeriodo,
  periodoDe,
  recurrentesSinRegistro,
  resultadoDeActividad,
  resumirActividades,
  resumirHabitos,
  serieDelPeriodo,
} from "../../domain/entidades/estadisticas-personal.entity";
import type { Actividad } from "../../domain/entidades/actividad.entity";

const HOY = "2026-09-23"; // miércoles
const act = (o: Partial<Actividad>): Actividad =>
  ({
    id: `a_${Math.random()}`,
    tipo: "mantenimiento",
    descripcion: "x",
    diaTarea: "2026-09-22",
    estado: "pendiente",
    creadoEn: 1,
    actualizadoEn: 1,
    ...o,
  }) as Actividad;

describe("Estadísticas: períodos", () => {
  test("semana, mes y año contienen el día y se pueden navegar", () => {
    const s = periodoDe("semana", HOY);
    assert.deepStrictEqual([s.desde, s.hasta], ["2026-09-21", "2026-09-27"]);
    assert.strictEqual(diasDelPeriodo(s).length, 7);
    const m = periodoDe("mes", "2028-02-10"); // bisiesto
    assert.deepStrictEqual([m.desde, m.hasta], ["2028-02-01", "2028-02-29"]);
    assert.strictEqual(
      moverPeriodo(periodoDe("mes", "2026-01-15"), -1).desde,
      "2025-12-01"
    );
    assert.strictEqual(moverPeriodo(s, -1).desde, "2026-09-14");
    const a = periodoDe("anio", HOY);
    assert.deepStrictEqual(
      [a.desde, a.hasta, a.etiqueta],
      ["2026-01-01", "2026-12-31", "2026"]
    );
    assert.strictEqual(moverPeriodo(a, 1).desde, "2027-01-01");
  });
});

describe("Estadísticas: cada actividad cae en un solo resultado", () => {
  test("todos los estados y casos", () => {
    const r = (a: Partial<Actividad>) => resultadoDeActividad(act(a), HOY);
    assert.strictEqual(r({ estado: "completada" }), "hecha");
    assert.strictEqual(
      r({ estado: "completada", cantidadObjetivo: 4, progresoActual: 4 }),
      "hecha"
    );
    assert.strictEqual(
      r({ estado: "completada", cantidadObjetivo: 4 }),
      "hecha"
    ); // sin registro incremental = meta entera
    assert.strictEqual(
      r({
        estado: "completada",
        cantidadObjetivo: 4,
        progresoActual: 2,
        cantidadMinima: 2,
      }),
      "al_minimo"
    );
    assert.strictEqual(
      r({
        estado: "completada",
        cantidadObjetivo: 4,
        progresoActual: 1,
        cantidadMinima: 2,
      }),
      "parcial"
    );
    assert.strictEqual(
      r({ estado: "completada", cantidadObjetivo: 4, progresoActual: 3 }),
      "parcial"
    ); // sin mínimo definido
    assert.strictEqual(
      r({ estado: "pendiente", diaTarea: "2026-09-22" }),
      "vencida"
    );
    assert.strictEqual(r({ estado: "pendiente", diaTarea: HOY }), "abierta");
    assert.strictEqual(
      r({ estado: "pendiente", diaTarea: "2026-09-25" }),
      "abierta"
    );
    assert.strictEqual(r({ estado: "migrada" }), "migrada");
    assert.strictEqual(r({ estado: "cancelada" }), "cancelada");
    assert.strictEqual(r({ estado: "descartada" }), "descartada");
  });

  test("el resumen suma todo, no penaliza abiertas ni descartadas y sí las vencidas", () => {
    const lista = [
      act({ estado: "completada" }),
      act({
        estado: "completada",
        cantidadObjetivo: 4,
        progresoActual: 2,
        cantidadMinima: 2,
      }),
      act({
        estado: "completada",
        cantidadObjetivo: 4,
        progresoActual: 1,
        cantidadMinima: 2,
      }),
      act({ estado: "pendiente", diaTarea: "2026-09-21" }), // vencida
      act({ estado: "migrada" }),
      act({ estado: "cancelada" }),
      act({ estado: "descartada" }),
      act({ estado: "pendiente", diaTarea: "2026-09-26" }), // abierta
    ];
    const s = resumirActividades(lista, HOY);
    assert.strictEqual(s.juzgables, 6);
    assert.strictEqual(
      s.hechas +
        s.alMinimo +
        s.parciales +
        s.vencidas +
        s.migradas +
        s.canceladas +
        s.descartadas +
        s.abiertas,
      lista.length
    );
    assert.strictEqual(s.cumplimiento, 33); // 2 de 6
    assert.strictEqual(s.cumplimientoPleno, 17); // 1 de 6
    assert.strictEqual(resumirActividades([], HOY).cumplimiento, 0);
  });

  test("la serie por día y por mes cubre todo el período", () => {
    const sem = periodoDe("semana", HOY);
    const serie = serieDelPeriodo(
      sem,
      [
        act({ estado: "completada", diaTarea: "2026-09-22" }),
        act({ estado: "cancelada", diaTarea: "2026-09-22" }),
      ],
      HOY
    );
    assert.strictEqual(serie.length, 7);
    assert.deepStrictEqual([serie[1].juzgables, serie[1].cumplidas], [2, 1]);
    const anio = serieDelPeriodo(
      periodoDe("anio", HOY),
      [act({ estado: "completada", diaTarea: "2026-03-05" })],
      HOY
    );
    assert.strictEqual(anio.length, 12);
    assert.strictEqual(anio[2].cumplidas, 1);
  });

  test("los motivos cuentan canceladas y migradas, y lo omitido queda como 'sin motivo'", () => {
    const a1 = act({ id: "1", estado: "cancelada" });
    const a2 = act({ id: "2", estado: "migrada" });
    const a3 = act({ id: "3", estado: "cancelada" });
    const a4 = act({ id: "4", estado: "completada" });
    const m = contarMotivos(
      [a1, a2, a3, a4],
      new Map([
        ["1", "sin_tiempo"],
        ["2", "sin_tiempo"],
      ])
    );
    assert.deepStrictEqual(
      m.map((x) => [x.motivo, x.cantidad]),
      [
        ["sin_tiempo", 2],
        ["sin_motivo", 1],
      ]
    );
  });
});

describe("Estadísticas: lo que tocaba y no tiene registro", () => {
  const entregable = {
    id: "e1",
    titulo: "Desarrollo",
    estado: "activo",
    diaInicio: "2026-09-14",
    diaLimite: "2027-02-28",
    recurrencia: {
      frecuencia: "dias_especificos",
      diasSemana: [1, 2, 3, 4, 5],
    },
  } as never;

  test("recurrentes sin actividad materializada se avisan, sin contar hoy", () => {
    const sem = periodoDe("semana", HOY); // lun 21 - dom 27
    const existente = act({ id: "e1_2026-09-21", diaTarea: "2026-09-21" });
    const r = recurrentesSinRegistro([entregable], [existente], sem, HOY);
    // Lunes tiene registro; falta el martes. Miércoles es hoy: todavía se puede cumplir.
    assert.deepStrictEqual(
      r.map((x) => x.dia),
      ["2026-09-22"]
    );
  });

  test("hábitos: cuenta niveles, no cumplido y días sin registro solo desde que existen", () => {
    const h = {
      id: "h1",
      nombre: "Caminar",
      activo: true,
      frecuencia: "diaria",
      creadoEn: new Date("2026-09-22T12:00:00Z").getTime(),
    } as never;
    const reg = (dia: string, nivel: string, motivo?: string) =>
      ({
        id: dia,
        habitoId: "h1",
        diaTarea: dia,
        nivelEjecutado: nivel,
        motivoIncumplimiento: motivo,
        creadoEn: 1,
      }) as never;
    const r = resumirHabitos(
      [h],
      [
        reg("2026-09-22", "MAX"),
        reg("2026-09-23", "NO_CUMPLIDO", "sin_tiempo"),
      ],
      periodoDe("semana", HOY),
      HOY
    );
    assert.strictEqual(r[0].tocaba, 2); // 22 y 23 (antes de crearse no cuenta, después de hoy tampoco)
    assert.strictEqual(r[0].max, 1);
    assert.strictEqual(r[0].noCumplido, 1);
    assert.strictEqual(r[0].cumplimiento, 50);
    assert.strictEqual(r[0].motivoTop, "sin_tiempo");
  });
});

describe("Estadísticas: lecturas", () => {
  test("señalan sin cerrar, motivo repetido y períodos incompletos", () => {
    const actual = resumirActividades(
      [
        act({ estado: "completada" }),
        act({ estado: "pendiente", diaTarea: "2026-09-21" }),
      ],
      HOY
    );
    const l = generarLecturas({
      actual,
      anterior: resumirActividades([act({ estado: "completada" })], HOY),
      motivos: [{ motivo: "sin_tiempo", etiqueta: "Sin tiempo", cantidad: 3 }],
      porArea: [],
      porDiaSemana: [],
      sinRegistro: 2,
      habitos: [],
      riesgosMinimos: 1,
    }).join(" | ");
    assert.match(l, /sin cerrar/i);
    assert.match(l, /sin tiempo/);
    assert.match(l, /Faltan 2 registro/);
    assert.match(l, /1 mínimo/);
    assert.match(l, /bajaste 50 puntos/);
  });
});

describe("Estadísticas: sobre datos reales (nada se pierde)", () => {
  beforeEach(async () => {
    for (const t of [
      db.actividad,
      db.entregable,
      db.personal_historial,
      db.habito_registro,
      db.habito_definicion,
      db.sesion_trabajo,
      db.objetivo_cuantificable,
      db.area_personal,
      db.proyectos,
    ])
      await t.clear();
  });

  test("cancelar y pasar a mañana con motivo, dejar sin cerrar y completar parcial: todo queda contado", async () => {
    const uc = new GestionarActividadesUseCase();
    const crear = async (d: string, extra: object = {}) =>
      (
        await uc.crearActividad({
          tipo: "mantenimiento",
          descripcion: d,
          diaTarea: "2026-09-22",
          ...extra,
        })
      ).valor!;
    const hecha = await crear("hecha");
    const cancelada = await crear("cancelada");
    const migrada = await crear("migrada");
    await crear("sin cerrar");
    const parcial = await crear("parcial", { cantidadObjetivo: 4 });

    await uc.completarActividad(hecha);
    await uc.cancelarActividad(cancelada, "sin_tiempo");
    await uc.migrarActividad({
      id: migrada,
      nuevoDiaTarea: "2026-09-23",
      motivo: "sin_energia",
    });
    await uc.cerrarConCantidad({ id: parcial, hecha: 2, destino: "fondo" });

    const e = await calcularEstadisticas(periodoDe("semana", HOY), HOY);
    const r = e.resumen;
    const todas = (await db.actividad.toArray()).filter(
      (a) => a.tipo !== "backlog"
    );
    const contadas =
      r.hechas +
      r.alMinimo +
      r.parciales +
      r.vencidas +
      r.migradas +
      r.canceladas +
      r.descartadas +
      r.abiertas;
    assert.strictEqual(
      contadas,
      todas.length,
      "cada actividad cuenta exactamente una vez"
    );
    assert.strictEqual(r.hechas, 1);
    assert.strictEqual(r.canceladas, 1);
    assert.strictEqual(r.migradas, 1);
    assert.strictEqual(r.vencidas, 1);
    assert.strictEqual(r.parciales, 1);
    assert.strictEqual(r.abiertas, 1); // la que se pasó a hoy (miércoles)
    assert.deepStrictEqual(
      e.motivos.map((m) => [m.motivo, m.cantidad]).sort(),
      [
        ["sin_energia", 1],
        ["sin_tiempo", 1],
      ]
    );
    assert.strictEqual(e.fondo.faltantesPendientes, 1); // lo que faltó del parcial quedó en el fondo
    assert.ok(e.lecturas.length > 0);
    // El período anterior está vacío pero no rompe.
    assert.strictEqual(e.anterior.juzgables, 0);
  });

  test("tiempo por área y proyecto, y meta vs mínimo", async () => {
    await db.area_personal.add({ id: "ar1", nombre: "Agencia" } as never);
    await db.objetivo_cuantificable.add({ id: "o1", areaId: "ar1" } as never);
    await db.proyectos.add({ id: "pro1", nombre: "Sistema X" } as never);
    await db.actividad.bulkAdd([
      act({
        id: "x1",
        objetivoId: "o1",
        estado: "completada",
        cantidadObjetivo: 4,
        progresoActual: 2,
        cantidadMinima: 2,
        proyectoTrabajoId: "pro1",
      }),
      act({
        id: "x2",
        objetivoId: "o1",
        estado: "completada",
        cantidadObjetivo: 4,
        progresoActual: 4,
      }),
    ]);
    await db.sesion_trabajo.bulkAdd([
      {
        id: "s1",
        actividadId: "x1",
        diaTarea: "2026-09-22",
        segundosAcumulados: 600,
        estado: "finalizada",
      },
      {
        id: "s2",
        diaTarea: "2026-09-22",
        segundosAcumulados: 300,
        estado: "finalizada",
      },
    ] as never[]);
    const e = await calcularEstadisticas(periodoDe("semana", HOY), HOY);
    assert.deepStrictEqual(e.metaVsMinimo, {
      meta: 1,
      minimo: 1,
      corto: 0,
      sinCerrar: 0,
    });
    assert.strictEqual(e.tiempo.totalSegundos, 900);
    assert.deepStrictEqual(
      e.tiempo.porArea.map((a) => [a.area, a.segundos]),
      [
        ["Agencia", 600],
        ["Sin área (sesión suelta)", 300],
      ]
    );
    assert.strictEqual(e.tiempo.porProyecto[0].nombre, "Sistema X");
    assert.strictEqual(e.porArea[0].clave, "Agencia");
  });

  test("datos viejos: el motivo guardado en la copia migrada se recupera para la original", async () => {
    await db.actividad.bulkAdd([
      act({
        id: "orig",
        descripcion: "Estudiar",
        diaTarea: "2026-09-21",
        estado: "migrada",
      }),
      act({
        id: "copia",
        descripcion: "Estudiar",
        diaTarea: "2026-09-22",
        estado: "completada",
        fechaMigradaDesde: "2026-09-21",
      }),
    ]);
    await db.personal_historial.add({
      id: "h1",
      entidadTipo: "actividad",
      entidadId: "copia",
      accion: "crear",
      campoNuevo: { diaTarea: "2026-09-22", motivo: "cambio_prioridad" },
      creadoEn: 5,
    } as never);
    const e = await calcularEstadisticas(periodoDe("semana", HOY), HOY);
    assert.deepStrictEqual(
      e.motivos.map((m) => [m.motivo, m.cantidad]),
      [["cambio_prioridad", 1]]
    );
  });

  test("pasar a otro día una actividad con cantidad (queda parcial) guarda el motivo una sola vez", async () => {
    const uc = new GestionarActividadesUseCase();
    const id = (
      await uc.crearActividad({
        tipo: "mantenimiento",
        descripcion: "Contactos",
        diaTarea: "2026-09-22",
        cantidadObjetivo: 10,
      })
    ).valor!;
    await uc.registrarAvance(id, 4);
    await uc.migrarActividad({
      id,
      nuevoDiaTarea: "2026-09-23",
      motivo: "se_complico",
    });
    const filas = (await db.personal_historial.toArray()).filter(
      (h) =>
        (h.campoNuevo as { motivo?: string } | undefined)?.motivo ===
        "se_complico"
    );
    assert.strictEqual(filas.length, 1);
    assert.strictEqual(filas[0].entidadId, id);
    const e = await calcularEstadisticas(periodoDe("semana", HOY), HOY);
    // La original quedó como parcial (algo se hizo) y no figura como migrada: el faltante sí se sumó a mañana.
    assert.strictEqual(e.resumen.migradas, 0);
    assert.strictEqual(e.resumen.parciales, 1);
  });
});
