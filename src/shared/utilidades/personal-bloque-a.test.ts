import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarBandejaEntradaUseCase } from "../../application/use-cases/personal/gestionar-bandeja-entrada.use-case";
import { GestionarBunkerUseCase } from "../../application/use-cases/personal/gestionar-bunker.use-case";
import { GestionarPendientesUseCase } from "../../application/use-cases/personal/gestionar-pendientes.use-case";

const inbox = new GestionarBandejaEntradaUseCase();
const bunker = new GestionarBunkerUseCase();
const pendientes = new GestionarPendientesUseCase();

const HOY = "2026-01-15";
const MANANA = "2026-01-16";

describe("Segundo Cerebro — Bloque A: bandeja de entrada, Búnker y Pendientes", () => {
  beforeEach(async () => {
    await db.inbox_item.clear();
    await db.tarea_diaria.clear();
    await db.tarea_pendiente.clear();
  });

  test("Bandeja de entrada: crear, promover a tarea del Búnker, y descartar", async () => {
    const item = await inbox.crearItem({ texto: "Llamar al contador" });
    assert.strictEqual(item.ok, true);

    const promovida = await inbox.promoverATareaDiaria(
      item.valor,
      HOY,
      "mantenimiento"
    );
    assert.strictEqual(promovida.ok, true);

    const itemActualizado = await db.inbox_item.get(item.valor);
    assert.strictEqual(itemActualizado?.estado, "promovido");
    assert.strictEqual(itemActualizado?.promovidoATipo, "tarea_mantenimiento");

    const tareaCreada = await db.tarea_diaria.get(promovida.valor);
    assert.strictEqual(tareaCreada?.descripcion, "Llamar al contador");
    assert.strictEqual(tareaCreada?.origenInboxId, item.valor);

    const otroItem = await inbox.crearItem({ texto: "Idea sin uso" });
    const descartado = await inbox.descartarItem(otroItem.valor);
    assert.strictEqual(descartado.ok, true);
    const descartadoRow = await db.inbox_item.get(otroItem.valor);
    assert.strictEqual(descartadoRow?.estado, "descartado");
  });

  test("Búnker: respeta el límite de 1 enfoque + 3 mantenimiento por día", async () => {
    const enfoque1 = await bunker.crearTareaDiaria({
      diaTarea: HOY,
      tipo: "enfoque",
      descripcion: "Terminar propuesta cliente X",
    });
    assert.strictEqual(enfoque1.ok, true);

    const enfoque2 = await bunker.crearTareaDiaria({
      diaTarea: HOY,
      tipo: "enfoque",
      descripcion: "Otra tarea de enfoque",
    });
    assert.strictEqual(enfoque2.ok, false);
    assert.match(enfoque2.error!.mensaje, /Menos pero mejor/);

    for (const desc of ["Mant 1", "Mant 2", "Mant 3"]) {
      const r = await bunker.crearTareaDiaria({
        diaTarea: HOY,
        tipo: "mantenimiento",
        descripcion: desc,
      });
      assert.strictEqual(r.ok, true);
    }

    const cuartoMantenimiento = await bunker.crearTareaDiaria({
      diaTarea: HOY,
      tipo: "mantenimiento",
      descripcion: "Mant 4 — no debería entrar",
    });
    assert.strictEqual(cuartoMantenimiento.ok, false);

    // Un día distinto no está afectado por el límite del otro día.
    const enfoqueOtroDia = await bunker.crearTareaDiaria({
      diaTarea: MANANA,
      tipo: "enfoque",
      descripcion: "Enfoque de mañana",
    });
    assert.strictEqual(enfoqueOtroDia.ok, true);
  });

  test("Búnker: completar, cancelar y migración atómica", async () => {
    const tarea = await bunker.crearTareaDiaria({
      diaTarea: HOY,
      tipo: "mantenimiento",
      descripcion: "Revisar factura",
    });
    assert.strictEqual(tarea.ok, true);

    const migrada = await bunker.migrarTarea({
      id: tarea.valor,
      nuevoDiaTarea: MANANA,
    });
    assert.strictEqual(migrada.ok, true);

    const original = await db.tarea_diaria.get(tarea.valor);
    assert.strictEqual(original?.estado, "migrada");

    const copia = await db.tarea_diaria.get(migrada.valor);
    assert.strictEqual(copia?.estado, "pendiente");
    assert.strictEqual(copia?.diaTarea, MANANA);
    assert.strictEqual(copia?.fechaMigradaDesde, HOY);
    assert.strictEqual(copia?.descripcion, "Revisar factura");

    // Cancelar/completar no chocan con el límite (ya no cuentan como activas).
    const otra = await bunker.crearTareaDiaria({
      diaTarea: HOY,
      tipo: "mantenimiento",
      descripcion: "Otra más",
    });
    assert.strictEqual(otra.ok, true);
    const completada = await bunker.completarTarea(otra.valor);
    assert.strictEqual(completada.ok, true);
    const otraRow = await db.tarea_diaria.get(otra.valor);
    assert.strictEqual(otraRow?.estado, "completada");
  });

  test("Pendientes: crear con triage, y promover al Búnker respetando el límite", async () => {
    const p1 = await pendientes.crearPendiente({
      descripcion: "Responder al cliente urgente",
      prioridad: "urgente",
      area: "profesional",
    });
    assert.strictEqual(p1.ok, true);

    // Ocupar el único lugar de enfoque del día.
    await bunker.crearTareaDiaria({
      diaTarea: HOY,
      tipo: "enfoque",
      descripcion: "Ya hay un enfoque hoy",
    });

    const promovidoSinLugar = await pendientes.promoverABunker(
      p1.valor,
      HOY,
      "enfoque"
    );
    assert.strictEqual(promovidoSinLugar.ok, false);
    const p1SigueIgual = await db.tarea_pendiente.get(p1.valor);
    assert.strictEqual(p1SigueIgual?.estado, "pendiente");

    const promovidoOk = await pendientes.promoverABunker(
      p1.valor,
      HOY,
      "mantenimiento"
    );
    assert.strictEqual(promovidoOk.ok, true);
    const p1Promovido = await db.tarea_pendiente.get(p1.valor);
    assert.strictEqual(p1Promovido?.estado, "promovida");

    const tareaNueva = await db.tarea_diaria.get(promovidoOk.valor);
    assert.strictEqual(tareaNueva?.origenPendienteId, p1.valor);
  });
});
