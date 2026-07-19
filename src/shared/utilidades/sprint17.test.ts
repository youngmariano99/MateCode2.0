import "fake-indexeddb/auto";
import { test, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarWorkflowsUseCase } from "../../application/use-cases/proyecto/gestionar-workflows.use-case";

beforeEach(async () => {
  await db.proyectos.clear();
  await db.proyecto_contexto.clear();
  await db.proyecto_design_system.clear();
  await db.workflow_templates.clear();
  await db.workflow_steps.clear();
  await db.task_executions.clear();
  await db.task_step_states.clear();
  await db.task_comments.clear();
});

test("Relevamiento: Debería guardar y recuperar notas brutas y resumen markdown", async () => {
  const projectId = "proj_test_123";

  // Initialize context row
  await db.proyecto_contexto.put({
    proyectoId: projectId,
    relevamientoNotasBrutas:
      "Reunión de zoom: El cliente vende zapatos de cuero y la web actual no carga.",
    relevamientoMarkdown: "# Resumen\n- Dolores: carga lenta\n- Zapatos",
  });

  const record = await db.proyecto_contexto.get(projectId);
  assert.ok(record);
  assert.strictEqual(
    record.relevamientoNotasBrutas,
    "Reunión de zoom: El cliente vende zapatos de cuero y la web actual no carga."
  );
  assert.strictEqual(
    record.relevamientoMarkdown,
    "# Resumen\n- Dolores: carga lenta\n- Zapatos"
  );
});

test("Relevamiento: Debería fall back a relevamientoMarkdown en el compilador de prompts de workflows", async () => {
  const projectId = "proj_workflow_test";
  const executionId = "exec_test_456";
  const templateId = "temp_dev";
  const stepId = "step_dev_1";

  // Seed project
  await db.proyectos.put({
    id: projectId,
    nombre: "E-Commerce Zapatos",
    tipo: "Sistemas",
    estado: "Desarrollo",
    stack: {
      frontend: ["React", "Next.js"],
      backend: ["Node.js"],
      baseDatos: ["PostgreSQL"],
    },
  });

  // Seed context with Relevamiento markdown but empty doloresCliente
  await db.proyecto_contexto.put({
    proyectoId: projectId,
    doloresCliente: "",
    relevamientoMarkdown:
      "# Relevamiento Zapatos\n- Dolor: El checkout falla un 30% de las veces.",
  });

  // Seed design system
  await db.proyecto_design_system.put({
    proyectoId: projectId,
    arquetipo: "Diseño Suizo",
  });

  // Seed execution & step
  await db.task_executions.put({
    id: executionId,
    proyectoId: projectId,
    templateId,
    estado: "IN_PROGRESS",
    titulo: "Flujo Desarrollo",
  });

  await db.workflow_steps.put({
    id: stepId,
    templateId,
    orden: 1,
    titulo: "Escribir código",
    promptTemplate:
      "Genera el backend considerando los dolores del cliente: {{dolores_cliente}}.",
  });

  await db.task_step_states.put({
    id: `state_${executionId}_${stepId}`,
    executionId,
    stepId,
    completado: false,
  });

  const uc = new GestionarWorkflowsUseCase();
  const res = await uc.compilarPromptInicial(
    executionId,
    stepId,
    "Implementar checkout"
  );

  assert.strictEqual(res.ok, true);
  // Verify that dolores_cliente placeholder resolved using the relevamientoMarkdown fallback
  assert.match(res.valor, /checkout falla/);
});
