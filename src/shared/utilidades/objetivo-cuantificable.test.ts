import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarObjetivosUseCase } from "../../application/use-cases/personal/gestionar-objetivos.use-case";
import { calcularRitmoObjetivo } from "../../domain/entidades/objetivo-cuantificable.entity";

const useCase = new GestionarObjetivosUseCase();

describe("Objetivo Cuantificable: cálculo de ritmo (función pura)", () => {
  const base = {
    cantidadObjetivo: 100,
    diaInicio: "2026-01-01",
    diaLimite: "2026-01-11", // 10 días totales
  };

  test("al día: el progreso coincide exactamente con lo esperado a mitad de camino", () => {
    const ritmo = calcularRitmoObjetivo(
      { ...base, progresoActual: 50 },
      "2026-01-06" // 5 días transcurridos de 10 → esperado 50%
    );
    assert.strictEqual(ritmo.estado, "al_dia");
    assert.strictEqual(ritmo.restante, 50);
    assert.strictEqual(ritmo.diasRestantes, 5);
    assert.strictEqual(ritmo.porDiaNecesario, 10);
  });

  test("atrasado: el progreso quedó por debajo de lo esperado", () => {
    const ritmo = calcularRitmoObjetivo(
      { ...base, progresoActual: 30 },
      "2026-01-06"
    );
    assert.strictEqual(ritmo.estado, "atrasado");
    assert.strictEqual(ritmo.restante, 70);
    assert.strictEqual(ritmo.porDiaNecesario, 14); // 70 / 5 días restantes
  });

  test("adelantado: el progreso superó lo esperado a esta altura", () => {
    const ritmo = calcularRitmoObjetivo(
      { ...base, progresoActual: 70 },
      "2026-01-06"
    );
    assert.strictEqual(ritmo.estado, "adelantado");
    assert.strictEqual(ritmo.restante, 30);
    assert.strictEqual(ritmo.porDiaNecesario, 6);
  });

  test("cumplido: el progreso ya alcanzó o superó la cantidad objetivo", () => {
    const ritmo = calcularRitmoObjetivo(
      { ...base, progresoActual: 100 },
      "2026-01-06"
    );
    assert.strictEqual(ritmo.estado, "cumplido");
    assert.strictEqual(ritmo.restante, 0);
    assert.strictEqual(ritmo.porDiaNecesario, 0);
  });

  test("vencido: pasó la fecha límite sin llegar a la cantidad objetivo", () => {
    const ritmo = calcularRitmoObjetivo(
      { ...base, progresoActual: 40 },
      "2026-01-15" // después del diaLimite
    );
    assert.strictEqual(ritmo.estado, "vencido");
    assert.strictEqual(ritmo.diasRestantes, 0);
    assert.strictEqual(ritmo.restante, 60);
  });

  test("proyección al ritmo actual: extrapola el promedio real hacia el total del período", () => {
    // 20 hechos en 5 de 10 días → ritmo real 4/día → proyección 40 al cierre.
    const ritmo = calcularRitmoObjetivo(
      { ...base, progresoActual: 20 },
      "2026-01-06"
    );
    assert.strictEqual(ritmo.proyeccionAlRitmoActual, 40);
  });
});

describe("Objetivo Cuantificable: use-case", () => {
  beforeEach(async () => {
    await db.objetivo_cuantificable.clear();
  });

  test("Crear, registrar avance, y auto-marcar cumplido al llegar a la meta", async () => {
    const creado = await useCase.crearObjetivo({
      titulo: "Contactos en frío",
      unidad: "contactos",
      cantidadObjetivo: 10,
      diaInicio: "2026-01-01",
      diaLimite: "2026-01-11",
      area: "profesional",
    });
    assert.strictEqual(creado.ok, true);

    const avance1 = await useCase.registrarAvance(creado.valor, 6);
    assert.strictEqual(avance1.ok, true);
    let row = await db.objetivo_cuantificable.get(creado.valor);
    assert.strictEqual(row?.progresoActual, 6);
    assert.strictEqual(row?.estado, "activo");

    const avance2 = await useCase.registrarAvance(creado.valor, 5);
    assert.strictEqual(avance2.ok, true);
    row = await db.objetivo_cuantificable.get(creado.valor);
    assert.strictEqual(row?.progresoActual, 11);
    assert.strictEqual(row?.estado, "cumplido");
  });

  test("Ajustar objetivo (cantidad y/o fecha) reactiva uno vencido", async () => {
    const creado = await useCase.crearObjetivo({
      titulo: "Ingresos del mes",
      unidad: "pesos",
      cantidadObjetivo: 1000,
      diaInicio: "2026-01-01",
      diaLimite: "2026-01-11",
      area: "profesional",
    });
    await db.objetivo_cuantificable.update(creado.valor, { estado: "vencido" });

    const ajuste = await useCase.ajustarObjetivo({
      id: creado.valor,
      cantidadObjetivo: 800,
      diaLimite: "2026-02-01",
    });
    assert.strictEqual(ajuste.ok, true);

    const row = await db.objetivo_cuantificable.get(creado.valor);
    assert.strictEqual(row?.cantidadObjetivo, 800);
    assert.strictEqual(row?.diaLimite, "2026-02-01");
    assert.strictEqual(row?.estado, "activo");
  });

  test("marcarVencidosSiCorresponde solo toca activos cuya fecha límite ya pasó", async () => {
    const vencido = await useCase.crearObjetivo({
      titulo: "Objetivo viejo",
      unidad: "unidades",
      cantidadObjetivo: 10,
      diaInicio: "2026-01-01",
      diaLimite: "2026-01-05",
      area: "personal",
    });
    const vigente = await useCase.crearObjetivo({
      titulo: "Objetivo vigente",
      unidad: "unidades",
      cantidadObjetivo: 10,
      diaInicio: "2026-01-01",
      diaLimite: "2026-02-01",
      area: "personal",
    });

    await useCase.marcarVencidosSiCorresponde("2026-01-10");

    const rowVencido = await db.objetivo_cuantificable.get(vencido.valor);
    const rowVigente = await db.objetivo_cuantificable.get(vigente.valor);
    assert.strictEqual(rowVencido?.estado, "vencido");
    assert.strictEqual(rowVigente?.estado, "activo");
  });
});
