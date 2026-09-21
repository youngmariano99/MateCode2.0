import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarContactoFrioUseCase } from "../../application/use-cases/crm/gestionar-contacto-frio.use-case";
import {
  armarCinta,
  inicioDelDia,
  sumarDiasMs,
} from "../../domain/entidades/contacto-frio-cinta.entity";
import {
  extraerJson,
  parsearCalificacionIA,
  parsearRespuestaIA,
} from "../../domain/entidades/contacto-frio-ia.entity";
import { generarPromptResponder } from "../../domain/prompts/generar-prompt-contacto-frio";

const uc = new GestionarContactoFrioUseCase();

async function nuevo(nombre = "Comercio X"): Promise<string> {
  const r = await uc.crearProspecto({
    nombre,
    rubro: "Ropa",
    prioridad: "Media",
  });
  assert.ok(r.ok);
  return r.valor!;
}

async function cinta() {
  return armarCinta(
    await db.potencial_cliente.toArray(),
    await db.intento_contacto.toArray(),
    Date.now()
  );
}

/** Corre hacia atrás las fechas de los intentos de un prospecto. */
async function envejecer(id: string, dias: number) {
  const ms = dias * 86_400_000;
  for (const i of await db.intento_contacto
    .where("potencialClienteId")
    .equals(id)
    .toArray()) {
    await db.intento_contacto.update(i.id, { fecha: i.fecha - ms });
  }
  const p = await db.potencial_cliente.get(id);
  if (p?.proximoPasoFecha !== undefined) {
    await db.potencial_cliente.update(id, {
      proximoPasoFecha: p.proximoPasoFecha - ms,
    });
  }
}

describe("Contacto en Frío: cinta de producción", () => {
  beforeEach(async () => {
    await db.potencial_cliente.clear();
    await db.ficha_digital.clear();
    await db.intento_contacto.clear();
    await db.clientes.clear();
  });

  test("un prospecto nuevo va a ③ Abrir", async () => {
    await nuevo();
    const c = await cinta();
    assert.strictEqual(c.abrir.length, 1);
    assert.strictEqual(
      c.seguir.length + c.esperando.length + c.responder.length,
      0
    );
  });

  test("después de la apertura queda esperando y toca a los 2 días, después cada 7", async () => {
    const id = await nuevo();
    await uc.registrarEnvio({
      potencialClienteId: id,
      canal: "Instagram",
      mensaje: "Hola",
      tipoEnvio: "apertura",
    });
    let c = await cinta();
    assert.strictEqual(c.esperando.length, 1);
    assert.strictEqual(c.abrir.length, 0);
    assert.strictEqual(
      (await db.potencial_cliente.get(id))?.estado,
      "Contactado"
    );

    await envejecer(id, 2);
    c = await cinta();
    assert.strictEqual(c.seguir.length, 1);

    await uc.registrarEnvio({
      potencialClienteId: id,
      canal: "Instagram",
      mensaje: "Seguimiento",
      tipoEnvio: "seguimiento",
    });
    const p = await db.potencial_cliente.get(id);
    assert.strictEqual(p?.proximoPasoFecha, sumarDiasMs(Date.now(), 7));
    c = await cinta();
    assert.strictEqual(c.esperando[0].totalEnviados, 2);
    assert.strictEqual(c.esperando[0].enviadosSinRespuesta, 2);
  });

  test("un seguimiento no hace retroceder el estado de En Conversación", async () => {
    const id = await nuevo();
    await uc.registrarRespuestaRecibida({
      potencialClienteId: id,
      canal: "WhatsApp",
      respuestaTexto: "Hola, contame",
    });
    assert.strictEqual(
      (await db.potencial_cliente.get(id))?.estado,
      "En Conversación"
    );
    await uc.registrarEnvio({
      potencialClienteId: id,
      canal: "WhatsApp",
      mensaje: "Te cuento",
      tipoEnvio: "respuesta",
    });
    assert.strictEqual(
      (await db.potencial_cliente.get(id))?.estado,
      "En Conversación"
    );
  });

  test("lo que me escriben va a ① Responder y sale al contestar", async () => {
    const id = await nuevo();
    await uc.registrarEnvio({
      potencialClienteId: id,
      canal: "Instagram",
      mensaje: "Hola",
      tipoEnvio: "apertura",
    });
    await envejecer(id, 1);
    await uc.registrarRespuestaRecibida({
      potencialClienteId: id,
      canal: "Instagram",
      respuestaTexto: "Sí, hacemos eso a mano",
    });
    let c = await cinta();
    assert.strictEqual(c.responder.length, 1);
    assert.strictEqual(
      (await db.potencial_cliente.get(id))?.proximoPasoFecha,
      undefined
    );

    await uc.registrarEnvio({
      potencialClienteId: id,
      canal: "Instagram",
      mensaje: "¿Cuándo fue la última vez?",
      tipoEnvio: "respuesta",
    });
    c = await cinta();
    assert.strictEqual(c.responder.length, 0);
    assert.strictEqual(c.esperando.length + c.seguir.length, 1);
  });

  test("'quedamos en algo' con fecha manda al lead a ② el día acordado, no a ①", async () => {
    const id = await nuevo();
    await uc.registrarRespuestaRecibida({
      potencialClienteId: id,
      canal: "WhatsApp",
      respuestaTexto: "Mandame la demo",
    });
    await uc.fijarProximoPaso({
      potencialClienteId: id,
      accion: "mandar_demo",
      dias: 0,
      nota: "Demo esta tarde",
    });
    const c = await cinta();
    assert.strictEqual(c.responder.length, 0);
    assert.strictEqual(c.seguir.length, 1);
    assert.strictEqual(
      c.seguir[0].prospecto.proximoPasoNota,
      "Demo esta tarde"
    );
  });

  test("mandar la demo pasa a Demo Enviada y no retrocede con seguimientos", async () => {
    const id = await nuevo();
    await uc.registrarEnvio({
      potencialClienteId: id,
      canal: "WhatsApp",
      mensaje: "Demo: link",
      tipoEnvio: "demo",
      diasHastaProximoToque: 2,
    });
    assert.strictEqual(
      (await db.potencial_cliente.get(id))?.estado,
      "Demo Enviada"
    );
    await uc.registrarEnvio({
      potencialClienteId: id,
      canal: "WhatsApp",
      mensaje: "¿Lo viste?",
      tipoEnvio: "seguimiento",
    });
    assert.strictEqual(
      (await db.potencial_cliente.get(id))?.estado,
      "Demo Enviada"
    );
  });

  test("descartarLead pasa a Rechazado y sale de la cinta", async () => {
    const id = await nuevo();
    await uc.registrarEnvio({
      potencialClienteId: id,
      canal: "Instagram",
      mensaje: "Hola",
      tipoEnvio: "apertura",
    });
    await uc.descartarLead(id, ["No le interesa"]);
    assert.strictEqual(
      (await db.potencial_cliente.get(id))?.estado,
      "Rechazado"
    );
    const c = await cinta();
    assert.strictEqual(
      c.esperando.length +
        c.seguir.length +
        c.responder.length +
        c.abrir.length,
      0
    );
  });

  test("cerrarComoCliente crea el cliente, lo vincula y es idempotente", async () => {
    const id = await nuevo("Tienda Sol");
    await uc.calificarFichaDigital(id, {
      instagram: "tiendasol",
      nombreDueño: "Sol",
      dolorTags: [],
      tieneWeb: "no",
      usaCatalogoNativoWhatsapp: false,
    });
    const r1 = await uc.cerrarComoCliente(id);
    assert.ok(r1.ok);
    const p = await db.potencial_cliente.get(id);
    assert.strictEqual(p?.estado, "Cliente Cerrado");
    assert.strictEqual(p?.clienteId, r1.valor);
    const cli = await db.clientes.get(r1.valor!);
    assert.strictEqual(cli?.empresa, "Tienda Sol");
    const r2 = await uc.cerrarComoCliente(id);
    assert.strictEqual(r2.valor, r1.valor);
    assert.strictEqual(await db.clientes.count(), 1);
  });

  test("importarProspectos crea, omite duplicados y los que no califican", async () => {
    await nuevo("Ya Existe");
    const base = {
      dolorTags: [],
      tieneWeb: "no" as const,
      usaCatalogoNativoWhatsapp: false,
      filtrosQueCumple: [],
    };
    const r = await uc.importarProspectos([
      { ...base, nombre: "Ya Existe", califica: true },
      { ...base, nombre: "Nuevo Uno", instagram: "@nuevouno", califica: true },
      { ...base, nombre: "No Sirve", califica: false },
    ]);
    assert.deepStrictEqual(r.valor, {
      creados: 1,
      duplicados: 1,
      noCalifican: 1,
    });
    const alta = (await db.potencial_cliente.toArray()).find(
      (p) => p.nombre === "Nuevo Uno"
    );
    assert.ok(alta);
    assert.strictEqual(
      (await db.ficha_digital.get(alta.id))?.instagram,
      "nuevouno"
    );
  });

  test("inicioDelDia es idempotente", () => {
    const x = inicioDelDia(Date.now());
    assert.strictEqual(inicioDelDia(x), x);
  });
});

