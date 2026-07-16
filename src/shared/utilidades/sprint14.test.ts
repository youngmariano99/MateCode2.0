/* eslint-disable @typescript-eslint/no-explicit-any */
import "fake-indexeddb/auto";
import { test, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarIngenieriaUseCase } from "../../application/use-cases/proyecto/gestionar-ingenieria.use-case";

const PROYECTO_ID = "test_sprint14_proj";

beforeEach(async () => {
  // Setup tables clean state
  await db.proyectos.clear();
  await db.epicas.clear();
  await db.historias.clear();
  await db.prompt_templates.clear();
  await db.proyecto_contexto.clear();
  await db.proyecto_design_system.clear();
  await db.proyecto_estado_tecnico.clear();

  // Seed project
  await db.proyectos.put({
    id: PROYECTO_ID,
    nombre: "Test App",
    tipo: "SaaS",
    descripcion: "Una app para pruebas",
    stack: {
      frontend: ["React"],
      backend: ["NodeJS"],
      baseDatos: ["PostgreSQL"],
    },
    estandares: {
      arquitectura: ["Clean Architecture"],
      patrones: ["Repository Pattern"],
    },
  });

  // Seed prompt template
  await db.prompt_templates.put({
    id: "test_temp_id",
    fase: "Arquitectura",
    titulo: "Test Template",
    contenido:
      "Proyecto: {{dolores_cliente}} utilizando {{stack_frontend}} y {{arquetipo}}.",
    variables_requeridas: ["dolores_cliente", "stack_frontend", "arquetipo"],
  });
});

test("Sprint 14: Debería generar prompt especializado resolviendo placeholders e inyectando contrato", async () => {
  const uc = new GestionarIngenieriaUseCase();

  // Seed context and design system
  await db.proyecto_contexto.put({
    proyectoId: PROYECTO_ID,
    doloresCliente: "El cliente tiene demoras en la carga de datos",
  });
  await db.proyecto_design_system.put({
    proyectoId: PROYECTO_ID,
    arquetipo: "Brutalismo Impactante",
  });

  const res = await uc.generarPromptEspecializado(PROYECTO_ID, "test_temp_id", {
    stack_frontend: "NextJS", // Override stack variables
  });

  assert.strictEqual(res.ok, true);
  // Verify placeholders resolved
  assert.ok(
    res.valor.includes("El cliente tiene demoras en la carga de datos")
  );
  assert.ok(res.valor.includes("NextJS"));
  assert.ok(res.valor.includes("Brutalismo Impactante"));
  // Verify hidden contract injected
  assert.ok(res.valor.includes("[Instrucción de Sistema Oculta]"));
  assert.ok(res.valor.includes("json-app-sync"));
});

test("Sprint 14: Debería importar backlog y reverse-engineer contexto/design system", async () => {
  const uc = new GestionarIngenieriaUseCase();

  const fullIngestaJson = JSON.stringify({
    contexto: {
      doloresCliente: "Dolores de ingesta recuperados",
      reglasNegocio: "Solo administradores pueden eliminar",
      publicoObjetivo: "Empresas PYME",
    },
    stack: {
      frontend: ["Vue", "Tailwind"],
      backend: ["FastAPI"],
      baseDatos: ["SQLite"],
    },
    designSystem: {
      arquetipo: "Cyberpunk Oscuro",
      metafora: "Diseño futurista de hackers",
      radioBordes: "0px",
    },
    epicas: [
      {
        id: "ep_ingesta",
        nombre: "Epica Ingesta",
        descripcion: "Modulo ingesta",
      },
    ],
    historias: [
      {
        id: "us_ingesta",
        epicaId: "ep_ingesta",
        titulo: "Historia Ingesta",
        descripcion: "Desc ingesta",
        prioridad: "Alta",
        estimacion: 5,
      },
    ],
  });

  const res = await uc.importarBacklogJSON(PROYECTO_ID, fullIngestaJson);
  assert.strictEqual(res.ok, true);

  // Assert backlog created
  const epicas = await db.epicas.toArray();
  assert.strictEqual(epicas.length, 1);
  assert.strictEqual(epicas[0].nombre, "Epica Ingesta");

  // Assert context restored
  const contexto = await db.proyecto_contexto.get(PROYECTO_ID);
  assert.strictEqual(
    contexto?.doloresCliente,
    "Dolores de ingesta recuperados"
  );

  // Assert design system restored
  const ds = await db.proyecto_design_system.get(PROYECTO_ID);
  assert.strictEqual(ds?.arquetipo, "Cyberpunk Oscuro");
  assert.strictEqual(ds?.metafora, "Diseño futurista de hackers");

  // Assert project stack synced
  const proj = await db.proyectos.get(PROYECTO_ID);
  assert.deepStrictEqual(proj?.stack, {
    frontend: ["Vue", "Tailwind"],
    backend: ["FastAPI"],
    baseDatos: ["SQLite"],
  });
});

test("Sprint 14: Debería sincronizar dependencias y base de datos de retorno json-app-sync", async () => {
  const uc = new GestionarIngenieriaUseCase();

  // Test sync dependencies
  const syncDepsJson = `
  \`\`\`json-app-sync
  {
    "update_type": "dependencies",
    "data": {
      "dependencies": ["lodash", "axios"]
    }
  }
  \`\`\`
  `;

  const res1 = await uc.sincronizarEstado(PROYECTO_ID, syncDepsJson);
  if (!res1.ok) {
    console.error("SYNC DEPS ERROR:", res1.error);
  }
  assert.strictEqual(res1.ok, true);

  const state1 = await db.proyecto_estado_tecnico.get(PROYECTO_ID);
  assert.deepStrictEqual(state1?.dependencias, ["lodash", "axios"]);

  // Test sync database schema
  const syncDbJson = `
  {
    "update_type": "database",
    "data": {
      "esquemaDb": {
        "usuarios": {
          "campos": ["id", "email", "hashed_password"],
          "descripcion": "Tabla de usuarios del sistema"
        }
      }
    }
  }
  `;

  const res2 = await uc.sincronizarEstado(PROYECTO_ID, syncDbJson);
  assert.strictEqual(res2.ok, true);

  const state2 = await db.proyecto_estado_tecnico.get(PROYECTO_ID);
  assert.ok((state2?.esquemaDb as any).usuarios);
  assert.strictEqual(
    (state2?.esquemaDb as any).usuarios.descripcion,
    "Tabla de usuarios del sistema"
  );
});
