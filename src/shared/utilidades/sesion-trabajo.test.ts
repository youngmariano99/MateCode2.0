import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarSesionTrabajoUseCase } from "../../application/use-cases/personal/gestionar-sesion-trabajo.use-case";
import { GestionarActividadesUseCase } from "../../application/use-cases/personal/gestionar-actividades.use-case";
import { GestionarConfiguracionOficinaUseCase } from "../../application/use-cases/personal/gestionar-configuracion-oficina.use-case";
import {
  ID_CONFIGURACION_OFICINA,
  tocaPausaActiva,
} from "../../domain/entidades/configuracion-oficina.entity";

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

describe("Sesiones: modos, pausa manual y pausa activa configurable", () => {
  const configuracion = new GestionarConfiguracionOficinaUseCase();

  beforeEach(async () => {
    await db.sesion_trabajo.clear();
    await db.actividad.clear();
    await db.configuracion_oficina.clear();
  });

  test("una sesión suelta necesita descripción; un temporizador necesita minutos", async () => {
    const sinNada = await sesiones.iniciarSesion({ modo: "libre" });
    assert.strictEqual(sinNada.ok, false);

    const sinMinutos = await sesiones.iniciarSesion({
      descripcion: "Leer",
      modo: "temporizador",
    });
    assert.strictEqual(sinMinutos.ok, false);

    const ok = await sesiones.iniciarSesion({
      descripcion: "Leer",
      modo: "temporizador",
      duracionMin: 60,
    });
    assert.strictEqual(ok.ok, true);
    const fila = await db.sesion_trabajo.get(ok.valor!);
    assert.strictEqual(fila?.duracionPlanificadaSeg, 3600);
    assert.strictEqual(fila?.actividadId, undefined);
  });

  test("terminar antes del tiempo guarda lo realmente trabajado, no lo planificado, y la nota", async () => {
    const res = await sesiones.iniciarSesion({
      descripcion: "Diseño",
      modo: "temporizador",
      duracionMin: 60,
    });
    const id = res.valor!;
    await db.sesion_trabajo.update(id, {
      iniciadoEn: Date.now() - 25 * 60_000,
    });

    await sesiones.finalizarSesion(id, "  Terminé el wireframe  ");
    const fila = await db.sesion_trabajo.get(id);
    assert.ok(
      fila!.segundosAcumulados >= 1499 && fila!.segundosAcumulados <= 1501
    );
    assert.strictEqual(fila?.nota, "Terminé el wireframe");
  });

  test("pausa manual y pausa activa quedan distinguidas, y reanudar limpia el tipo", async () => {
    const res = await sesiones.iniciarSesion({
      descripcion: "X",
      modo: "libre",
    });
    const id = res.valor!;
    await sesiones.pausarParaDescanso(id, "manual");
    assert.strictEqual((await db.sesion_trabajo.get(id))?.tipoPausa, "manual");
    await sesiones.reanudarSesion(id);
    assert.strictEqual((await db.sesion_trabajo.get(id))?.tipoPausa, undefined);
    await sesiones.pausarParaDescanso(id);
    assert.strictEqual(
      (await db.sesion_trabajo.get(id))?.tipoPausa,
      "pausa_activa"
    );
  });

  test("extenderTiempo suma minutos y pasarALibre quita el límite", async () => {
    const res = await sesiones.iniciarSesion({
      descripcion: "X",
      modo: "temporizador",
      duracionMin: 25,
    });
    const id = res.valor!;
    await sesiones.extenderTiempo(id, 10);
    assert.strictEqual(
      (await db.sesion_trabajo.get(id))?.duracionPlanificadaSeg,
      35 * 60
    );
    await sesiones.pasarALibre(id);
    const fila = await db.sesion_trabajo.get(id);
    assert.strictEqual(fila?.modo, "libre");
    assert.strictEqual(fila?.duracionPlanificadaSeg, undefined);
  });

  test("el contador de pausa suma el tiempo ENTRE sesiones y se reinicia al hacer/saltear la pausa", async () => {
    await configuracion.guardar({ intervaloPausaMin: 60, pausaAlAzar: false });

    for (const minutos of [25, 25]) {
      const res = await sesiones.iniciarSesion({
        descripcion: "Bloque",
        modo: "libre",
      });
      await db.sesion_trabajo.update(res.valor!, {
        iniciadoEn: Date.now() - minutos * 60_000,
      });
      await sesiones.finalizarSesion(res.valor!);
    }
    let config = await db.configuracion_oficina.get(ID_CONFIGURACION_OFICINA);
    assert.ok(
      config!.segundosDesdePausa >= 2999 && config!.segundosDesdePausa <= 3001
    );
    assert.strictEqual(tocaPausaActiva(config!, 0), false, "50 min < 60 min");
    assert.strictEqual(
      tocaPausaActiva(config!, 11 * 60),
      true,
      "con un tramo corriendo de 11 min ya toca"
    );

    await configuracion.reiniciarContadorPausa();
    config = await db.configuracion_oficina.get(ID_CONFIGURACION_OFICINA);
    assert.strictEqual(config?.segundosDesdePausa, 0);
  });

  test("con la pausa desactivada (0 min) no se acumula nada ni toca nunca", async () => {
    const res = await sesiones.iniciarSesion({
      descripcion: "X",
      modo: "libre",
    });
    await db.sesion_trabajo.update(res.valor!, {
      iniciadoEn: Date.now() - 3_600_000,
    });
    await sesiones.finalizarSesion(res.valor!);
    const config = await db.configuracion_oficina.get(ID_CONFIGURACION_OFICINA);
    assert.strictEqual(config, undefined);
    assert.strictEqual(
      tocaPausaActiva(
        { intervaloPausaMin: 0, segundosDesdePausa: 99999 },
        99999
      ),
      false
    );
  });
});
