import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarContactoFrioUseCase } from "../../application/use-cases/crm/gestionar-contacto-frio.use-case";

const useCase = new GestionarContactoFrioUseCase();

describe("Contacto en Frío: prospección física + digital + conversión", () => {
  beforeEach(async () => {
    await db.potencial_cliente.clear();
    await db.ficha_digital.clear();
    await db.ficha_fisica.clear();
    await db.intento_contacto.clear();
    await db.clientes.clear();
  });

  test("Alta física → visita exitosa → conversión a CRM", async () => {
    const alta = await useCase.crearProspecto({
      nombre: "Panadería Colón",
      rubro: "Gastronomía",
      prioridad: "Alta",
    });
    assert.strictEqual(alta.ok, true);
    const id = alta.valor;

    const ficha = await useCase.agregarFichaFisica(id, {
      direccionCalle: "Av. Colón 450",
      direccionCiudad: "Bahía Blanca",
      direccionProvincia: "Buenos Aires",
    });
    assert.strictEqual(ficha.ok, true);

    const visita = await useCase.registrarVisitaFisica(id, { visitado: true });
    assert.strictEqual(visita.ok, true);

    const prospecto = await db.potencial_cliente.get(id);
    assert.strictEqual(prospecto?.estado, "Contactado");

    const intentos = await db.intento_contacto
      .where("potencialClienteId")
      .equals(id)
      .toArray();
    assert.strictEqual(intentos.length, 1);
    assert.strictEqual(intentos[0].canal, "Presencial");

    await db.clientes.add({
      id: "cli_test",
      nombre: "Panadería Colón",
      correo: "",
    });
    const cierre = await useCase.marcarClienteCerrado(id);
    assert.strictEqual(cierre.ok, true);

    const prospectoFinal = await db.potencial_cliente.get(id);
    assert.strictEqual(prospectoFinal?.estado, "Cliente Cerrado");
  });

  test("Alta digital → calificación con etiquetas → intento registrado avanza el embudo", async () => {
    const alta = await useCase.crearProspecto({
      nombre: "Gimnasio Estilo",
      rubro: "Deportes",
    });
    const id = alta.valor;

    const calificacion = await useCase.calificarFichaDigital(id, {
      instagram: "@gimnasio_estilo",
      dolorTags: ["Responde tarde (+2hs)"],
      tieneWeb: "no",
      usaCatalogoNativoWhatsapp: true,
    });
    assert.strictEqual(calificacion.ok, true);

    const intento = await useCase.registrarIntento({
      potencialClienteId: id,
      canal: "Instagram",
      mensajeEnviado: "Hola, ¿cómo va?",
      resultado: "Respondió",
      tagsResultado: [],
    });
    assert.strictEqual(intento.ok, true);

    const prospecto = await db.potencial_cliente.get(id);
    assert.strictEqual(prospecto?.estado, "En Conversación");
    assert.ok(prospecto?.fechaUltimoContacto);
  });

  test("Eliminar un prospecto borra también sus fichas e intentos", async () => {
    const alta = await useCase.crearProspecto({ nombre: "Local de prueba" });
    const id = alta.valor;
    await useCase.agregarFichaFisica(id, { direccionCalle: "Calle Falsa 123" });
    await useCase.registrarIntento({
      potencialClienteId: id,
      canal: "WhatsApp",
      resultado: "Sin respuesta",
      tagsResultado: [],
    });

    const eliminacion = await useCase.eliminarProspecto(id);
    assert.strictEqual(eliminacion.ok, true);

    assert.strictEqual(await db.potencial_cliente.get(id), undefined);
    assert.strictEqual(await db.ficha_fisica.get(id), undefined);
    assert.strictEqual(
      (
        await db.intento_contacto
          .where("potencialClienteId")
          .equals(id)
          .toArray()
      ).length,
      0
    );
  });
});
