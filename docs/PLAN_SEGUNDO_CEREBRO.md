# Plan — MateCode Segundo Cerebro (Profesional / Personal)

Checklist vivo. Se actualiza a medida que se implementa — no editar a mano salvo para agregar contexto nuevo del usuario.

## Estándares que aplican a todo este módulo

- Poco mantenimiento: si pasa una semana sin abrir la app, una sola pantalla dice qué pasó y permite reajustar sin ritual.
- Adaptado a desvíos: reprogramar (eliminar, mover de fecha, reajustar objetivo) siempre a un clic.
- Datos para retroalimentar: todo lo que se registre debe poder usarse después para mejorar el propio sistema u otro módulo.
- Funciones complementarias: cada pieza facilita la siguiente (inbox → Búnker/Pendientes, Pendientes → Búnker, Objetivo → ritmo diario).
- Interfaz limpia, economía de clics.
- Estándares de desarrollo Nodexa de siempre: archivos ≤500 líneas, sin sobreingeniería (lo justo para el ticket), tipado estricto, nombres descriptivos en español, offline-first + sync real a Postgres, schema pensado para que una IA lo pueda automatizar a futuro.

## Decisiones ya tomadas

- División Profesional/Personal: switcher arriba del sidebar (no dos menús mezclados).
- Contacto en Frío ya cubre lo que iba a ser el "CRM de Adquisición" — no se reconstruye.
- Modelo de datos: sin entidad "unificada" gigante — cada tabla nueva lleva una etiqueta de área/categoría liviana para poder cruzar datos después sin forzar arquitectura de más.
- "Promover a Proyecto" desde la bandeja de entrada queda FUERA de Bloque A: los "Proyectos" de MateCode hoy son de desarrollo de software (sprints, historias) y no encajan con un proyecto personal — se define bien cuando haga falta, no antes.

---

## Bloque A — Cimientos: Bandeja de entrada + Búnker del Enfoque + Pendientes

- [x] Nav: consolidar el sidebar duplicado (desktop/mobile) en una sola fuente, agregar switcher Profesional/Personal.
- [x] Dominio: entidad `InboxItem` (captura libre + estado + a qué se promovió).
- [x] Dominio: entidad `TareaDiaria` (Búnker: tipo enfoque/mantenimiento, límite 1+3 por día, resolución completar/migrar/cancelar).
- [x] Dominio: entidad `TareaPendiente` (backlog con prioridad Urgente/Importante/Puede esperar, área Profesional/Personal/Ambas).
- [x] Dexie: nueva versión (18) con las 3 tablas.
- [x] Postgres: schema + migración aplicada + wiring en rutas de sync.
- [x] Use-case: `GestionarBandejaEntradaUseCase` (crear, promover a tarea/pendiente, descartar).
- [x] Use-case: `GestionarBunkerUseCase` (crear tarea con límite, completar/cancelar, migración atómica).
- [x] Use-case: `GestionarPendientesUseCase` (crear con triage, completar/descartar, promover al Búnker respetando el límite).
- [x] Tests del use-case (límite del Búnker, migración atómica, promoción desde inbox y pendientes) — 4 tests nuevos, 86/86 en total.
- [x] Componentes: estación de Bandeja de entrada (captura + lista + promover).
- [x] Componentes: estación Búnker del día (1 enfoque + 3 mantenimiento + resolución inline).
- [x] Componentes: Pendientes (lista por prioridad, promover a Búnker, reprogramar/eliminar en un clic).
- [x] Página `/dashboard/personal/hoy` (todo en una sola pantalla: bandeja arriba, Búnker + Pendientes abajo — no hace falta navegar entre estaciones).
- [x] Verificación: typecheck, lint, 86/86 tests.
- [x] Bug preexistente encontrado y arreglado al verificar en navegador: `globals.css` tenía los `@import` de Google Fonts/Fontshare después de `@import "tailwindcss"`, lo que rompía TODO el build en dev (no relacionado a este módulo, pero bloqueaba poder probar cualquier cosa).
- [ ] Recorrido manual en navegador con una cuenta real — no tengo credenciales de login, hace falta que el usuario lo haga (o me las pase) para el último check visual.

## Bloque B — Objetivos cuantitativos + Panel de retorno

- [x] Dominio: entidad `ObjetivoCuantificable` (cantidad objetivo, fecha límite, progreso, área) + función pura `calcularRitmoObjetivo` (cuánto por día/semana para llegar, recalculado según lo que ya pasó, con estados cumplido/vencido/al_dia/atrasado/adelantado).
- [x] Dexie (versión 19) + Postgres + sync para `ObjetivoCuantificable`.
- [x] Use-case `GestionarObjetivosUseCase`: crear, registrar avance (con auto-cumplido), ajustar cantidad/fecha en un clic (reactiva uno vencido), archivar, marcar vencidos al entrar.
- [x] Retrofit: `WidgetObjetivo` reusable enganchado a Contacto en Frío (título/unidad sugeridos "Contactos en frío"/"contactos") — define el objetivo si no existe, muestra ritmo y permite sumar avance o ajustar sin salir de la pantalla.
- [x] Panel de retorno (`PanelRetorno`) en `/dashboard/personal/hoy`: tareas del Búnker sin resolver de días anteriores (completar/pasar a hoy/eliminar) + objetivos atrasados o vencidos (estirar fecha o bajar la meta al ritmo real) — no se muestra nada si no hay nada pendiente.
- [x] Tests del cálculo de ritmo (al día, atrasado, adelantado, cumplido, vencido, proyección) + del use-case (avance, ajuste, marcar vencidos) — 9 tests nuevos, 95/95 en total.
- [x] Verificación: typecheck, lint, 95/95 tests, `npm run build` de producción limpio (compiló las 21 rutas, incluidas `/dashboard/personal/hoy` y `/dashboard/contacto-frio`).
- [ ] Recorrido manual en navegador con una cuenta real — sigue pendiente del usuario (sin credenciales de login).

