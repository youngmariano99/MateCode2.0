import "fake-indexeddb/auto";
import { test, describe } from "node:test";
import assert from "node:assert";
import { GeocodificarDireccionUseCase } from "../../application/use-cases/territorio/geocodificar-direccion.use-case";
import { CalcularRecorridoUseCase } from "../../application/use-cases/territorio/calcular-recorrido.use-case";
import { RegistrarVisitaUseCase } from "../../application/use-cases/territorio/registrar-visita.use-case";
import { db } from "../../offline/dexie/db";

describe("Módulo de Inteligencia Territorial", () => {
  test("Debería geocodificar dirección y actualizar coordenadas del cliente", async () => {
    await db.clientes.clear();
    await db.logs_sincronizacion.clear();

    await db.clientes.put({
      id: "cli_geo_1",
      nombre: "Tienda Centro",
      correo: "centro@tienda.com",
      direccion: "Av. Corrientes 1234, CABA",
      estado: "Lead",
    });

    const geocodeUC = new GeocodificarDireccionUseCase();
    const res = await geocodeUC.ejecutar(
      "cli_geo_1",
      "Av. Corrientes 1234, CABA"
    );
    assert.strictEqual(res.ok, true);
    assert.ok(res.valor.latitud);
    assert.ok(res.valor.longitud);

    const local = await db.clientes.get("cli_geo_1");
    assert.strictEqual(local?.latitud, res.valor.latitud);
    assert.strictEqual(local?.longitud, res.valor.longitud);
  });

  test("Debería calcular y guardar un recorrido optimizado", async () => {
    await db.recorridos.clear();

    const routeUC = new CalcularRecorridoUseCase();
    const puntos = [
      { id: "p1", nombre: "Punto A", latitud: -34.6, longitud: -58.4 },
      { id: "p2", nombre: "Punto B", latitud: -34.62, longitud: -58.42 },
    ];

    const res = await routeUC.ejecutar(puntos, "GraphHopper");
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.valor.puntos.length, 2);
    assert.ok(res.valor.distanciaKm);

    const recorridosList = await db.recorridos.toArray();
    assert.strictEqual(recorridosList.length, 1);
    assert.strictEqual(recorridosList[0].distanciaKm, res.valor.distanciaKm);
  });

  test("Debería registrar visitas y actualizar historial del cliente", async () => {
    await db.visitas.clear();
    await db.clientes.clear();

    await db.clientes.put({
      id: "cli_vis_1",
      nombre: "Cliente Visitas",
      correo: "visitas@test.com",
      estado: "Cliente Activo",
    });

    const visitaUC = new RegistrarVisitaUseCase();
    const res = await visitaUC.ejecutar({
      clienteId: "cli_vis_1",
      horaLlegada: "10:00",
      horaSalida: "11:30",
      resultado: "Interesado",
      notas: "Conversación de onboarding",
    });
    assert.strictEqual(res.ok, true);

    const visitas = await db.visitas.toArray();
    assert.strictEqual(visitas.length, 1);
    assert.strictEqual(visitas[0].clienteId, "cli_vis_1");

    const cli = await db.clientes.get("cli_vis_1");
    assert.ok(cli?.ultimaVisita);
    const historial = cli.historialVisitas as { notas: string }[];
    assert.strictEqual(historial.length, 1);
    assert.strictEqual(historial[0].notas, "Conversación de onboarding");
  });
});
