import "fake-indexeddb/auto";
import { test, describe } from "node:test";
import assert from "node:assert";
import { GestionarIngenieriaUseCase } from "../../application/use-cases/proyecto/gestionar-ingenieria.use-case";
import { GestionarBacklogUseCase } from "../../application/use-cases/proyecto/gestionar-backlog.use-case";
import { db } from "../../offline/dexie/db";

describe("Centro de Ingeniería del Proyecto (Sprint 13)", () => {
  test("Debería guardar stack técnico, estándares y PO", async () => {
    await db.proyectos.clear();

    await db.proyectos.put({
      id: "pro_test_ing",
      nombre: "Proyecto Inteligente",
      tipo: "E-commerce",
      estado: "Desarrollo",
    });

    const ingUC = new GestionarIngenieriaUseCase();

    const stack = {
      frontend: ["Next.js", "Tailwind"],
      backend: ["NestJS"],
      baseDatos: ["PostgreSQL"],
      infraestructura: ["Docker"],
      seguridad: ["JWT"],
      integraciones: ["Stripe"],
    };

    const estandares = {
      arquitectura: ["Clean Architecture"],
      patrones: ["Repository"],
      buenasPracticas: ["SOLID"],
      principios: ["SRP"],
      testing: ["Unitarios"],
      devops: ["CI/CD"],
      coberturaMinima: 90,
    };

    const resConfig = await ingUC.configurarStackYEstandares(
      "pro_test_ing",
      stack,
      estandares
    );
    assert.strictEqual(resConfig.ok, true);

    const proMod = await db.proyectos.get("pro_test_ing");
    assert.deepStrictEqual(proMod?.stack, stack);
    assert.deepStrictEqual(proMod?.estandares, estandares);

    const po = {
      problema: "Checkout lento",
      dolor: "Usuarios abandonan carrito",
      objetivos: "Reducir fricción",
      usuarios: "Compradores",
      restricciones: "Sin conexión móvil",
      competencia: "Tienda local",
      notas: "Revisar API Stripe",
    };

    const resPO = await ingUC.guardarProductOwner("pro_test_ing", po);
    assert.strictEqual(resPO.ok, true);

    const proPO = await db.proyectos.get("pro_test_ing");
    assert.deepStrictEqual(proPO?.productOwner, po);
  });

  test("Debería generar prompt de IA y exportar Markdown", async () => {
    const ingUC = new GestionarIngenieriaUseCase();
    const promptRes = await ingUC.generarPrompt("pro_test_ing");
    assert.strictEqual(promptRes.ok, true);
    assert.ok(promptRes.valor.includes("Actúa como un Ingeniero"));

    const mdRes = await ingUC.exportarContextoMarkdown("pro_test_ing");
    assert.strictEqual(mdRes.ok, true);
    assert.ok(mdRes.valor.includes("# Contexto del Proyecto"));
  });

  test("Debería importar backlog desde JSON validado", async () => {
    await db.epicas.clear();
    await db.historias.clear();

    const ingUC = new GestionarIngenieriaUseCase();
    const backlogJSON = JSON.stringify({
      epicas: [
        {
          id: "epi_1",
          nombre: "Gestión de Autenticación",
          descripcion: "Registro y login",
        },
      ],
      historias: [
        {
          id: "his_1",
          epicaId: "epi_1",
          titulo: "Login con Google",
          descripcion: "Como usuario quiero entrar con Google para...",
          prioridad: "Alta",
          estimacion: 3,
          dependencias: [],
          etiquetas: ["auth"],
        },
      ],
    });

    const resImport = await ingUC.importarBacklogJSON(
      "pro_test_ing",
      backlogJSON
    );
    assert.strictEqual(resImport.ok, true);

    const epicas = await db.epicas.toArray();
    assert.strictEqual(epicas.length, 1);
    assert.strictEqual(epicas[0].nombre, "Gestión de Autenticación");

    const historias = await db.historias.toArray();
    assert.strictEqual(historias.length, 1);
    assert.strictEqual(historias[0].titulo, "Login con Google");
  });

  test("Debería planificar y finalizar sprints gestionando historias del backlog", async () => {
    const backlogUC = new GestionarBacklogUseCase();

    const sprintPayload = {
      nombre: "Sprint 1: MVP Core",
      duracionSemanas: 2,
      fechaInicio: Date.now(),
      fechaFin: Date.now() + 14 * 24 * 60 * 60 * 1000,
      objetivo: "Login funcional",
      descripcion: "MVP de registro",
      capacidad: 10,
      miembros: ["Mariano"],
      historiasIds: ["his_1"],
    };

    const resSprint = await backlogUC.planificarSprint(
      "pro_test_ing",
      sprintPayload
    );
    assert.strictEqual(resSprint.ok, true);

    const hisPlan = await db.historias.get("his_1");
    assert.strictEqual(hisPlan?.sprintId, resSprint.valor);
    assert.strictEqual(hisPlan?.estado, "todo");

    const resKanban = await backlogUC.actualizarEstadoHistoria("his_1", "done");
    assert.strictEqual(resKanban.ok, true);

    const resFin = await backlogUC.finalizarSprint(resSprint.valor!);
    assert.strictEqual(resFin.ok, true);

    const hisCompletada = await db.historias.get("his_1");
    assert.strictEqual(hisCompletada?.completada, true);
  });
});
