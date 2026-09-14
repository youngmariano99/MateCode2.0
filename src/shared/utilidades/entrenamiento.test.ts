import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarBloquesUseCase } from "../../application/use-cases/personal/gestionar-bloques.use-case";
import { GestionarPlantillasRutinaUseCase } from "../../application/use-cases/personal/gestionar-plantillas-rutina.use-case";
import { GestionarRegistroActividadUseCase } from "../../application/use-cases/personal/gestionar-registro-actividad.use-case";
import {
  ejesDisponibles,
  ejeEfectivo,
} from "../../domain/entidades/ejercicio.entity";
import { calcularMejoraEjercicio } from "../../domain/entidades/registro-actividad.entity";
import type { RegistroActividad } from "../../domain/entidades/registro-actividad.entity";

const bloques = new GestionarBloquesUseCase();
const plantillas = new GestionarPlantillasRutinaUseCase();
const registros = new GestionarRegistroActividadUseCase();

describe("Entrenamiento: eje de progresión efectivo (función pura)", () => {
  test("un ejercicio con carga y escalera tiene los 3 ejes disponibles", () => {
    const ejes = ejesDisponibles({
      permiteCarga: true,
      niveles: [{ nivel: 0, nombre: "", detalle: "" }],
    });
    assert.deepStrictEqual(
      ejes.sort(),
      ["carga", "progresion", "volumen"].sort()
    );
  });

  test("un ejercicio sin carga ni escalera solo tiene volumen", () => {
    const ejes = ejesDisponibles({ permiteCarga: false, niveles: [] });
    assert.deepStrictEqual(ejes, ["volumen"]);
  });

  test("el eje del bloque se respeta si el ejercicio lo soporta", () => {
    const ej = { permiteCarga: true, niveles: [] };
    assert.strictEqual(ejeEfectivo("carga", ej), "carga");
  });

  test("si el bloque pide 'carga' pero el ejercicio no la soporta, cae a progresión si tiene escalera", () => {
    const ej = {
      permiteCarga: false,
      niveles: [{ nivel: 0, nombre: "", detalle: "" }],
    };
    assert.strictEqual(ejeEfectivo("carga", ej), "progresion");
  });

  test("si no tiene ni carga ni escalera, cae a volumen (siempre disponible)", () => {
    const ej = { permiteCarga: false, niveles: [] };
    assert.strictEqual(ejeEfectivo("carga", ej), "volumen");
  });
});

describe("Entrenamiento: mejora por eje (función pura) — no mezcla unidades", () => {
  const registrosFalsos: RegistroActividad[] = [
    {
      id: "r1",
      plantillaId: "p1",
      diaTarea: "2026-01-01",
      comoPlanificado: true,
      resultados: [
        {
          ejercicioId: "cej_1",
          nivelUsado: -1,
          sets: [{ reps: 8, pesoKg: 10 }],
        },
      ],
      creadoEn: 0,
    },
    {
      id: "r2",
      plantillaId: "p1",
      diaTarea: "2026-01-08",
      comoPlanificado: true,
      resultados: [
        {
          ejercicioId: "cej_1",
          nivelUsado: 0,
          sets: [{ reps: 12, pesoKg: 15 }],
        },
      ],
      creadoEn: 0,
    },
  ];

  test("eje volumen compara reps acumuladas (ignora peso y nivel)", () => {
    const r = calcularMejoraEjercicio(registrosFalsos, "cej_1", "volumen");
    assert.strictEqual(r?.valorInicial, 8);
    assert.strictEqual(r?.valorFinal, 12);
    assert.strictEqual(r?.mejoro, true);
  });

  test("eje carga compara peso máximo usado (ignora reps y nivel)", () => {
    const r = calcularMejoraEjercicio(registrosFalsos, "cej_1", "carga");
    assert.strictEqual(r?.valorInicial, 10);
    assert.strictEqual(r?.valorFinal, 15);
    assert.strictEqual(r?.mejoro, true);
  });

  test("eje progresión compara el nivel de la escalera (ignora peso y reps)", () => {
    const r = calcularMejoraEjercicio(registrosFalsos, "cej_1", "progresion");
    assert.strictEqual(r?.valorInicial, -1);
    assert.strictEqual(r?.valorFinal, 0);
    assert.strictEqual(r?.mejoro, true);
  });

  test("sin registros de ese ejercicio, devuelve undefined", () => {
    const r = calcularMejoraEjercicio(
      registrosFalsos,
      "cej_inexistente",
      "volumen"
    );
    assert.strictEqual(r, undefined);
  });
});

