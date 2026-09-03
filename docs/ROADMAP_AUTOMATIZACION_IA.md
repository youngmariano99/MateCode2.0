# Roadmap: Automatización de Desarrollo de Tickets con IA

Este documento es la referencia vigente para el Módulo de Ejecución Autónoma/Híbrida.
**Reemplaza las secciones 3 y parte de la 5 de `PLAN_AUTOMATIZACION_EJECUCION.md`** (el
motor de ejecución vía API cruda de Anthropic + Tool Use manual dentro de un route de
Next.js). Se conserva y extiende el modelo de datos de ese documento (secciones 1-2),
que ya está parcialmente cableado en `schema.ts` y `db.ts` (v14).

## Decisión de arquitectura (confirmada)

- **Runner**: proceso Node local separado de la app Next.js (no un API route ejecutando
  `exec()` sobre el propio servidor que sirve la UI).
- **Motor de IA**: **Claude Code headless** (`claude -p ... --output-format json`), no la
  API cruda de Anthropic con Tool Use reimplementado a mano. Motivo: Claude Code ya
  resuelve edición de archivos, ejecución de comandos, permisos por proyecto (corralito)
  y sesiones resumibles — reconstruir eso con Tool Use manual es más trabajo, menos
  seguro y gasta más tokens en reconstrucción de contexto.
- **Comunicación runner ↔ sistema**: vía la infraestructura de sync ya existente
  (`/api/sync/[table]`, `/api/sync/bulk` → Supabase), no acceso directo a IndexedDB
  (el runner no corre en el navegador).
- **Cada paso automático tiene equivalente manual** — la automatización nunca reemplaza
  el flujo manual, se agrega al lado.
- **Todo el procedimiento es resumible**: el estado vive en la base (checkpoints), no en
  memoria del proceso runner, para sobrevivir a un corte de créditos, de conexión o un
  reinicio.

## Principios de diseño acordados

1. **Trazabilidad total** — cada intento de ejecución queda como checkpoint auditable,
   con un catálogo de errores común entre IA y sistema (mismo "idioma" de fallos).
2. **Doble resumen** — todo handoff trae `resumen_tecnico` (para vos como dev) y
   `resumen_negocio` (lenguaje de Product Owner, sin tecnicismo).
3. **Métricas objetivas por ticket y sprint** — tiempo real, tokens consumidos (input/
   output, vienen directo de la respuesta de Claude Code), y cantidad de iteraciones/
   bugs, para medir eficiencia real del proceso, no percibida.
4. **Verificación por tipo de test, no por herramienta** — cada proyecto define sus
   comandos (`buildCmd/lintCmd/testUnitCmd/testIntegrationCmd/testE2eCmd`), pero la regla
   de "qué hay que tener testeado" (lógica backend, flujo frontend tocado, roundtrip de
   BD) es la misma en todos los proyectos.
5. **Corralito de seguridad real** — enforcement a nivel de permisos de la herramienta
   (`.claude/settings.json` por proyecto: comandos y rutas permitidas/denegadas), no solo
   reglas de texto en el prompt.
6. **Guía de pruebas manuales estandarizada** en cada handoff (pasos, datos de prueba,
   resultado esperado) para que probar manualmente sea rápido y consistente.
7. **Economía de tokens por diseño**: el sistema no vuelca contenido de docs
   (SCHEMA.md/SITEMAP.md/etc.) dentro del prompt — le dice al agente dónde están y deja
   que los lea bajo demanda con sus propias tools, ya que tiene acceso directo al repo.
   Reglas de tamaño de archivo (ej. evitar componentes >300 líneas) como estándar de
   proyecto, para no forzar lecturas de archivos gigantes que degradan contexto.
8. **Acciones fuera de alcance de la IA, clasificadas en 2 niveles**:
   - **Moderadas**: no bloquean el desarrollo (ej. cargar una credencial real de BD) —
     la IA sigue developing y deja la acción pendiente en la lista de tareas manuales
     del handoff.
   - **Críticas**: bloquean el desarrollo hasta resolverse (ej. sin esa configuración no
     hay forma de correr los tests y verificar objetivamente) — el checkpoint pasa a
     `BLOQUEADO_ACCION_CRITICA`, el runner se pausa sin marcarlo como error, y espera
     confirmación manual para continuar.

