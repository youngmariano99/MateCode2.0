import "fake-indexeddb/auto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { db } from "../../offline/dexie/db";
import { ImportarBloqueEntrenamientoUseCase } from "../../application/use-cases/personal/importar-bloque-entrenamiento.use-case";
import { GestionarProgresionBloqueUseCase } from "../../application/use-cases/personal/gestionar-progresion-bloque.use-case";
import { GestionarRegistroActividadUseCase } from "../../application/use-cases/personal/gestionar-registro-actividad.use-case";
import { rutinasDelDia } from "../../domain/entidades/progresion-entrenamiento.entity";

const importar = new ImportarBloqueEntrenamientoUseCase();
const progresion = new GestionarProgresionBloqueUseCase();
const registro = new GestionarRegistroActividadUseCase();

const EJERCICIOS_NUEVOS = [
  {
    nombre: "Sentadilla goblet",
    patron: "dominante_rodilla",
    tipoConteo: "repes",
    modoConteo: "global",
    equipamiento: [],
    permiteCarga: true,
  },
  {
    nombre: "Flexiones",
    patron: "empuje",
    tipoConteo: "repes",
    modoConteo: "global",
    equipamiento: [],
    permiteCarga: false,
    niveles: [
      { nivel: 0, nombre: "En rodillas", detalle: "x" },
      { nivel: 1, nombre: "Estándar", detalle: "x" },
      { nivel: 2, nombre: "Pies elevados", detalle: "x" },
    ],
  },
  {
    nombre: "Plancha",
    patron: "core_transporte",
    tipoConteo: "tiempo",
    modoConteo: "global",
    equipamiento: [],
    permiteCarga: false,
  },
];

// Bloque de 4 semanas, lunes 2026-09-21 → domingo 2026-10-18.
const bloqueJson = (
  nombre: string,
  inicio: string,
  fin: string,
  extra: object = {}
) => ({
  bloque: {
    nombre,
    diaInicio: inicio,
    diaFin: fin,
    ejeProgresionDefault: "volumen",
    descargas: [{ paso: 4, factor: 0.7 }],
  },
  rutinas: [
    {
      nombre: "Fuerza A",
      formato: "tradicional",
      calentamiento: [
        { nombre: "Movilidad de cadera", series: 2, reps: 10 },
        { nombre: "Plancha", series: 2, tiempoSeg: 20 },
      ],
      ejercicios: [
        {
          nombre: "Sentadilla goblet",
          series: 3,
          reps: 8,
          pesoKg: 10,
          progresion: [{ tipo: "carga", incremento: 2, cadaSemanas: 2 }],
          minimo: { pesoKg: 10, reps: 6 },
        },
        {
          nombre: "Flexiones",
          series: 3,
          reps: 8,
          nivel: 0,
          progresion: { tipo: "nivel", incremento: 1, cadaSemanas: 2, tope: 2 },
        },
        { nombre: "Plancha", series: 3, reps: 20, progresion: "ninguna" },
      ],
      diasSemana: [1, 3],
    },
  ],
  ejerciciosNuevos: EJERCICIOS_NUEVOS,
  ...extra,
});

