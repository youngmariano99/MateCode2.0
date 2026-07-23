/* eslint-disable @typescript-eslint/no-explicit-any */
import "fake-indexeddb/auto";
import { test, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";

beforeEach(async () => {
  await db.planificaciones_contenido.clear();
  await db.contenidos.clear();
  await db.agencia_config.clear();
});

test("Sprint 20 Contenido: Debería crear planificación semanal, guardar objetivos y KPIs", async () => {
  const planId = "plan_test_week_30";
  const planObj = {
    id: planId,
    nombre: "Semana 30 - Lanzamiento",
    fechaInicio: "2026-07-20",
    fechaFin: "2026-07-26",
    objetivo: "Dar a conocer el nuevo portal B2B",
    kpi: "Superar las 5000 impresiones",
    ideas: [
      { id: "idea_1", texto: "Video de soporte post-venta", dia: "jueves" },
      { id: "idea_2", texto: "Post explicativo de UI", dia: "martes" },
    ],
    creadoEn: Date.now(),
  };

  await db.planificaciones_contenido.put(planObj);

  const planLoaded = (await db.planificaciones_contenido.get(planId)) as any;
  assert.ok(planLoaded);
  assert.strictEqual(planLoaded.nombre, "Semana 30 - Lanzamiento");
  assert.strictEqual(planLoaded.ideas.length, 2);
  assert.strictEqual(planLoaded.ideas[0].texto, "Video de soporte post-venta");
});

test("Sprint 20 Contenido: Debería guardar contenidos vinculados a ideas y validar estados", async () => {
  const contentId = "cont_test_script_1";
  const contentObj = {
    id: contentId,
    planificacionId: "plan_test_week_30",
    ideaId: "idea_1",
    titulo: "Tutorial Nodexa Soporte",
    canales: ["Instagram", "TikTok"],
    tipos: ["Reel"],
    fecha: "2026-07-23",
    estado: "Planificado",
    gancho: "Descubre el soporte B2B definitivo",
    ganchoVisual: " Laptop con soporte premium",
    desarrollo: "Explicar el paso 1 al 5",
    cta: "Haz click en link del perfil",
    descripcionVideo: "#nodexa #soporte #b2b",
    pasos: ["Definir Gancho", "Grabar", "Subir"],
    creadoEn: Date.now(),
  };

  await db.contenidos.put(contentObj);

  const contentLoaded = (await db.contenidos.get(contentId)) as any;
  assert.ok(contentLoaded);
  assert.strictEqual(contentLoaded.titulo, "Tutorial Nodexa Soporte");
  assert.deepEqual(contentLoaded.canales, ["Instagram", "TikTok"]);
  assert.strictEqual(contentLoaded.estado, "Planificado");
});

test("Sprint 20 Contenido: Debería ejecutar Finalizar Semana y realizar rollover o purga de contenidos", async () => {
  const planId = "plan_closeout_week";

  // Create 3 content items
  const c1 = {
    id: "c1",
    planificacionId: planId,
    titulo: "Contenido Completado",
    estado: "Subido",
    fecha: "2026-07-22",
  };
  const c2 = {
    id: "c2",
    planificacionId: planId,
    titulo: "Contenido Pendiente para Backlog",
    estado: "Editado",
    fecha: "2026-07-23",
  };
  const c3 = {
    id: "c3",
    planificacionId: planId,
    titulo: "Contenido Pendiente a Eliminar",
    estado: "Planificado",
    fecha: "2026-07-24",
  };

  await db.contenidos.bulkPut([c1, c2, c3]);

  // Simulate closeout rollover
  // c2 -> rollover (keeps but moves to backlog)
  // c3 -> delete
  const rolloverActions: Record<string, "rollover" | "delete"> = {
    c2: "rollover",
    c3: "delete",
  };

  const activeConts = (await db.contenidos
    .where("planificacionId")
    .equals(planId)
    .toArray()) as any[];
  for (const c of activeConts) {
    if (c.estado === "Subido") {
      continue;
    }
    const action = rolloverActions[c.id];
    if (action === "delete") {
      await db.contenidos.delete(c.id);
    } else {
      await db.contenidos.update(c.id, {
        planificacionId: "backlog",
        fecha: "",
      });
    }
  }

  // Assertions
  const checkC1 = (await db.contenidos.get("c1")) as any;
  assert.ok(checkC1);
  assert.strictEqual(checkC1.planificacionId, planId); // Stays on this week's plan

  const checkC2 = (await db.contenidos.get("c2")) as any;
  assert.ok(checkC2);
  assert.strictEqual(checkC2.planificacionId, "backlog"); // Rolled over
  assert.strictEqual(checkC2.fecha, ""); // Date cleared for re-scheduling

  const checkC3 = (await db.contenidos.get("c3")) as any;
  assert.strictEqual(checkC3, undefined); // Purged
});
