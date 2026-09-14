import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarHabitosUseCase } from "../../application/use-cases/personal/gestionar-habitos.use-case";
import {
  requiereMinimoObligatorio,
  idRegistroHabito,
  aplicaHoy,
  type HabitoRegistro,
} from "../../domain/entidades/habitos.entity";

const useCase = new GestionarHabitosUseCase();

describe("El Acordeón: regla 'No Fallar Dos Veces' (función pura)", () => {
  const HOY = "2026-01-10";
  const AYER = "2026-01-09";

  test("no se dispara si el hábito recién se creó hoy (no había 'ayer')", () => {
    const habito = {
      creadoEn: new Date(HOY).getTime(),
      frecuencia: "diaria" as const,
    };
    assert.strictEqual(
      requiereMinimoObligatorio(habito, undefined, AYER),
      false
    );
  });

  test("no se dispara si ayer hubo registro, sea cual sea el nivel", () => {
    const habito = {
      creadoEn: new Date("2026-01-01").getTime(),
      frecuencia: "diaria" as const,
    };
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
    const habito = {
      creadoEn: new Date("2026-01-01").getTime(),
      frecuencia: "diaria" as const,
    };
    assert.strictEqual(
      requiereMinimoObligatorio(habito, undefined, AYER),
      true
    );
  });

  test("no se dispara para un hábito de días específicos si ayer no le tocaba", () => {
    // AYER = 2026-01-09, viernes (getUTCDay()=5). Un hábito de Lun-Sáb
    // (1-6) sí le tocaba; uno de "solo domingos" (0) no.
    const habitoLunSab = {
      creadoEn: new Date("2026-01-01").getTime(),
      frecuencia: "dias_especificos" as const,
      diasSemana: [1, 2, 3, 4, 5, 6],
    };
    const habitoSoloDomingo = {
      creadoEn: new Date("2026-01-01").getTime(),
      frecuencia: "dias_especificos" as const,
      diasSemana: [0],
    };
    assert.strictEqual(
      requiereMinimoObligatorio(habitoLunSab, undefined, AYER),
      true
    );
    assert.strictEqual(
      requiereMinimoObligatorio(habitoSoloDomingo, undefined, AYER),
      false
    );
  });
});

describe("aplicaHoy (frecuencia de hábitos/compromisos)", () => {
  test("un hábito diario aplica cualquier día", () => {
    assert.strictEqual(aplicaHoy({ frecuencia: "diaria" }, "2026-01-10"), true);
  });

  test("días específicos solo aplica en los días de semana elegidos", () => {
    // 2026-01-10 es sábado (getUTCDay()=6); 2026-01-11 es domingo (0).
    const habito = {
      frecuencia: "dias_especificos" as const,
      diasSemana: [1, 2, 3, 4, 5, 6],
    };
    assert.strictEqual(aplicaHoy(habito, "2026-01-10"), true);
    assert.strictEqual(aplicaHoy(habito, "2026-01-11"), false);
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

  test("buscarDiasSinRegistrar devuelve los días sin registro de un hábito diario", async () => {
    const creado = await useCase.crearHabito({
      nombre: "Contacto en frío",
      descripcionMin: "1 contacto",
      descripcionMed: "3 contactos",
      descripcionMax: "6 contactos",
      area: "profesional",
      frecuencia: "diaria",
    });
    // Registrado el 2026-01-07; faltan 08, 09, 10, 11, 12 hasta "hoy" 01-12.
    await useCase.registrarNivel({
      habitoId: creado.valor,
      diaTarea: "2026-01-07",
      nivelEjecutado: "MIN",
    });

    const faltantes = await useCase.buscarDiasSinRegistrar(
      creado.valor,
      "2026-01-07",
      "2026-01-12"
    );
    assert.deepStrictEqual(faltantes, [
      "2026-01-08",
      "2026-01-09",
      "2026-01-10",
      "2026-01-11",
      "2026-01-12",
    ]);
  });

  test("buscarDiasSinRegistrar respeta días específicos (no cuenta días que no le tocaban)", async () => {
    const creado = await useCase.crearHabito({
      nombre: "Contacto en frío Lun-Sáb",
      descripcionMin: "1 contacto",
      descripcionMed: "3 contactos",
      descripcionMax: "6 contactos",
      area: "profesional",
      frecuencia: "dias_especificos",
      diasSemana: [1, 2, 3, 4, 5, 6],
    });
    // 2026-01-10 es sábado, 2026-01-11 es domingo, 2026-01-12 es lunes.
    const faltantes = await useCase.buscarDiasSinRegistrar(
      creado.valor,
      "2026-01-09",
      "2026-01-12"
    );
    assert.deepStrictEqual(faltantes, ["2026-01-10", "2026-01-12"]);
  });
});
