import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import {
  chequearCoherenciaMinimos,
  evaluarMinimo,
  minimoDe,
} from "../../domain/entidades/minimos-personal.entity";
import { expandirReparto } from "../../domain/entidades/distribucion-personal.entity";
import { calcularRiesgosMinimos } from "../../application/servicios/minimos-personal.service";

describe("Mínimos: cálculo puro", () => {
  test("minimoDe redondea para arriba y devuelve undefined sin banda", () => {
    assert.strictEqual(minimoDe(200, 75), 150);
    assert.strictEqual(minimoDe(10, 60), 6);
    assert.strictEqual(minimoDe(2, 50), 1);
    assert.strictEqual(minimoDe(1, 40), 1);
    assert.strictEqual(minimoDe(7, undefined), undefined);
  });

  test("el ejemplo del usuario: mínimos diarios que no alcanzan para el total", () => {
    // 200 total, mínimo 50 (25%)... con 100 solo de mínimos diarios llegaría a 100 < 150.
    const e = evaluarMinimo({
      meta: 200,
      bandaAceptable: 75,
      progreso: 0,
      potencialRestante: 200,
      minimosRestantes: 100,
    });
    assert.strictEqual(e.estado, "en_riesgo");
    assert.strictEqual(e.minimo, 150);
    assert.strictEqual(e.deficit, 50);
  });

  test("estados: logrado, en camino, perdido", () => {
    assert.strictEqual(
      evaluarMinimo({
        meta: 10,
        bandaAceptable: 60,
        progreso: 6,
        potencialRestante: 4,
        minimosRestantes: 0,
      }).estado,
      "logrado"
    );
    assert.strictEqual(
      evaluarMinimo({
        meta: 10,
        bandaAceptable: 60,
        progreso: 2,
        potencialRestante: 8,
        minimosRestantes: 4,
      }).estado,
      "en_camino"
    );
    assert.strictEqual(
      evaluarMinimo({
        meta: 10,
        bandaAceptable: 60,
        progreso: 1,
        potencialRestante: 3,
        minimosRestantes: 2,
      }).estado,
      "perdido"
    );
    assert.strictEqual(
      evaluarMinimo({
        meta: 10,
        progreso: 0,
        potencialRestante: 10,
        minimosRestantes: 5,
      }).estado,
      "sin_minimo"
    );
  });

  test("coherencia: 20 semanas de 10 con mínimo 60% no alcanzan para 75% de 200", () => {
    const hijos = Array.from({ length: 20 }, (_, i) => ({
      titulo: `S${i}`,
      meta: 10,
      bandaAceptable: 60,
    }));
    const aviso = chequearCoherenciaMinimos("Contactos", 200, 75, hijos);
    assert.ok(aviso);
    assert.strictEqual(aviso.minimoPadre, 150);
    assert.strictEqual(aviso.sumaMinimosHijos, 120);
    assert.strictEqual(
      chequearCoherenciaMinimos("Contactos", 200, 60, hijos),
      undefined
    );
  });

  test("expandirReparto calcula el mínimo de cada día (propio o heredado)", () => {
    const propio = expandirReparto(
      {
        descripcion: "x",
        tipo: "mantenimiento",
        diasSemana: [1, 2, 3, 4, 5],
        bandaAceptable: 50,
      },
      { diaInicio: "2027-01-04", diaLimite: "2027-01-08", total: 10 }
    );
    assert.deepStrictEqual(
      propio.porDia.map((d) => [d.cantidad, d.minimo]),
      [
        [2, 1],
        [2, 1],
        [2, 1],
        [2, 1],
        [2, 1],
      ]
    );
    const heredado = expandirReparto(
      { descripcion: "x", tipo: "mantenimiento", diasSemana: [1, 2, 3, 4, 5] },
      {
        diaInicio: "2027-01-04",
        diaLimite: "2027-01-08",
        total: 15,
        bandaAceptable: 60,
      }
    );
    assert.strictEqual(heredado.porDia[0].minimo, 2);
    const sin = expandirReparto(
      { descripcion: "x", tipo: "mantenimiento", diasSemana: [1] },
      { diaInicio: "2027-01-04", diaLimite: "2027-01-08", total: 4 }
    );
    assert.strictEqual(sin.porDia[0].minimo, undefined);
  });
});

