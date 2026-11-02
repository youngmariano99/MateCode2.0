# 🏛️ Blueprint y Plan de Trabajo: Nueva Oficina Digital

> **Objetivo:** Transformar `/dashboard/personal/oficina` en un auténtico puesto de trabajo y cockpit ejecutivo diario que no duplique las vistas de Planificación, centrado 100% en la ejecución del día a día, con timer y pausas activas, baúl de recursos, diario técnico inteligente y copiloto IA ultra eficiente en tokens (prohibido inventar datos).

---

## 📌 Checklist de Tareas por Pasos

### PASO 1: Modelo de Datos, Persistencia y Escalabilidad

- [x] Crear entidad de dominio `recurso-oficina.entity.ts` con validación Zod y helpers de hitos.
- [x] Crear script SQL manual para Supabase: `scripts/sql/01_crear_recurso_oficina.sql`.
- [x] Actualizar esquema Drizzle en `src/infrastructure/persistencia/schema.ts` (`recursoOficina`).
- [x] Actualizar esquema Dexie en `src/offline/dexie/db.ts` (versión 31 con tabla `recurso_oficina`).
- [x] Implementar caso de uso `GestionarRecursosOficinaUseCase` (crear, listar, actualizar, eliminar, calcular alertas de hitos).

### PASO 2: Motor de Preprocesamiento, Modo Ahorro y Logs IA (Gemini)

- [x] Implementar servicio de agregación `AsistenteOficinaService` (cálculo determinista en código de tareas de hoy, balance semanal y distancia a pisos mínimos de entregables).
- [x] Implementar generador de respuestas deterministas (Modo Ahorro = 0 tokens, instantáneo).
- [x] Integrar llamada a Gemini 2.5 Flash con prompt comprimido y estructurado (Modo IA Enriquecido).
- [x] Implementar manejo tipificado de errores (401/403 credenciales, 429 quota/rate limit, timeout, red) con fallback automático al Modo Ahorro.

### PASO 3: Componentes de Soporte y Modales Especializados

- [x] **Modal de Trazabilidad Jerárquica:** Al hacer clic en cualquier tarea de hoy, muestra la cadena gráfica Área ➔ Objetivo ➔ Proyecto ➔ Entregable con sus metas y estados.
- [x] **Modal Baúl de Recursos & Hitos:**
  - Pestaña Links útiles con buscador y filtrado por etiquetas (#ERP, #Docs, etc.).
  - Pestaña Hitos & Fechas Importantes con aviso previo configurable.
  - Pestaña Quick-Add Prospecto (formulario rápido que guarda en `potencial_cliente` sin navegar fuera de la oficina).
  - Pestaña Notas Rápidas (Inbox).
- [x] **Modal Diario Técnico (Noticias):**
  - Endpoint `/api/noticias` para consumo de Hacker News API + RSS (OpenAI, Anthropic, GitHub Changelog, arXiv).
  - Selector temporal (Hoy, Semana, Mes, Año).
  - Pestañas de categorías y badges interactivos de tags.
  - Tarjetas de noticias con enlace a la fuente original (`target="_blank"`).
  - Soporte para Modo Ahorro (copetes originales) vs Modo IA (resúmenes ejecutivos).
- [x] **Drawer / Modal Copiloto IA:**
  - Switch de Modo Ahorro.
  - Preguntas rápidas en 1 clic ("¿Qué hice hoy y qué me falta?", "¿Cómo voy en la semana?", "¿Cómo voy con los pisos mínimos?").
  - Indicador de estado de la API y visor de diagnóstico si hay errores.

### PASO 4: Rediseño Integral de la Página de Oficina

- [x] Reestructurar `/dashboard/personal/oficina/page.tsx`:
  - **Header:** Banner dinámico de alertas de hitos próximos + Dock de Accesos Rápidos (links internos abren en `target="_blank"` + accesos personalizados agregados por el usuario).
  - **Columna Izquierda:** Cockpit de Tareas de Hoy (Pendientes vs Hechas, avance numérico, visualización de meta 100% y piso mínimo, clic para abrir trazabilidad jerárquica).
  - **Columna Derecha:** Puesto de Foco & Timer (selector de tarea, presets 25m/45m/60m/libre, contador en vivo) + Modal integrado de Pausa Activa / Descanso.
  - **Botones de Barra Flotante:** Acceso directo a abrir Noticias, Baúl y Copiloto sin abandonar la página ni perder el estado del timer.
- [x] Pruebas finales de tipos (`typecheck`) y validación de flujo completo.

---

## 🗄️ Script SQL para Supabase (Manual)

Guardado en: `scripts/sql/01_crear_recurso_oficina.sql`

```sql
CREATE TABLE IF NOT EXISTS public.recurso_oficina (
    id VARCHAR(255) PRIMARY KEY,
    tipo VARCHAR(30) NOT NULL, -- 'link_util', 'acceso_directo', 'hito_fecha', 'nota_rapida'
    titulo VARCHAR(255) NOT NULL,
    url TEXT,
    icono VARCHAR(50),
    etiquetas JSONB DEFAULT '[]'::jsonb NOT NULL,
    fecha_limite VARCHAR(10), -- YYYY-MM-DD
    dias_aviso_previo INT DEFAULT 0,
    descripcion TEXT,
    orden INT DEFAULT 0,
    creado_en BIGINT NOT NULL,
    actualizado_en BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recurso_oficina_tipo ON public.recurso_oficina(tipo);
CREATE INDEX IF NOT EXISTS idx_recurso_oficina_fecha ON public.recurso_oficina(fecha_limite);
```
