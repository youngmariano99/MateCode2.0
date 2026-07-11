import "fake-indexeddb/auto";
import { test, describe } from "node:test";
import assert from "node:assert";
import { ObtenerDashboardUseCase } from "../../application/use-cases/dashboard/ObtenerDashboardUseCase";
import { db } from "../../offline/dexie/db";

describe("Módulo de Dashboard y Centro de Operaciones", () => {
  test("Debería obtener los datos consolidados del dashboard", async () => {
    await db.clientes.clear();
    await db.contactos.clear();
    await db.contratos.clear();
    await db.pagos.clear();

    // Seed Client 1 (representing follow-up agenda item)
    await db.clientes.put({
      id: "1",
      nombre: "Acme Corp",
      empresa: "Acme Corp",
      estado: "Cliente Activo",
      fechaSeguimiento: "2026-07-15",
      notaSeguimiento: "Reunión de requerimientos",
    });

    // Seed Client 2 (representing pending payment)
    await db.clientes.put({
      id: "2",
      nombre: "Initech",
      empresa: "Initech",
      estado: "Cliente Activo",
    });

    // Seed payment associated with Client 2 (Initech)
    await db.pagos.put({
      id: "1",
      clienteId: "2",
      monto: 150000,
      moneda: "ARS",
      estado: "Pendiente",
      fechaVencimiento: "15/07/2026",
    });

    const useCase = new ObtenerDashboardUseCase();
    const res = await useCase.ejecutar();

    assert.strictEqual(res.ok, true);
    const data = res.valor;

    assert.strictEqual(data.kpis.clientesActivos, 2);

    assert.ok(data.agenda.length > 0);
    assert.strictEqual(data.agenda[0].cliente, "Acme Corp");

    assert.ok(data.proximosPagos.length > 0);
    assert.strictEqual(data.proximosPagos[0].cliente, "Initech");
  });
});
