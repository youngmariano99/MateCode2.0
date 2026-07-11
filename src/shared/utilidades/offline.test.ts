import "fake-indexeddb/auto";
import { test, describe } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { QueueService } from "../../offline/services/queue.service";
import { ConflictService } from "../../offline/services/conflict.service";

describe("Motor Offline y Sincronización Inteligente", () => {
  test("Debería inicializar base de datos local y realizar operaciones CRUD", async () => {
    await db.clientes.clear();

    const testCliente = {
      id: "cli_123",
      nombre: "Cliente Local S.A.",
      correo: "info@local.com",
    };

    // Create
    await db.clientes.put(testCliente);

    // Read
    const obtenido = await db.clientes.get("cli_123");
    assert.deepStrictEqual(obtenido, testCliente);

    // Update
    testCliente.nombre = "Cliente Local Editado";
    await db.clientes.put(testCliente);
    const modificado = await db.clientes.get("cli_123");
    assert.strictEqual(modificado?.nombre, "Cliente Local Editado");

    // Delete
    await db.clientes.delete("cli_123");
    const eliminado = await db.clientes.get("cli_123");
    assert.strictEqual(eliminado, undefined);
  });

  test("Debería encolar y vaciar eventos en la cola de sincronización", async () => {
    await QueueService.vaciar();

    const payload = { nombre: "Juan Perez", rol: "Desarrollador" };
    const idEvento = await QueueService.encolar(
      "clientes",
      "crear",
      "cli_789",
      payload
    );
    assert.ok(idEvento > 0);

    const pendientes = await QueueService.obtenerPendientes();
    assert.strictEqual(pendientes.length, 1);
    assert.strictEqual(pendientes[0].registroId, "cli_789");
    assert.deepStrictEqual(pendientes[0].payload, payload);

    await QueueService.eliminar(idEvento);
    const vacio = await QueueService.obtenerPendientes();
    assert.strictEqual(vacio.length, 0);
  });

  test("Debería resolver conflictos con la estrategia Última Modificación Gana (LWW)", async () => {
    const local = { id: "1", actualizadoEn: 1700000000000, dato: "Local" };
    const server = { id: "1", actualizadoEn: 1700001000000, dato: "Servidor" };

    const resServer = await ConflictService.resolver(
      "clientes",
      "1",
      local,
      server
    );
    assert.strictEqual(resServer.dato, "Servidor");

    const localMasNuevo = {
      id: "1",
      actualizadoEn: 1700002000000,
      dato: "Local Nuevo",
    };
    const resLocal = await ConflictService.resolver(
      "clientes",
      "1",
      localMasNuevo,
      server
    );
    assert.strictEqual(resLocal.dato, "Local Nuevo");
  });
});
