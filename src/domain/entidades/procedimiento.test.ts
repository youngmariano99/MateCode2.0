import "fake-indexeddb/auto";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../offline/dexie/db";
import {
  crearProcedimientoSchema,
  calcularProgresoProcedimiento,
  clonarPasosParaEjecucion,
  aplicarTildadoPaso,
  type PasoProcedimientoDefinicion,
  type Procedimiento,
  type EjecucionProcedimiento,
} from "./procedimiento.entity";

describe("Procedimiento — Entidad de Dominio y Contratos Zod", () => {
  it("valida la creación de un procedimiento genérico sin cliente (ej. Contacto en frío o Estudio)", () => {
    const inputGenerico = {
      titulo: "Rutina de Contacto en Frío",
      descripcion: "Pasos diarios para prospección en frío",
      categoria: "contacto_frio" as const,
      tags: ["prospeccion", "outreach"],
      pasos: [
        {
          orden: 0,
          titulo: "Calificar 5 cuentas objetivo",
          duracionEstimadaMin: 15,
          esObligatorio: true,
        },
        {
          orden: 1,
          titulo: "Enviar pitch o Loom personalizado",
          duracionEstimadaMin: 30,
          esObligatorio: true,
        },
        {
          orden: 2,
          titulo: "Registrar intentos en el CRM",
          duracionEstimadaMin: 10,
          esObligatorio: false,
        },
      ],
    };

    const parsed = crearProcedimientoSchema.safeParse(inputGenerico);
    assert.ok(parsed.success);
    assert.equal(parsed.data.clienteId, undefined);
    assert.equal(parsed.data.pasos.length, 3);
  });

  it("valida un procedimiento con cliente y proyecto asociado (ej. Desarrollo de Software)", () => {
    const inputConCliente = {
      titulo: "Despliegue y QA de Feature",
      categoria: "desarrollo" as const,
      clienteId: "cli_123",
      proyectoTrabajoId: "proy_crm_456",
      pasos: [
        { orden: 0, titulo: "Correr suite de tests", esObligatorio: true },
        {
          orden: 1,
          titulo: "Merge a rama main y tag de versión",
          esObligatorio: true,
        },
        {
          orden: 2,
          titulo: "Verificar despliegue en Vercel",
          esObligatorio: true,
        },
      ],
    };

    const parsed = crearProcedimientoSchema.safeParse(inputConCliente);
    assert.ok(parsed.success);
    assert.equal(parsed.data.clienteId, "cli_123");
    assert.equal(parsed.data.proyectoTrabajoId, "proy_crm_456");
  });

  it("rechaza procedimientos sin pasos o sin título", () => {
    const sinPasos = {
      titulo: "Procedimiento vacío",
      categoria: "general" as const,
      pasos: [],
    };
    const resSinPasos = crearProcedimientoSchema.safeParse(sinPasos);
    assert.ok(!resSinPasos.success);

    const sinTitulo = {
      titulo: "   ",
      categoria: "general" as const,
      pasos: [{ orden: 0, titulo: "Paso 1", esObligatorio: true }],
    };
    const resSinTitulo = crearProcedimientoSchema.safeParse(sinTitulo);
    assert.ok(!resSinTitulo.success);
  });

  it("clonarPasosParaEjecucion clona y ordena los pasos para iniciar una corrida", () => {
    const definiciones: PasoProcedimientoDefinicion[] = [
      { id: "p2", orden: 2, titulo: "Paso final", esObligatorio: true },
      { id: "p0", orden: 0, titulo: "Paso inicial", esObligatorio: true },
      { id: "p1", orden: 1, titulo: "Paso intermedio", esObligatorio: false },
    ];

    const pasosClonados = clonarPasosParaEjecucion(definiciones);
    assert.equal(pasosClonados.length, 3);
    assert.equal(pasosClonados[0].pasoId, "p0");
    assert.equal(pasosClonados[1].pasoId, "p1");
    assert.equal(pasosClonados[2].pasoId, "p2");
    assert.ok(pasosClonados.every((p) => p.completado === false));
  });

  it("calcularProgresoProcedimiento calcula avance y verifica pasos obligatorios", () => {
    const pasos = [
      {
        pasoId: "p1",
        orden: 0,
        titulo: "1",
        esObligatorio: true,
        completado: true,
      },
      {
        pasoId: "p2",
        orden: 1,
        titulo: "2",
        esObligatorio: true,
        completado: false,
      },
      {
        pasoId: "p3",
        orden: 2,
        titulo: "3",
        esObligatorio: false,
        completado: true,
      },
      {
        pasoId: "p4",
        orden: 3,
        titulo: "4",
        esObligatorio: false,
        completado: false,
      },
    ];

    const metricas = calcularProgresoProcedimiento(pasos);
    assert.equal(metricas.totalPasos, 4);
    assert.equal(metricas.pasosCompletados, 2);
    assert.equal(metricas.porcentajeAvance, 50);
    assert.equal(metricas.todoObligatorioListo, false); // Falta p2

    // Al completar p2
    pasos[1].completado = true;
    const metricas2 = calcularProgresoProcedimiento(pasos);
    assert.equal(metricas2.pasosCompletados, 3);
    assert.equal(metricas2.porcentajeAvance, 75);
    assert.equal(metricas2.todoObligatorioListo, true); // p1 y p2 están listos
  });

  it("aplicarTildadoPaso actualiza de forma inmutable y autotransiciona de estado", () => {
    const ejecucionBase: EjecucionProcedimiento = {
      id: "run_1",
      procedimientoId: "proc_1",
      tituloProcedimiento: "Desarrollo de API",
      diaTarea: "2026-10-26",
      estado: "en_progreso",
      pasos: [
        {
          pasoId: "p1",
          orden: 0,
          titulo: "Schema",
          esObligatorio: true,
          completado: false,
        },
        {
          pasoId: "p2",
          orden: 1,
          titulo: "Endpoints",
          esObligatorio: true,
          completado: false,
        },
      ],
      totalPasos: 2,
      pasosCompletados: 0,
      porcentajeAvance: 0,
      todoObligatorioListo: false,
      iniciadoEn: 1000,
      actualizadoEn: 1000,
    };

    // Tildamos paso 1 a la mañana
    const tarde = 2000;
    const conPaso1 = aplicarTildadoPaso(
      ejecucionBase,
      "p1",
      true,
      "Schema listo",
      tarde
    );
    assert.equal(conPaso1.pasosCompletados, 1);
    assert.equal(conPaso1.porcentajeAvance, 50);
    assert.equal(conPaso1.todoObligatorioListo, false);
    assert.equal(conPaso1.estado, "en_progreso");
    assert.equal(conPaso1.pasos[0].completado, true);
    assert.equal(conPaso1.pasos[0].completadoEn, tarde);
    assert.equal(conPaso1.pasos[0].nota, "Schema listo");

    // Tildamos paso 2 a la tarde -> Finaliza el procedimiento
    const noche = 5000;
    const conPaso2 = aplicarTildadoPaso(conPaso1, "p2", true, undefined, noche);
    assert.equal(conPaso2.pasosCompletados, 2);
    assert.equal(conPaso2.porcentajeAvance, 100);
    assert.equal(conPaso2.todoObligatorioListo, true);
    assert.equal(conPaso2.estado, "completado");
    assert.equal(conPaso2.finalizadoEn, noche);
  });
});

