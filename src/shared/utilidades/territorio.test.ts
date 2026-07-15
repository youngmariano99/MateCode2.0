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

  test("Debería calcular y guardar un recorrido optimizado teniendo en cuenta la prioridad", async () => {
    await db.recorridos.clear();

    const routeUC = new CalcularRecorridoUseCase();

    // We start at Point A (0, 0)
    // Point B (Baja priority, very close) at (0.005, 0.005) -> Should be visited first because it's "on the way"
    // Point C (Alta priority, further) at (0.03, 0.03) -> Chosen after B because C has higher rank but is much further.
    // Point D (Baja priority, far away) at (0.04, 0.04) -> Chosen last.
    const puntos = [
      {
        id: "p_start",
        nombre: "Inicio (Posición actual)",
        latitud: -34.6,
        longitud: -58.4,
        prioridad: "Media" as const,
      },
      {
        id: "p_close_low",
        nombre: "Baja prioridad de paso",
        latitud: -34.605,
        longitud: -58.405,
        prioridad: "Baja" as const,
      },
      {
        id: "p_far_high",
        nombre: "Alta prioridad principal",
        latitud: -34.63,
        longitud: -58.43,
        prioridad: "Alta" as const,
      },
      {
        id: "p_far_low",
        nombre: "Baja prioridad lejos",
        latitud: -34.64,
        longitud: -58.44,
        prioridad: "Baja" as const,
      },
    ];

    const res = await routeUC.ejecutar(puntos, "GraphHopper");
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.valor.puntos.length, 4);

    // The starting point is always the first one in Nearest Neighbor
    assert.strictEqual(res.valor.puntos[0].id, "p_start");

    // Verify that the very close low priority is visited before heading to the far high priority
    assert.strictEqual(res.valor.puntos[1].id, "p_close_low");
    assert.strictEqual(res.valor.puntos[2].id, "p_far_high");
    assert.strictEqual(res.valor.puntos[3].id, "p_far_low");

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
