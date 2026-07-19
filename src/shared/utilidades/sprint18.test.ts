/* eslint-disable @typescript-eslint/no-explicit-any */
import "fake-indexeddb/auto";
import { test, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarWorkflowsUseCase } from "../../application/use-cases/proyecto/gestionar-workflows.use-case";

beforeEach(async () => {
  await db.proyectos.clear();
  await db.proyecto_contexto.clear();
  await db.proyecto_design_system.clear();
  await db.agencia_config.clear();
  await db.workflow_templates.clear();
  await db.workflow_steps.clear();
  await db.task_executions.clear();
  await db.task_step_states.clear();
});

test("Sprint 18: Debería persistir y cargar presets de estándares en agencia_config", async () => {
  const presetId = "preset_estandar_test_1";
  await db.agencia_config.put({
    id: presetId,
    nombre: "Test Standards Preset",
    tipo: "preset_estandar",
    data: {
      estandares: {
        seguridad: ["OWASP"],
        escalabilidad: ["Clean Architecture"],
      },
      coberturaMinima: 90,
    },
  });

  const preset = await db.agencia_config.get(presetId);
  assert.ok(preset);
  assert.strictEqual(preset.nombre, "Test Standards Preset");
  assert.strictEqual((preset.data as any).coberturaMinima, 90);
  assert.deepStrictEqual((preset.data as any).estandares.seguridad, ["OWASP"]);
});

test("Sprint 18: Debería persistir y cargar presets de stack en agencia_config", async () => {
  const presetId = "preset_stack_test_1";
  await db.agencia_config.put({
    id: presetId,
    nombre: "Test Stack Preset",
    tipo: "preset_stack",
    data: {
      stack: {
        frontend: ["React"],
        backend: ["NestJS"],
      },
    },
  });

  const preset = await db.agencia_config.get(presetId);
  assert.ok(preset);
  assert.strictEqual(preset.nombre, "Test Stack Preset");
  assert.deepStrictEqual((preset.data as any).stack.frontend, ["React"]);
});

test("Sprint 18: Debería fall back a designSystemMarkdown en el compilador de prompts de workflows", async () => {
  const projectId = "proj_workflow_ds_test";
  const executionId = "exec_ds_test_1";
  const templateId = "temp_dev_ds";
  const stepId = "step_dev_ds_1";

  // Seed project
  await db.proyectos.put({
    id: projectId,
    nombre: "Test Project",
    tipo: "Sistemas",
    estado: "Desarrollo",
    stack: {
      frontend: ["React"],
      backend: ["Node"],
      baseDatos: ["Postgre"],
    },
  });

  // Seed context
  await db.proyecto_contexto.put({
    proyectoId: projectId,
    relevamientoMarkdown: "# Relevamiento Zapatos",
  });

  // Seed design system with Markdown but no individual legacy fields
  await db.proyecto_design_system.put({
    proyectoId: projectId,
    designSystemMarkdown:
      "# Ficha de Branding\n- Colores: Negro y Verde\n- Arquetipo: Cyberpunk",
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
    titulo: "Maquetar UI",
    promptTemplate:
      "Crea el componente con el arquetipo visual: {{arquetipo}} y las reglas de color: {{reglas_color}}.",
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
    "Diseñar dashboard"
  );

  assert.strictEqual(res.ok, true);
  // Both arquetipo and reglas_color should fallback to the entire designSystemMarkdown
  assert.match(res.valor, /Ficha de Branding/);
  assert.match(res.valor, /Colores: Negro y Verde/);
});

test("Sprint 18: Debería guardar requisitos y entidades en el contexto y cargarlos", async () => {
  const projectId = "proj_planning_test";
  await db.proyecto_contexto.put({
    proyectoId: projectId,
    requisitosFuncionales: "RF1: Autenticación",
    requisitosNoFuncionales: "RNF1: Rápido",
    sitemap: "Landing Page",
    entidades: "Tabla: usuarios",
  });

  const ctx = await db.proyecto_contexto.get(projectId);
  assert.ok(ctx);
  assert.strictEqual(ctx.requisitosFuncionales, "RF1: Autenticación");
  assert.strictEqual(ctx.entidades, "Tabla: usuarios");
});

test("Sprint 18: Debería importar backlog y sprints masivamente desde JSON", async () => {
  const projectId = "proj_import_test";

  // Mock backlog JSON structure
  const backlogData = [
    {
      nombre: "Épica de Seguridad",
      descripcion: "Seguridad y Roles",
      historias: [
        {
          titulo: "Inicio de sesión",
          descripcion: "Como usuario...",
          prioridad: "Alta",
          estimacion: 3,
          actividades: ["Crear input", "Validar JWT"],
        },
      ],
    },
  ];

  // Import Backlog logic
  await db.transaction("rw", [db.epicas, db.historias, db.tareas], async () => {
    for (const epica of backlogData) {
      const epicaId = "epi_test_1";
      await db.epicas.put({
        id: epicaId,
        proyectoId: projectId,
        nombre: epica.nombre,
        descripcion: epica.descripcion,
      });

      for (const historia of epica.historias) {
        const historiaId = "hist_test_1";
        await db.historias.put({
          id: historiaId,
          proyectoId: projectId,
          epicaId,
          titulo: historia.titulo,
          descripcion: historia.descripcion,
          prioridad: historia.prioridad,
          estimacion: historia.estimacion,
          estado: "todo",
        });

        for (const act of historia.actividades) {
          await db.tareas.put({
            id: `tar_${Math.random()}`,
            proyectoId: projectId,
            historiaId,
            titulo: act,
            estado: "todo",
          });
        }
      }
    }
  });

  const epics = await db.epicas.where("proyectoId").equals(projectId).toArray();
  const stories = await db.historias
    .where("proyectoId")
    .equals(projectId)
    .toArray();
  const tasks = await db.tareas.where("proyectoId").equals(projectId).toArray();

  assert.strictEqual(epics.length, 1);
  assert.strictEqual(stories.length, 1);
  assert.strictEqual(tasks.length, 2);
  assert.strictEqual(epics[0].nombre, "Épica de Seguridad");
  assert.strictEqual(stories[0].titulo, "Inicio de sesión");

  // Mock sprint plan JSON
  const sprintData = [
    {
      nombre: "Sprint 1: Cimiento",
      objetivo: "Setup inicial",
      duracionSemanas: 2,
      capacidad: 20,
      historiasTitulos: ["Inicio de sesión"],
    },
  ];

  // Import Sprints logic
  await db.transaction("rw", [db.sprints, db.historias], async () => {
    for (const sprint of sprintData) {
      const sprintId = "spr_test_1";
      await db.sprints.put({
        id: sprintId,
        proyectoId: projectId,
        nombre: sprint.nombre,
        objetivo: sprint.objetivo,
        duracionSemanas: sprint.duracionSemanas,
        capacidad: sprint.capacidad,
        estado: "planificacion",
      });

      for (const title of sprint.historiasTitulos) {
        const matches = await db.historias
          .where("proyectoId")
          .equals(projectId)
          .filter((h) => h.titulo === title)
          .toArray();

        for (const match of matches) {
          await db.historias.update(match.id as string, { sprintId });
        }
      }
    }
  });

  const sprints = await db.sprints
    .where("proyectoId")
    .equals(projectId)
    .toArray();
  const updatedStory = await db.historias.get("hist_test_1");

  assert.strictEqual(sprints.length, 1);
  assert.strictEqual(sprints[0].nombre, "Sprint 1: Cimiento");
  assert.strictEqual(updatedStory?.sprintId, "spr_test_1");
});
