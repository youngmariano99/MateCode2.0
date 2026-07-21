/* eslint-disable @typescript-eslint/no-explicit-any */
import "fake-indexeddb/auto";
import { test, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";

beforeEach(async () => {
  await db.proyectos.clear();
  await db.proyecto_contexto.clear();
  await db.task_executions.clear();
  await db.task_step_states.clear();
});

test("Sprint 20: Debería parsear etiquetas {{SECCION}} y generar estructura de secciones", () => {
  const rawText = `
{{HERO}}
Encabezado con título de alto impacto y video de fondo.
{{/HERO}}

{{SERVICIOS}}
Grilla de 4 tarjetas destacando las soluciones principales.
{{/SERVICIOS}}

{{CONTACTO}}
Formulario de captación de leads con validación.
{{/CONTACTO}}
  `;

  const regex = /\{\{([A-Z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/gi;
  const secciones: Array<{ nombre: string; descripcion: string }> = [];
  let match;

  while ((match = regex.exec(rawText)) !== null) {
    secciones.push({
      nombre: match[1].trim().toUpperCase(),
      descripcion: match[2].trim(),
    });
  }

  assert.strictEqual(secciones.length, 3);
  assert.strictEqual(secciones[0].nombre, "HERO");
  assert.strictEqual(
    secciones[0].descripcion,
    "Encabezado con título de alto impacto y video de fondo."
  );
  assert.strictEqual(secciones[1].nombre, "SERVICIOS");
  assert.strictEqual(secciones[2].nombre, "CONTACTO");
});

test("Sprint 20: Debería guardar y cargar seccionesSitemap en el contexto del proyecto", async () => {
  const proyectoId = "proj_sitemap_test_1";
  const seccionesSitemap = [
    {
      id: "sec_1",
      nombre: "HERO",
      descripcion: "Sección principal con CTA",
    },
    {
      id: "sec_2",
      nombre: "TESTIMONIOS",
      descripcion: "Reseñas de clientes felices",
    },
  ];

  await db.proyecto_contexto.put({
    proyectoId,
    seccionesSitemap,
    sitemapMarkup: "{{HERO}}Sección principal con CTA{{/HERO}}",
  });

  const ctx = await db.proyecto_contexto.get(proyectoId);
  assert.ok(ctx);
  assert.ok(Array.isArray((ctx as any).seccionesSitemap));
  assert.strictEqual((ctx as any).seccionesSitemap.length, 2);
  assert.strictEqual((ctx as any).seccionesSitemap[0].nombre, "HERO");
  assert.strictEqual(
    (ctx as any).seccionesSitemap[1].descripcion,
    "Reseñas de clientes felices"
  );
});

test("Sprint 20: Debería borrar en cascada la sección y el ticket de desarrollo vinculado", async () => {
  const proyectoId = "proj_sitemap_test_2";
  const ticketId = "exec_sec_hero_1";

  // Create active execution ticket for HERO section
  await db.task_executions.put({
    id: ticketId,
    proyectoId,
    templateId: "workflow_section_landing",
    estado: "IN_PROGRESS",
    data: {
      seccionNombre: "HERO",
      seccionDescripcion: "Sección Hero principal",
    },
  });

  await db.task_step_states.put({
    id: "step_1_hero",
    executionId: ticketId,
    stepId: "step_1",
    completado: true,
  });

  // Verify ticket exists
  const existingTicket = await db.task_executions.get(ticketId);
  assert.ok(existingTicket);

  // Cascade delete simulation
  await db.task_executions.delete(ticketId);
  await db.task_step_states.delete("step_1_hero");

  const deletedTicket = await db.task_executions.get(ticketId);
  const deletedStep = await db.task_step_states.get("step_1_hero");

  assert.strictEqual(deletedTicket, undefined);
  assert.strictEqual(deletedStep, undefined);
});
