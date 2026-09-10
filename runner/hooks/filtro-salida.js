#!/usr/bin/env node
// Lee stdin (la salida ya combinada de un comando de build/lint/test,
// 2>&1) y deja pasar solo lo relevante: cada línea que matchea un patrón
// de fallo, más contexto alrededor (el detalle real suele venir después
// del título del error, no en esa misma línea), más la cola del log
// completo (resumen final de la mayoría de los test runners). Pensado
// para engancharse con un pipe simple — no ejecuta nada por su cuenta.
//
// SIN PROBAR TODAVÍA contra una corrida real de Claude Code — antes de
// confiar en esto para un sprint completo, correr un ticket de prueba y
// revisar en pasosLog que las fallas reales siguen detectándose (que el
// filtro no se las está comiendo).
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  const lineas = raw.split(/\r?\n/);
  const patronFallo = /fail|error|✗|✖/i;
  const resultado = [];
  let restante = 0;
  for (const l of lineas) {
    if (patronFallo.test(l)) {
      resultado.push(l);
      restante = 15;
    } else if (restante > 0) {
      resultado.push(l);
      restante--;
    }
  }

  if (resultado.length === 0) {
    // Sin ningún match de fallo: probablemente pasó todo, y en ese caso el
    // log completo ya suele ser corto — no hace falta filtrar nada.
    process.stdout.write(raw);
    return;
  }

  const filtradas = resultado.slice(0, 300);
  const cola = lineas.slice(-20);
  process.stdout.write(
    [...filtradas, "--- (últimas líneas del log completo) ---", ...cola].join(
      "\n"
    )
  );
});
