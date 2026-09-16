# Sprint 21: Fases con arrastre, bandas de aceptación, prompts guiados por etapas y ajuste asistido por IA

> Seguimiento vivo — se va marcando a medida que se cierra cada parte. Plan completo (decisiones, shapes exactos) en el historial de conversación; acá el checklist de ejecución.

## Decisiones ya tomadas (no reabrir sin discutirlo)

- `FasePersonal` cuelga solo de Entregable en esta vuelta (no Objetivo/Proyecto) — su progreso se calcula sumando Actividades por rango de `diaTarea`.
- Bandas de aceptación (`bandaAceptable`/`bandaMejorable`, % de la meta) son informativas en Objetivo/Proyecto/Entregable, pero en Fase **deciden el flujo de cierre**: "ideal"/"aceptable" habilita las 4 decisiones clásicas de arrastre, "mejorable"/"bajo" fuerza (u ofrece) "reestructurar_restantes".
- `calcularDistribucionProgresiva()` es una función pura (motor de reparto pirámide/constante) reusada tanto para "Generar Fases automáticamente" como para "reestructurar_restantes" al cerrar una Fase mal.
- "Ajuste asistido por IA" sigue el patrón copiar-prompt/pegar-JSON del resto del módulo — `api/ai/execute` no sirve (es un agente de código con acceso a filesystem/shell, no un endpoint genérico).
- Los avisos de Fase vencida son un banner síncrono (mismo patrón que `PanelRetorno`), sin jobs en segundo plano.

## Checklist de ejecución

### Sprint 1 — Vista previa antes de importar JSON ✅ COMPLETO

- [x] `ModalImportarJson`: prop opcional `renderResumen?: (items: unknown[]) => React.ReactNode` — sin este prop el comportamiento queda idéntico a antes (usado también por `estacion-ideas.tsx`, `estacion-guion.tsx`, `panel-bloques.tsx`, `crear-plantilla.tsx`, sin tocarlos)
- [x] Paso de confirmación (resumen + "Confirmar e importar" / "Volver a editar") cuando se pasa `renderResumen`
- [x] `resumen-import-jerarquia.tsx` (nuevo): 4 funciones de resumen (árbol/objetivo comparten una, proyecto, entregable, actividades) — reusan los mismos zod schemas que `ImportarArbolPersonalUseCase`, así que un JSON con forma inválida se rechaza acá mismo con el mismo mensaje
- [x] Cableado en los 5 puntos de entrada existentes de `navegador-jerarquico.tsx`
- [x] Verificación: typecheck / eslint / test / build — todo limpio

### Sprint 2 — Fixes puntuales de prompts existentes ✅ COMPLETO

- [x] `cantidadObjetivo` en Entregable recurrente = TOTAL acumulado, con ejemplo numérico explícito (incluye el caso pirámide: sumar lo que corresponde a cada semana con su propia cuota)
- [x] Sub-tareas del mismo día = Entregables recurrentes separados (agregado a `NOTA_RECURRENCIA`)
- [x] `NOTA_HABITO` (nueva): sugerir Hábito cuando no hay meta final — cableada en árbol completo, Proyecto y Entregable (los 3 puntos donde se puede crear un Entregable)
- [x] Verificación: typecheck / eslint / test (167/167)

### Sprint 3 — Bandas de aceptación ✅ COMPLETO

- [x] `bandaAceptable?`/`bandaMejorable?` en `ObjetivoCuantificable`, `ProyectoPersonal`, `Entregable` — con refine de zod (mejorable < aceptable) en crear/ajustar de los 3 niveles
- [x] `calcularNivelLogro()` (función pura, junto a `calcularRitmoObjetivo` en `objetivo-cuantificable.entity.ts`) + 6 tests nuevos
- [x] Postgres: columnas `banda_aceptable`/`banda_mejorable` (integer) en las 3 tablas, aplicadas en vivo
- [x] Chip de nivel de logro en `TarjetaNodo` (junto al chip de ritmo)
- [x] Edición: en vez de 3 formularios de creación nuevos, se extendió `AjustarCantidadModal` (ya abierto para "meta" en los 3 niveles) con 2 inputs opcionales de banda — reduce alcance respecto al plan original (no se tocaron los formularios de creación) para no duplicar el mismo dato en dos lugares; crear con bandas ya seteadas queda disponible vía import JSON más adelante si hace falta
- [x] Verificación: typecheck / eslint / test (173/173) / build — todo limpio

### Sprint 4 — Entidad `FasePersonal` + Dexie/Postgres/sync + CRUD ✅ COMPLETO

