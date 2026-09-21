import { test, describe } from "node:test";
import assert from "node:assert";
import {
  ajustarRitmo,
  avisosDeProgresion,
  cantidadSemanasBloque,
  eliminarUltimaSemana,
  extenderBloque,
  indiceSemanaDe,
  pasoDelDia,
  pasosDelBloque,
  planParaPaso,
  repetirSemana,
  resultadosDePlan,
  resumirSemanaBloque,
  rutinasDelDia,
  vecesAplicada,
  type CatalogoInfo,
} from "../../domain/entidades/progresion-entrenamiento.entity";
import type {
  BloqueEntrenamiento,
  EstructuraSeries,
} from "../../domain/entidades/rutina.entity";

// Bloque de 4 semanas: lunes 2026-09-21 → domingo 2026-10-18.
const bloque = (
  extra: Partial<BloqueEntrenamiento> = {}
): BloqueEntrenamiento =>
  ({
    id: "b1",
    nombre: "B1",
    diaInicio: "2026-09-21",
    diaFin: "2026-10-18",
    ejeProgresionDefault: "volumen",
    estado: "activo",
    rutinasProgramadas: [],
    eliminado: false,
    creadoEn: 1,
    actualizadoEn: 1,
    ...extra,
  }) as BloqueEntrenamiento;

const catalogo: CatalogoInfo = new Map([
  ["sentadilla", { permiteCarga: true, niveles: [] }],
  [
    "flexiones",
    {
      permiteCarga: false,
      niveles: [
        { nivel: 0, nombre: "rodillas", detalle: "" },
        { nivel: 1, nombre: "estándar", detalle: "" },
        { nivel: 2, nombre: "declinadas", detalle: "" },
      ],
    },
  ],
  ["plancha", { permiteCarga: false, niveles: [] }],
]);
const estructura: EstructuraSeries = {
  bloques: [
    {
      ejercicioId: "sentadilla",
      sets: [
        { reps: 8, pesoKg: 10 },
        { reps: 8, pesoKg: 10 },
      ],
    },
    { ejercicioId: "flexiones", sets: [{ reps: 6 }, { reps: 6 }], nivel: 0 },
    { ejercicioId: "plancha", sets: [{ tiempoSeg: 20 }, { tiempoSeg: 20 }] },
  ],
};
const plan = (
  paso: number,
  programada: object,
  descargas: { paso: number; factor: number }[] = []
) =>
  planParaPaso({
    tipoEstructura: "series",
    estructura,
    programada,
    paso,
    descargas,
    catalogo,
  });

describe("Progresión: semanas y pasos del bloque", () => {
  test("semanas, pasos por defecto, índice y paso de un día", () => {
    const b = bloque();
    assert.strictEqual(cantidadSemanasBloque(b), 4);
    assert.deepStrictEqual(pasosDelBloque(b), [1, 2, 3, 4]);
    assert.strictEqual(indiceSemanaDe(b, "2026-09-28"), 1);
    assert.strictEqual(indiceSemanaDe(b, "2027-01-01"), 3); // fuera del bloque: se queda en la última
    assert.strictEqual(pasoDelDia(b, "2026-10-05"), 3);
  });

  test("repetir una semana duplica su paso y alarga el bloque una semana", () => {
    const b = bloque();
    const r = repetirSemana(b, 1); // no pude hacer la semana 2
    assert.deepStrictEqual(r.pasosSemana, [1, 2, 2, 3, 4]);
    assert.strictEqual(r.diaFin, "2026-10-25");
    // Repetir otra vez sobre el resultado sigue funcionando.
    const r2 = repetirSemana({ ...b, ...r }, 2);
    assert.deepStrictEqual(r2.pasosSemana, [1, 2, 2, 2, 3, 4]);
    assert.strictEqual(r2.diaFin, "2026-11-01");
  });

  test("eliminar la última semana, extender y no dejar el bloque sin semanas", () => {
    const b = bloque();
    assert.deepStrictEqual(eliminarUltimaSemana(b), {
      pasosSemana: [1, 2, 3],
      diaFin: "2026-10-11",
    });
    assert.deepStrictEqual(extenderBloque(b), {
      pasosSemana: [1, 2, 3, 4, 5],
      diaFin: "2026-10-25",
    });
    const una = bloque({ diaFin: "2026-09-27" });
    assert.strictEqual(eliminarUltimaSemana(una), undefined);
  });

  test("ajustar el ritmo corre solo lo que falta y nunca baja del paso 1", () => {
    const b = bloque();
    assert.deepStrictEqual(ajustarRitmo(b, 1, 1), [1, 3, 4, 5]); // fue fácil: se saltea un paso
    assert.deepStrictEqual(ajustarRitmo(b, 2, -1), [1, 2, 2, 3]); // fue mucho: se frena
    assert.deepStrictEqual(ajustarRitmo(b, 0, -5), [1, 1, 1, 1]);
  });
});

