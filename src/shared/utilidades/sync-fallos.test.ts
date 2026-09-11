import "fake-indexeddb/auto";
import { test, describe } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import {
  QueueService,
  MAX_INTENTOS_SYNC,
} from "../../offline/services/queue.service";
import { SyncService } from "../../offline/services/sync.service";
import { servidorTieneVersionMasNueva } from "./resolucion-conflictos";

describe("Resolución de conflictos (last-write-wins por actualizadoEn)", () => {
  test("el servidor gana si su actualizadoEn es estrictamente mayor", () => {
    assert.strictEqual(servidorTieneVersionMasNueva(2000, 1000), true);
  });

  test("el que llega gana en empate", () => {
    assert.strictEqual(servidorTieneVersionMasNueva(1000, 1000), false);
  });

  test("el que llega gana si es más nuevo que el servidor", () => {
    assert.strictEqual(servidorTieneVersionMasNueva(1000, 2000), false);
  });

  test("sin dato del servidor, nunca se considera más nuevo", () => {
    assert.strictEqual(servidorTieneVersionMasNueva(null, 1000), false);
    assert.strictEqual(servidorTieneVersionMasNueva(undefined, 1000), false);
  });

  test("sin dato entrante, nunca se considera más nuevo", () => {
    assert.strictEqual(servidorTieneVersionMasNueva(1000, null), false);
    assert.strictEqual(servidorTieneVersionMasNueva(1000, undefined), false);
  });

  test("funciona igual con fechas Date que con epoch numérico", () => {
    const server = new Date(2000);
    const entrante = new Date(1000);
    assert.strictEqual(servidorTieneVersionMasNueva(server, entrante), true);
  });
});

describe("SyncService — resiliencia ante fallas de red a mitad de sincronización", () => {
  test("un evento que no puede llegar al servidor no corta la cola: se registra el fallo y se sigue con el resto", async () => {
    await QueueService.vaciar();
    await db.logs_sincronizacion.clear();

    // Sin servidor real escuchando en este entorno de test, cualquier POST
    // a /sync/* falla (red inalcanzable) — exactamente el escenario de
    // "se corta la conexión a mitad de sync" que no tenía cobertura.
    await QueueService.encolar("clientes", "crear", "cli_1", { id: "cli_1" });
    await QueueService.encolar("clientes", "crear", "cli_2", { id: "cli_2" });

    const { exitosos, fallidos } = await SyncService.sincronizar();

    assert.strictEqual(exitosos, 0);
    assert.strictEqual(fallidos, 2);

    // Ambos eventos siguen en la cola (no se perdieron) y cada uno quedó
    // con su propio registro de intento fallido, no se cortó al primero.
    const pendientes = await QueueService.obtenerPendientes();
    assert.strictEqual(pendientes.length, 2);
    for (const evento of pendientes) {
      assert.strictEqual(evento.intentos, 1);
      assert.ok(evento.ultimoError && evento.ultimoError.length > 0);
    }
  });

  test("un evento que agota MAX_INTENTOS_SYNC en este intento queda marcado para revisión manual, y uno que ya lo había agotado antes no vuelve a tocar la red", async () => {
    await QueueService.vaciar();
    await db.logs_sincronizacion.clear();

    // Este evento está a un fallo de agotar los intentos: sincronizar()
    // todavía lo intenta, falla por red inalcanzable, y ESE intento lo hace
    // cruzar el umbral — debe quedar logueado como "conflicto".
    const idPorAgotar = await QueueService.encolar(
      "clientes",
      "crear",
      "cli_3",
      { id: "cli_3" }
    );
    await db.cola_eventos.update(idPorAgotar, {
      intentos: MAX_INTENTOS_SYNC - 1,
    });

    // Este ya había agotado los intentos en una corrida anterior:
    // sincronizar() debe saltearlo sin volver a intentar la red.
    const idYaAgotado = await QueueService.encolar(
      "clientes",
      "crear",
      "cli_4",
      { id: "cli_4" }
    );
    await db.cola_eventos.update(idYaAgotado, {
      intentos: MAX_INTENTOS_SYNC,
    });

    const { fallidos } = await SyncService.sincronizar();
    assert.strictEqual(fallidos, 2);

    const pendientes = await QueueService.obtenerPendientes();
    assert.strictEqual(pendientes.length, 2, "ninguno se descarta de la cola");

    const porAgotar = pendientes.find((e) => e.registroId === "cli_3");
    assert.strictEqual(porAgotar?.intentos, MAX_INTENTOS_SYNC);

    const yaAgotado = pendientes.find((e) => e.registroId === "cli_4");
    assert.strictEqual(
      yaAgotado?.intentos,
      MAX_INTENTOS_SYNC,
      "no se le suma un intento más, sincronizar() ni lo tocó"
    );

    const logs = await db.logs_sincronizacion.toArray();
    assert.ok(
      logs.some((l) => l.tipo === "conflicto"),
      "debe quedar un log de tipo conflicto para revisión manual"
    );
  });
});