describe("Contacto en Frío: JSON de la IA y prompts", () => {
  test("extraerJson saca el JSON de un bloque con cercas y texto alrededor", () => {
    const v = extraerJson(
      'Acá va:\n```json\n{"a": "x } y", "b": [1]}\n```\nlisto'
    ) as { a: string };
    assert.strictEqual(v.a, "x } y");
  });

  test("parsearRespuestaIA valida y completa defaults", () => {
    const ok = parsearRespuestaIA(
      '{"borradorRespuesta":"Hola","proximoPaso":{"accion":"mandar_demo","dias":2}}'
    );
    assert.ok(ok.ok);
    if (ok.ok) assert.deepStrictEqual(ok.data.aprendizaje, {});
    assert.strictEqual(parsearRespuestaIA('{"lectura":"x"}').ok, false);
    assert.strictEqual(parsearRespuestaIA("nada").ok, false);
  });

  test("parsearCalificacionIA acepta array directo u objeto", () => {
    const item = '{"nombre":"A"}';
    const a = parsearCalificacionIA(`[${item}]`);
    const b = parsearCalificacionIA(`{"prospectos":[${item}]}`);
    assert.ok(a.ok && b.ok);
    if (a.ok) assert.strictEqual(a.data.prospectos[0].califica, true);
  });

  test("el prompt de responder lleva lo que escribió y pide el borrador", () => {
    const p = generarPromptResponder({
      prospecto: {
        nombre: "Tienda Sol",
        rubro: "Ropa",
        estado: "En Conversación",
      },
      historial: "[01/01 · yo · apertura · Instagram] Hola",
      resumen: "1 mensaje tuyo",
      aprendizaje: {},
      loQueEscribio: "Sí, lo hacemos por WhatsApp",
    });
    assert.match(p, /Sí, lo hacemos por WhatsApp/);
    assert.match(p, /borradorRespuesta/);
  });
});
