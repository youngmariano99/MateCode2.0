import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { ImportarPlanificacionUseCase } from "../../application/use-cases/personal/importar-planificacion.use-case";
import { generarResumenPeriodo } from "../../domain/prompts/generar-prompt-planificacion-personal";
import type {
  HabitoDefinicion,
  HabitoRegistro,
} from "../../domain/entidades/habitos.entity";
import type { ObjetivoCuantificable } from "../../domain/entidades/objetivo-cuantificable.entity";

const useCase = new ImportarPlanificacionUseCase();

describe("generarResumenPeriodo (función pura)", () => {
  test("resume el cumplimiento de hábitos y el ritmo de objetivos", () => {
    const habito: HabitoDefinicion = {
      id: "h1",
      nombre: "Contactar potenciales",
      descripcionMin: "1",
      descripcionMed: "3",
      descripcionMax: "5",
      area: "ambas",
      frecuencia: "diaria",
      activo: true,
      creadoEn: Date.now(),
      actualizadoEn: Date.now(),
    };
    const registros: HabitoRegistro[] = [
      {
        id: "r1",
        habitoId: "h1",
        diaTarea: "2026-01-01",
        nivelEjecutado: "MED",
        creadoEn: Date.now(),
      },
      {
        id: "r2",
        habitoId: "h1",
        diaTarea: "2026-01-02",
        nivelEjecutado: "MIN",
        creadoEn: Date.now(),
      },
      {
        id: "r3",
        habitoId: "h1",
        diaTarea: "2026-01-03",
        nivelEjecutado: "NO_CUMPLIDO",
        creadoEn: Date.now(),
      },
      {
        id: "r4",
        habitoId: "h1",
        diaTarea: "2026-01-04",
        nivelEjecutado: "MAX",
        creadoEn: Date.now(),
      },
    ];
    const objetivo: ObjetivoCuantificable = {
      id: "o1",
      titulo: "200 contactos",
      unidad: "contactos",
      cantidadObjetivo: 200,
      progresoActual: 120,
      diaInicio: "2026-01-01",
      diaLimite: "2026-01-11",
      area: "ambas",
      estado: "activo",
      creadoEn: Date.now(),
      actualizadoEn: Date.now(),
    };

    const resumen = generarResumenPeriodo(
      [habito],
      registros,
      [objetivo],
      "2026-01-06" // mitad de camino → 120/200 es "adelantado"
    );

    assert.match(
      resumen,
      /Contactar potenciales: cumplido 3\/4 días registrados/
    );
    assert.match(
      resumen,
      /200 contactos: 120\/200 contactos — ritmo adelantado/
    );
  });

  test("sin hábitos ni objetivos, devuelve un mensaje explícito en vez de texto vacío", () => {
    const resumen = generarResumenPeriodo([], [], [], "2026-01-06");
    assert.match(resumen, /Sin compromisos ni objetivos activos todavía/);
  });
});

describe("ImportarPlanificacionUseCase", () => {
  beforeEach(async () => {
    await db.tarea_diaria.clear();
    await db.tarea_pendiente.clear();
    await db.objetivo_cuantificable.clear();
  });

  test("importarSemana crea tareas diarias y pendientes del JSON", async () => {
    const res = await useCase.importarSemana([
      {
        tareasDiarias: [
          {
            diaTarea: "2026-01-06",
            tipo: "enfoque",
            descripcion: "Cerrar propuesta X",
          },
          {
            diaTarea: "2026-01-06",
            tipo: "mantenimiento",
            descripcion: "Responder mails",
          },
        ],
        pendientes: [{ descripcion: "Renovar dominio", prioridad: "urgente" }],
      },
    ]);
    assert.strictEqual(res.ok, true);

    const tareas = await db.tarea_diaria.toArray();
    const pendientes = await db.tarea_pendiente.toArray();
    assert.strictEqual(tareas.length, 2);
    assert.strictEqual(pendientes.length, 1);
    assert.strictEqual(pendientes[0].prioridad, "urgente");
  });

  test("importarObjetivos crea objetivos nuevos y ajusta uno existente por título exacto", async () => {
    const creado = await useCase.importarObjetivos([
      {
        objetivosNuevos: [
          {
            titulo: "Leer 12 libros",
            unidad: "libros",
            cantidadObjetivo: 12,
            diaLimite: "2026-12-31",
          },
        ],
      },
    ]);
    assert.strictEqual(creado.ok, true);

    const ajustado = await useCase.importarObjetivos([
      {
        ajustes: [{ titulo: "Leer 12 libros", cantidadObjetivo: 15 }],
      },
    ]);
    assert.strictEqual(ajustado.ok, true);

    const objetivos = await db.objetivo_cuantificable.toArray();
    assert.strictEqual(objetivos.length, 1);
    assert.strictEqual(objetivos[0].cantidadObjetivo, 15);
  });

  test("importarObjetivos: un ajuste a un título que no existe no crea nada ni rompe el resto", async () => {
    const res = await useCase.importarObjetivos([
      { ajustes: [{ titulo: "Objetivo inexistente", cantidadObjetivo: 10 }] },
    ]);
    assert.strictEqual(res.ok, false);
    const objetivos = await db.objetivo_cuantificable.toArray();
    assert.strictEqual(objetivos.length, 0);
  });

  test("importarSemana rechaza un JSON con estructura inválida (tipo de tarea inexistente) en vez de importarlo a medias", async () => {
    const res = await useCase.importarSemana([
      {
        tareasDiarias: [
          { diaTarea: "2026-01-06", tipo: "urgente", descripcion: "Algo" },
        ],
      },
    ]);
    assert.strictEqual(res.ok, false);
    assert.match(res.error!.mensaje, /estructura esperada/);
    assert.match(res.error!.mensaje, /tareasDiarias\.0\.tipo/);
    const tareas = await db.tarea_diaria.toArray();
    assert.strictEqual(tareas.length, 0);
  });

  test("importarSemana rechaza una fecha con formato inválido", async () => {
    const res = await useCase.importarSemana([
      {
        tareasDiarias: [
          { diaTarea: "6 de enero", tipo: "enfoque", descripcion: "Algo" },
        ],
      },
    ]);
    assert.strictEqual(res.ok, false);
    assert.match(res.error!.mensaje, /estructura esperada/);
  });

  test("importarObjetivos rechaza un objetivo nuevo sin cantidad", async () => {
    const res = await useCase.importarObjetivos([
      {
        objetivosNuevos: [
          { titulo: "Leer libros", unidad: "libros", diaLimite: "2026-12-31" },
        ],
      },
    ]);
    assert.strictEqual(res.ok, false);
    assert.match(res.error!.mensaje, /estructura esperada/);
    const objetivos = await db.objetivo_cuantificable.toArray();
    assert.strictEqual(objetivos.length, 0);
  });
});
