import "fake-indexeddb/auto";
import { test, describe } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";

describe("Módulo de Potenciales Clientes (Prospección y Conversión)", () => {
  test("Debería registrar, visitar y convertir un prospecto a cliente CRM con éxito", async () => {
    await db.potenciales_clientes.clear();
    await db.clientes.clear();

    const prospectoId = "pot_test_123";

    // 1. Creation
    const testProspecto = {
      id: prospectoId,
      nombre: "Panadería Colón",
      contacto: "Roberto (Dueño)",
      tipoServicio: "Menú QR",
      pitch: "Digitalizar carta física",
      direccionCalle: "Av. Colón 450",
      direccionCodigoPostal: "8000",
      direccionCiudad: "Bahía Blanca",
      direccionProvincia: "Buenos Aires",
      direccionPais: "Argentina",
      direccion: "Av. Colón 450, 8000, Bahía Blanca, Buenos Aires, Argentina",
      visitado: false,
      visitasCount: 0,
      convertido: false,
      creadoEn: Date.now(),
      actualizadoEn: Date.now(),
    };

    await db.potenciales_clientes.add(testProspecto);

    const guardado = await db.potenciales_clientes.get(prospectoId);
    assert.ok(guardado);
    assert.strictEqual(guardado.nombre, "Panadería Colón");
    assert.strictEqual(guardado.visitado, false);

    // 2. Visit logging
    await db.potenciales_clientes.update(prospectoId, {
      visitado: true,
      visitasCount: 1,
      motivoNoVisita: undefined,
      actualizadoEn: Date.now(),
    });

    const visitadoRecord = await db.potenciales_clientes.get(prospectoId);
    assert.strictEqual(visitadoRecord?.visitado, true);
    assert.strictEqual(visitadoRecord?.visitasCount, 1);

    // 3. Conversion to CRM Clientes
    const clienteId = "cli_test_456";
    const crmPayload = {
      id: clienteId,
      nombre: visitadoRecord?.nombre,
      direccion: visitadoRecord?.direccion,
      direccionCalle: visitadoRecord?.direccionCalle,
      direccionCodigoPostal: visitadoRecord?.direccionCodigoPostal,
      direccionCiudad: visitadoRecord?.direccionCiudad,
      direccionProvincia: visitadoRecord?.direccionProvincia,
      direccionPais: visitadoRecord?.direccionPais,
      estado: "Lead",
      observaciones: `Convertido de Prospecto: ${visitadoRecord?.pitch}`,
    };

    await db.clientes.add(crmPayload);
    await db.potenciales_clientes.update(prospectoId, {
      convertido: true,
      clienteIdRef: clienteId,
      actualizadoEn: Date.now(),
    });

    // Verify CRM Cliente exists
    const crmCliente = await db.clientes.get(clienteId);
    assert.ok(crmCliente);
    assert.strictEqual(crmCliente.nombre, "Panadería Colón");

    // Verify Prospecto is flagged as converted
    const prospectoFinal = await db.potenciales_clientes.get(prospectoId);
    assert.strictEqual(prospectoFinal?.convertido, true);
    assert.strictEqual(prospectoFinal?.clienteIdRef, clienteId);
  });
});