---

## Bloque C — Hábitos (El Acordeón) — ✅ Completo

- [x] Dominio: `HabitoDefinicion` (nombre + descripción de los 3 niveles MIN/MED/MAX, área) y `HabitoRegistro` (ledger simple, id determinístico `habitoId_diaTarea` para que re-registrar el mismo día sea un upsert, no un choque).
- [x] Dominio: `requiereMinimoObligatorio` — regla "No Fallar Dos Veces" (si el hábito ya existía ayer y no hubo registro ayer, hoy queda resaltado).
- [x] Dexie (versión 20) + Postgres + sync para las 2 tablas. Nota: `activo` (boolean) no se indexa — boolean no es clave válida de IndexedDB, se filtra en memoria.
- [x] Use-case `GestionarHabitosUseCase`: crear hábito, registrar nivel del día (upsert), desactivar hábito (soft, conserva histórico).
- [x] Componente `TarjetaHabitos`: 3 píldoras MIN/MED/MAX por hábito (44px, área táctil), borde rojo pulsante en MIN cuando aplica "No Fallar Dos Veces", alta de hábito nuevo inline.
- [x] Wiring en `/dashboard/personal/hoy`, arriba de la bandeja de entrada (lo primero del día).
- [x] Tests: regla con/sin historial y hábito nuevo (no la dispara el día 1), crear+registrar, upsert del mismo día, desactivar conserva histórico — 6 tests nuevos, 101/101 en total.
- [x] Verificación: typecheck, lint, 101/101 tests, `npm run build` limpio (21 rutas).

## Bloque D — Bienestar y Entrenamiento

Decisiones tomadas con el usuario (ver conversación): 2 formas estructurales en vez de 19 formatos fijos (series con lista de sets — cubre tradicional Y pirámide con la misma forma — y por-tiempo para Tabata/EMOM/AMRAP/For Time/circuito). Bloques (mesociclos) con un eje de progresión por defecto (carga/volumen/progresión) que cae automáticamente al eje disponible más cercano por ejercicio, sin inputs extra. Motor de sugerencia automática de progresión queda para después — esta vuelta es: declarar eje, registrar con fricción mínima, mostrar cómo mejoraste en ese eje. Potencia como campo opcional; %RM y velocidad de ejecución afuera por ahora.

- [x] Dominio `ejercicio.entity.ts`: `CatalogoEjercicio` (patrón, tipo/modo de conteo, equipamiento, niveles de regresión/progresión, si permite carga) + `ejesDisponibles`/`ejeEfectivo` (fallback automático).
- [x] Seed real: transformar `ejercicios-matriz.json` (7 patrones, ~20 ejercicios con escalera completa) a un array TS — sin re-teclear a mano.
- [x] Dominio `rutina.entity.ts`: `PlantillaRutina` (formato, tipoEstructura "series"|"tiempo", estructura JSONB) y `BloqueEntrenamiento` (mesociclo: nombre, diaInicio, diaFin, ejeProgresionDefault, estado).
- [x] Dominio `registro-actividad.entity.ts`: ledger de sesiones — "como planificado" (un tap) vs "con desvío" (edición por excepción), detalles de ejecución JSONB.
- [x] Dexie + Postgres + sync para las 4 tablas nuevas (catalogo_ejercicio, plantilla_rutina, bloque_entrenamiento, registro_actividad).
- [x] Use-cases: `GestionarBloquesUseCase`, `GestionarPlantillasRutinaUseCase`, `GestionarRegistroActividadUseCase` (confirmación en 1 clic + edición por excepción).
- [x] Estadísticas por bloque+ejercicio+eje: primera vs última sesión del bloque, sin mezclar unidades entre ejes (`calcularMejoraEjercicio`, `PanelEstadisticas`).
- [ ] Extender el Panel de Retorno: si hace mucho que no se registra actividad de un bloque activo, sugerir arrancar más suave (usar la escalera de regresión del ejercicio). — diferido, no incluido en esta vuelta.
- [x] Componentes: selector/gestión de bloques, ejecución de sesión (un tap + excepción), panel de estadísticas.
- [x] Wiring en el área Personal (sección propia `/dashboard/personal/entrenamiento`, 3 estaciones: Hoy/Rutinas/Progreso — no vive en la pantalla diaria de "Hoy").
- [x] Tests: eje efectivo con fallback, registro 1-tap vs excepción, estadística por eje no mezcla unidades, use-cases de bloques/plantillas/registro (series y tiempo). Detección de racha rota específica no se armó como test aparte — diferida junto con el Panel de Retorno.
- [x] Verificación: typecheck, lint (archivos nuevos/tocados), tests (114/114), `npm run build` (incluye `/dashboard/personal/entrenamiento`).