describe("Entrenamiento: progresiones por ejercicio, en el import y en el registro", () => {
  beforeEach(async () => {
    for (const t of [
      db.bloque_entrenamiento,
      db.plantilla_rutina,
      db.catalogo_ejercicio,
      db.registro_actividad,
      db.personal_historial,
    ])
      await t.clear();
  });

  test("el import guarda reglas por ejercicio, mínimos, descargas y calentamiento estructurado", async () => {
    const r = await importar.importarBloqueCompleto([
      bloqueJson("Bloque 1", "2026-09-21", "2026-10-18"),
    ]);
    assert.ok(r.ok, r.ok ? "" : r.error!.mensaje);
    const b = (await db.bloque_entrenamiento.toArray())[0];
    assert.deepStrictEqual(b.descargas, [{ paso: 4, factor: 0.7 }]);
    const rp = b.rutinasProgramadas[0];
    assert.ok(rp.estructuraBase, "guarda la estructura base del paso 1");
    assert.strictEqual(rp.progresiones?.length, 3);
    const flex = (await db.catalogo_ejercicio.toArray()).find(
      (e) => e.nombre === "Flexiones"
    )!;
    const pFlex = rp.progresiones!.find((p) => p.ejercicioId === flex.id)!;
    assert.strictEqual(pFlex.reglas[0].tipo, "nivel");
    const plancha = (await db.catalogo_ejercicio.toArray()).find(
      (e) => e.nombre === "Plancha"
    )!;
    assert.strictEqual(
      rp.progresiones!.find((p) => p.ejercicioId === plancha.id)?.sinProgresion,
      true
    );
    const plantilla = (await db.plantilla_rutina.toArray())[0];
    assert.strictEqual(plantilla.calentamientoEstructura?.length, 2);
    assert.match(plantilla.calentamiento!, /Movilidad de cadera \(2x10\)/);
  });

  test("avisa cuando una progresión no le sirve al ejercicio (kg a peso corporal) y cuando el calentamiento es solo texto", async () => {
    const json = bloqueJson("Bloque 1", "2026-09-21", "2026-10-18");
    json.rutinas[0].ejercicios[1] = {
      nombre: "Flexiones",
      series: 3,
      reps: 8,
      progresion: { tipo: "carga", incremento: 2 },
    } as never;
    json.rutinas.push({
      nombre: "Rutina sin calentamiento armado",
      formato: "tradicional",
      calentamiento: "5 min de cinta" as never,
      ejercicios: [{ nombre: "Plancha", series: 2, reps: 20 }],
      diasSemana: [5],
    } as never);
    const r = await importar.importarBloqueCompleto([json]);
    assert.ok(r.ok);
    assert.match(r.valor!, /no admite una progresión de tipo "carga"/);
    assert.match(r.valor!, /calentamiento no viene como lista/);
  });

  test("ajustar una rutina en un bloque nuevo NO cambia el plan de los bloques anteriores", async () => {
    await importar.importarBloqueCompleto([
      bloqueJson("Bloque 1", "2026-09-21", "2026-10-18"),
    ]);
    const nueva = bloqueJson("Bloque 2", "2026-10-19", "2026-11-15");
    nueva.rutinas[0].ejercicios[0] = {
      nombre: "Sentadilla goblet",
      series: 4,
      reps: 10,
      pesoKg: 16,
    } as never;
    await importar.importarBloqueCompleto([nueva]);
    const [b1, b2] = (await db.bloque_entrenamiento.toArray()).sort((a, b) =>
      a.diaInicio.localeCompare(b.diaInicio)
    );
    const base1 = b1.rutinasProgramadas[0].estructuraBase as {
      bloques: { sets: { pesoKg?: number }[] }[];
    };
    const base2 = b2.rutinasProgramadas[0].estructuraBase as {
      bloques: { sets: { pesoKg?: number }[] }[];
    };
    assert.strictEqual(base1.bloques[0].sets[0].pesoKg, 10);
    assert.strictEqual(base1.bloques[0].sets.length, 3);
    assert.strictEqual(base2.bloques[0].sets[0].pesoKg, 16);
    assert.strictEqual(base2.bloques[0].sets.length, 4);
  });

  test("'Hice lo planificado' registra el plan con la progresión de esa semana y lo guarda para comparar", async () => {
    await importar.importarBloqueCompleto([
      bloqueJson("Bloque 1", "2026-09-21", "2026-10-18"),
    ]);
    const b = (await db.bloque_entrenamiento.toArray())[0];
    const plantillaId = b.rutinasProgramadas[0].plantillaId;
    const sentadilla = (await db.catalogo_ejercicio.toArray()).find(
      (e) => e.nombre === "Sentadilla goblet"
    )!;
    // Semana 3 (paso 3): la carga sube +2 en el paso 2 (cada 2 semanas desde el paso 2 → paso 2 y 4)
    const id = (
      await registro.registrarComoPlanificado(plantillaId, "2026-10-05", b.id)
    ).valor!;
    const reg = (await db.registro_actividad.get(id))!;
    assert.strictEqual(reg.pasoBloque, 3);
    assert.strictEqual(
      reg.resultados.find((x) => x.ejercicioId === sentadilla.id)?.sets[0]
        .pesoKg,
      12
    );
    assert.deepStrictEqual(reg.planificado, reg.resultados);
    // Semana 4 es de descarga (×0,7) pero nunca baja del mínimo (10 kg y 6 reps).
    const id4 = (
      await registro.registrarComoPlanificado(plantillaId, "2026-10-12", b.id)
    ).valor!;
    const reg4 = (await db.registro_actividad.get(id4))!;
    const s = reg4.resultados.find((x) => x.ejercicioId === sentadilla.id)!
      .sets[0];
    assert.strictEqual(s.pesoKg, 10); // 14 × 0,7 = 9,8 → mínimo 10
    assert.strictEqual(s.reps, 6); // 8 × 0,7 = 5,6 → 6
    // Nivel de dificultad de las flexiones en el paso 4: 0 + 2 (pasos 2 y 4) = 2, con tope 2.
    const flex = (await db.catalogo_ejercicio.toArray()).find(
      (e) => e.nombre === "Flexiones"
    )!;
    assert.strictEqual(
      reg4.resultados.find((x) => x.ejercicioId === flex.id)?.nivelUsado,
      2
    );
  });
});

