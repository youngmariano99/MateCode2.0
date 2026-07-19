# Sprint 18: Rediseño de Arquitectura y Consola de Design System

## 1. Bitácora de Desarrollo

- **Reorganización por Categorías (`StandardSelector`):** Implementamos los estándares predeterminados por las 7 categorías especificadas por el usuario (Seguridad Total, Escalabilidad, DX, Testing, Trazabilidad, Robustez y DevOps).
- **Persistencia de Presets de Estándares & Stack:** Creada lógica de guardado y carga de configuraciones usando IndexedDB (`agencia_config`) con tipos `preset_estandar` y `preset_stack`.
- **Entrada de JSON:** Diseñada una caja para pegar estructuras JSON directamente y cargarlas en la UI del Stack y de Estándares, junto con botones para copiar la plantilla de prompt para la IA externa.
- **Unificación de Design System:** Eliminado el formulario clásico de inputs de branding y reemplazado por un editor Markdown único.
- **Prompt de UI/UX Integrado:** Botón para compilar el prompt consolidando el Relevamiento en Markdown de la fase 1 + instrucciones detalladas de branding.
- **Botones de Descarga:**
  - `especificacion_tecnica_{proyectoId}.md`: Stack tecnológico + Estándares seleccionados.
  - `design_system_{proyectoId}.md`: Directrices visuales completas.

## 2. Archivos Afectados

- [standard-selector.tsx](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/src/presentation/components/proyectos/standard-selector.tsx) [MODIFY]
- [stack-selector.tsx](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/src/presentation/components/proyectos/stack-selector.tsx) [MODIFY]
- [design-system-form.tsx](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/src/presentation/components/proyectos/design-system-form.tsx) [MODIFY]
- [page.tsx](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/src/app/dashboard/proyectos/page.tsx) [MODIFY]
- [gestionar-workflows.use-case.ts](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/src/application/use-cases/proyecto/gestionar-workflows.use-case.ts) [MODIFY]
- [sprint18.test.ts](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/src/shared/utilidades/sprint18.test.ts) [NEW]

## 3. Pruebas Unitarias de Verificación

- `sprint18.test.ts` valida:
  1. Guardado y carga de presets de estándares en IndexedDB.
  2. Guardado y carga de presets de stacks tecnológicos.
  3. Fallback del compilador de prompts de workflow a la propiedad unificada `designSystemMarkdown`.
- Resultado: **23 de 23 tests en verde**.
