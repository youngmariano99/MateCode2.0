import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { GestionarBloquesUseCase } from "../../application/use-cases/personal/gestionar-bloques.use-case";
import { GestionarPlantillasRutinaUseCase } from "../../application/use-cases/personal/gestionar-plantillas-rutina.use-case";
import { GestionarRegistroActividadUseCase } from "../../application/use-cases/personal/gestionar-registro-actividad.use-case";
import { GestionarEjerciciosUseCase } from "../../application/use-cases/personal/gestionar-ejercicios.use-case";
import { ImportarBloqueEntrenamientoUseCase } from "../../application/use-cases/personal/importar-bloque-entrenamiento.use-case";
import {
  ejesDisponibles,
  ejeEfectivo,
} from "../../domain/entidades/ejercicio.entity";
import { calcularMejoraEjercicio } from "../../domain/entidades/registro-actividad.entity";
import type { RegistroActividad } from "../../domain/entidades/registro-actividad.entity";

const bloques = new GestionarBloquesUseCase();
const plantillas = new GestionarPlantillasRutinaUseCase();
const registros = new GestionarRegistroActividadUseCase();
const ejercicios = new GestionarEjerciciosUseCase();
const importarBloque = new ImportarBloqueEntrenamientoUseCase();

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

  test("Eliminar un bloque es soft delete: sigue en la base pero nunca borra RegistroActividad", async () => {
    const creado = await bloques.crearBloque({
      nombre: "Bloque con sesiones",
      diaInicio: "2026-01-01",
      diaFin: "2026-01-28",
      ejeProgresionDefault: "volumen",
    });
    assert.strictEqual(creado.ok, true);

    const plantilla = await plantillas.crearPlantilla({
      nombre: "Rutina de prueba",
      formato: "tradicional",
      tipoEstructura: "series",
      estructura: {
        bloques: [{ ejercicioId: "cej_x", sets: [{ reps: 10 }] }],
      },
    });
    const sesion = await registros.registrarComoPlanificado(
      plantilla.valor,
      "2026-01-05",
      creado.valor
    );
    assert.strictEqual(sesion.ok, true);

    const eliminado = await bloques.eliminarBloque(creado.valor);
    assert.strictEqual(eliminado.ok, true);

    const fila = await db.bloque_entrenamiento.get(creado.valor);
    assert.strictEqual(fila?.eliminado, true, "queda marcado, no se borra");

    const registroDeLaSesion = await db.registro_actividad.get(sesion.valor);
    assert.ok(
      registroDeLaSesion,
      "la sesión ya registrada nunca se toca al eliminar el bloque"
    );
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

describe("Entrenamiento: crear Ejercicio respeta el equipamiento real (Sprint 22)", () => {
  beforeEach(async () => {
    await db.catalogo_ejercicio.clear();
    await db.catalogo_etiquetas.clear();
  });

  test("rechaza un ejercicio que pide equipamiento que el usuario no tiene", async () => {
    await db.catalogo_etiquetas.add({
      id: "etq_1",
      etiqueta: "Mancuernas",
      categoria: "equipamiento_propio",
      esDelUsuario: true,
      creadoEn: Date.now(),
    });
    const res = await ejercicios.crearEjercicio({
      patron: "empuje",
      nombre: "Press con banda",
      tipoConteo: "repes",
      modoConteo: "global",
      equipamiento: ["banda elástica"],
      permiteCarga: true,
    });
    assert.strictEqual(res.ok, false);
    assert.match(res.error!.mensaje, /banda elástica/);
  });

  test("crea el ejercicio si el equipamiento pedido es subconjunto de lo que tiene", async () => {
    await db.catalogo_etiquetas.add({
      id: "etq_1",
      etiqueta: "Mancuernas",
      categoria: "equipamiento_propio",
      esDelUsuario: true,
      creadoEn: Date.now(),
    });
    const res = await ejercicios.crearEjercicio({
      patron: "dominante_rodilla",
      nombre: "Zancada búlgara",
      tipoConteo: "repes",
      modoConteo: "por_lado",
      equipamiento: ["mancuernas"],
      permiteCarga: true,
    });
    assert.strictEqual(res.ok, true);
    const fila = await db.catalogo_ejercicio.get(res.valor);
    assert.strictEqual(fila?.nombre, "Zancada búlgara");
  });

  test("un ejercicio sin equipo (peso corporal) siempre se puede crear", async () => {
    const res = await ejercicios.crearEjercicio({
      patron: "empuje",
      nombre: "Flexiones diamante",
      tipoConteo: "repes",
      modoConteo: "global",
      equipamiento: [],
    });
    assert.strictEqual(res.ok, true);
  });
});

describe("Entrenamiento: import combinado Bloque + Rutinas + Ejercicios (Sprint 22)", () => {
  beforeEach(async () => {
    await db.bloque_entrenamiento.clear();
    await db.plantilla_rutina.clear();
    await db.catalogo_ejercicio.clear();
    await db.catalogo_etiquetas.clear();
    await db.catalogo_ejercicio.add({
      id: "cej_flexiones",
      patron: "empuje",
      nombre: "Flexiones de pecho",
      tipoConteo: "repes",
      modoConteo: "global",
      equipamiento: [],
      esPausaActiva: false,
      esNeat: false,
      permiteCarga: false,
      niveles: [],
      creadoEn: Date.now(),
    });
  });

  test("crea el Bloque con sus Rutinas vinculadas por plantillaIds, reusando el ejercicio existente", async () => {
    const res = await importarBloque.importarBloqueCompleto([
      {
        bloque: {
          nombre: "Bloque 1 — Volumen",
          diaInicio: "2026-01-01",
          diaFin: "2026-02-01",
          ejeProgresionDefault: "volumen",
        },
        rutinas: [
          {
            nombre: "Full Body A",
            formato: "tradicional",
            ejercicios: [{ nombre: "Flexiones de pecho", series: 3, reps: 10 }],
          },
        ],
        ejerciciosNuevos: [],
      },
    ]);
    assert.strictEqual(res.ok, true);

    const bloque = (await db.bloque_entrenamiento.toArray()).find(
      (b) => b.nombre === "Bloque 1 — Volumen"
    );
    assert.strictEqual(bloque?.rutinasProgramadas.length, 1);
    const rutina = await db.plantilla_rutina.get(
      bloque!.rutinasProgramadas[0].plantillaId
    );
    assert.strictEqual(rutina?.nombre, "Full Body A");

    const todosLosEjercicios = await db.catalogo_ejercicio.toArray();
    assert.strictEqual(
      todosLosEjercicios.length,
      1,
      "no debe haber creado un ejercicio duplicado de 'Flexiones de pecho'"
    );
  });

  test("crea un Ejercicio nuevo cuando no existe en el catálogo", async () => {
    const res = await importarBloque.importarBloqueCompleto([
      {
        bloque: {
          nombre: "Bloque 2",
          diaInicio: "2026-01-01",
          diaFin: "2026-02-01",
          ejeProgresionDefault: "carga",
        },
        rutinas: [
          {
            nombre: "Tren inferior",
            formato: "tradicional",
            ejercicios: [{ nombre: "Zancada búlgara", series: 3, reps: 10 }],
          },
        ],
        ejerciciosNuevos: [
          {
            patron: "dominante_rodilla",
            nombre: "Zancada búlgara",
            tipoConteo: "repes",
            modoConteo: "por_lado",
            equipamiento: [],
            permiteCarga: true,
          },
        ],
      },
    ]);
    assert.strictEqual(res.ok, true);
    const creado = await db.catalogo_ejercicio
      .filter((e) => e.nombre === "Zancada búlgara")
      .first();
    assert.ok(creado, "el ejercicio nuevo debió crearse");
  });

  test("si ya existe una Rutina con ese nombre exacto, la ACTUALIZA en vez de duplicarla", async () => {
    const original = await plantillas.crearPlantilla({
      nombre: "Full Body A",
      formato: "tradicional",
      tipoEstructura: "series",
      estructura: {
        bloques: [
          { ejercicioId: "cej_flexiones", sets: [{ reps: 8 }, { reps: 8 }] },
        ],
      },
    });
    assert.strictEqual(original.ok, true);

    const res = await importarBloque.importarBloqueCompleto([
      {
        bloque: {
          nombre: "Bloque 2 — Fuerza",
          diaInicio: "2026-01-01",
          diaFin: "2026-03-01",
          ejeProgresionDefault: "carga",
        },
        rutinas: [
          {
            nombre: "Full Body A", // mismo nombre exacto
            formato: "tradicional",
            ejercicios: [{ nombre: "Flexiones de pecho", series: 4, reps: 12 }],
          },
        ],
        ejerciciosNuevos: [],
      },
    ]);
    assert.strictEqual(res.ok, true);

    const todasLasRutinas = await db.plantilla_rutina.toArray();
    assert.strictEqual(
      todasLasRutinas.length,
      1,
      "no debe haber duplicado la rutina 'Full Body A'"
    );
    const actualizada = await db.plantilla_rutina.get(original.valor);
    const estructura = actualizada?.estructura as {
      bloques: { sets: { reps?: number }[] }[];
    };
    assert.strictEqual(estructura.bloques[0].sets.length, 4);
    assert.strictEqual(estructura.bloques[0].sets[0].reps, 12);
  });

  test("un ejercicio nuevo con equipamiento inválido no bloquea el resto del import", async () => {
    await db.catalogo_etiquetas.add({
      id: "etq_1",
      etiqueta: "Mancuernas",
      categoria: "equipamiento_propio",
      esDelUsuario: true,
      creadoEn: Date.now(),
    });
    const res = await importarBloque.importarBloqueCompleto([
      {
        bloque: {
          nombre: "Bloque 3",
          diaInicio: "2026-01-01",
          diaFin: "2026-02-01",
          ejeProgresionDefault: "volumen",
        },
        rutinas: [
          {
            nombre: "Rutina válida",
            formato: "tradicional",
            ejercicios: [{ nombre: "Flexiones de pecho", series: 3, reps: 10 }],
          },
          {
            nombre: "Rutina imposible",
            formato: "tradicional",
            ejercicios: [{ nombre: "Remo con banda", series: 3, reps: 10 }],
          },
        ],
        ejerciciosNuevos: [
          {
            patron: "tiron",
            nombre: "Remo con banda",
            tipoConteo: "repes",
            modoConteo: "global",
            equipamiento: ["banda elástica"], // el usuario no tiene esto
            permiteCarga: false,
          },
        ],
      },
    ]);
    assert.strictEqual(
      res.ok,
      true,
      "el bloque igual se crea con lo que sí se pudo resolver"
    );
    assert.match(res.valor, /Con errores/);

    const bloque = (await db.bloque_entrenamiento.toArray()).find(
      (b) => b.nombre === "Bloque 3"
    );
    assert.strictEqual(
      bloque?.rutinasProgramadas.length,
      1,
      "solo la rutina válida quedó vinculada"
    );
  });

  test("nunca guarda pesoKg en un ejercicio de peso corporal, aunque el JSON lo traiga (bug del '1kg')", async () => {
    const res = await importarBloque.importarBloqueCompleto([
      {
        bloque: {
          nombre: "Bloque 4",
          diaInicio: "2026-01-01",
          diaFin: "2026-02-01",
          ejeProgresionDefault: "volumen",
        },
        rutinas: [
          {
            nombre: "Full Body B",
            formato: "tradicional",
            // "cej_flexiones" (creado en el beforeEach) tiene permiteCarga: false.
            ejercicios: [
              { nombre: "Flexiones de pecho", series: 3, reps: 10, pesoKg: 1 },
            ],
          },
        ],
        ejerciciosNuevos: [],
      },
    ]);
    assert.strictEqual(res.ok, true);

    const rutina = await db.plantilla_rutina
      .filter((p) => p.nombre === "Full Body B")
      .first();
    const estructura = rutina?.estructura as {
      bloques: { sets: { pesoKg?: number }[] }[];
    };
    assert.strictEqual(
      estructura.bloques[0].sets[0].pesoKg,
      undefined,
      "un ejercicio sin permiteCarga nunca debe guardar pesoKg"
    );
  });
});

describe("Entrenamiento: pausas activas — solo Rutinas, nunca un Bloque (Sprint 22)", () => {
  beforeEach(async () => {
    await db.bloque_entrenamiento.clear();
    await db.plantilla_rutina.clear();
    await db.catalogo_ejercicio.clear();
    await db.catalogo_ejercicio.add({
      id: "cej_pausa",
      patron: "pausa_movilidad",
      nombre: "Círculos de hombro",
      tipoConteo: "tiempo",
      modoConteo: "global",
      equipamiento: [],
      esPausaActiva: true,
      esNeat: false,
      permiteCarga: false,
      niveles: [],
      creadoEn: Date.now(),
    });
  });

  test("crea Rutinas de pausa activa sin crear ningún BloqueEntrenamiento", async () => {
    const res = await importarBloque.importarPausasActivas([
      {
        rutinasNuevas: [
          {
            nombre: "Pausa hombros",
            formato: "pausa_activa",
            ejercicios: ["Círculos de hombro"],
          },
        ],
        ejerciciosNuevos: [],
      },
    ]);
    assert.strictEqual(res.ok, true);

    const bloques = await db.bloque_entrenamiento.toArray();
    assert.strictEqual(bloques.length, 0, "no debe crear ningún bloque");

    const rutina = await db.plantilla_rutina
      .filter((p) => p.nombre === "Pausa hombros")
      .first();
    assert.ok(rutina);
    assert.strictEqual(rutina?.formato, "pausa_activa");
  });
});
