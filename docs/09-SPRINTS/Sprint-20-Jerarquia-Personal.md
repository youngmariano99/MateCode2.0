# Sprint 20: Jerarquía Personal (Área → Objetivo → Proyecto → Entregable → Actividad)

> Seguimiento vivo de la implementación — se va marcando a medida que se cierra cada parte. Plan completo de diseño (decisiones, shapes exactos, JSON de ejemplo) en el historial de conversación; acá solo el checklist de ejecución.

## Decisiones ya tomadas (no reabrir sin discutirlo)

- Actividad reemplaza `TareaDiaria` + `TareaPendiente`. Hábitos quedan separados, sin absorber (solo ganan `entregableId?`/`proyectoId?` opcionales).
- Área pasa a ser entidad real (`AreaPersonal`), no más texto libre de `catalogo_etiquetas`.
- `ObjetivoCuantificable` se extiende in-place (no se reemplaza).
- Migración por etapas (coexistencia), nunca big-bang — hay datos reales de uso diario.

## Checklist de ejecución

### Fixes reportados por el usuario probando en vivo

- [x] **Bug**: en el tab "Mes", el botón "Planificar objetivos con IA" (componente viejo de la Fase C, `PlanificarObjetivosIA` en `planificar-con-ia.tsx`) armaba el prompt con las áreas de `catalogo_etiquetas` (categoría `area_personal`), la fuente vieja — mostraba "sin áreas definidas todavía" aunque el usuario ya tenía Agencia/Desarrollo/Salud creadas en `area_personal` (la fuente nueva). Quedó reemplazado por "Armar árbol con IA" + el "Copiar prompt para IA" de cada nivel del navegador jerárquico, que sí leen `area_personal`. Fix: se sacó `PlanificarObjetivosIA` del tab Mes en `hoy/page.tsx` (el export queda huérfano en el archivo — candidato a borrar en el Sprint 10, junto con `panel-objetivos.tsx`). Verificado: typecheck/eslint/167 tests/build limpio.

### Sprint 1 — Base de datos ✅ COMPLETO

- [x] `area-personal.entity.ts` (nuevo)
- [x] `proyecto-personal.entity.ts` (nuevo)
- [x] `entregable.entity.ts` (nuevo, incluye `RecurrenciaEntregable` + `aplicaHoyEntregable`)
- [x] `actividad.entity.ts` (nuevo)
- [x] `personal-historial.entity.ts` (nuevo — shape de auditoría)
- [x] `objetivo-cuantificable.entity.ts` extendido (`areaId`, `tieneHijos` opcionales, `ritmoEsperadoHastaHoy` en `RitmoObjetivo`)
- [x] `habitos.entity.ts` extendido (`entregableId?`, `proyectoId?`)
- [x] Dexie `db.ts` versión 23 (área_personal, proyecto_personal, entregable, actividad, personal_historial)
- [x] `schema.ts`: pgTable nuevas — `areaPersonal`, `proyectoPersonal`, `entregable`, `actividadPersonal` (tabla Postgres `actividad_personal`, no `actividad` — ya existía una tabla legacy con ese nombre), `personalHistorial`
- [x] `tableMapper` en `sync/[table]/route.ts` y `sync/bulk/route.ts` (clave `actividad`, valor `schema.actividadPersonal` — la clave matchea el nombre de tabla Dexie/QueueService, no el nombre real en Postgres)
- [x] `EMPTY_TO_NULL_FIELDS` (bulk route): `areaId`/`proyectoId`/`entregableId`
- [x] Migración Postgres real aplicada (columnas nuevas en `objetivo_cuantificable` + 5 tablas nuevas + índices)
- [x] Verificación: typecheck / eslint / test (137/137) / build — todo limpio

### Sprint 2 — CRUD + cascada de progreso + auditoría ✅ COMPLETO

- [x] `GestionarAreasUseCase` (crear/editar/desactivar)
- [x] `GestionarProyectosPersonalUseCase` (crear/ajustar/archivar — marca `tieneHijos` en el Objetivo padre)
- [x] `GestionarEntregablesUseCase` (crear/ajustar/archivar/registrarAvance — marca `tieneHijos` en el Proyecto padre)
- [x] `GestionarActividadesUseCase` (crear con tope 1 enfoque+3 mantenimiento/día, completar/cancelar/descartar, registrarAvance, migrar)
- [x] `GestionarObjetivosUseCase.registrarAvance` ahora rechaza si `tieneHijos=true` (mensaje claro: registrar en la actividad correspondiente)
- [x] `recomputar-progreso-personal.service.ts`: `recomputarEntregable`/`recomputarProyecto`/`recomputarObjetivo`, bottom-up, con escape hatch si ningún hijo tiene métrica, y auto-flip a "cumplido" al alcanzar la cantidad objetivo en cada nivel
- [x] `registrar-historial-personal.service.ts` + cableado en las 5 use-cases (Áreas/Objetivos/Proyectos/Entregables/Actividades)
- [x] Tests nuevos (`jerarquia-personal.test.ts`, 6 tests): CRUD de Área, gate de `tieneHijos`, cascada completa de 4 niveles, tope diario de Actividad, auditoría por mutación
- [x] Verificación: typecheck / eslint / test (143/143) / build — todo limpio

