import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import {
  cuotaSemanalDe,
  metasDelPeriodo,
  recurrentesDelDia,
} from "../../domain/entidades/metas-periodo.entity";
import { GestionarEntregablesUseCase } from "../../application/use-cases/personal/gestionar-entregables.use-case";
import type { Entregable } from "../../domain/entidades/entregable.entity";
import type { FasePersonal } from "../../domain/entidades/fase-personal.entity";

const entregable = (o: Partial<Entregable>): Entregable =>
  ({
    id: "e1",
    proyectoId: "p1",
    objetivoId: "o1",
    titulo: "Videos",
    diaInicio: "2026-09-21",
    diaLimite: "2027-02-28",
    progresoActual: 0,
    estado: "activo",
    tieneHijos: false,
    creadoEn: 1,
    actualizadoEn: 1,
    ...o,
  }) as Entregable;

describe("Metas del período", () => {
  test("cuota semanal: 12 videos en 4 semanas = 3 por semana; una semana o menos no tiene cuota", () => {
    assert.strictEqual(cuotaSemanalDe(12, "2026-09-21", "2026-10-18"), 3);
    assert.strictEqual(
      cuotaSemanalDe(3, "2026-09-21", "2026-09-27"),
      undefined
    );
  });

  test("las fases abiertas que se solapan con la semana aparecen con su mínimo y cuota", () => {
    const fase = {
      id: "f1",
      entregableId: "e1",
      titulo: "Mes 1",
      orden: 0,
      diaInicio: "2026-09-21",
      diaLimite: "2026-10-18",
      cantidadObjetivo: 12,
      unidad: "videos",
      progresoActual: 2,
      bandaAceptable: 60,
      estado: "abierta",
    } as FasePersonal;
    const fueraDeRango = {
      ...fase,
      id: "f2",
      diaInicio: "2026-11-01",
      diaLimite: "2026-11-28",
    };
    const metas = metasDelPeriodo(
      [entregable({ cantidadObjetivo: 48 })],
      [fase, fueraDeRango],
      [],
      "2026-09-21",
      "2026-09-27"
    );
    assert.strictEqual(metas.length, 1);
    assert.strictEqual(metas[0].cuotaSemanal, 3);
    assert.strictEqual(metas[0].minimo, 8);
    assert.strictEqual(metas[0].tieneActividadesDiarias, false);
    // El entregable con fases no se repite como meta propia.
  });

  test("recurrentes: proyecta el día que toca y omite si ya está materializada", () => {
    const rec = entregable({
      recurrencia: { frecuencia: "dias_especificos", diasSemana: [1, 3, 5] },
    });
    // 2026-09-21 es lunes
    assert.strictEqual(recurrentesDelDia([rec], [], "2026-09-21").length, 1);
    assert.strictEqual(recurrentesDelDia([rec], [], "2026-09-22").length, 0);
    assert.strictEqual(
      recurrentesDelDia(
        [rec],
        [{ id: "x", recurrenciaId: "e1", diaTarea: "2026-09-21" } as never],
        "2026-09-21"
      ).length,
      0
    );
    assert.strictEqual(recurrentesDelDia([rec], [], "2027-03-01").length, 0);
  });
});

describe("Anotar avance sin actividades diarias", () => {
  beforeEach(async () => {
    await db.entregable.clear();
    await db.fase_personal.clear();
    await db.actividad.clear();
  });

  test("suma al entregable y a la fase de esa fecha", async () => {
    await db.entregable.add(
      entregable({ cantidadObjetivo: 12, unidad: "videos" })
    );
    await db.fase_personal.add({
      id: "f1",
      entregableId: "e1",
      titulo: "Mes 1",
      orden: 0,
      diaInicio: "2026-09-21",
      diaLimite: "2026-10-18",
      cantidadObjetivo: 12,
      unidad: "videos",
      progresoActual: 0,
      estado: "abierta",
    } as FasePersonal);
    const uc = new GestionarEntregablesUseCase();
    assert.ok((await uc.anotarAvance("e1", 1, "2026-09-22")).ok);
    assert.ok((await uc.anotarAvance("e1", 2, "2026-09-23")).ok);
    assert.strictEqual((await db.entregable.get("e1"))?.progresoActual, 3);
    assert.strictEqual((await db.fase_personal.get("f1"))?.progresoActual, 3);
    assert.strictEqual((await uc.anotarAvance("e1", 0)).ok, false);
  });
});
