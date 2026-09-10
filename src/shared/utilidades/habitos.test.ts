import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarHabitosUseCase } from "../../application/use-cases/personal/gestionar-habitos.use-case";
import {
  requiereMinimoObligatorio,
  idRegistroHabito,
  type HabitoRegistro,
} from "../../domain/entidades/habitos.entity";

const useCase = new GestionarHabitosUseCase();

describe("El Acordeón: regla 'No Fallar Dos Veces' (función pura)", () => {
  const HOY = "2026-01-10";
  const AYER = "2026-01-09";

  test("no se dispara si el hábito recién se creó hoy (no había 'ayer')", () => {
    const habito = { creadoEn: new Date(HOY).getTime() };
    assert.strictEqual(
      requiereMinimoObligatorio(habito, undefined, AYER),
      false
    );
  });

  test("no se dispara si ayer hubo registro, sea cual sea el nivel", () => {
    const habito = { creadoEn: new Date("2026-01-01").getTime() };
    const registroAyer: HabitoRegistro = {
      id: idRegistroHabito("h1", AYER),
      habitoId: "h1",
      diaTarea: AYER,
      nivelEjecutado: "MIN",
      creadoEn: Date.now(),
    };
    assert.strictEqual(
      requiereMinimoObligatorio(habito, registroAyer, AYER),
      false
    );
  });

  test("se dispara si el hábito ya existía ayer y no hubo registro", () => {
    const habito = { creadoEn: new Date("2026-01-01").getTime() };
    assert.strictEqual(
      requiereMinimoObligatorio(habito, undefined, AYER),
      true
    );
  });
});

describe("El Acordeón: use-case", () => {
  beforeEach(async () => {
    await db.habito_definicion.clear();
    await db.habito_registro.clear();
  });

  test("Crear hábito y registrar el nivel de hoy", async () => {
    const creado = await useCase.crearHabito({
      nombre: "Código",
      descripcionMin: "Abrir el editor 5 minutos",
      descripcionMed: "1 hora de código enfocado",
      descripcionMax: "Bloque completo de desarrollo",
      area: "profesional",
    });
    assert.strictEqual(creado.ok, true);

    const registrado = await useCase.registrarNivel({
      habitoId: creado.valor,
      diaTarea: "2026-01-10",
      nivelEjecutado: "MED",
    });
    assert.strictEqual(registrado.ok, true);

    const fila = await db.habito_registro.get(
      idRegistroHabito(creado.valor, "2026-01-10")
    );
    assert.strictEqual(fila?.nivelEjecutado, "MED");
  });

  test("Registrar dos veces el mismo día corrige (upsert), no duplica", async () => {
    const creado = await useCase.crearHabito({
      nombre: "Salud",
      descripcionMin: "Estirar 5 minutos",
      descripcionMed: "Rutina de 20 minutos",
      descripcionMax: "Entrenamiento completo",
      area: "personal",
    });

    await useCase.registrarNivel({
      habitoId: creado.valor,
      diaTarea: "2026-01-10",
      nivelEjecutado: "MIN",
    });
    await useCase.registrarNivel({
      habitoId: creado.valor,
      diaTarea: "2026-01-10",
      nivelEjecutado: "MAX",
    });

    const registrosDelDia = await db.habito_registro
      .where("habitoId")
      .equals(creado.valor)
      .toArray();
    assert.strictEqual(registrosDelDia.length, 1);
    assert.strictEqual(registrosDelDia[0].nivelEjecutado, "MAX");
  });

  test("Desactivar un hábito lo saca de activos pero conserva su historial", async () => {
    const creado = await useCase.crearHabito({
      nombre: "Adquisición",
      descripcionMin: "1 mensaje de contacto",
      descripcionMed: "3 mensajes de contacto",
      descripcionMax: "Jornada completa de prospección",
      area: "profesional",
    });
    await useCase.registrarNivel({
      habitoId: creado.valor,
      diaTarea: "2026-01-10",
      nivelEjecutado: "MIN",
    });

    const desactivado = await useCase.desactivarHabito(creado.valor);
    assert.strictEqual(desactivado.ok, true);

    const habito = await db.habito_definicion.get(creado.valor);
    assert.strictEqual(habito?.activo, false);

    const historial = await db.habito_registro
      .where("habitoId")
      .equals(creado.valor)
      .toArray();
    assert.strictEqual(historial.length, 1);
  });
});
