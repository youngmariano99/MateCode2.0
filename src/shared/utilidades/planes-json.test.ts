import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { db } from "../../offline/dexie/db";
import { ImportarArbolPersonalUseCase } from "../../application/use-cases/personal/importar-arbol-personal.use-case";
import { calcularRiesgosMinimos } from "../../application/servicios/minimos-personal.service";

// Los planes reales (docs/planes) tienen que importar sin errores ni avisos de mínimos.
for (const archivo of ["agencia-y-finanzas", "salud"]) {
  test(`el plan ${archivo}.json importa limpio y sus mínimos cierran`, async () => {
    for (const t of [
      db.area_personal,
      db.objetivo_cuantificable,
      db.proyecto_personal,
      db.entregable,
      db.fase_personal,
      db.actividad,
    ])
      await t.clear();
    const json = JSON.parse(
      readFileSync(`docs/planes/${archivo}.json`, "utf-8")
    );
    const res = await new ImportarArbolPersonalUseCase().importarArbol([json]);
    assert.ok(res.ok, res.ok ? "" : res.error!.mensaje);
    assert.ok(!res.valor!.includes("Con errores"), res.valor);
    assert.ok(!res.valor!.includes("Ojo con los mínimos"), res.valor);
    const riesgos = await calcularRiesgosMinimos("2026-09-21");
    assert.deepStrictEqual(
      riesgos.map((r) => r.mensaje),
      []
    );
  });
}