describe("Entrenamiento: use-cases", () => {
  beforeEach(async () => {
    await db.bloque_entrenamiento.clear();
    await db.plantilla_rutina.clear();
    await db.registro_actividad.clear();
  });

  test("Crear bloque y cerrarlo", async () => {
    const creado = await bloques.crearBloque({
      nombre: "Bloque 1 — Volumen",
      diaInicio: "2026-01-01",
      diaFin: "2026-01-28",
      ejeProgresionDefault: "volumen",
    });
    assert.strictEqual(creado.ok, true);

    const cerrado = await bloques.cerrarBloque(creado.valor);
    assert.strictEqual(cerrado.ok, true);
    const row = await db.bloque_entrenamiento.get(creado.valor);
    assert.strictEqual(row?.estado, "cerrado");
  });

  test("Importar secuencia: el primero queda activo, el resto planificado y encadenado por fecha", async () => {
    const res = await bloques.importarSecuencia([
      {
        nombre: "Bloque 1 — Volumen",
        duracionSemanas: 4,
        ejeProgresionDefault: "volumen",
      },
      {
        nombre: "Bloque 2 — Fuerza",
        duracionSemanas: 2,
        ejeProgresionDefault: "carga",
      },
    ]);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.valor, 2);

    const todos = await db.bloque_entrenamiento.toArray();
    const activo = todos.find((b) => b.nombre === "Bloque 1 — Volumen");
    const planificado = todos.find((b) => b.nombre === "Bloque 2 — Fuerza");
    assert.strictEqual(activo?.estado, "activo");
    assert.strictEqual(planificado?.estado, "planificado");
    // El segundo bloque arranca el día siguiente a que termina el primero.
    const diaSiguiente = new Date(new Date(activo!.diaFin).getTime() + 86400000)
      .toISOString()
      .slice(0, 10);
    assert.strictEqual(planificado?.diaInicio, diaSiguiente);
  });

  test("Al cerrar el bloque activo, se promueve automáticamente el siguiente planificado", async () => {
    await bloques.importarSecuencia([
      {
        nombre: "Bloque 1",
        duracionSemanas: 1,
        ejeProgresionDefault: "volumen",
      },
      { nombre: "Bloque 2", duracionSemanas: 1, ejeProgresionDefault: "carga" },
    ]);
    const todosAntes = await db.bloque_entrenamiento.toArray();
    const primero = todosAntes.find((b) => b.nombre === "Bloque 1")!;

    await bloques.cerrarBloque(primero.id);

    const todosDespues = await db.bloque_entrenamiento.toArray();
    const segundo = todosDespues.find((b) => b.nombre === "Bloque 2");
    assert.strictEqual(segundo?.estado, "activo");
    assert.strictEqual(
      todosDespues.find((b) => b.nombre === "Bloque 1")?.estado,
      "cerrado"
    );
  });

  test("Crear plantilla por series y registrar 'como planificado' en un tap", async () => {
    const plantilla = await plantillas.crearPlantilla({
      nombre: "Full Body A",
      formato: "tradicional",
      tipoEstructura: "series",
      estructura: {
        bloques: [
          {
            ejercicioId: "cej_emp_flexiones",
            sets: [{ reps: 10 }, { reps: 10 }, { reps: 8 }],
          },
        ],
      },
    });
    assert.strictEqual(plantilla.ok, true);

    const sesion = await registros.registrarComoPlanificado(
      plantilla.valor,
      "2026-01-05"
    );
    assert.strictEqual(sesion.ok, true);

    const row = await db.registro_actividad.get(sesion.valor);
    assert.strictEqual(row?.comoPlanificado, true);
    assert.strictEqual(row?.resultados.length, 1);
    assert.strictEqual(row?.resultados[0].sets.length, 3);
    assert.strictEqual(row?.resultados[0].sets[2].reps, 8);
  });

  test("Registrar con excepción solo pide lo que cambió", async () => {
    const sesion = await registros.registrarConExcepcion({
      plantillaId: "p_inexistente_pero_valido_como_id",
      diaTarea: "2026-01-06",
      comoPlanificado: false,
      resultados: [{ ejercicioId: "cej_emp_flexiones", sets: [{ reps: 6 }] }],
      notas: "Menos energía hoy",
    });
    assert.strictEqual(sesion.ok, true);
    const row = await db.registro_actividad.get(sesion.valor);
    assert.strictEqual(row?.comoPlanificado, false);
    assert.strictEqual(row?.notas, "Menos energía hoy");
  });

  test("Registrar como planificado contra una plantilla de formato 'tiempo' (AMRAP/EMOM/etc)", async () => {
    const plantilla = await plantillas.crearPlantilla({
      nombre: "AMRAP 15",
      formato: "amrap",
      tipoEstructura: "tiempo",
      estructura: {
        ejercicioIds: ["cej_emp_flexiones", "cej_rod_sentadilla_goblet"],
        numeroRondas: 5,
        tiempoLimiteMin: 15,
      },
    });
    const sesion = await registros.registrarComoPlanificado(
      plantilla.valor,
      "2026-01-07"
    );
    assert.strictEqual(sesion.ok, true);
    const row = await db.registro_actividad.get(sesion.valor);
    assert.strictEqual(row?.resultados.length, 2);
    assert.strictEqual(row?.resultados[0].rondasCompletadas, 5);
  });
});
