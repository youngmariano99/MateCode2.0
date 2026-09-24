import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarActividadesUseCase } from "../../application/use-cases/personal/gestionar-actividades.use-case";
import { GestionarCatalogoEtiquetasUseCase } from "../../application/use-cases/shared/gestionar-catalogo-etiquetas.use-case";

const uc = new GestionarActividadesUseCase();
const catalogo = new GestionarCatalogoEtiquetasUseCase();

describe("Tareas extra: alta, detalle, desvíos y registro", () => {
  beforeEach(async () => {
    for (const t of [
      db.actividad,
      db.entregable,
      db.personal_historial,
      db.cola_eventos,
      db.catalogo_etiquetas,
    ])
      await t.clear();
  });

  const historial = async (id: string) =>
    (await db.personal_historial.where("entidadId").equals(id).toArray()).sort(
      (a, b) => a.creadoEn - b.creadoEn
    );

  test("una tarea suelta con fecha, prioridad y proyecto queda registrada y sincronizable", async () => {
    const r = await uc.crearActividad({
      tipo: "mantenimiento",
      descripcion: "Llamar al contador",
      diaTarea: "2026-09-25",
      prioridad: "urgente",
      area: "profesional",
    });
    assert.ok(r.ok);
    await uc.editarDetalle(r.valor!, {
      nota: "Preguntar por monotributo",
      proyectoTrabajoId: "pro_1",
    });
    const a = (await db.actividad.get(r.valor!))!;
    assert.strictEqual(a.estado, "pendiente");
    assert.strictEqual(a.prioridad, "urgente");
    assert.strictEqual(a.proyectoTrabajoId, "pro_1");
    assert.strictEqual(a.entregableId, undefined);
    const h = await historial(r.valor!);
    assert.deepStrictEqual(
      h.map((x) => x.accion),
      ["crear", "editar"]
    );
    const cola = await db.cola_eventos.toArray();
    assert.ok(cola.some((e) => e.tabla === "actividad"));
  });

  test("sin fecha va al backlog; con tipo enfoque/mantenimiento la fecha es obligatoria", async () => {
    const b = await uc.crearActividad({
      tipo: "backlog",
      descripcion: "Algún día",
      prioridad: "importante",
    });
    assert.ok(b.ok);
    assert.strictEqual((await db.actividad.get(b.valor!))?.diaTarea, undefined);
    const mala = await uc.crearActividad({
      tipo: "mantenimiento",
      descripcion: "Sin fecha",
    });
    assert.ok(!mala.ok);
  });

  test("pasar a otro día y cancelar guardan el motivo del desvío y nunca borran", async () => {
    const id = (
      await uc.crearActividad({
        tipo: "mantenimiento",
        descripcion: "X",
        diaTarea: "2026-09-25",
      })
    ).valor!;
    const m = await uc.migrarActividad({
      id,
      nuevoDiaTarea: "2026-09-26",
      motivo: "sin_tiempo",
    });
    assert.ok(m.ok);
    const todas = await db.actividad.toArray();
    assert.ok(todas.length >= 1);
    const hMig = (await db.personal_historial.toArray()).filter((h) =>
      JSON.stringify(h.campoNuevo ?? {}).includes("sin_tiempo")
    );
    assert.ok(hMig.length >= 1);

    const id2 = (
      await uc.crearActividad({
        tipo: "mantenimiento",
        descripcion: "Y",
        diaTarea: "2026-09-25",
      })
    ).valor!;
    await uc.cancelarActividad(id2, "cambio_prioridad");
    assert.strictEqual((await db.actividad.get(id2))?.estado, "cancelada");
    const hCan = await historial(id2);
    assert.ok(
      hCan.some(
        (h) =>
          (h.campoNuevo as { motivo?: string } | undefined)?.motivo ===
          "cambio_prioridad"
      )
    );
  });

  test("un motivo de desvío nuevo (no de los 5 sugeridos) se puede usar y queda guardado para la próxima", async () => {
    const id = (
      await uc.crearActividad({
        tipo: "mantenimiento",
        descripcion: "Reunión con el proveedor",
        diaTarea: "2026-09-25",
      })
    ).valor!;
    // Antes de agregarlo no está en el catálogo.
    assert.strictEqual(
      (
        await db.catalogo_etiquetas
          .where("categoria")
          .equals("motivo_desvio_actividad")
          .toArray()
      ).length,
      0
    );
    const creado = await catalogo.crearEtiqueta(
      "Esperando al proveedor",
      "motivo_desvio_actividad"
    );
    assert.ok(creado.ok);
    await uc.cancelarActividad(id, "Esperando al proveedor");
    assert.strictEqual((await db.actividad.get(id))?.estado, "cancelada");
    const hist = await historial(id);
    assert.ok(
      hist.some(
        (h) =>
          (h.campoNuevo as { motivo?: string } | undefined)?.motivo ===
          "Esperando al proveedor"
      )
    );
    // Queda guardado en el catálogo para elegirlo de nuevo sin volver a escribirlo.
    const guardado = await db.catalogo_etiquetas
      .where("categoria")
      .equals("motivo_desvio_actividad")
      .toArray();
    assert.deepStrictEqual(
      guardado.map((e) => e.etiqueta),
      ["Esperando al proveedor"]
    );
  });
});