## Modelo de datos (extiende el plan previo)

### `proyecto_config_automatizacion` (ya existe, se completa)

`buildCmd, lintCmd, testUnitCmd, testIntegrationCmd, testE2eCmd, maxRetriesLinter,
maxLineasPorArchivo, allowedTools (json), deniedPaths (json)`

### `task_execution_checkpoints` (ya existe, se extiende)

Agregar: `tokensInput, tokensOutput, costoUsd, tiempoInicioMs, tiempoFinMs,
claudeSessionId, codigoError (FK catalogo_errores), accionesManualesModeradas (json[]),
accionesManualesCriticas (json[]), resumenNegocio, guiaPruebasManual (json)`

### `catalogo_errores` (nueva)

`codigo (PK), categoria, severidad, esRecuperable (bool), accionSugerida`.
Ej: `BUILD_FAILED`, `TEST_FAILED`, `HANDOFF_INVALID_JSON`, `SCOPE_BLOCKED_CRITICO`,
`SCOPE_BLOCKED_MODERADO`, `TOKEN_LIMIT_EXCEEDED`, `VERIFICACION_INCONCLUSA`,
`MERGE_CONFLICT`, `SYNC_FAILED`.

### Contrato de handoff (validado con zod, ya no `JSON.parse` libre)

`archivos_creados_o_modificados[], firmas_o_contratos_exportados[], resumen_tecnico,
resumen_negocio, guia_pruebas_manual{pasos[], datos_prueba, resultado_esperado},
acciones_manuales_requeridas[{nivel: "moderada"|"critica", descripcion}], update_docs?`

## Fases

- **Fase 0 — Saneamiento** ✅ _completa_: cola de eventos resiliente (intentos/
  ultimoError, ya no se traba por un evento roto), columnas Dexie↔Drizzle alineadas y
  migradas en Supabase (`task_executions.titulo/fechaInicio/fechaFin`,
  `historias.completada`, `actualizadoEn` faltantes), soft-delete uniforme
  (`eliminado`/`eliminadoEn` en epicas/sprints/historias/tareas/task_executions, con
  `task_executions` pasando de hard-delete a soft-delete sincronizado), código muerto
  eliminado (`kanban-board.tsx`, no se importaba en ningún lado).
  Pendiente menor (no bloqueante): reconciliar nomenclatura de estado de
  `sprint-planner.tsx` (`planificacion/finalizado`) con la real
  (`planificado/completado` de `sprint-enfoque-tab.tsx`) — se resuelve cuando se toque
  esa pantalla.
- **Fase 1 — Modelo de datos completo** ✅ _completa_: tabla `catalogo_errores` creada y
  sembrada (10 códigos iniciales, ver
  [`automatizacion-ia.entity.ts`](../src/domain/entidades/automatizacion-ia.entity.ts)),
  `task_execution_checkpoints` extendido con métricas (tokens, costo, tiempos,
  `claudeSessionId`), acciones manuales moderadas/críticas, doble resumen y guía de
  pruebas; `proyecto_config_automatizacion` extendido con comandos de test por capa y
  corralito (`allowedTools`/`deniedPaths`/`maxLineasPorArchivo`); tipado fuerte en Dexie
  (antes estas tablas no tenían ni tipos TS ni se sincronizaban con Supabase — ya
  wireadas en `/api/sync/[table]`, `/api/sync/bulk` y el backup completo); contrato de
  handoff validado con zod (`handoffIASchema` / `parseHandoffIA`, reemplaza el
  `JSON.parse` libre anterior).
