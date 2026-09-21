import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { db } from "../../offline/dexie/db";
import { CATALOGO_EJERCICIOS_SEED } from "../../domain/entidades/ejercicio-catalogo-seed";
import { ImportarBloqueEntrenamientoUseCase } from "../../application/use-cases/personal/importar-bloque-entrenamiento.use-case";
import {
  catalogoInfo,
  planDeSesion,
} from "../../application/use-cases/personal/gestionar-progresion-bloque.use-case";
import {
  armarContextoReestructuracion,
  armarUltimoPlanBloqueActivo,
} from "../../application/servicios/armar-contexto-entrenamiento.service";
import {
  generarPromptBloqueCompleto,
  generarPromptReestructurar,
} from "../../domain/prompts/generar-prompt-entrenamiento";

// El plan real de entrenamiento (docs/planes/entrenamiento.json) tiene que importar
// contra el catálogo real, sin errores ni avisos, y cada bloque tiene que progresar.
test("el plan de entrenamiento importa limpio, progresa semana a semana y alimenta los prompts", async () => {
  for (const t of [
    db.bloque_entrenamiento,
    db.plantilla_rutina,
    db.catalogo_ejercicio,
    db.registro_actividad,
    db.personal_historial,
  ])
    await t.clear();
  await db.catalogo_ejercicio.bulkAdd(
    CATALOGO_EJERCICIOS_SEED.map((e) => ({ ...e, creadoEn: 1 }))
  );

  const json = JSON.parse(
    readFileSync("docs/planes/entrenamiento.json", "utf-8")
  );
  assert.strictEqual(json.length, 4);
  const res =
    await new ImportarBloqueEntrenamientoUseCase().importarBloqueCompleto(json);
  assert.ok(res.ok, res.ok ? "" : res.error!.mensaje);
  assert.ok(!res.valor!.includes("Con errores"), res.valor);
  assert.ok(!res.valor!.includes("Ojo"), res.valor);

  const bloques = (await db.bloque_entrenamiento.toArray()).sort((a, b) =>
    a.diaInicio.localeCompare(b.diaInicio)
  );
  assert.strictEqual(bloques.length, 4);
  const info = await catalogoInfo();
  const plantillas = new Map(
    (await db.plantilla_rutina.toArray()).map((p) => [p.id, p])
  );
  const textoPlan = async (
    bloque: (typeof bloques)[number],
    nombreRutina: string,
    dia: string
  ) => {
    const rp = bloque.rutinasProgramadas.find(
      (r) => plantillas.get(r.plantillaId)?.nombre === nombreRutina
    )!;
    return JSON.stringify(
      await planDeSesion(bloque, plantillas.get(rp.plantillaId)!, dia, info)
    );
  };

  // Cada bloque de fuerza: la primera y la última semana NO son iguales.
  const rutinasDeFuerza = [
    [0, "Fuerza A — Empuje y Rodilla"],
    [0, "Fuerza B — Tirón y Cadera"],
    [1, "Fuerza Unilateral A — Rodilla y Empuje"],
    [1, "Fuerza Unilateral B — Cadera y Tirón"],
    [2, "Potencia A — Balístico y Tracción"],
    [2, "Potencia B — Unipodal y Fuerza Explosiva"],
    [2, "Acondicionamiento HIIT — Pasadas RSA Fútbol"],
    [3, "Pretemporada A — Fuerza Específica Fútbol"],
    [3, "Pretemporada B — Cadena Posterior y Profilaxis"],
    [3, "MetCon — Piques, Agilidad y Cambios de Dirección"],
  ] as const;
  for (const [i, nombre] of rutinasDeFuerza) {
    const b = bloques[i];
    const primera = await textoPlan(b, nombre, b.diaInicio);
    const ultima = await textoPlan(b, nombre, b.diaFin);
    assert.notStrictEqual(
      primera,
      ultima,
      `"${nombre}" tiene que progresar dentro de su bloque`
    );
  }

  // Todas las rutinas (salvo pausa activa) tienen calentamiento estructurado.
  for (const p of plantillas.values()) {
    if (p.formato === "pausa_activa") continue;
    assert.ok(
      (p.calentamientoEstructura?.length ?? 0) > 0,
      `${p.nombre} sin calentamiento estructurado`
    );
  }

  // Los prompts se arman con el contexto real.
  const ultimo = await armarUltimoPlanBloqueActivo();
  const contexto = await armarContextoReestructuracion("2026-09-30");
  assert.match(contexto, /Bloque 1 — Hábito/);
  assert.match(contexto, /Progresión:/);
  const catalogo = await db.catalogo_ejercicio.toArray();
  const p1 = generarPromptBloqueCompleto(catalogo, [], [], [], "", ultimo);
  for (const clave of [
    "PROGRESIÓN",
    "MÍNIMOS",
    "DESCARGA",
    "CALENTAMIENTO → DESARROLLO",
    "CONTINUIDAD ENTRE BLOQUES",
    '"progresion"',
    '"descargas"',
  ]) {
    assert.ok(p1.includes(clave), `el prompt del bloque no menciona ${clave}`);
  }
  const p2 = generarPromptReestructurar(
    catalogo,
    [],
    contexto,
    "Fue muy fácil"
  );
  for (const clave of [
    "REEMPLAZAN",
    "Fue muy fácil",
    "Bloque 1 — Hábito",
    "PROGRESIÓN",
  ]) {
    assert.ok(
      p2.includes(clave),
      `el prompt de reestructurar no incluye ${clave}`
    );
  }
});