### Sprint 3 — Borrado en cascada + ajuste de fechas ✅ COMPLETO

- [x] `EliminarNodoPersonalUseCase` (`contarDescendientes` + `ejecutar`, 4 niveles: área/objetivo/proyecto/entregable). Los hábitos vinculados NUNCA se borran en cascada — solo se les limpia el vínculo colgante (Decisión A).
- [x] `PreviewarAjusteFechaUseCase` / `AplicarAjusteFechaUseCase` (delega en los ajustar* de Sprint 2, así queda historial por cada fila tocada)
- [x] Fix de índices Dexie (dentro de la misma v23, sin tocar versiones viejas con datos reales): `habito_definicion` ahora indexa `objetivoId/proyectoId/entregableId`, `objetivo_cuantificable` suma `areaId` al índice — hacían falta para las queries de conteo/cascada
- [x] Tests nuevos (10): conteo real de descendientes, borrado de Entregable/Objetivo/Área sin huérfanos (verificado consultando las tablas hijas después de borrar), preview con conflicto de fechas, aplicar ajuste con historial
- [x] Verificación: typecheck / eslint / test (149/149) / build — todo limpio

### Sprint 4 — Recurrencia ✅ COMPLETO

- [x] `RecurrenciaEntregable` + `aplicaHoyEntregable` (ya estaban del Sprint 1) + `idInstanciaEntregableRecurrente` (id determinístico, upsert-si-falta)
- [x] `MaterializarActividadesDelDiaUseCase` — crea la Actividad de hoy por cada Entregable recurrente aplicable, idempotente, no compite por el tope de 1 enfoque+3 mantenimiento (mismo criterio que los Hábitos), no genera más instancias una vez cumplida la cantidad objetivo
- [x] Fix importante en `recomputar-progreso-personal.service.ts`: el "escape hatch" original solo contaba un Proyecto/Entregable hacia arriba si tenía **su propia** `cantidadObjetivo` — eso rompía el caso real ("Prospección" sin meta propia, agrupando "Contacto en frío" que sí la tiene). Ahora cuenta si tiene meta propia **o** tiene hijos cuantificados debajo.
- [x] `GestionarActividadesUseCase.registrarAvance` ya no exige `cantidadObjetivo` predeclarada — una instancia diaria materializada no tiene meta fija por día
- [x] Tests nuevos (6): `aplicaHoyEntregable` (diaria/días específicos), materializa/idempotente/respeta días, avance sube hasta el Objetivo, corta al cumplir la meta
- [x] Verificación: typecheck / eslint / test (155/155) / build — todo limpio

### Sprint 5 — Migración de datos existentes ✅ COMPLETO

- [x] Dexie `.upgrade()` v24: `TareaDiaria` + `TareaPendiente` → `Actividad` (id conservado, tablas viejas NO se borran — quedan de solo lectura)
- [x] Dexie `.upgrade()`: `etiquetaArea` → `areaId` (mismo nombre de etiqueta → misma Área siempre, sin duplicar; sin etiqueta → Área fallback "Sin área")
- [x] Lógica de mapeo extraída a funciones puras y testeada (`mapearTareaDiariaAActividad`, `mapearTareaPendienteAActividad`, `resolverAreaId`/`idAreaDesdeEtiqueta`) — no hay forma establecida en este proyecto de testear una transición de versión de Dexie de punta a punta, así que la lógica real es pura/testeable y el `.upgrade()` solo orquesta
- [x] Cada fila creada/editada por la migración se encola en `cola_eventos` (escrito directo con `tx`, no `QueueService`, porque `db` global no está abierta durante el upgrade) — así la sincronización empuja lo mismo a Supabase
- [x] Campo `Actividad.area` agregado (faltaba, se perdía el `TareaPendiente.area` en la migración) + columna Postgres
- [x] **Auditoría de paridad Dexie↔Postgres** (pedido explícito del usuario): se consultó `information_schema.columns` real contra cada entidad nueva/modificada y se encontraron 2 gaps reales — `actividad_personal` sin columna `area`, y `habito_definicion` sin `proyecto_id`/`entregable_id` (existían en Dexie y en el dominio, pero nunca se agregaron a `schema.ts` ni se aplicaron en Postgres). Ambos corregidos y verificados con una segunda consulta.
- [x] Tests nuevos (3): mapeo de TareaDiaria conserva id/fechas, mapeo de TareaPendiente ("promovida"→"completada"), `resolverAreaId` determinístico (mismo nombre → mismo id, sin duplicar)
- [x] Verificación: typecheck / eslint / test (158/158) / build — todo limpio