describe("Entrenamiento: decisiones de la semana, con historial", () => {
  beforeEach(async () => {
    for (const t of [
      db.bloque_entrenamiento,
      db.plantilla_rutina,
      db.catalogo_ejercicio,
      db.registro_actividad,
      db.personal_historial,
    ])
      await t.clear();
    await importar.importarBloqueCompleto([
      bloqueJson("Bloque 1", "2026-09-21", "2026-10-18"),
      bloqueJson("Bloque 2", "2026-10-19", "2026-11-15"),
    ]);
  });
  const bloque = async (nombre: string) =>
    (await db.bloque_entrenamiento.toArray()).find((b) => b.nombre === nombre)!;

  test("repetir una semana alarga el bloque, corre el siguiente y queda registrado", async () => {
    const b1 = await bloque("Bloque 1");
    assert.ok(
      (await progresion.repetirSemana(b1.id, 1, "No pude entrenar")).ok
    );
    const despues = await bloque("Bloque 1");
    assert.deepStrictEqual(despues.pasosSemana, [1, 2, 2, 3, 4]);
    assert.strictEqual(despues.diaFin, "2026-10-25");
    const b2 = await bloque("Bloque 2");
    assert.strictEqual(b2.diaInicio, "2026-10-26"); // encadenado: se corrió una semana
    assert.strictEqual(b2.diaFin, "2026-11-22");
    const dec = await progresion.decisiones(b1.id);
    assert.strictEqual(dec[0].accion, "repetir_semana");
    assert.strictEqual(dec[0].nota, "No pude entrenar");
    // El bloque siguiente también dejó constancia de que lo corrieron.
    assert.ok((await progresion.decisiones(b2.id)).length >= 1);
  });

  test("eliminar la última semana acorta y también corre el siguiente hacia atrás; avanzar solo deja constancia", async () => {
    const b1 = await bloque("Bloque 1");
    assert.ok((await progresion.eliminarUltimaSemana(b1.id)).ok);
    assert.strictEqual((await bloque("Bloque 1")).diaFin, "2026-10-11");
    assert.strictEqual((await bloque("Bloque 2")).diaInicio, "2026-10-12");
    const antes = await bloque("Bloque 1");
    assert.ok(
      (await progresion.avanzarSemana(b1.id, 0, "Alcanza con esto")).ok
    );
    const igual = await bloque("Bloque 1");
    assert.deepStrictEqual(igual.pasosSemana, antes.pasosSemana);
    assert.strictEqual(
      (await progresion.decisiones(b1.id))[0].accion,
      "avanzar_semana"
    );
  });

  test("ajustar el ritmo: 'fue fácil' adelanta pasos y puede aplicarse también a los bloques siguientes", async () => {
    const b1 = await bloque("Bloque 1");
    const n = await progresion.ajustarRitmo(
      b1.id,
      1,
      1,
      "este_y_siguientes",
      "Fue muy fácil"
    );
    assert.strictEqual(n.valor, 2);
    assert.deepStrictEqual(
      (await bloque("Bloque 1")).pasosSemana,
      [1, 3, 4, 5]
    );
    assert.deepStrictEqual(
      (await bloque("Bloque 2")).pasosSemana,
      [2, 3, 4, 5]
    );
    assert.strictEqual((await progresion.ajustarRitmo(b1.id, 0, 0)).ok, false);
  });

  test("mover una rutina de día: no toca el día original, sí el nuevo, y se puede registrar ahí", async () => {
    const b1 = await bloque("Bloque 1");
    const plantillaId = b1.rutinasProgramadas[0].plantillaId;
    assert.ok(
      (
        await progresion.moverRutina(
          b1.id,
          plantillaId,
          "2026-09-21",
          "2026-09-22"
        )
      ).ok
    );
    const movido = await bloque("Bloque 1");
    assert.strictEqual(rutinasDelDia(movido, "2026-09-21").length, 0);
    assert.strictEqual(rutinasDelDia(movido, "2026-09-22").length, 1);
    // Volver a moverla desde el nuevo día no encadena: se reubica.
    await progresion.moverRutina(
      b1.id,
      plantillaId,
      "2026-09-22",
      "2026-09-24"
    );
    const otra = await bloque("Bloque 1");
    assert.strictEqual(otra.excepciones?.length, 1);
    assert.strictEqual(rutinasDelDia(otra, "2026-09-24").length, 1);
    // Devolverla a su día original limpia la excepción.
    await progresion.moverRutina(
      b1.id,
      plantillaId,
      "2026-09-24",
      "2026-09-21"
    );
    assert.strictEqual((await bloque("Bloque 1")).excepciones?.length, 0);
    assert.strictEqual(
      (
        await progresion.moverRutina(
          b1.id,
          "no_existe",
          "2026-09-21",
          "2026-09-22"
        )
      ).ok,
      false
    );
  });

  test("el resumen de la semana cuenta lo hecho y lo que falta", async () => {
    const b1 = await bloque("Bloque 1");
    const plantillaId = b1.rutinasProgramadas[0].plantillaId;
    await registro.registrarComoPlanificado(plantillaId, "2026-09-21", b1.id);
    const r = (await progresion.resumenSemana(b1.id, 0)).valor!;
    assert.deepStrictEqual(
      [r.planificadas, r.hechas, r.cumplimiento],
      [2, 1, 50]
    );
    assert.deepStrictEqual(r.filas[0].pendientes, ["2026-09-23"]);
    assert.strictEqual(
      (await progresion.resumenSemana(b1.id, 1)).valor!.nadaHecho,
      true
    );
  });

  test("editar la progresión de una rutina queda registrado con antes y después", async () => {
    const b1 = await bloque("Bloque 1");
    const plantillaId = b1.rutinasProgramadas[0].plantillaId;
    const antes = b1.rutinasProgramadas[0].progresiones;
    assert.ok(
      (
        await progresion.editarProgresion(
          b1.id,
          plantillaId,
          { progresionGeneral: [{ tipo: "reps", incremento: 1 }] },
          [{ paso: 3, factor: 0.8 }],
          "Le agrego más"
        )
      ).ok
    );
    const despues = await bloque("Bloque 1");
    assert.deepStrictEqual(despues.rutinasProgramadas[0].progresionGeneral, [
      { tipo: "reps", incremento: 1 },
    ]);
    assert.deepStrictEqual(despues.descargas, [{ paso: 3, factor: 0.8 }]);
    const fila = (await db.personal_historial.toArray()).find(
      (h) => h.accion === "editar_progresion"
    )!;
    assert.deepStrictEqual(
      (fila.campoAnterior as { progresiones: unknown }).progresiones,
      antes
    );
    assert.strictEqual(
      (fila.campoNuevo as { nota: string }).nota,
      "Le agrego más"
    );
  });
});