- [x] `fase-personal.entity.ts`: entidad, zod schemas, `DECISIONES_CIERRE_FASE` (5 valores)
- [x] `personal-historial.entity.ts`: `TIPOS_ENTIDAD_HISTORIAL` +"fase", `ACCIONES_HISTORIAL` +"cerrar_fase" (+ `panel-historial-personal.tsx` actualizado, tenía un `Record<AccionHistorial>` exhaustivo)
- [x] Dexie versión 26: `fase_personal: "id, entregableId, estado, diaLimite, orden"`
- [x] Postgres: `pgTable("fase_personal", ...)` con `cierre: jsonb`, tabla creada en vivo
- [x] Sync: `tableMapper` en ambas rutas (`entregableId` ya estaba en `EMPTY_TO_NULL_FIELDS`)
- [x] `recomputarFasesDeEntregable()`: suma solo las Actividades cuyo `diaTarea` cae en el rango de cada Fase abierta, llamado desde `recomputarEntregable()`
- [x] `gestionar-fases.use-case.ts`: `crearFase`, `ajustarFase`
- [x] `AjustarCantidadModal`: `NivelConCantidad` +"fase"
- [x] Verificación: typecheck / eslint / test / build

### Sprint 5 — Motor de distribución progresiva ✅ COMPLETO (backend) — falta UI

- [x] `calcularDistribucionProgresiva()` en `fase-personal.entity.ts` (constante e incremental con tope, reporta `diferencia` vs. total pedido en vez de forzarlo)
- [x] `crearFasesDesdeDistribucion()` en `gestionar-fases.use-case.ts`
- [x] 3 tests (constante, creciente con tope, caso que no cierra)
- [x] `generar-fases-modal.tsx`: formulario (fechas, días hábiles, duración de fase, cuota inicial/incremento/tope, total) + preview editable en vivo + total proyectado vs. pedido resaltado si no coincide
- [x] Botón "Generar automáticamente" en `seccion-fases-entregable.tsx`
- [x] Verificación: typecheck / eslint / test / build — todo limpio

### Sprint 6 — Cierre de fase con arrastre y gate por bandas ✅ COMPLETO

- [x] `cerrarFase()`: calcula `nivelLogro`, bloquea las 4 decisiones clásicas si el nivel es "mejorable"/"bajo" (salvo "descartar", siempre válida), aplica los 5 caminos
- [x] `detectarFasesPendientesDeCierre(hoy)` (solo lectura, nunca cierra sola)
- [x] 6 tests: progreso por rango de fechas, trasladar_siguiente (+ error sin fase siguiente), repartir_restantes, descartar, gate por bandas + reestructurar_restantes, detectar pendientes
- [x] Verificación: typecheck / eslint / test (183/183) / build — todo limpio

### Sprint 7 — UI de Fases restante ✅ COMPLETO (código) — ⚠️ pendiente de que VOS lo pruebes en el navegador

- [x] `seccion-fases-entregable.tsx`: sección "Fases" embebida en `VistaActividades` — listado con progreso/meta/estado/banda, formulario "Nueva fase" (una a la vez), botón "Generar automáticamente"
- [x] `cerrar-fase-modal.tsx`: si el nivel de logro es "ideal"/"aceptable" ofrece las 4 decisiones clásicas (incluye reparto manual con inputs por fase), si es "mejorable"/"bajo" solo deja "Reestructurar restantes" (con su propio preview vía `calcularDistribucionProgresiva`, mapeado 1:1 por orden a las fases futuras existentes) o "Descartar"
- [x] `aviso-fases-pendientes.tsx` en la vista "Hoy" (junto a `PanelRetorno`), mismo estilo ámbar — lista Fases vencidas sin cerrar con el nombre de su Entregable, botón "Resolver" abre `CerrarFaseModal`
- [x] Verificación: typecheck / eslint / test (183/183) / build — todo limpio
- [ ] **Verificación visual — no pude hacerla yo**: mismo límite de siempre (login sin credenciales). Falta que abras un Entregable, crees Fases (a mano y con "Generar automáticamente"), y pruebes cerrar una fase con cada tipo de decisión

### Sprint 8 — Prompt de planificación en etapas + 6to punto de entrada ✅ COMPLETO

