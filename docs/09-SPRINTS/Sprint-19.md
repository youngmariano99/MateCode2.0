# Sprint 19: Flujo Especializado para Landing Page y Sitio Web Institucional

## 1. Bitácora de Desarrollo

- **Relevamiento con Links de Inspiración y Copywriting (`RelevamientoWorkspace`):**
  - Creado panel de gestión de enlaces de referencia visual (URLs de benchmarking) con botón de copiado masivo.
  - Creado panel de Copywriting y Contenido de Marca con generador de prompts para redactar textos por secciones.
  - Inclusión de referencias visuales y Copywriting en la descarga de archivos `.md`.
- **Inyección Automática en Planificación (`PlanificacionIAWorkspace`):**
  - Los compiladores de prompts de requisitos e historias de usuario inyectan el Copywriting y los enlaces de referencia guardados.
- **Taller de Desarrollo por Secciones & Refinamiento Iterativo (`DesarrolloWorkspace`):**
  - Pestañas de navegación para alternar entre _Desarrollo por Secciones (Landing)_ y _Tablero de Sprints (Sistemas)_.
  - Selector de secciones estándar (Hero Section, Beneficios, Servicios, Testimonios, Precios, FAQ, Footer/CTA).
  - Consola de Refinamiento Iterativo: Permite ingresar consideraciones visuales/técnicas y copiar el **Prompt de Refinamiento** que ordena a la IA modificar estrictamente solo lo indicado manteniendo el resto intacto.
  - Historial de iteraciones por fecha guardadas en `metadata.iterations`.

## 2. Archivos Afectados

- [relevamiento-workspace.tsx](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/src/presentation/components/proyectos/relevamiento-workspace.tsx) [MODIFY]
- [planificacion-ia-workspace.tsx](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/src/presentation/components/proyectos/planificacion-ia-workspace.tsx) [MODIFY]
- [desarrollo-workspace.tsx](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/src/presentation/components/proyectos/desarrollo-workspace.tsx) [MODIFY]
- [sprint19.test.ts](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/src/shared/utilidades/sprint19.test.ts) [NEW]

## 3. Pruebas Unitarias de Verificación

- `sprint19.test.ts` valida:
  1. Guardado y carga de enlaces de inspiración visual y copy de marca en IndexedDB.
  2. Creación de tickets de sección de landing.
  3. Registro del historial de iteraciones y compilación del prompt de refinamiento aislado.
- Resultado: **29 de 29 tests en verde**.
