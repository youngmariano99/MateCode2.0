import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../../offline/dexie/db";
import { GestionarProcedimientosUseCase } from "./gestionar-procedimientos.use-case";
import { EjecutarProcedimientoUseCase } from "./ejecutar-procedimiento.use-case";
import { GestionarActividadesUseCase } from "./gestionar-actividades.use-case";

const gestionarProcedimientos = new GestionarProcedimientosUseCase();
const ejecutarProcedimiento = new EjecutarProcedimientoUseCase();
const gestionarActividades = new GestionarActividadesUseCase();

describe("Fase 3: Casos de Uso de Procedimientos y Ejecuciones", () => {
  beforeEach(async () => {
    for (const t of [
      db.procedimiento,
      db.ejecucion_procedimiento,
      db.actividad,
      db.cola_eventos,
      db.personal_historial,
    ]) {
      await t.clear();
    }
  });

  describe("GestionarProcedimientosUseCase (CRUD y Filtros)", () => {
    test("crearProcedimiento genera IDs de pasos, persiste en Dexie y encola evento", async () => {
      const res = await gestionarProcedimientos.crearProcedimiento({
        titulo: "SOP Contacto en Frío",
        categoria: "contacto_frio",
        descripcion: "Flujo estándar de prospección",
        color: "#3b82f6",
        pasos: [
          { titulo: "Buscar 10 perfiles en LinkedIn", orden: 1 },
          { titulo: "Personalizar mensaje de conexión", orden: 2 },
          { titulo: "Registrar en CRM", orden: 3, esObligatorio: false },
        ],
      });

      assert.strictEqual(res.ok, true);
      const procId = res.valor!;
      assert.ok(procId.startsWith("proc_"));

      const enDb = await db.procedimiento.get(procId);
      assert.ok(enDb);
      assert.strictEqual(enDb.titulo, "SOP Contacto en Frío");
      assert.strictEqual(enDb.pasos.length, 3);
      assert.strictEqual(enDb.vecesEjecutado, 0);
      assert.strictEqual(enDb.activo, true);
      assert.ok(enDb.pasos[0].id.startsWith("paso_"));

      // Evento de sync en cola
      const eventos = await db.cola_eventos
        .where("tabla")
        .equals("procedimiento")
        .toArray();
      assert.strictEqual(eventos.length, 1);
      assert.strictEqual(eventos[0].accion, "crear");

      // Historial registrado
      const hist = await db.personal_historial.toArray();
      assert.strictEqual(hist.length, 1);
      assert.strictEqual(hist[0].entidadTipo, "procedimiento");
    });

    test("editarProcedimiento actualiza propiedades y pasos", async () => {
      const creado = await gestionarProcedimientos.crearProcedimiento({
        titulo: "Desarrollo Feature",
        categoria: "desarrollo",
        pasos: [{ titulo: "Escribir test" }],
      });
      const id = creado.valor!;

      const editRes = await gestionarProcedimientos.editarProcedimiento({
        id,
        titulo: "Desarrollo TDD",
        clienteId: "cli_123",
        pasos: [
          { titulo: "Escribir test rojo" },
          { titulo: "Hacer pasar test verde" },
          { titulo: "Refactorizar" },
        ],
      });
      assert.strictEqual(editRes.ok, true);

      const actualizado = (await db.procedimiento.get(id))!;
      assert.strictEqual(actualizado.titulo, "Desarrollo TDD");
      assert.strictEqual(actualizado.clienteId, "cli_123");
      assert.strictEqual(actualizado.pasos.length, 3);
    });

    test("eliminarProcedimiento realiza soft-delete", async () => {
      const creado = await gestionarProcedimientos.crearProcedimiento({
        titulo: "A eliminar",
        categoria: "general",
        pasos: [{ titulo: "Paso 1" }],
      });
      const id = creado.valor!;

      const elimRes = await gestionarProcedimientos.eliminarProcedimiento(id);
      assert.strictEqual(elimRes.ok, true);

      const enDb = (await db.procedimiento.get(id))!;
      assert.ok(enDb.eliminadoEn);
      assert.strictEqual(enDb.activo, false);

      const obtenerRes = await gestionarProcedimientos.obtenerPorId(id);
      assert.strictEqual(obtenerRes.ok, false);

      const lista = await gestionarProcedimientos.listar();
      assert.strictEqual(lista.length, 0);
    });

    test("listar filtra por categoría, cliente y búsqueda", async () => {
      await gestionarProcedimientos.crearProcedimiento({
        titulo: "Contacto en Frío B2B",
        categoria: "contacto_frio",
        pasos: [{ titulo: "Investigar nicho" }],
      });
      await gestionarProcedimientos.crearProcedimiento({
        titulo: "Desarrollo Cliente Alfa",
        categoria: "desarrollo",
        clienteId: "cli_alfa",
        pasos: [{ titulo: "Setup repo" }],
      });
      await gestionarProcedimientos.crearProcedimiento({
        titulo: "Rutina Estudio TypeScript",
        categoria: "estudio",
        pasos: [{ titulo: "Leer docs" }],
      });

      // Filtro por categoría
      const dev = await gestionarProcedimientos.listar({
        categoria: "desarrollo",
      });
      assert.strictEqual(dev.length, 1);
      assert.strictEqual(dev[0].titulo, "Desarrollo Cliente Alfa");

      // Filtro por cliente
      const alfa = await gestionarProcedimientos.listar({
        clienteId: "cli_alfa",
      });
      assert.strictEqual(alfa.length, 1);

      // Búsqueda de texto
      const buscados = await gestionarProcedimientos.listar({
        busqueda: "typescript",
      });
      assert.strictEqual(buscados.length, 1);
      assert.strictEqual(buscados[0].titulo, "Rutina Estudio TypeScript");
    });
  });

  describe("EjecutarProcedimientoUseCase (Ciclo de Vida de Ejecución)", () => {
    test("iniciarEjecucion clona pasos, vincula con actividad y actualiza estadísticas", async () => {
      const procRes = await gestionarProcedimientos.crearProcedimiento({
        titulo: "Desarrollo Sprint",
        categoria: "desarrollo",
        pasos: [
          { titulo: "Revisar arquitectura", esObligatorio: true },
          { titulo: "Implementar código", esObligatorio: true },
          { titulo: "Verificar lints y tests", esObligatorio: true },
        ],
      });
      const procId = procRes.valor!;

      const actRes = await gestionarActividades.crearActividad({
        descripcion: "Implementar nuevo endpoint",
        tipo: "enfoque",
        diaTarea: "2026-10-26",
      });
      const actId = actRes.valor!;

      const ejecRes = await ejecutarProcedimiento.iniciarEjecucion({
        procedimientoId: procId,
        actividadId: actId,
        diaTarea: "2026-10-26",
      });
      assert.strictEqual(ejecRes.ok, true);
      const ejecId = ejecRes.valor!;

      // Verifica la ejecución
      const ejecucion = (await db.ejecucion_procedimiento.get(ejecId))!;
      assert.strictEqual(ejecucion.procedimientoId, procId);
      assert.strictEqual(ejecucion.tituloProcedimiento, "Desarrollo Sprint");
      assert.strictEqual(ejecucion.actividadId, actId);
      assert.strictEqual(ejecucion.estado, "en_progreso");
      assert.strictEqual(ejecucion.totalPasos, 3);
      assert.strictEqual(ejecucion.pasosCompletados, 0);
      assert.strictEqual(ejecucion.porcentajeAvance, 0);

      // Verifica que la actividad tenga vinculada la ejecución y el procedimiento
      const act = (await db.actividad.get(actId))!;
      assert.strictEqual(act.procedimientoId, procId);
      assert.strictEqual(act.procedimientoEjecucionId, ejecId);

      // Verifica que el procedimiento template aumentó sus veces ejecutado
      const proc = (await db.procedimiento.get(procId))!;
      assert.strictEqual(proc.vecesEjecutado, 1);
      assert.ok(proc.ultimoEjecutadoEn);
    });

    test("tildarPaso actualiza progreso y autocompleta la actividad al finalizar", async () => {
      const procRes = await gestionarProcedimientos.crearProcedimiento({
        titulo: "Revisión Rápida",
        categoria: "general",
        pasos: [
          { titulo: "Paso 1", esObligatorio: true },
          { titulo: "Paso 2", esObligatorio: true },
        ],
      });
      const procId = procRes.valor!;

      const actRes = await gestionarActividades.crearActividad({
        descripcion: "Hacer revisión rápida",
        tipo: "mantenimiento",
        diaTarea: "2026-10-26",
      });
      const actId = actRes.valor!;

      const ejecRes = await ejecutarProcedimiento.iniciarEjecucion({
        procedimientoId: procId,
        actividadId: actId,
        diaTarea: "2026-10-26",
      });
      const ejecId = ejecRes.valor!;
      const ejecucionInicial = (await db.ejecucion_procedimiento.get(ejecId))!;
      const [paso1, paso2] = ejecucionInicial.pasos;

      // 1. Tildar primer paso
      const resPaso1 = await ejecutarProcedimiento.tildarPaso({
        ejecucionId: ejecId,
        pasoId: paso1.pasoId,
        completado: true,
        nota: "Primer paso listo",
      });
      assert.strictEqual(resPaso1.ok, true);
      assert.strictEqual(resPaso1.valor!.pasosCompletados, 1);
      assert.strictEqual(resPaso1.valor!.porcentajeAvance, 50);
      assert.strictEqual(resPaso1.valor!.estado, "en_progreso");

      // La actividad todavía debe estar pendiente
      let act = (await db.actividad.get(actId))!;
      assert.strictEqual(act.estado, "pendiente");

      // 2. Tildar segundo paso (100% completado)
      const resPaso2 = await ejecutarProcedimiento.tildarPaso({
        ejecucionId: ejecId,
        pasoId: paso2.pasoId,
        completado: true,
      });
      assert.strictEqual(resPaso2.ok, true);
      assert.strictEqual(resPaso2.valor!.pasosCompletados, 2);
      assert.strictEqual(resPaso2.valor!.porcentajeAvance, 100);
      assert.strictEqual(resPaso2.valor!.estado, "completado");

      // La actividad vinculada se autocompleta automáticamente
      act = (await db.actividad.get(actId))!;
      assert.strictEqual(act.estado, "completada");
    });

    test("pausar y reanudar ejecución", async () => {
      const procRes = await gestionarProcedimientos.crearProcedimiento({
        titulo: "SOP Pausa",
        categoria: "general",
        pasos: [{ titulo: "Paso 1" }],
      });
      const ejecRes = await ejecutarProcedimiento.iniciarEjecucion({
        procedimientoId: procRes.valor!,
        diaTarea: "2026-10-26",
      });
      const ejecId = ejecRes.valor!;

      await ejecutarProcedimiento.pausarEjecucion(ejecId);
      let ejec = (await db.ejecucion_procedimiento.get(ejecId))!;
      assert.strictEqual(ejec.estado, "pausado");

      await ejecutarProcedimiento.reanudarEjecucion(ejecId);
      ejec = (await db.ejecucion_procedimiento.get(ejecId))!;
      assert.strictEqual(ejec.estado, "en_progreso");
    });

    test("migrarActividad traslada la ejecución con sus checks preservados al nuevo día", async () => {
      const procRes = await gestionarProcedimientos.crearProcedimiento({
        titulo: "SOP Migración",
        categoria: "desarrollo",
        pasos: [
          { titulo: "Paso A (hecho hoy)", esObligatorio: true },
          { titulo: "Paso B (para mañana)", esObligatorio: true },
        ],
      });
      const procId = procRes.valor!;

      const actRes = await gestionarActividades.crearActividad({
        descripcion: "Actividad con SOP a migrar",
        tipo: "enfoque",
        diaTarea: "2026-10-26",
      });
      const actOriginalId = actRes.valor!;

      const ejecRes = await ejecutarProcedimiento.iniciarEjecucion({
        procedimientoId: procId,
        actividadId: actOriginalId,
        diaTarea: "2026-10-26",
      });
      const ejecId = ejecRes.valor!;

      // Tildamos el Paso A hoy
      const ejec = (await db.ejecucion_procedimiento.get(ejecId))!;
      await ejecutarProcedimiento.tildarPaso({
        ejecucionId: ejecId,
        pasoId: ejec.pasos[0].pasoId,
        completado: true,
      });

      // No terminamos el Paso B, migramos la actividad a mañana
      const migrarRes = await gestionarActividades.migrarActividad({
        id: actOriginalId,
        nuevoDiaTarea: "2026-10-27",
        motivo: "Se hizo tarde, continúo mañana",
      });
      assert.strictEqual(migrarRes.ok, true);
      const nuevaActId = migrarRes.valor!;

      // La nueva actividad tiene la ejecución vinculada
      const nuevaAct = (await db.actividad.get(nuevaActId))!;
      assert.strictEqual(nuevaAct.procedimientoId, procId);
      assert.strictEqual(nuevaAct.procedimientoEjecucionId, ejecId);
      assert.strictEqual(nuevaAct.diaTarea, "2026-10-27");

      // La ejecución se actualizó apuntando a la nueva actividad y al nuevo día
      const ejecMigrada = (await db.ejecucion_procedimiento.get(ejecId))!;
      assert.strictEqual(ejecMigrada.actividadId, nuevaActId);
      assert.strictEqual(ejecMigrada.diaTarea, "2026-10-27");
      // ¡Los pasos tildados siguen intactos!
      assert.strictEqual(ejecMigrada.pasos[0].completado, true);
      assert.strictEqual(ejecMigrada.pasos[1].completado, false);
      assert.strictEqual(ejecMigrada.porcentajeAvance, 50);
    });
  });

  describe("Fase 4: Integración con IA y Esquemas JSON", () => {
    test("generarPromptProcedimiento genera estructura XML con rol, contexto y output_requerido", async () => {
      const { generarPromptProcedimiento } =
        await import("../../../domain/prompts/generar-prompt-jerarquia-personal");
      const prompt = generarPromptProcedimiento({
        tema: "Contacto en frío LinkedIn",
        categoria: "contacto_frio",
        clienteNombre: "Cliente Beta",
        detallesExtra: "Incluir verificación de perfil antes de escribir",
      });

      assert.ok(prompt.includes("<rol>"));
      assert.ok(prompt.includes("<contexto>"));
      assert.ok(prompt.includes("<instrucciones>"));
      assert.ok(prompt.includes("<output_requerido>"));
      assert.ok(prompt.includes("Contacto en frío LinkedIn"));
      assert.ok(prompt.includes("procedimientosNuevos"));
      assert.ok(prompt.includes("esObligatorio"));
    });

    test("importarProcedimientos es idempotente y crea múltiples SOPs", async () => {
      const res1 = await gestionarProcedimientos.importarProcedimientos({
        procedimientosNuevos: [
          {
            titulo: "SOP Ingesta de Clientes",
            categoria: "servicio_cliente",
            descripcion: "Pasos para dar de alta a un cliente nuevo",
            pasos: [
              { titulo: "Crear carpeta Drive", orden: 1 },
              { titulo: "Enviar cuestionario inicial", orden: 2 },
            ],
          },
          {
            titulo: "SOP Deploy a Producción",
            categoria: "desarrollo",
            pasos: [
              { titulo: "Correr suite de tests", orden: 1 },
              { titulo: "Merge a main", orden: 2 },
            ],
          },
        ],
      });

      assert.strictEqual(res1.ok, true);
      assert.strictEqual(res1.valor!.creados, 2);
      assert.strictEqual(res1.valor!.omitidos, 0);

      // Re-importar el mismo lote no debe duplicar (idempotente)
      const res2 = await gestionarProcedimientos.importarProcedimientos({
        procedimientosNuevos: [
          {
            titulo: "SOP Ingesta de Clientes",
            categoria: "servicio_cliente",
            pasos: [{ titulo: "Crear carpeta Drive" }],
          },
          {
            titulo: "SOP Nuevo",
            categoria: "general",
            pasos: [{ titulo: "Paso único" }],
          },
        ],
      });

      assert.strictEqual(res2.ok, true);
      assert.strictEqual(res2.valor!.creados, 1);
      assert.strictEqual(res2.valor!.omitidos, 1);

      const todos = await gestionarProcedimientos.listar();
      assert.strictEqual(todos.length, 3);
    });
  });
});
