import "fake-indexeddb/auto";
import { test, describe } from "node:test";
import assert from "node:assert";
import { CrearProyectoUseCase } from "../../application/use-cases/proyecto/crear-proyecto.use-case";
import { ActualizarProyectoUseCase } from "../../application/use-cases/proyecto/actualizar-proyecto.use-case";
import { GestionarTareaUseCase } from "../../application/use-cases/proyecto/gestionar-tarea.use-case";
import { db } from "../../offline/dexie/db";

describe("Módulo de Workspace de Proyectos", () => {
  test("Debería crear y actualizar un proyecto en IndexedDB", async () => {
    await db.proyectos.clear();
    await db.logs_sincronizacion.clear();

    const crearUC = new CrearProyectoUseCase();
    const actualizarUC = new ActualizarProyectoUseCase();

    const testProyecto = {
      id: "pro_test_1",
      nombre: "Proyecto Test 1",
      clienteId: "cli_1",
      tipo: "Sistema Web",
      estado: "Desarrollo",
    };

    const resCrear = await crearUC.ejecutar(testProyecto);
    assert.strictEqual(resCrear.ok, true);

    const local = await db.proyectos.get("pro_test_1");
    assert.ok(local);
    assert.strictEqual(local.nombre, "Proyecto Test 1");

    const resAct = await actualizarUC.ejecutar("pro_test_1", {
      ...local,
      nombre: "Proyecto Test Modificado",
      estado: "Testing",
    });
    assert.strictEqual(resAct.ok, true);

    const localMod = await db.proyectos.get("pro_test_1");
    assert.strictEqual(localMod?.nombre, "Proyecto Test Modificado");
    assert.strictEqual(localMod?.estado, "Testing");
  });

  test("Debería crear, actualizar y eliminar tareas asociadas a un proyecto", async () => {
    await db.tareas.clear();

    const taskUC = new GestionarTareaUseCase();

    const testTarea = {
      id: "tar_test_1",
      proyectoId: "pro_test_1",
      titulo: "Tarea de prueba 1",
      estado: "Pendiente",
      prioridad: "Media",
    };

    const resCrear = await taskUC.crearTarea(testTarea);
    assert.strictEqual(resCrear.ok, true);

    const local = await db.tareas.get("tar_test_1");
    assert.ok(local);
    assert.strictEqual(local.titulo, "Tarea de prueba 1");

    const resAct = await taskUC.actualizarTarea("tar_test_1", {
      ...local,
      estado: "Desarrollo",
      prioridad: "Alta",
    });
    assert.strictEqual(resAct.ok, true);

    const localMod = await db.tareas.get("tar_test_1");
    assert.strictEqual(localMod?.estado, "Desarrollo");
    assert.strictEqual(localMod?.prioridad, "Alta");

    const resDel = await taskUC.eliminarTarea("tar_test_1");
    assert.strictEqual(resDel.ok, true);

    const localDel = await db.tareas.get("tar_test_1");
    assert.strictEqual(localDel, undefined);
  });

  test("Debería persistir comentarios y archivos adjuntos del proyecto", async () => {
    await db.comentarios_proyecto.clear();
    await db.archivos_proyecto.clear();

    // 1. Test Comentarios
    const testComm = {
      id: "comm_test_1",
      proyectoId: "pro_test_1",
      autor: "Mariano",
      texto: "Avance del sprint validado",
      fecha: "14/07/2026 18:30",
      creadoEn: Date.now(),
    };
    await db.comentarios_proyecto.add(testComm);
    const commDb = await db.comentarios_proyecto.get("comm_test_1");
    assert.ok(commDb);
    assert.strictEqual(commDb.texto, "Avance del sprint validado");

    // 2. Test Archivos
    const testFile = {
      id: "file_test_1",
      proyectoId: "pro_test_1",
      nombre: "Logo.png",
      tamanio: "15 KB",
      fecha: "14/07/2026",
      contenidoBase64:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      tipoMime: "image/png",
      creadoEn: Date.now(),
    };
    await db.archivos_proyecto.add(testFile);
    const fileDb = await db.archivos_proyecto.get("file_test_1");
    assert.ok(fileDb);
    assert.strictEqual(fileDb.nombre, "Logo.png");
  });
});