describe("Procedimiento — Persistencia Dexie v30", () => {
  beforeEach(async () => {
    await db.procedimiento.clear();
    await db.ejecucion_procedimiento.clear();
  });

  it("persiste y consulta procedimientos por categoría y clienteId", async () => {
    const ahora = Date.now();
    const proc1: Procedimiento = {
      id: "proc_dev_1",
      titulo: "Pipeline de Feature",
      categoria: "desarrollo",
      clienteId: "cli_alfa",
      tags: ["dev", "feature"],
      pasos: [{ id: "p1", orden: 0, titulo: "Code", esObligatorio: true }],
      activo: true,
      vecesEjecutado: 1,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    const proc2: Procedimiento = {
      id: "proc_outreach_1",
      titulo: "Contacto en Frío Diario",
      categoria: "contacto_frio",
      tags: ["outreach"],
      pasos: [{ id: "p1", orden: 0, titulo: "Pitch", esObligatorio: true }],
      activo: true,
      vecesEjecutado: 5,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    await db.procedimiento.bulkPut([proc1, proc2]);

    const devProcs = await db.procedimiento
      .where("categoria")
      .equals("desarrollo")
      .toArray();
    assert.equal(devProcs.length, 1);
    assert.equal(devProcs[0].id, "proc_dev_1");

    const clienteProcs = await db.procedimiento
      .where("clienteId")
      .equals("cli_alfa")
      .toArray();
    assert.equal(clienteProcs.length, 1);
    assert.equal(clienteProcs[0].titulo, "Pipeline de Feature");
  });

  it("persiste ejecuciones y permite filtrar por diaTarea y estado", async () => {
    const ahora = Date.now();
    const ejecucion: EjecucionProcedimiento = {
      id: "run_100",
      procedimientoId: "proc_dev_1",
      tituloProcedimiento: "Pipeline de Feature",
      diaTarea: "2026-10-26",
      estado: "en_progreso",
      clienteId: "cli_alfa",
      actividadId: "act_999",
      pasos: [
        {
          pasoId: "p1",
          orden: 0,
          titulo: "Code",
          esObligatorio: true,
          completado: true,
          completadoEn: ahora,
        },
        {
          pasoId: "p2",
          orden: 1,
          titulo: "Deploy",
          esObligatorio: true,
          completado: false,
        },
      ],
      totalPasos: 2,
      pasosCompletados: 1,
      porcentajeAvance: 50,
      todoObligatorioListo: false,
      iniciadoEn: ahora,
      actualizadoEn: ahora,
    };

    await db.ejecucion_procedimiento.put(ejecucion);

    const activasHoy = await db.ejecucion_procedimiento
      .where("diaTarea")
      .equals("2026-10-26")
      .filter((e) => e.estado === "en_progreso")
      .toArray();

    assert.equal(activasHoy.length, 1);
    assert.equal(activasHoy[0].tituloProcedimiento, "Pipeline de Feature");
    assert.equal(activasHoy[0].pasosCompletados, 1);

    // Actualizamos a completado
    await db.ejecucion_procedimiento.update("run_100", {
      estado: "completado",
      pasosCompletados: 2,
      porcentajeAvance: 100,
      todoObligatorioListo: true,
      actualizadoEn: ahora + 1000,
    });

    const guardada = await db.ejecucion_procedimiento.get("run_100");
    assert.equal(guardada?.estado, "completado");
    assert.equal(guardada?.porcentajeAvance, 100);
  });
});