### Sprint 6 — Prompts IA + import JSON ✅ COMPLETO

- [x] `planificacion-jerarquica.entity.ts`: schemas zod reusables anidados (Actividad ⊂ Entregable ⊂ Proyecto ⊂ Objetivo), un solo set para los 5 puntos de entrada
- [x] `ImportarArbolPersonalUseCase`: `importarArbol` (árbol completo, resuelve/crea el Área por título), `importarObjetivo` (mismo schema, alias con nombre propio para el prompt angosto), `importarProyecto`/`importarEntregable`/`importarActividades` (bajo un padre YA EXISTENTE, resuelto por título exacto, no fatal si no matchea)
- [x] `generar-prompt-jerarquia-personal.ts`: los 5 prompts (`generarPromptArbolCompleto`, `generarPromptObjetivo`, `generarPromptProyecto`, `generarPromptEntregable`, `generarPromptActividades`), mismo estilo XML-tag + "preguntar antes de generar" que el resto de prompts de Personal
- [x] Cada creación delega en los use-cases de Sprint 2 (mismos límites, misma auditoría, mismo recompute) — el import nunca escribe Dexie directo
- [x] Tests nuevos (7): estructura inválida rechazada, árbol completo con Área nueva + 4 niveles anidados sin huérfanos, Área existente se reusa (no se duplica por mayúsculas), objetivo padre inexistente falla con mensaje claro, encadenar importarProyecto→importarEntregable→importarActividades sobre lo creado antes
- [x] Verificación: typecheck / eslint / test (164/164) / build — todo limpio

### Sprint 7 — UI vista Hoy ✅ COMPLETO (código) — ⚠️ pendiente de que VOS lo pruebes en el navegador

- [x] `bunker-del-dia.tsx` → lee de `Actividad`, título "Agenda de hoy" (sin "Búnker")
- [x] `panel-pendientes.tsx` → lee de `Actividad` (tipo backlog)
- [x] `armar-semana.tsx` → lee de `Actividad` (tipo backlog)
- [x] `panel-retorno.tsx` → lee de `Actividad`, y se sacó la sección de "Objetivos que se están quedando atrás" (vivía en el tab Día, violaba "sin objetivos en la vista de hoy" — ese contenido pasa a la vista jerárquica del tab Mes en el Sprint 8)
- [x] `GestionarActividadesUseCase` ganó `promoverAAgenda` (backlog → enfoque/mantenimiento) y `asignarASemanaActual` (equivalentes a lo que tenía `GestionarPendientesUseCase`)
- [x] `hoy/page.tsx`: corre `MaterializarActividadesDelDiaUseCase` al entrar, junto con el chequeo de objetivos vencidos que ya existía
- [x] Tests nuevos (3): promover a agenda marca origen completado, asignar a la semana, falla sin ids
- [x] Verificación automatizable: typecheck / eslint / test (167/167) / build — todo limpio
- [ ] **Verificación visual — no pude hacerla yo**: la app pide login y no tengo tus credenciales (no te las voy a pedir). Sin errores de consola en lo que sí cargó, pero falta que abras `/dashboard/personal/hoy` vos y confirmes que la Agenda de hoy y Pendientes se ven y funcionan bien

### Sprint 8 — UI navegador jerárquico ✅ COMPLETO (código) — ⚠️ pendiente de que VOS lo pruebes en el navegador