describe("Progresión: plan por paso, por ejercicio y con mínimos", () => {
  test("cada ejercicio progresa a su manera: kg, nivel de dificultad y reps; el peso corporal no recibe kg", () => {
    const programada = {
      progresiones: [
        {
          ejercicioId: "sentadilla",
          reglas: [{ tipo: "carga", incremento: 2, cadaSemanas: 2 }],
        },
        {
          ejercicioId: "flexiones",
          reglas: [
            { tipo: "nivel", incremento: 1, cadaSemanas: 2, tope: 2 },
            { tipo: "carga", incremento: 5 },
          ],
        },
        {
          ejercicioId: "plancha",
          reglas: [{ tipo: "tiempo", incremento: 5, tope: 30 }],
        },
      ],
    };
    const p1 = plan(1, programada);
    assert.strictEqual(p1.ejercicios[0].sets[0].pesoKg, 10);
    assert.strictEqual(p1.ejercicios[1].nivel, 0);
    const p4 = plan(4, programada);
    assert.strictEqual(p4.ejercicios[0].sets[0].pesoKg, 14); // +2 en paso 2 y +2 en paso 4
    assert.strictEqual(p4.ejercicios[1].nivel, 2); // pasos 2 y 4 → +2 niveles
    assert.strictEqual(p4.ejercicios[1].sets[0].pesoKg, undefined); // "+5 kg" no se aplica al peso corporal
    assert.strictEqual(p4.ejercicios[2].sets[0].tiempoSeg, 30); // tope
    assert.strictEqual(plan(9, programada).ejercicios[1].nivel, 2); // nunca pasa del último nivel
  });

  test("progresión general de la rutina, con excepciones y ejercicios que no progresan", () => {
    const programada = {
      progresionGeneral: [
        { tipo: "reps", incremento: 1 },
        { tipo: "carga", incremento: 2 },
      ],
      progresiones: [
        { ejercicioId: "plancha", reglas: [], sinProgresion: true },
      ],
    };
    const p3 = plan(3, programada);
    assert.strictEqual(p3.ejercicios[0].sets[0].reps, 10);
    assert.strictEqual(p3.ejercicios[0].sets[0].pesoKg, 14);
    assert.strictEqual(p3.ejercicios[1].sets[0].reps, 8);
    assert.strictEqual(p3.ejercicios[1].sets[0].pesoKg, undefined);
    assert.strictEqual(p3.ejercicios[2].sets[0].tiempoSeg, 20); // sin progresión
    assert.strictEqual(p3.ejercicios[0].sets.length, 2);
  });

  test("series se agregan con tope y descarga baja el volumen sin pasar los mínimos", () => {
    const programada = {
      progresiones: [
        {
          ejercicioId: "sentadilla",
          reglas: [
            { tipo: "series", incremento: 1, tope: 4 },
            { tipo: "carga", incremento: 4 },
          ],
          minimo: { series: 3, pesoKg: 12, reps: 6 },
        },
      ],
    };
    assert.strictEqual(plan(2, programada).ejercicios[0].sets.length, 3);
    assert.strictEqual(plan(5, programada).ejercicios[0].sets.length, 4); // tope
    const desc = plan(5, programada, [{ paso: 5, factor: 0.5 }]);
    assert.strictEqual(desc.esDescarga, true);
    // 4 series × 0,5 = 2 → sube al mínimo de 3; 8 reps × 0,5 = 4 → mínimo 6; peso (26 × 0,5 = 13) ≥ 12
    assert.strictEqual(desc.ejercicios[0].sets.length, 3);
    assert.strictEqual(desc.ejercicios[0].sets[0].reps, 6);
    assert.strictEqual(desc.ejercicios[0].sets[0].pesoKg, 13);
  });

  test("una regla negativa nunca baja del mínimo", () => {
    const programada = {
      progresiones: [
        {
          ejercicioId: "sentadilla",
          reglas: [{ tipo: "reps", incremento: -2 }],
          minimo: { reps: 5 },
        },
      ],
    };
    assert.strictEqual(plan(4, programada).ejercicios[0].sets[0].reps, 5);
  });

  test("vecesAplicada respeta el paso de inicio y la frecuencia", () => {
    const r = {
      tipo: "reps",
      incremento: 1,
      cadaSemanas: 3,
      desdePaso: 4,
    } as const;
    assert.deepStrictEqual(
      [1, 3, 4, 6, 7, 10].map((p) => vecesAplicada(r, p)),
      [0, 0, 1, 1, 2, 3]
    );
  });

  test("rutinas por tiempo: rondas y tiempos progresan por separado", () => {
    const p = planParaPaso({
      tipoEstructura: "tiempo",
      estructura: {
        ejercicioIds: ["plancha"],
        numeroRondas: 6,
        tiempoTrabajoSeg: 15,
        tiempoDescansoSeg: 15,
      },
      programada: {
        progresionTiempo: [
          { tipo: "rondas", incremento: 2, cadaSemanas: 2, tope: 10 },
          { tipo: "tiempo_descanso", incremento: -5, tope: 10 },
        ],
      },
      paso: 5,
      catalogo,
    });
    assert.deepStrictEqual(p.tiempo, {
      numeroRondas: 10,
      tiempoTrabajoSeg: 15,
      tiempoDescansoSeg: 10,
      tiempoLimiteMin: undefined,
    });
    assert.strictEqual(resultadosDePlan(p)[0].rondasCompletadas, 10);
  });

  test("resultadosDePlan lleva el nivel y avisosDeProgresion detecta reglas que no sirven", () => {
    const p = plan(3, {
      progresiones: [
        {
          ejercicioId: "flexiones",
          reglas: [{ tipo: "nivel", incremento: 1 }],
        },
      ],
    });
    assert.strictEqual(resultadosDePlan(p)[1].nivelUsado, 2);
    const avisos = avisosDeProgresion(
      estructura,
      {
        progresiones: [
          {
            ejercicioId: "plancha",
            reglas: [{ tipo: "carga", incremento: 2 }],
          },
          { ejercicioId: "no_esta", reglas: [] },
        ],
      },
      catalogo,
      (id) => id
    );
    assert.strictEqual(avisos.length, 2);
  });
});

