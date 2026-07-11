import "fake-indexeddb/auto";
import { test, describe } from "node:test";
import assert from "node:assert";
import { CrmUseCase } from "../../application/use-cases/crm/CrmUseCase";
import { db } from "../../offline/dexie/db";

describe("Módulo de CRM y Flujo Comercial", () => {
  test("Debería crear, actualizar y eliminar un cliente en IndexedDB", async () => {
    await db.clientes.clear();
    await db.logs_sincronizacion.clear();

    const useCase = new CrmUseCase();

    const testCliente = {
      id: "cli_abc",
      nombre: "Juan Perez",
      correo: "juan@perez.com",
      empresa: "Perez S.A.",
      estado: "Lead",
      responsable: "Mariano",
      etiquetas: ["VIP"],
    };

    const resCrear = await useCase.crearCliente(testCliente);
    assert.strictEqual(resCrear.ok, true);

    const local = await db.clientes.get("cli_abc");
    assert.ok(local);
    assert.strictEqual(local.nombre, "Juan Perez");

    const resAct = await useCase.actualizarCliente("cli_abc", {
      ...local,
      nombre: "Juan Perez Modificado",
    });
    assert.strictEqual(resAct.ok, true);

    const localMod = await db.clientes.get("cli_abc");
    assert.strictEqual(localMod?.nombre, "Juan Perez Modificado");

    const resDel = await useCase.eliminarCliente("cli_abc");
    assert.strictEqual(resDel.ok, true);

    const localDel = await db.clientes.get("cli_abc");
    assert.strictEqual(localDel, undefined);
  });

  test("Debería realizar cambios de estado, propietarios y etiquetas de forma masiva", async () => {
    await db.clientes.clear();

    const useCase = new CrmUseCase();

    await useCase.crearCliente({
      id: "cli_x1",
      nombre: "X1",
      correo: "x1@test.com",
      estado: "Lead",
      responsable: "Mariano",
      etiquetas: ["A"],
    });
    await useCase.crearCliente({
      id: "cli_x2",
      nombre: "X2",
      correo: "x2@test.com",
      estado: "Lead",
      responsable: "Mariano",
      etiquetas: ["A"],
    });

    const resEst = await useCase.cambiarEstadoMasivo(
      ["cli_x1", "cli_x2"],
      "Negociación"
    );
    assert.strictEqual(resEst.ok, true);

    const c1 = await db.clientes.get("cli_x1");
    const c2 = await db.clientes.get("cli_x2");
    assert.strictEqual(c1?.estado, "Negociación");
    assert.strictEqual(c2?.estado, "Negociación");

    const resResp = await useCase.asignarResponsableMasivo(
      ["cli_x1", "cli_x2"],
      "Mateo Gomez"
    );
    assert.strictEqual(resResp.ok, true);

    const c1Resp = await db.clientes.get("cli_x1");
    assert.strictEqual(c1Resp?.responsable, "Mateo Gomez");

    const resTags = await useCase.agregarEtiquetasMasivas(
      ["cli_x1", "cli_x2"],
      ["Urgente", "B"]
    );
    assert.strictEqual(resTags.ok, true);

    const c1Tags = await db.clientes.get("cli_x1");
    assert.deepStrictEqual(c1Tags?.etiquetas, ["A", "Urgente", "B"]);
  });
});
