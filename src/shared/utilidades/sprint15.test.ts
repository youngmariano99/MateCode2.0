import "fake-indexeddb/auto";
import { test, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarWorkflowsUseCase } from "../../application/use-cases/proyecto/gestionar-workflows.use-case";

const PROYECTO_ID = "test_sprint15_proj";
const TEMPLATE_ID = "wt_feature";

beforeEach(async () => {
  // Clear tables
  await db.task_executions.clear();
  await db.task_step_states.clear();
  await db.task_comments.clear();
  await db.actas_auditoria.clear();
  await db.workflow_templates.clear();
  await db.workflow_steps.clear();

  // Populate seeds manually for test consistency
  await db.workflow_templates.add({
    id: TEMPLATE_ID,
    nombre: "Desarrollo de Feature Nueva",
    descripcion:
      "Flujo estándar para implementar nuevas características de software.",
    fase: "Desarrollo",
  });

  await db.workflow_steps.bulkAdd([
    {
      id: "ws_test_step_1",
      templateId: TEMPLATE_ID,
      titulo: "Crear rama local",
      descripcion: "Crea una rama git local",
      tipo: "manual",
      orden: 1,
    },
    {
      id: "ws_test_step_2",
      templateId: TEMPLATE_ID,
      titulo: "Exportar Prompt",
      descripcion: "Exporta el prompt",
      tipo: "prompt",
      orden: 2,
    },
  ]);
});

test("Sprint 15: Debería iniciar una ejecución de flujo y crear estados para cada paso", async () => {
  const uc = new GestionarWorkflowsUseCase();
  const res = await uc.iniciarEjecucion(
    PROYECTO_ID,
    TEMPLATE_ID,
    "Feature Checkout",
    "usr_mariano"
  );

  assert.strictEqual(res.ok, true);
  const exeId = res.valor;
  assert.ok(exeId.startsWith("exe_"));

  // Check execution record
  const exe = await db.task_executions.get(exeId);
  assert.ok(exe);
  assert.strictEqual(exe.proyectoId, PROYECTO_ID);
  assert.strictEqual(exe.estado, "NOT_STARTED");
  assert.strictEqual(exe.usuarioAsignadoId, "usr_mariano");

  // Check that task step states were initialized
  const stepStates = await db.task_step_states
    .where("executionId")
    .equals(exeId)
    .toArray();
  assert.strictEqual(stepStates.length, 2);
  assert.strictEqual(stepStates[0].completado, false);
  assert.strictEqual(stepStates[0].id, `${exeId}_ws_test_step_1`);

  // Check audit log
  const logs = await db.actas_auditoria
    .where("executionId")
    .equals(exeId)
    .toArray();
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].tipoEvento, "ACTIVITY_STARTED");
});

test("Sprint 15: Debería cambiar el estado del flujo de desarrollo y registrar auditoría", async () => {
  const uc = new GestionarWorkflowsUseCase();
  const resInit = await uc.iniciarEjecucion(
    PROYECTO_ID,
    TEMPLATE_ID,
    "Feature Ingesta",
    "usr_mariano"
  );
  const exeId = resInit.valor;

  // Change state to IN_PROGRESS
  const resState = await uc.cambiarEstado(exeId, "IN_PROGRESS", "usr_mariano");
  assert.strictEqual(resState.ok, true);

  const exe = await db.task_executions.get(exeId);
  assert.strictEqual(exe?.estado, "IN_PROGRESS");

  // Verify audit log entry
  const logs = await db.actas_auditoria
    .where("executionId")
    .equals(exeId)
    .toArray();
  const stateLog = logs.find((l) => l.tipoEvento === "ASSIGNMENT_CHANGED");
  assert.ok(stateLog);
  assert.match(stateLog.mensaje as string, /IN_PROGRESS/);
});

test("Sprint 15: Debería agregar comentarios de bitácora / traspaso", async () => {
  const uc = new GestionarWorkflowsUseCase();
  const resInit = await uc.iniciarEjecucion(
    PROYECTO_ID,
    TEMPLATE_ID,
    "Bugfix API",
    "usr_mateo"
  );
  const exeId = resInit.valor;

  // Add comment
  const resComment = await uc.agregarComentario(
    exeId,
    "ws_test_step_2",
    "Falta validar los inputs en el controlador",
    "usr_mateo"
  );
  assert.strictEqual(resComment.ok, true);

  // Check database comments table
  const comments = await db.task_comments
    .where("executionId")
    .equals(exeId)
    .toArray();
  assert.strictEqual(comments.length, 1);
  assert.strictEqual(
    comments[0].comentario,
    "Falta validar los inputs en el controlador"
  );
  assert.strictEqual(comments[0].stepId, "ws_test_step_2");

  // Check audit log
  const logs = await db.actas_auditoria
    .where("executionId")
    .equals(exeId)
    .toArray();
  const commentLog = logs.find((l) => l.tipoEvento === "COMMENT_ADDED");
  assert.ok(commentLog);
});

test("Sprint 15: Debería completar un paso individual del procedimiento guardando inputs y outputs", async () => {
  const uc = new GestionarWorkflowsUseCase();
  const resInit = await uc.iniciarEjecucion(
    PROYECTO_ID,
    TEMPLATE_ID,
    "Deployment MVP",
    "usr_mariano"
  );
  const exeId = resInit.valor;

  // Complete step
  const resStep = await uc.actualizarEstadoPaso(
    exeId,
    "ws_test_step_1",
    true,
    "Rama: feature/checkout",
    "Código integrado sin conflictos",
    "usr_mariano"
  );
  assert.strictEqual(resStep.ok, true);

  // Check step state
  const stepState = await db.task_step_states.get(`${exeId}_ws_test_step_1`);
  assert.strictEqual(stepState?.completado, true);
  assert.strictEqual(stepState?.inputs, "Rama: feature/checkout");
  assert.strictEqual(stepState?.outputs, "Código integrado sin conflictos");

  // Check audit log
  const logs = await db.actas_auditoria
    .where("executionId")
    .equals(exeId)
    .toArray();
  const stepLog = logs.find((l) => l.tipoEvento === "STEP_COMPLETED");
  assert.ok(stepLog);
});