describe("Progresión: rutinas del día y resumen semanal", () => {
  const b = bloque({
    rutinasProgramadas: [
      { plantillaId: "A", diasSemana: [1, 3] }, // lun y mié
      { plantillaId: "B", diasSemana: [5] }, // vie
    ],
  });

  test("mover una rutina la saca del día original y la pone en el nuevo", () => {
    const movido = {
      ...b,
      excepciones: [
        { plantillaId: "A", dia: "2026-09-21", aDia: "2026-09-22" },
      ],
    };
    assert.deepStrictEqual(
      rutinasDelDia(b, "2026-09-21").map((r) => r.plantillaId),
      ["A"]
    );
    assert.deepStrictEqual(
      rutinasDelDia(movido, "2026-09-21").map((r) => r.plantillaId),
      []
    );
    assert.deepStrictEqual(
      rutinasDelDia(movido, "2026-09-22").map((r) => r.plantillaId),
      ["A"]
    );
    assert.deepStrictEqual(
      rutinasDelDia(b, "2026-11-30").map((r) => r.plantillaId),
      []
    ); // fuera del bloque
  });

  test("resumen: hechas, pendientes, extras y nada hecho", () => {
    const reg = (plantillaId: string, dia: string) => ({
      plantillaId,
      diaTarea: dia,
      bloqueId: "b1",
      resultados: [],
    });
    const s = resumirSemanaBloque(b, 0, [
      reg("A", "2026-09-21"),
      reg("C", "2026-09-23"),
    ]);
    assert.strictEqual(s.planificadas, 3);
    assert.strictEqual(s.hechas, 1);
    assert.strictEqual(s.extras, 1);
    assert.strictEqual(s.cumplimiento, 33);
    assert.deepStrictEqual(
      s.filas.find((f) => f.plantillaId === "A")?.pendientes,
      ["2026-09-23"]
    );
    assert.strictEqual(resumirSemanaBloque(b, 1, []).nadaHecho, true);
  });

  test("el logro compara lo hecho contra el plan guardado de cada sesión", () => {
    const registro = {
      plantillaId: "A",
      diaTarea: "2026-09-21",
      bloqueId: "b1",
      planificado: [{ ejercicioId: "x", sets: [{ reps: 10 }, { reps: 10 }] }],
      resultados: [{ ejercicioId: "x", sets: [{ reps: 10 }, { reps: 5 }] }],
    };
    assert.strictEqual(resumirSemanaBloque(b, 0, [registro]).logro, 75);
  });
});