- [x] `navegador-jerarquico.tsx` (nuevo): breadcrumb drill-down (Áreas → Objetivos → Proyectos → Entregables → Actividades), un solo nivel visible a la vez, clic en una miga anterior trunca de vuelta
- [x] Tarjetas por nivel (`TarjetaNodo`): título, badge de horizonte, fecha relativa (roja si venció), barra de progreso, ritmo **con el número** ("llevás X — deberías llevar Y"), no solo la etiqueta
- [x] Formularios de creación inline en cada nivel (Área/Objetivo/Proyecto/Entregable/Actividad), incluye el toggle "¿se repite?" + selector de días para Entregables recurrentes
- [x] Botón "Copiar prompt para IA" + "Pegar plan generado" (`ModalImportarJson`) en cada nivel, usando los prompts/use-cases del Sprint 6
- [x] Reemplaza `PanelObjetivos` en el tab "Mes" de `hoy/page.tsx` (el archivo viejo queda sin usar — candidato a borrar en el Sprint 10, no se tocó ahora para no arriesgar nada)
- [x] Verificación automatizable: typecheck / eslint / test (167/167) / build — todo limpio, sin errores de consola nuevos (solo ruido de HMR normal en dev)
- [ ] **Verificación visual — no pude hacerla yo**: mismo límite que Sprint 7 (login). Falta que abras el tab "Mes" y confirmes que se ve y navega bien

### Sprint 9 — UI borrado/ajuste/historial ✅ COMPLETO (código) — ⚠️ pendiente de que VOS lo pruebes en el navegador

- [x] `ConfirmarEliminacionNodo`: cuenta los descendientes reales (`useLiveQuery`, no un `useEffect` manual — evita el problema de "setState dentro de un efecto") antes de habilitar el botón de eliminar; lista Proyectos/Entregables/Actividades/Hábitos vinculados con sus números reales
- [x] `AjustarFechaModal`: preview obligatorio antes de escribir nada — muestra los hijos directos afectados, marca conflicto en rojo si su fecha ya supera la propuesta, fecha editable por fila, el usuario elige cuáles ajustar también
- [x] `PanelHistorialPersonal`: timeline cronológico inverso desde `personal_historial`, con diff antes/después cuando aplica
- [x] Integrado en `navegador-jerarquico.tsx`: cada tarjeta (Área/Objetivo/Proyecto/Entregable) tiene su fila de acciones (historial siempre, ajustar fecha solo en Objetivo/Proyecto, eliminar en los 4 niveles no-hoja) — estado de los 3 modales centralizado en el componente raíz, no duplicado por nivel
- [x] Verificación automatizable: typecheck / eslint / test (167/167) / build — todo limpio, sin errores de consola
- [ ] **Verificación visual — no pude hacerla yo**: mismo límite que Sprints 7 y 8 (login). Falta que abras el tab "Mes", entres a un Objetivo/Proyecto y confirmes que eliminar/ajustar fecha/historial se ven y funcionan bien

### Ajustes pedidos tras probar Sprints 8/9 en vivo ✅ COMPLETO (código) — ⚠️ pendiente de que VOS lo pruebes en el navegador

Pedido del usuario: (1) faltaban los botones de "ajustar cantidad" y "archivar" en el navegador jerárquico (el backend ya los soportaba desde el Sprint 2, solo faltaba la UI); (2) sacar el tope duro de actividades por día — dejar solo una cantidad recomendada — y mostrar en la vista de Hoy las próximas actividades ya agendadas, además de que los prompts de IA traten esa cantidad como una guía blanda, no un límite, y sepan distinguir una actividad que se repite igual de una que va evolucionando en el tiempo.

- [x] `ajustar-cantidad-modal.tsx` (nuevo): `AjustarCantidadModal`, sin preview de cascada (a diferencia de la fecha, la cantidad de un nivel es un valor propio, nunca derivado de los hijos — cambiarla no afecta a nadie más), escritura directa vía `ajustarObjetivo`/`ajustarProyecto`/`ajustarEntregable`
- [x] `navegador-jerarquico.tsx`: acción "Ajustar cantidad" cableada en Objetivo/Proyecto/Entregable (estado `ajustarCantidadTarget` centralizado en la raíz, mismo patrón que `eliminarTarget`/`ajustarTarget`/`historialTarget`); acción "Archivar" cableada donde ya existía `archivarEntregable`/etc. en el use-case
- [x] `gestionar-actividades.use-case.ts`: sacado el bloque que rechazaba `crearActividad()` al llegar a `MAX_TAREAS_ENFOQUE_POR_DIA`/`MAX_TAREAS_MANTENIMIENTO_POR_DIA` — esos números quedan como cantidad _recomendada_, ya no bloquean. Test viejo de "rechaza al superar el tope" reemplazado por uno que confirma que 2 enfoque + 5 mantenimiento el mismo día NO se bloquean
- [x] `bunker-del-dia.tsx`: el formulario de nueva actividad ya no se oculta al llegar a la cantidad recomendada (queda siempre visible, con un contador que avisa si se pasó del recomendado); nueva sección "Próximas actividades" debajo, listando pendientes con `diaTarea` posterior a hoy ordenadas ascendente, reusando `FilaActividad` (completar/migrar/cancelar)
- [x] `generar-prompt-jerarquia-personal.ts`: ablandado el lenguaje de `generarPromptActividades` (de "no propongas más de eso" a "guía, no límite estricto"); `NOTA_RECURRENCIA` (usada en los prompts de árbol/proyecto/entregable) ganó un párrafo nuevo pidiéndole a la IA que distinga actividad repetitiva-sin-cambios (un solo Entregable recurrente) de evolutiva (cuando cambia la cantidad o el enfoque, crear un Entregable nuevo y aparte para esa etapa)
- [x] Verificación automatizable: typecheck / eslint / test (167/167) / build — todo limpio
- [ ] **Verificación visual — no pude hacerla yo**: mismo límite de siempre (la app pide login, no tengo credenciales). Falta que abras el tab "Mes" y confirmes que "Ajustar cantidad"/"Archivar" se ven y funcionan, y el tab "Hoy" para confirmar que el formulario ya no se esconde y que "Próximas actividades" se ve bien