describe("Entrenamiento: reestructurar bloques con IA (reemplazar sin perder historial)", () => {
  beforeEach(async () => {
    for (const t of [
      db.bloque_entrenamiento,
      db.plantilla_rutina,
      db.catalogo_ejercicio,
      db.registro_actividad,
      db.personal_historial,
    ])
      await t.clear();
  });

  test("reemplaza el bloque con el mismo nombre, crea los nuevos, conserva las sesiones y deja el estado anterior en el historial", async () => {
    await importar.importarBloqueCompleto([
      bloqueJson("Bloque 1", "2026-09-21", "2026-10-18"),
    ]);
    const b = (await db.bloque_entrenamiento.toArray())[0];
    await registro.registrarComoPlanificado(
      b.rutinasProgramadas[0].plantillaId,
      "2026-09-21",
      b.id
    );

    const nuevo = bloqueJson("Bloque 1", "2026-09-21", "2026-11-01"); // ahora dura más
    nuevo.rutinas[0].ejercicios[0] = {
      nombre: "Sentadilla goblet",
      series: 4,
      reps: 8,
      pesoKg: 12,
    } as never;
    const otro = bloqueJson("Bloque nuevo", "2026-11-02", "2026-11-29");
    const r = await importar.reestructurarBloques([nuevo, otro]);
    assert.ok(r.ok, r.ok ? "" : r.error!.mensaje);

    const todos = await db.bloque_entrenamiento.toArray();
    assert.strictEqual(
      todos.length,
      2,
      "el existente se reemplazó (mismo id) y el otro se creó"
    );
    const reemplazado = todos.find((x) => x.nombre === "Bloque 1")!;
    assert.strictEqual(reemplazado.id, b.id);
    assert.strictEqual(reemplazado.diaFin, "2026-11-01");
    const base = reemplazado.rutinasProgramadas[0].estructuraBase as {
      bloques: { sets: unknown[] }[];
    };
    assert.strictEqual(base.bloques[0].sets.length, 4);
    assert.strictEqual(
      await db.registro_actividad.count(),
      1,
      "las sesiones ya hechas no se tocan"
    );
    const fila = (await db.personal_historial.toArray()).find(
      (h) => h.accion === "reestructurar"
    )!;
    assert.strictEqual(fila.entidadId, b.id);
    assert.strictEqual(
      (fila.campoAnterior as { diaFin: string }).diaFin,
      "2026-10-18"
    );
  });
});
