import "fake-indexeddb/auto";
import { test, describe } from "node:test";
import assert from "node:assert";
import { CrearDocumentoUseCase } from "../../application/use-cases/documento/crear-documento.use-case";
import { ActualizarDocumentoUseCase } from "../../application/use-cases/documento/actualizar-documento.use-case";
import { db } from "../../offline/dexie/db";

describe("Módulo de Documentos Inteligentes", () => {
  test("Debería crear y actualizar un documento con control de versiones", async () => {
    await db.documentos.clear();
    await db.logs_sincronizacion.clear();

    const crearUC = new CrearDocumentoUseCase();
    const actualizarUC = new ActualizarDocumentoUseCase();

    const testDoc = {
      id: "doc_test_1",
      titulo: "Contrato de Prueba",
      tipo: "Contrato",
      clienteId: "cli_1",
      contenido: "Contenido inicial",
    };

    const resCrear = await crearUC.ejecutar(testDoc);
    assert.strictEqual(resCrear.ok, true);

    const local = await db.documentos.get("doc_test_1");
    assert.ok(local);
    assert.strictEqual(local.titulo, "Contrato de Prueba");
    assert.strictEqual(local.contenido, "Contenido inicial");
    assert.strictEqual((local.versiones as unknown as unknown[]).length, 1);

    const resAct = await actualizarUC.ejecutar(
      "doc_test_1",
      {
        ...local,
        contenido: "Contenido modificado",
      },
      "Cambio de cláusula principal"
    );
    assert.strictEqual(resAct.ok, true);

    const localMod = await db.documentos.get("doc_test_1");
    assert.strictEqual(localMod?.contenido, "Contenido modificado");
    const versiones = localMod?.versiones as unknown as {
      version: number;
      comentario: string;
    }[];
    assert.strictEqual(versiones.length, 2);
    assert.strictEqual(versiones[1].comentario, "Cambio de cláusula principal");
  });
});
