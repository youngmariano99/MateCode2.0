/* eslint-disable @typescript-eslint/no-explicit-any */
import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";

test("Sprint 19: Debería guardar y cargar enlaces de inspiración visual y copy de marca en el contexto", async () => {
  const projectId = "proj_landing_test_1";
  const links = ["https://dribbble.com/shots/1", "https://awwwards.com/site/1"];
  const copy =
    "Transforma tu negocio con inteligencia artificial de vanguardia.";

  await db.proyecto_contexto.put({
    proyectoId: projectId,
    relevamientoNotasBrutas: "Notas de marca...",
    relevamientoMarkdown: "# Relevamiento Marca",
    linksInspiracion: links,
    copyContenido: copy,
  });

  const ctx = await db.proyecto_contexto.get(projectId);
  assert.ok(ctx);
  assert.deepStrictEqual(ctx.linksInspiracion, links);
  assert.strictEqual(ctx.copyContenido, copy);
});

test("Sprint 19: Debería iniciar un ticket de Sección Landing y compilar prompt de refinamiento sin alterar lo demás", async () => {
  const projectId = "proj_landing_test_2";
  const sectionTicketId = "tick_sec_test_1";

  // Create Landing Section Ticket
  await db.transaction(
    "rw",
    [db.task_executions, db.task_step_states],
    async () => {
      await db.task_executions.put({
        id: sectionTicketId,
        proyectoId: projectId,
        templateId: "workflow_section_landing",
        titulo: "SECCIÓN: Hero Section (Portada & CTA)",
        estado: "IN_PROGRESS",
        usuarioAsignadoId: "Mariano",
        fechaInicio: Date.now(),
        metadata: {
          seccionNombre: "Hero Section (Portada & CTA)",
          seccionDescripcion: "Fondo oscuro con gradiente verde",
          iterations: [],
        },
      });

      const steps = [
        "Análisis de Copy & Referencias Visuales",
        "Generación de Maquetado e IA Prompt Base",
        "Refinamiento e Iteraciones Visuales",
        "Pruebas Responsive y Aprobación",
        "Cierre y Guardado de Sección",
      ];

      for (let i = 0; i < steps.length; i++) {
        await db.task_step_states.put({
          id: `state_${sectionTicketId}_step_${i + 1}`,
          executionId: sectionTicketId,
          stepId: `step_${i + 1}`,
          titulo: steps[i],
          completado: false,
        });
      }
    }
  );

  const exec = await db.task_executions.get(sectionTicketId);
  const steps = await db.task_step_states
    .where("executionId")
    .equals(sectionTicketId)
    .toArray();

  assert.ok(exec);
  assert.strictEqual(exec.estado, "IN_PROGRESS");
  assert.strictEqual(steps.length, 5);

  // Register iteration refinement
  const refinementText =
    "Cambia el botón a verde esmeralda y haz el título más grande sin modificar nada más.";
  const prevMeta = exec.metadata || {};
  await db.task_executions.update(sectionTicketId, {
    metadata: {
      ...prevMeta,
      iterations: [
        {
          fecha: "12:00:00",
          consideraciones: refinementText,
        },
      ],
    },
  });

  const updatedExec = await db.task_executions.get(sectionTicketId);
  const iterations = (updatedExec?.metadata as any).iterations;
  assert.strictEqual(iterations.length, 1);
  assert.strictEqual(iterations[0].consideraciones, refinementText);
});
