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

    await db.clientes.put({
      id: "1",
      nombreComercial: "Cli 1",
      tipoAgencia: "A",
      estado: "activo",
    });
    await db.clientes.put({
      id: "2",
      nombreComercial: "Cli 2",
      tipoAgencia: "B",
      estado: "activo",
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
