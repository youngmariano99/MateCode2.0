# Sprint 22: Entrenamiento — armar Bloque + Rutinas + Ejercicios con un solo prompt/JSON

> Seguimiento vivo — se va marcando a medida que se cierra cada parte. Plan completo en el historial de conversación; acá el checklist de ejecución.

## Decisiones ya tomadas (no reabrir sin discutirlo)

- `BloqueEntrenamiento` gana `plantillaIds: string[]` — array denormalizado, sin tabla de unión, sin índice Dexie.
- Ejercicio: resolución por nombre exacto → reusa si existe, crea si no (validando equipamiento ⊆ lo que el usuario tiene).
- Rutina: resolución por nombre exacto → si existe, se **actualiza in-place** (nunca duplica) — así "mismo nombre, números nuevos" es la forma de ajustar un bloque.
- Equipamiento es fijo — la IA nunca lo crea ni lo amplía, solo lo respeta como restricción.
- Progresión de un Bloque nuevo se basa en `calcularMejoraEjercicio()` sobre `RegistroActividad` reales del bloque anterior, no en la plantilla teórica.
- Pausas activas = solo Rutinas de formato `pausa_activa`, sin Bloque ni fechas — biblioteca que crece de a poco.

## Checklist de ejecución

### Pieza 1 — Dominio: creación de Ejercicio + ajuste de Rutina + `plantillaIds` en Bloque ✅ COMPLETO

- [x] `crearEjercicioSchema` en `ejercicio.entity.ts`
- [x] `BloqueEntrenamiento.plantillaIds: string[]` en `rutina.entity.ts`; `crearBloqueSchema` acepta `plantillaIds?` (default [])
- [x] `ajustarPlantillaRutinaSchema` en `rutina.entity.ts`
- [x] Postgres: columna `plantilla_ids jsonb default '[]'` en `bloque_entrenamiento`, aplicada en vivo
- [x] Verificación: typecheck / eslint / test (184/184)

### Pieza 2 — Backend: use-cases ✅ COMPLETO

- [x] `gestionar-ejercicios.use-case.ts` (nuevo): `crearEjercicio` con validación de equipamiento ⊆ equipamiento propio
- [x] `gestionar-plantillas-rutina.use-case.ts`: `ajustarPlantilla`
- [x] `gestionar-bloques.use-case.ts`: `crearBloque` acepta `plantillaIds?`, nuevo `vincularRutinas(bloqueId, plantillaIds)` (une sin duplicar, `Set`)
- [x] `importarSecuencia` también setea `plantillaIds: []` en cada bloque creado
- [x] Verificación: typecheck / eslint / test (184/184)

### Pieza 3 — Import combinado (Bloque + Rutinas + Ejercicios) ✅ COMPLETO

- [x] `planificacion-entrenamiento.entity.ts` (nuevo): schemas del JSON combinado — `itemEjercicioNuevoJsonSchema` reusa `crearEjercicioSchema` tal cual, `itemRutinaJsonSchema`/`itemBloqueJsonSchema`, `importarBloqueCompletoSchema`, `importarPausasActivasSchema`
- [x] `tipoEstructuraDeFormato()` movido a `rutina.entity.ts` (antes duplicado solo en `crear-plantilla.tsx`)
- [x] `importar-bloque-entrenamiento.use-case.ts` (nuevo): `importarBloqueCompleto` + `importarPausasActivas` — resolución SECUENCIAL (no `Promise.all`) a propósito, para que dos Rutinas que comparten un Ejercicio nuevo no lo creen dos veces en una carrera
- [x] 8 tests nuevos: reusa ejercicio existente sin duplicar, crea ejercicio nuevo, actualiza Rutina existente por nombre en vez de duplicarla, un ejercicio con equipamiento inválido no bloquea el resto del import, pausas activas nunca crean un Bloque
- [x] Verificación: typecheck / eslint / test (192/192) — todo limpio

### Pieza 4 — Prompts ✅ COMPLETO

- [x] `generarPromptBloqueCompleto()` (contexto completo: catálogo, equipamiento, rutinas existentes con su estructura actual, bloques existentes, progreso real del bloque activo vía `calcularMejoraEjercicio`)
- [x] `generarPromptPausasActivas()` (acotado a ejercicios `esPausaActiva` y formato `pausa_activa`)
- [x] `generarPromptRutina()` existente gana `rutinasExistentes` como 3er parámetro (anti-duplicado) — firma cambió, se actualizó el único call site
- [x] `NOTA_ANTIDUPLICADO` compartida entre los 3 prompts
- [x] Verificación: typecheck / eslint / test (192/192)

### Pieza 5 — UI ✅ COMPLETO

- [x] `resumen-import-entrenamiento.tsx` (nuevo): `resumenBloqueCompleto`, `resumenPausasActivas`, `resumenRutinasStandalone` (los 2 últimos comparten implementación — mismo shape `{rutinasNuevas, ejerciciosNuevos}` sin Bloque)
- [x] `panel-bloques.tsx`: botones "Copiar prompt (bloque completo)" / "Pegar plan generado" (unificado), Rutinas vinculadas visibles en la tarjeta del bloque activo con badges, Combobox + botón "Vincular" para agregar una rutina existente a mano sin IA — los botones viejos de "solo periodización" (`Importar secuencia`, sin rutinas) se mantuvieron, no se eliminaron (siguen siendo útiles para armar el esqueleto de mesociclos sin comprometerse a rutinas todavía)
- [x] `crear-plantilla.tsx`: `importarRutinas` ahora delega 100% en `ImportarBloqueEntrenamientoUseCase.importarPausasActivas` (mismo shape `{rutinasNuevas, ejerciciosNuevos}`, sin Bloque) — ganó resolución-por-nombre (actualiza en vez de duplicar) y creación de Ejercicios nuevos, sin reimplementar la lógica; `tipoEstructuraDe` local reemplazado por `tipoEstructuraDeFormato` compartido
- [x] `panel-pausas-activas.tsx` (nuevo) + montado en la estación "Rutinas" de `entrenamiento/page.tsx`
- [x] Verificación: typecheck / eslint / test (192/192) / build — todo limpio

## Sprint 22 completo