describe("Mínimos: riesgos sobre datos reales", () => {
  beforeEach(async () => {
    await db.entregable.clear();
    await db.fase_personal.clear();
    await db.actividad.clear();
  });

  test("una fase cuyos mínimos diarios no llegan a su mínimo queda en riesgo", async () => {
    await db.entregable.add({
      id: "e1",
      titulo: "Contactos",
      estado: "activo",
      cantidadObjetivo: 20,
      progresoActual: 0,
      diaInicio: "2027-01-04",
      diaLimite: "2027-01-08",
      unidad: "contactos",
    } as never);
    // Fase: meta 10, mínimo 70% = 7, pero cada día mínimo 1 de 2 → solo 5.
    await db.fase_personal.add({
      id: "f1",
      entregableId: "e1",
      titulo: "Semana 1",
      estado: "abierta",
      cantidadObjetivo: 10,
      unidad: "contactos",
      progresoActual: 0,
      bandaAceptable: 70,
      diaInicio: "2027-01-04",
      diaLimite: "2027-01-08",
    } as never);
    for (let i = 4; i <= 8; i++) {
      await db.actividad.add({
        id: `a${i}`,
        entregableId: "e1",
        tipo: "mantenimiento",
        descripcion: "c",
        diaTarea: `2027-01-0${i}`,
        estado: "pendiente",
        cantidadObjetivo: 2,
        cantidadMinima: 1,
      } as never);
    }
    const r = await calcularRiesgosMinimos("2027-01-04");
    const fase = r.find((x) => x.tipo === "fase");
    assert.ok(fase);
    assert.strictEqual(fase.evaluacion.estado, "en_riesgo");
    assert.strictEqual(fase.evaluacion.proyeccionAlMinimo, 5);
    assert.strictEqual(fase.evaluacion.minimo, 7);
  });

  test("sin riesgo cuando los mínimos diarios alcanzan", async () => {
    await db.entregable.add({
      id: "e1",
      titulo: "C",
      estado: "activo",
      cantidadObjetivo: 10,
      progresoActual: 0,
      diaInicio: "2027-01-04",
      diaLimite: "2027-01-08",
    } as never);
    await db.fase_personal.add({
      id: "f1",
      entregableId: "e1",
      titulo: "S1",
      estado: "abierta",
      cantidadObjetivo: 10,
      unidad: "u",
      progresoActual: 0,
      bandaAceptable: 50,
      diaInicio: "2027-01-04",
      diaLimite: "2027-01-08",
    } as never);
    for (let i = 4; i <= 8; i++) {
      await db.actividad.add({
        id: `a${i}`,
        entregableId: "e1",
        tipo: "mantenimiento",
        descripcion: "c",
        diaTarea: `2027-01-0${i}`,
        estado: "pendiente",
        cantidadObjetivo: 2,
        cantidadMinima: 1,
      } as never);
    }
    assert.strictEqual((await calcularRiesgosMinimos("2027-01-04")).length, 0);
  });

  test("detecta incoherencia entre el mínimo del entregable y el de sus fases", async () => {
    await db.entregable.add({
      id: "e1",
      titulo: "Total",
      estado: "activo",
      cantidadObjetivo: 200,
      bandaAceptable: 75,
      progresoActual: 0,
      diaInicio: "2027-01-04",
      diaLimite: "2027-06-01",
      unidad: "c",
    } as never);
    for (let i = 0; i < 20; i++) {
      await db.fase_personal.add({
        id: `f${i}`,
        entregableId: "e1",
        titulo: `S${i}`,
        estado: "abierta",
        cantidadObjetivo: 10,
        unidad: "c",
        progresoActual: 0,
        bandaAceptable: 60,
        diaInicio: "2027-03-01",
        diaLimite: "2027-03-07",
      } as never);
    }
    const r = await calcularRiesgosMinimos("2027-01-04");
    assert.ok(
      r.some((x) => x.tipo === "coherencia" && x.evaluacion.deficit === 30)
    );
  });
});