- **Fase 2 — Motor de ejecución** ✅ _código base completo, falta Fase 3 para disparar
  tickets desde la UI_: runner Node local (`runner/`, `npm run ai:runner`) con Claude
  Code headless. Reusa el generador de prompt real extraído a
  [`generar-prompt-actividad.ts`](../src/domain/prompts/generar-prompt-actividad.ts)
  (antes vivía como closure dentro de `desarrollo-workspace.tsx`, no reusable fuera del
  componente) — el runner NO le pide a la IA que arme el prompt, usa el mismo texto que
  ya arma el sistema. Captura tokens/costo/`session_id` de la respuesta de Claude Code
  (`runner/claude-code.ts`), corre build/lint/test como gate objetivo
  (`runner/verificacion.ts`), escribe el checkpoint en cada sub-paso (claim → invocación
  → verificación → handoff) para poder retomar tras un corte, y reintenta con
  `--resume <sessionId>` + el log del error como contexto en vez de reconstruir todo de
  cero. Escribe el corralito de permisos (`.claude/settings.local.json`) en el repo
  destino antes de invocar al agente (`runner/corralito.ts`). Clasifica acciones fuera de
  alcance en moderadas/críticas: las críticas pausan el checkpoint
  (`BLOQUEADO_ACCION_CRITICA`) sin marcarlo error; las moderadas quedan registradas pero
  no bloquean. El ticket automatizado nunca se autocompleta: al pasar la verificación
  queda en `in_revision` para que el humano lo revise y lo marque `Verificado` (Fase 3).
  Config por máquina en `runner.config.json` (gitignored, ver
  `runner.config.example.json`) — mapea cada `proyectoId` a su ruta local de repo.
  **Pendiente para poder usarlo de punta a punta**: la Fase 3 (botón "Comenzar ticket con
  IA" en la UI, que es lo que crea el checkpoint en estado `IDLE` que el runner recoge) —
  hoy el runner funciona pero no tiene aún quién le mande tickets.
- **Fase 3 — UI híbrida en el Kanban** ✅ _completa_: componente
  [`EjecucionIAControl`](../src/presentation/components/proyectos/desarrollo/ejecucion-ia-control.tsx)
  integrado en cada tarjeta de actividad de `sprint-enfoque-tab.tsx`, al lado del botón
  manual "🎯 Modo Enfoque" (no lo reemplaza). Botón "🚀 Comenzar ticket con IA" (crea el
  checkpoint `IDLE` que el runner recoge), estado en vivo con las 8 etiquetas del ciclo
  (`en cola / desarrollando / verificando / reintentando / bloqueado / pausado / listo
para revisar / verificado`), panel de revisión con resumen técnico + resumen de negocio
  - guía de pruebas manual + acciones pendientes moderadas, botones "✅ Verificado" (pasa
    el ticket a completado) y "🔁 Iterar con IA" (input libre → nueva vuelta del runner con
    ese feedback), y "⚠️ Reintentar con IA" cuando queda pausado o bloqueado por una acción
    crítica ya resuelta a mano.
    **Pieza nueva no prevista originalmente pero necesaria**: como el runner corre fuera
    del navegador y escribe directo en Supabase, hacía falta una vía de lectura
    ("pull") que hoy no existía en el sistema (todo el sync era solo push
    local→remoto) — se agregó `GET /api/checkpoints/[proyectoId]` +
    [`checkpoint-pull.service.ts`](../src/offline/services/checkpoint-pull.service.ts),
    con polling cada 10s mientras el tablero está abierto, para que la UI vea el progreso
    del runner casi en vivo.
    **Verificado**: typecheck y lint limpios en todo lo nuevo; el runner sigue arrancando
    correctamente end-to-end. **No verificado todavía** (requiere un proyecto real con
    Claude Code instalado): el ciclo completo botón → runner → verificación → revisión
    humana corriendo de punta a punta — es el primer paso lógico de prueba antes de seguir
    a la Fase 4.
- **Fase 4 — Git/PR automation**: commit de checkpoint antes de empezar, push y creación
  de PR al completar, rollback (`git reset --hard`) accesible desde la UI.
- **Fase 5 — Métricas y dashboard de eficiencia**: tiempo/tokens/iteraciones por ticket y
  por sprint, para detectar qué tipo de ticket es sistemáticamente más caro o iterativo.
- **Fase 6 — Auto-planificación**: aplicar el mismo motor a la generación de
  épicas/historias/actividades/sprints desde un relevamiento inicial.
- **Fase 7 — Automatización de sprint completo**: orquestación secuencial de todos los
  tickets de un sprint con contexto acumulado entre ellos, resumen consolidado al cierre.

Se implementa **una fase a la vez**, con checkpoint de revisión entre cada una.
