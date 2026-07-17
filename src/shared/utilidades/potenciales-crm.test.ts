/* eslint-disable @typescript-eslint/no-explicit-any */
import "fake-indexeddb/auto";
import { test, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarContactosUseCase } from "../../application/use-cases/crm/gestionar-contactos.use-case";

beforeEach(async () => {
  await db.contacto_sesiones.clear();
  await db.potenciales_clientes.clear();
  await db.servicios_agencia.clear();
  await db.reuniones_contacto.clear();
  await db.clientes.clear();

  // Seed one service for testing
  await db.servicios_agencia.put({
    id: "serv_ecommerce",
    nombre: "E-Commerce",
    descripcion: "Tienda integrada premium.",
  });
});

test("Outbound CRM: Debería crear una sesión de contacto", async () => {
  const uc = new GestionarContactosUseCase();
  const res = await uc.crearSesion("Instagram Cold Outbound");
  assert.strictEqual(res.ok, true);
  assert.ok(res.valor.startsWith("ses_"));

  const session = await db.contacto_sesiones.get(res.valor);
  assert.ok(session);
  assert.strictEqual(session.nombre, "Instagram Cold Outbound");
  assert.strictEqual(session.estado, "ACTIVE");
});

test("Outbound CRM: Debería bloquear si se agregan más de 15 prospectos a una sesión", async () => {
  const uc = new GestionarContactosUseCase();
  const resSes = await uc.crearSesion("Spam prevention");
  const sesId = resSes.valor;

  // Add 15 prospects
  const ids: string[] = [];
  for (let i = 0; i < 15; i++) {
    const resP = await uc.crearProspectoAlVuelo(`Prospecto ${i}`);
    await uc.agregarProspectoSesion(sesId, resP.valor);
    ids.push(resP.valor);
  }

  // Count matches
  const count = await db.potenciales_clientes
    .where("sesionId")
    .equals(sesId)
    .count();
  assert.strictEqual(count, 15);

  // Try to add 16th prospect
  const res16 = await uc.crearProspectoAlVuelo("Prospecto 16");
  const resAdd = await uc.agregarProspectoSesion(sesId, res16.valor);
  assert.strictEqual(resAdd.ok, false);
  assert.match(resAdd.error?.mensaje || "", /límite superado/i);
});

test("Outbound CRM: Debería compilar prompt de pitch resolviendo placeholders", async () => {
  const uc = new GestionarContactosUseCase();
  const resP = await uc.crearProspectoAlVuelo("Café Martinez", "@cafemartinez");
  const pId = resP.valor;

  await uc.actualizarFichaProspecto(pId, {
    nombreNegocio: "Café Martinez Recoleta",
    rubro: "Gastronomía",
    ganchoEmpatico: "Vi que su web carga muy lento en móviles",
    canalVentaActual: "Instagram DM",
    dolorDetectado: "Tienen un menú PDF pesado de descargar",
    servicioOfrecidoId: "serv_ecommerce",
    checklist: ["step1", "step2"],
  });

  const resPrompt = await uc.compilarPitchPrompt(pId);
  assert.strictEqual(resPrompt.ok, true);

  const prompt = resPrompt.valor;
  assert.match(prompt, /Café Martinez Recoleta/);
  assert.match(prompt, /Gastronomía/);
  assert.match(prompt, /E-Commerce/);
  assert.match(prompt, /menú PDF pesado/);
});

test("Outbound CRM: Debería forzar comentario obligatorio al rechazar prospecto", async () => {
  const uc = new GestionarContactosUseCase();
  const resP = await uc.crearProspectoAlVuelo("Negocio Test");
  const pId = resP.valor;

  // Try to reject without motif comment
  const resFail = await uc.cambiarEstadoProspecto(pId, "Rechazado");
  assert.strictEqual(resFail.ok, false);
  assert.match(resFail.error?.mensaje || "", /es obligatorio/i);

  // Reject with motif comment
  const resSuccess = await uc.cambiarEstadoProspecto(pId, "Rechazado", {
    motivoRechazo: "Ya tienen su propia app interna",
  });
  assert.strictEqual(resSuccess.ok, true);

  const record = await db.potenciales_clientes.get(pId);
  assert.strictEqual(record?.estadoOutbound, "Rechazado");
  assert.strictEqual(
    (record as any).motivoRechazo,
    "Ya tienen su propia app interna"
  );
});

test("Outbound CRM: Debería agendar reunión / Loom y registrar handoff", async () => {
  const uc = new GestionarContactosUseCase();
  const resP = await uc.crearProspectoAlVuelo("Loom Client");
  const pId = resP.valor;

  const resState = await uc.cambiarEstadoProspecto(pId, "Reunión / Loom", {
    tipoReunion: "loom",
    linkLoom: "https://loom.com/share/test",
  });
  assert.strictEqual(resState.ok, true);

  const record = await db.potenciales_clientes.get(pId);
  assert.strictEqual(record?.estadoOutbound, "Reunión / Loom");

  // Check meetings table
  const meetings = await db.reuniones_contacto
    .where("prospectoId")
    .equals(pId)
    .toArray();
  assert.strictEqual(meetings.length, 1);
  assert.strictEqual(meetings[0].tipo, "loom");
  assert.strictEqual(
    (meetings[0] as any).linkLoom,
    "https://loom.com/share/test"
  );
});

test("Outbound CRM: Debería convertir a cliente core al ser Aceptado", async () => {
  const uc = new GestionarContactosUseCase();
  const resP = await uc.crearProspectoAlVuelo(
    "Cliente Aceptado",
    "@aceptado",
    "11223344",
    "test@aceptado.com"
  );
  const pId = resP.valor;

  const resState = await uc.cambiarEstadoProspecto(pId, "Aceptado");
  assert.strictEqual(resState.ok, true);

  const record = await db.potenciales_clientes.get(pId);
  assert.strictEqual(record?.convertido, true);
  assert.ok(record?.clienteIdRef);

  // Verify core clients table
  const client = await db.clientes.get(record.clienteIdRef as string);
  assert.ok(client);
  assert.strictEqual(client.nombre, "Cliente Aceptado");
  assert.strictEqual(client.correo, "test@aceptado.com");
});