- [x] `generarPromptPlanificacionEnFases()`: 3 etapas obligatorias (cuantificar → Fases → estructura), no genera JSON hasta cerrar las 3, incluye áreas + objetivos activos + resumen de las últimas 10 Fases tocadas
- [x] `generarPromptFases()`: prompt de "Fases bajo un Entregable existente" (5to→6to punto de entrada)
- [x] `itemFaseJsonSchema`/`importarFasesBajoEntregableSchema` + `importarFases()` en `ImportarArbolPersonalUseCase`
- [x] `resumenFasesBajoEntregable()` para la vista previa
- [x] Botones "Prompt IA" / "Pegar plan" en `SeccionFasesEntregable`, botón "Planificar por etapas" en `VistaAreas`
- [x] Verificación: typecheck / eslint / test (183/183) / build — todo limpio

### Sprint 9 — Ajuste asistido por IA ✅ COMPLETO (código) — ⚠️ pendiente de que VOS lo pruebes en el navegador

- [x] `ajuste-ia.entity.ts`: `itemAjusteIAJsonSchema`/`ajustesIAJsonSchema` — resuelve por TÍTULO EXACTO (nivel objetivo/proyecto/entregable/fase), nunca por id (la IA no conoce ids internos)
- [x] `generarPromptAjusteIA(contextoCompleto)`
- [x] `AplicarAjustesIAUseCase`: resuelve cada ajuste dentro del subárbol del Objetivo elegido, reporta no encontrado / ambiguo como error no bloqueante y sigue con el resto, delega en los `ajustar*` ya existentes (mismo historial, mismo recompute)
- [x] `AjustarConIAModal`: arma el contexto completo (Objetivo → Proyectos → Entregables → Fases con logrado/meta/faltante), copiar prompt + pegar respuesta reusando `ModalImportarJson` + `renderResumen`
- [x] Acción "Ajustar con IA" agregada a `AccionesNodo`/`TarjetaNodo`, cableada solo a nivel Objetivo (`VistaObjetivos`)
- [x] Verificación: typecheck / eslint / test (183/183) / build final — todo limpio
- [ ] **Verificación visual — no pude hacerla yo**: mismo límite de siempre (login sin credenciales)

### Fix post-entrega: Fases anidadas en el mismo JSON, no como paso aparte

El usuario probó el prompt de "Planificar por etapas" y notó una contradicción real: la Etapa 3 decía "bajá a Proyecto/Entregable/Actividad **dentro de cada Fase**" (como si la Fase fuera un contenedor), pero el JSON de salida no tenía lugar para Fases y pedía generarlas en un prompt totalmente aparte — dos exhanges de copiar/pegar en vez de uno. Esto no coincidía con el modelo de datos real (Fase cuelga de un Entregable, nunca al revés) ni con lo que el usuario esperaba (ir llenando de a partes en un solo flujo, como los sprints de desarrollo).

- [x] `itemEntregableJsonSchema` gana `fases: ItemFaseJson[]` anidado (mismo lugar que `actividades`) — ahora **cualquiera** de los 5 puntos de entrada de la jerarquía puede crear Fases en la misma pasada, no solo el flujo por etapas
- [x] `ImportarArbolPersonalUseCase.crearEntregableConHijos` crea las Fases anidadas junto con las Actividades
- [x] `NOTA_FASES` (nueva, en `generar-prompt-jerarquia-personal.ts`): aclara explícitamente que Fase NO es un nivel de la jerarquía, va dentro del Entregable — cableada en el árbol completo, en "Entregable bajo Proyecto existente", y en el flujo por etapas
- [x] `generarPromptPlanificacionEnFases`: Etapa 2 reformulada ("pensar el ritmo", no "armar Fases como contenedor"), Etapa 3 aclara que el reparto se nidea dentro del Entregable, un solo JSON final con todo junto — sacada la nota vieja que mandaba a un segundo prompt
- [x] `resumen-import-jerarquia.tsx`: la vista previa del Entregable ahora también muestra sus Fases anidadas
- [x] El prompt/import de "Fases bajo un Entregable existente" (`generarPromptFases`/`importarFases`) se mantiene — pero ahora está clarificado que es solo para agregar Fases a algo que ya existía de antes, no para el armado inicial
- [x] Test nuevo: `importarArbol` crea las Fases anidadas dentro del Entregable en la misma pasada
- [x] Verificación: typecheck / eslint / test (184/184) / build — todo limpio

## Sprint 21 completo — resumen

Los 9 sprints del plan quedaron implementados y verificados (typecheck/eslint/test/build limpios en cada uno). Pendiente únicamente la prueba visual en el navegador (bloqueada por el login) — recorrido sugerido: crear Fases a mano y con "Generar automáticamente" en un Entregable, cerrar una Fase con cada tipo de decisión (incluida la que queda bloqueada por bandas), usar "Planificar por etapas" y "Ajustar con IA" desde Áreas/Objetivos, y confirmar que la vista previa de import funciona en los 6 puntos de entrada.
