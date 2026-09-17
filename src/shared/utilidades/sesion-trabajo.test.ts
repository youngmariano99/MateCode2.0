import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarSesionTrabajoUseCase } from "../../application/use-cases/personal/gestionar-sesion-trabajo.use-case";
import { GestionarActividadesUseCase } from "../../application/use-cases/personal/gestionar-actividades.use-case";

const sesiones = new GestionarSesionTrabajoUseCase();
const actividades = new GestionarActividadesUseCase();

async function crearActividadPendiente(descripcion = "Tarea de prueba") {
  const res = await actividades.crearActividad({
    tipo: "enfoque",
    descripcion,
    diaTarea: "2026-01-01",
  });
  assert.strictEqual(res.ok, true);
  return res.valor!;
}

describe("GestionarSesionTrabajoUseCase", () => {
  beforeEach(async () => {
    await db.sesion_trabajo.clear();
    await db.actividad.clear();
  });

  test("iniciarSesion crea una sesión activa para una actividad pendiente", async () => {
    const actividadId = await crearActividadPendiente();
    const res = await sesiones.iniciarSesion(actividadId);
    assert.strictEqual(res.ok, true);

    const sesion = await db.sesion_trabajo.get(res.valor!);
    assert.strictEqual(sesion?.estado, "activa");
    assert.strictEqual(sesion?.actividadId, actividadId);
    assert.strictEqual(sesion?.segundosAcumulados, 0);
  });

  test("iniciarSesion falla si la actividad no existe", async () => {
    const res = await sesiones.iniciarSesion("act_inexistente");
    assert.strictEqual(res.ok, false);
  });

  test("iniciarSesion falla si la actividad ya no está pendiente", async () => {
    const actividadId = await crearActividadPendiente();
    const resCompletar = await actividades.completarActividad(actividadId);
    assert.strictEqual(resCompletar.ok, true);

    const res = await sesiones.iniciarSesion(actividadId);
    assert.strictEqual(res.ok, false);
  });

  test("iniciarSesion falla si ya hay una sesión activa", async () => {
    const idA = await crearActividadPendiente("A");
    const idB = await crearActividadPendiente("B");
    const resA = await sesiones.iniciarSesion(idA);
    assert.strictEqual(resA.ok, true);

    const resB = await sesiones.iniciarSesion(idB);
    assert.strictEqual(resB.ok, false);
  });

  test("iniciarSesion falla si ya hay una sesión pausada", async () => {
    const idA = await crearActividadPendiente("A");
    const idB = await crearActividadPendiente("B");
    const resA = await sesiones.iniciarSesion(idA);
    assert.strictEqual(resA.ok, true);
    const resPausar = await sesiones.pausarParaDescanso(resA.valor!);
    assert.strictEqual(resPausar.ok, true);

    const resB = await sesiones.iniciarSesion(idB);
    assert.strictEqual(resB.ok, false);
  });

  test("pausarParaDescanso acumula segundos correctamente y pasa a pausada", async () => {
    const actividadId = await crearActividadPendiente();
    const res = await sesiones.iniciarSesion(actividadId);
    const id = res.valor!;

    // Simula 90s corridos: retrocede iniciadoEn directamente en Dexie, sin
    // mockear Date.now (mismo criterio que el resto de los tests del módulo).
    await db.sesion_trabajo.update(id, {
      iniciadoEn: Date.now() - 90_000,
    });

    const resPausar = await sesiones.pausarParaDescanso(id);
    assert.strictEqual(resPausar.ok, true);

    const sesion = await db.sesion_trabajo.get(id);
    assert.strictEqual(sesion?.estado, "pausada");
    assert.ok(
      sesion!.segundosAcumulados >= 89 && sesion!.segundosAcumulados <= 91
    );
    assert.ok(sesion?.pausadoEn !== undefined);
  });

  test("reanudarSesion vuelve a activa sin perder segundosAcumulados", async () => {
    const actividadId = await crearActividadPendiente();
    const res = await sesiones.iniciarSesion(actividadId);
    const id = res.valor!;
    await db.sesion_trabajo.update(id, { iniciadoEn: Date.now() - 60_000 });
    await sesiones.pausarParaDescanso(id);

    const antes = await db.sesion_trabajo.get(id);
    const acumuladoPrevio = antes!.segundosAcumulados;

    const resReanudar = await sesiones.reanudarSesion(id);
    assert.strictEqual(resReanudar.ok, true);

    const despues = await db.sesion_trabajo.get(id);
    assert.strictEqual(despues?.estado, "activa");
    assert.strictEqual(despues?.segundosAcumulados, acumuladoPrevio);
    assert.strictEqual(despues?.pausadoEn, undefined);
  });

  test("finalizarSesion desde activa acumula el tramo final y no toca la Actividad", async () => {
    const actividadId = await crearActividadPendiente();
    const res = await sesiones.iniciarSesion(actividadId);
    const id = res.valor!;
    await db.sesion_trabajo.update(id, { iniciadoEn: Date.now() - 30_000 });

    const resFinalizar = await sesiones.finalizarSesion(id);
    assert.strictEqual(resFinalizar.ok, true);

    const sesion = await db.sesion_trabajo.get(id);
    assert.strictEqual(sesion?.estado, "finalizada");
    assert.ok(
      sesion!.segundosAcumulados >= 29 && sesion!.segundosAcumulados <= 31
    );

    const actividad = await db.actividad.get(actividadId);
    assert.strictEqual(actividad?.estado, "pendiente");
  });

  test("finalizarSesion desde pausada no vuelve a sumar el tramo ya acumulado", async () => {
    const actividadId = await crearActividadPendiente();
    const res = await sesiones.iniciarSesion(actividadId);
    const id = res.valor!;
    await db.sesion_trabajo.update(id, { iniciadoEn: Date.now() - 20_000 });
    await sesiones.pausarParaDescanso(id);

    const pausada = await db.sesion_trabajo.get(id);
    const acumuladoAlPausar = pausada!.segundosAcumulados;

    const resFinalizar = await sesiones.finalizarSesion(id);
    assert.strictEqual(resFinalizar.ok, true);

    const finalizada = await db.sesion_trabajo.get(id);
    assert.strictEqual(finalizada?.segundosAcumulados, acumuladoAlPausar);
  });

  test("después de finalizar una sesión, iniciarSesion para otra actividad funciona", async () => {
    const idA = await crearActividadPendiente("A");
    const idB = await crearActividadPendiente("B");
    const resA = await sesiones.iniciarSesion(idA);
    await sesiones.finalizarSesion(resA.valor!);

    const resB = await sesiones.iniciarSesion(idB);
    assert.strictEqual(resB.ok, true);
  });
});
