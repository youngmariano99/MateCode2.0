import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../../offline/dexie/db";
import { ResetearPlanificacionUseCase } from "./resetear-planificacion.use-case";

describe("ResetearPlanificacionUseCase", () => {
  const useCase = new ResetearPlanificacionUseCase();

  beforeEach(async () => {
    await db.area_personal.clear();
    await db.objetivo_cuantificable.clear();
    await db.proyecto_personal.clear();
    await db.entregable.clear();
    await db.fase_personal.clear();
    await db.actividad.clear();
    await db.habito_definicion.clear();
    await db.cola_eventos.clear();
    await db.procedimiento.clear();

    // Poblar 2 áreas con jerarquía completa
    await db.area_personal.bulkAdd([
      {
        id: "area-1",
        nombre: "Profesional",
        activa: true,
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      },
      {
        id: "area-2",
        nombre: "Salud",
        activa: true,
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      },
    ]);

    await db.objetivo_cuantificable.bulkAdd([
      {
        id: "obj-1",
        areaId: "area-1",
        titulo: "Conseguir Clientes",
        cantidadObjetivo: 10,
        unidad: "clientes",
        progresoActual: 2,
        diaInicio: "2026-11-01",
        diaLimite: "2026-11-30",
        area: "profesional",
        estado: "activo",
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      },
      {
        id: "obj-2",
        areaId: "area-2",
        titulo: "Entrenar",
        cantidadObjetivo: 16,
        unidad: "sesiones",
        progresoActual: 4,
        diaInicio: "2026-11-01",
        diaLimite: "2026-11-30",
        area: "personal",
        estado: "activo",
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      },
    ]);

    await db.proyecto_personal.bulkAdd([
      {
        id: "proy-1",
        objetivoId: "obj-1",
        titulo: "Caso May",
        diaInicio: "2026-11-01",
        diaLimite: "2026-11-30",
        progresoActual: 20,
        estado: "activo",
        tieneHijos: true,
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      },
      {
        id: "proy-2",
        objetivoId: "obj-2",
        titulo: "Rutina Fuerza",
        diaInicio: "2026-11-01",
        diaLimite: "2026-11-30",
        progresoActual: 25,
        estado: "activo",
        tieneHijos: true,
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      },
    ]);

    await db.entregable.bulkAdd([
      {
        id: "ent-1",
        proyectoId: "proy-1",
        objetivoId: "obj-1",
        titulo: "Landing Page",
        diaInicio: "2026-11-01",
        diaLimite: "2026-11-15",
        progresoActual: 50,
        estado: "activo",
        tieneHijos: true,
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      },
      {
        id: "ent-2",
        proyectoId: "proy-2",
        objetivoId: "obj-2",
        titulo: "Semana 1",
        diaInicio: "2026-11-01",
        diaLimite: "2026-11-07",
        progresoActual: 100,
        estado: "cumplido",
        tieneHijos: true,
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      },
    ]);

    await db.actividad.bulkAdd([
      {
        id: "act-1",
        entregableId: "ent-1",
        descripcion: "Diseñar hero",
        estado: "pendiente",
        diaTarea: "2026-11-05",
        tipo: "enfoque",
        progresoActual: 0,
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      },
      {
        id: "act-2",
        entregableId: "ent-1",
        descripcion: "Configurar Analytics",
        estado: "completada",
        diaTarea: "2026-11-06",
        tipo: "mantenimiento",
        progresoActual: 1,
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      },
      {
        id: "act-3",
        entregableId: "ent-2",
        descripcion: "Día 1 gimnasio",
        estado: "completada",
        diaTarea: "2026-11-02",
        tipo: "mantenimiento",
        progresoActual: 1,
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
      },
    ]);
  });

  test("contar desglosa con precisión las entidades que serán borradas según modo", async () => {
    const conteoTodo = await useCase.contar({ modo: "todo" });
    assert.strictEqual(conteoTodo.areas, 2);
    assert.strictEqual(conteoTodo.objetivos, 2);
    assert.strictEqual(conteoTodo.proyectos, 2);
    assert.strictEqual(conteoTodo.entregables, 2);
    assert.strictEqual(conteoTodo.actividades, 3);

    const conteoDesdeObjs = await useCase.contar({ modo: "desde_objetivos" });
    assert.strictEqual(conteoDesdeObjs.areas, 0); // Preserva áreas
    assert.strictEqual(conteoDesdeObjs.objetivos, 2);
    assert.strictEqual(conteoDesdeObjs.actividades, 3);

    const conteoArea1 = await useCase.contar({
      modo: "todo",
      areaId: "area-1",
    });
    assert.strictEqual(conteoArea1.areas, 1);
    assert.strictEqual(conteoArea1.objetivos, 1);
    assert.strictEqual(conteoArea1.proyectos, 1);
    assert.strictEqual(conteoArea1.entregables, 1);
    assert.strictEqual(conteoArea1.actividades, 2);
  });

  test("modo 'desde_objetivos' borra objetivos y descendientes pero conserva las áreas", async () => {
    const res = await useCase.ejecutar({ modo: "desde_objetivos" });
    assert.ok(res.ok);

    const areasRestantes = await db.area_personal.toArray();
    assert.strictEqual(areasRestantes.length, 2);

    const objsRestantes = await db.objetivo_cuantificable.toArray();
    assert.strictEqual(objsRestantes.length, 0);

    const actsRestantes = await db.actividad.toArray();
    assert.strictEqual(actsRestantes.length, 0);
  });

  test("preservarCompletadas=true no elimina actividades completadas", async () => {
    const res = await useCase.ejecutar({
      modo: "solo_actividades",
      preservarCompletadas: true,
    });
    assert.ok(res.ok);

    const acts = await db.actividad.toArray();
    // Había 1 pendiente (act-1) y 2 completadas (act-2, act-3)
    assert.strictEqual(acts.length, 2);
    assert.ok(acts.every((a) => a.estado === "completada"));
  });

  test("filtrar por areaId solo afecta esa área y deja intacta la otra", async () => {
    const res = await useCase.ejecutar({ modo: "todo", areaId: "area-1" });
    assert.ok(res.ok);

    const areas = await db.area_personal.toArray();
    assert.strictEqual(areas.length, 1);
    assert.strictEqual(areas[0].id, "area-2");

    const objs = await db.objetivo_cuantificable.toArray();
    assert.strictEqual(objs.length, 1);
    assert.strictEqual(objs[0].id, "obj-2");
  });
});
