import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarActividadesUseCase } from "../../application/use-cases/personal/gestionar-actividades.use-case";
import { MaterializarActividadesDelDiaUseCase } from "../../application/use-cases/personal/materializar-actividades-del-dia.use-case";
import { GestionarSesionTrabajoUseCase } from "../../application/use-cases/personal/gestionar-sesion-trabajo.use-case";
import { tiempoPorProyecto } from "../../application/servicios/tiempo-por-proyecto.service";

const actividades = new GestionarActividadesUseCase();

describe("Detalle de actividad: nota y proyecto de trabajo", () => {
  beforeEach(async () => {
    for (const t of [
      db.actividad,
      db.entregable,
      db.proyectos,
      db.sesion_trabajo,
    ])
      await t.clear();
  });

  test("editarDetalle guarda, cambia y borra la nota y el proyecto", async () => {
    const r = await actividades.crearActividad({
      tipo: "mantenimiento",
      descripcion: "Desarrollo",
      diaTarea: "2026-09-21",
    });
    const id = r.valor!;
    assert.ok(
      (
        await actividades.editarDetalle(id, {
          nota: "  Voy a armar el login  ",
          proyectoTrabajoId: "pro_1",
        })
      ).ok
    );
    let a = (await db.actividad.get(id))!;
    assert.strictEqual(a.nota, "Voy a armar el login");
    assert.strictEqual(a.proyectoTrabajoId, "pro_1");
    // Solo la nota: el proyecto queda.
    await actividades.editarDetalle(id, { nota: "Armé el login y los tests" });
    a = (await db.actividad.get(id))!;
    assert.strictEqual(a.nota, "Armé el login y los tests");
    assert.strictEqual(a.proyectoTrabajoId, "pro_1");
    // Se puede editar después de completarla.
    await actividades.completarActividad(id);
    assert.ok(
      (
        await actividades.editarDetalle(id, {
          nota: null,
          proyectoTrabajoId: null,
        })
      ).ok
    );
    a = (await db.actividad.get(id))!;
    assert.strictEqual(a.nota, undefined);
    assert.strictEqual(a.proyectoTrabajoId, undefined);
    assert.strictEqual(
      (await actividades.editarDetalle("nada", { nota: "x" })).ok,
      false
    );
  });

  test("la recurrencia (Lun-Sáb) hereda el proyecto del día anterior", async () => {
    await db.entregable.add({
      id: "e_dev",
      proyectoId: "p",
      objetivoId: "o",
      titulo: "Desarrollo de Proyectos",
      diaInicio: "2026-09-21",
      diaLimite: "2027-02-28",
      progresoActual: 0,
      estado: "activo",
      tieneHijos: false,
      recurrencia: {
        frecuencia: "dias_especificos",
        diasSemana: [1, 2, 3, 4, 5, 6],
      },
    } as never);
    const mat = new MaterializarActividadesDelDiaUseCase();
    await mat.ejecutar("2026-09-21"); // lunes
    await actividades.editarDetalle("e_dev_2026-09-21", {
      proyectoTrabajoId: "pro_cliente",
      nota: "Base de datos",
    });
    await mat.ejecutar("2026-09-22"); // martes
    const martes = (await db.actividad.get("e_dev_2026-09-22"))!;
    assert.strictEqual(martes.proyectoTrabajoId, "pro_cliente");
    assert.strictEqual(martes.nota, undefined); // la nota es del día, no se hereda
  });

  test("tiempoPorProyecto suma el tiempo de las sesiones y junta las notas", async () => {
    await db.proyectos.add({
      id: "pro_cliente",
      nombre: "Sistema Tienda Sol",
    } as never);
    await db.actividad.bulkAdd([
      {
        id: "a1",
        tipo: "mantenimiento",
        descripcion: "Desarrollo",
        diaTarea: "2026-09-21",
        estado: "completada",
        proyectoTrabajoId: "pro_cliente",
        nota: "Login",
      },
      {
        id: "a2",
        tipo: "mantenimiento",
        descripcion: "Desarrollo",
        diaTarea: "2026-09-22",
        estado: "completada",
        proyectoTrabajoId: "pro_cliente",
      },
      {
        id: "a3",
        tipo: "mantenimiento",
        descripcion: "Otra cosa",
        diaTarea: "2026-09-22",
        estado: "completada",
      },
    ] as never[]);
    await db.sesion_trabajo.bulkAdd([
      {
        id: "s1",
        actividadId: "a1",
        diaTarea: "2026-09-21",
        segundosAcumulados: 3600,
        estado: "finalizada",
      },
      {
        id: "s2",
        actividadId: "a2",
        diaTarea: "2026-09-22",
        segundosAcumulados: 1800,
        estado: "finalizada",
        nota: "Tests del carrito",
      },
      {
        id: "s3",
        actividadId: "a3",
        diaTarea: "2026-09-22",
        segundosAcumulados: 999,
        estado: "finalizada",
      },
    ] as never[]);
    const r = await tiempoPorProyecto("2026-09-21", "2026-09-27");
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].nombre, "Sistema Tienda Sol");
    assert.strictEqual(r[0].segundos, 5400);
    assert.strictEqual(r[0].dias, 2);
    assert.deepStrictEqual(
      r[0].registros.map((x) => x.texto),
      ["Tests del carrito", "Login"]
    );
  });

  test("una sesión suelta ligada a un proyecto suma tiempo, y puede cambiarse después", async () => {
    await db.proyectos.bulkAdd([
      { id: "pro_a", nombre: "Proyecto A" },
      { id: "pro_b", nombre: "Proyecto B" },
    ] as never[]);
    const sesiones = new GestionarSesionTrabajoUseCase();
    const r = await sesiones.iniciarSesion({
      descripcion: "Arreglar el deploy",
      proyectoTrabajoId: "pro_a",
      modo: "libre",
    });
    assert.ok(r.ok);
    const id = r.valor!;
    assert.strictEqual(
      (await db.sesion_trabajo.get(id))?.proyectoTrabajoId,
      "pro_a"
    );
    // Se simula el tiempo trabajado y se reasigna a otro proyecto.
    const hoy = (await db.sesion_trabajo.get(id))!.diaTarea;
    await db.sesion_trabajo.update(id, {
      segundosAcumulados: 900,
      estado: "finalizada",
    });
    await sesiones.asignarProyecto(id, "pro_b");
    const res = await tiempoPorProyecto(hoy, hoy);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].nombre, "Proyecto B");
    assert.strictEqual(res[0].segundos, 900);
    assert.deepStrictEqual(
      res[0].registros.map((x) => x.texto),
      ["Arreglar el deploy"]
    );
    // Sin proyecto no cuenta.
    await sesiones.asignarProyecto(id, null);
    assert.deepStrictEqual(await tiempoPorProyecto(hoy, hoy), []);
  });
});