### Calendario semanal/mensual + colores de Área ✅ COMPLETO (código) — ⚠️ pendiente de que VOS lo pruebes en el navegador

Pedido del usuario: poder corroborar de un vistazo que la planificación quedó bien armada (algo que el navegador jerárquico, al mostrar un solo nivel a la vez, no permite ver), con Áreas distinguibles por color y una distinción visual clara entre Actividad y Entregable.

- [x] `area-personal.entity.ts`: `AreaPersonal` gana `color?` (hex), paleta fija `PALETA_COLORES_AREA` (10 colores), `colorDeAreaEfectivo(area)` — si el área no tiene color propio (todas las que ya existían antes de este cambio), deriva uno determinístico de su id vía hash, así los datos reales de hoy ya se ven distinguibles sin tener que migrar nada
- [x] `gestionar-areas.use-case.ts`: `crearArea`/`editarArea` aceptan y persisten `color`
- [x] `schema.ts` + Postgres real: columna `color varchar(7)` agregada a `area_personal` (aplicada en vivo, script temporal borrado después)
- [x] `navegador-jerarquico.tsx`: selector de paleta al crear un Área, punto de color en cada tarjeta de Área, botón "Cambiar color" inline por área existente
- [x] `calendario-utils.ts` (nuevo): `useColorPorObjetivo()` — un solo mapa Objetivo→Área→color (Entregable/Actividad ya traen `objetivoId` denormalizado, no hace falta ir tabla por tabla), color neutro `COLOR_SIN_AREA` para actividades/entregables sueltos sin jerarquía arriba
- [x] `calendario-semanal.tsx` (nuevo): `CalendarioSemanal` — 7 columnas Lun-Dom, navegación semana anterior/siguiente/volver a hoy, Actividades en su `diaTarea` (con acciones completar/cancelar inline) + Entregables como hito en su `diaLimite` (borde punteado, solo lectura), cada chip con el color de su Área y un ícono distinto según tipo (Target=enfoque, ListTodo=mantenimiento, Package=entregable)
- [x] `calendario-mensual.tsx` (nuevo): `CalendarioMensual` — grilla de 6 semanas siempre completa (días de meses linderos atenuados), puntos de color por Área presente ese día, click en un día abre el detalle debajo reusando los mismos chips del calendario semanal
- [x] `db.ts`: Dexie versión 25 — `entregable` gana índice por `diaLimite` (necesario para las queries por rango de fecha de los dos calendarios; no se toca ninguna otra tabla)
- [x] `hoy/page.tsx`: dos pestañas nuevas, "Cal. semana" y "Cal. mes", separadas de las pestañas existentes "Semana" (pendientes/backlog) y "Mes" (navegador jerárquico) para no pisar su significado actual
- [x] Verificación automatizable: typecheck / eslint / test (167/167) / build — todo limpio
- [ ] **Verificación visual — no pude hacerla yo**: mismo límite de siempre (login sin credenciales). Falta que abras "Cal. semana" y "Cal. mes" y confirmes que las actividades/entregables aparecen en el día correcto, que los colores por Área se ven bien, y que "Cambiar color" en una tarjeta de Área funciona

### Sprint 10 — Corte final (después, no en el mismo lote)

- [ ] Retirar `tarea_diaria`/`tarea_pendiente` de `.stores()`
- [ ] Retirar `etiquetaArea` deprecado
- [ ] Verificación completa: typecheck / eslint / test / build
