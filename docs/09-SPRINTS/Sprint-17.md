# Sprint 17: Rediseño de Concepción a Relevamiento del Cliente

Bitácora de planificación y control de tareas para la transformación de la fase de "Concepción" en un workspace interactivo de "Relevamiento del Cliente" asistido por IA.

---

## 1. Logros de este Sprint (Qué se hizo)

- **Renombramiento de Fase:** Actualizada la barra de progreso del ciclo de vida de desarrollo de los proyectos reemplazando la fase "Concepción" por "Relevamiento".
- **Simplificación del Tipo de Proyecto:** Ajustado el listado de opciones de tipos de proyectos (`TIPOS_PROYECTO`) para agruparlos en exactamente dos categorías estructuradas: "Sistemas" y "Landing/Institucional".
- **Desarrollo del Workspace de Relevamiento (`RelevamientoWorkspace`):**
  - Creado un espacio de texto enriquecido para capturar notas desestructuradas (reuniones, audios, chats).
  - Diseñados dos prompts especializados con pautas de PO y Branding según el tipo de proyecto seleccionado.
  - Integrado un inyector dinámico que une el prompt base con las notas del cliente y copia todo al portapapeles con un solo clic.
  - Habilitada una caja receptora de formato Markdown para almacenar el resumen estructurado devuelto por la IA.
  - Programada la descarga directa del relevamiento consolidado en formato de archivo `.md`.
- **Compatibilidad del Compilador de Workflows:** Añadido un fallback automático en `gestionar-workflows.use-case.ts` para que las variables de dolores y reglas de negocio se alimenten directamente del `relevamientoMarkdown` general si no hay campos segmentados.
- **Pruebas de Calidad:**
  - Desarrollada la suite de pruebas unitarias en `sprint17.test.ts` cubriendo la persistencia de relevamiento y fallbacks del compilador.
  - 20 unit tests ejecutados con éxito en local.

---

## 2. Lo que Falta (Backlog Pendiente)

- Ninguno. ¡Módulo de Relevamiento de Cliente e Integración IA del PO completamente desplegado!
