1. Adaptación de la Base de Datos
   Analizando la estructura actual (donde veo que ya manejas entidades fuertes con uuid, marcas de tiempo y auditoría como creado_por), necesitamos agregar tablas estratégicas para soportar la memoria del proyecto y las plantillas dinámicas.

Nuevas Tablas Requeridas
prompt_templates: Almacenará los prompts maestros.

id (uuid)

fase (varchar) - Ej: 'Arquitectura', 'Planificacion'

titulo (varchar)

contenido (text) - Aquí irá el prompt con las llaves {{dolores}}, {{stack_frontend}}.

variables_requeridas (jsonb) - Un array indicando qué llaves necesita para autocompletarse.

proyecto_contexto: Guardará la información de la Fase 1 (Concepción).

proyecto_id (uuid, FK)

dolores_cliente (text)

reglas_negocio (text)

publico_objetivo (text)

proyecto_design_system: Ya tienes la tabla branding asociada a agencia_id, pero necesitamos una específica por proyecto para la IA.

proyecto_id (uuid, FK)

estilo_ui (varchar) - Ej: 'Minimalista Oscuro', 'Neumorfismo'

tipografias (varchar)

reglas_diseno (text) - Qué evitar, qué priorizar.

logo_url (varchar)

proyecto_estado_tecnico: Para guardar lo seleccionado en la pestaña de "Arquitectura" (Clean Architecture, SOLID, React, etc.) y permitir que la IA lo actualice.

proyecto_id (uuid, FK)

categoria (varchar) - 'frontend', 'backend', 'base_datos', 'patrones'

valor (varchar)

2. Implementación de las Funcionalidades Clave
   A. Sistema de Prompts Dinámicos y Desplegables
   En la vista de "Entrega & Docs", donde tienes el Generador de Prompts, implementaremos un motor de parseo.

Cuando seleccionas una plantilla, el sistema lee el campo contenido.

Mediante una expresión regular (ej. /\{\{(.*?)\}\}/g), detecta todas las llaves {{variable}}.

Si la variable es {{dolores_cliente}}, el sistema hace un fetch automático a la tabla proyecto_contexto y la reemplaza de forma invisible.

Si la variable está vacía o es personalizada, abre automáticamente el modal/desplegable que mencionas para que el usuario elija o escriba el dato faltante antes de copiar el prompt.

B. El Formulario del Design System (Eficiente)
En la fase de Arquitectura o Concepción, agrega una tarjeta para el Design System.
Para que no sea tedioso de llenar, usa presets:

Selector Visual: Muestra 4 o 5 imágenes representativas de estilos (Corporativo, SaaS Moderno, E-commerce vibrante). Al hacer clic en uno, se autocompleta el formulario subyacente.

Reglas Anti-Genéricas: Un campo de texto simple llamado "Directrices estrictas de UI". Aquí puedes escribir cosas como: "Prohibido usar bordes redondeados, usar esquinas a 0px. Tipografía monoespaciada obligatoria". Esto viajará directo al agente de Frontend.

C. Importación y Recuperación de Proyectos (Reverse Engineering)
Para proyectos que ya están en curso y necesitas integrarlos a este nuevo flujo:

Crea un "Super Prompt de Ingesta" predefinido en tu sistema.

Este prompt le pide a la IA que analice la estructura de carpetas, el package.json y el README del proyecto existente.

La instrucción final del prompt será:

"Devuelve EXCLUSIVAMENTE un JSON con este formato exacto: {"contexto": {...}, "stack": [...], "sprints_actuales": [...]}."

En la vista de Planificación ("Importar Backlog JSON"), pegas esa respuesta. Tu sistema mapea ese JSON e inserta los registros directamente en las tablas proyecto_contexto, proyecto_estado_tecnico y en tu tablero Kanban.

D. Actualización Continua Bidireccional (La Joya del Sistema)
Para que los diagramas, dependencias y tablas de la base de datos se mantengan actualizados a medida que desarrollas:
Debes inyectar un "Contrato de Retorno" oculto al final de cada prompt que copies desde la plataforma:

[Instrucción de Sistema Oculta]
Al finalizar tu tarea, si agregaste una nueva librería, modificaste una tabla de la base de datos o cambiaste la arquitectura, debes añadir al final de tu respuesta un bloque de código JSON con el lenguaje json-app-sync siguiendo esta estructura:
{ "update_type": "database|dependencies", "data": {} }

Cuando la IA te devuelve esto en tu IDE, copias ese bloque JSON, vas a tu sistema y lo pegas en un input universal llamado "Sincronizar Estado". El sistema lee el JSON y hace el UPDATE o INSERT correspondiente en tu base de datos, manteniendo todo vivo sin que tengas que llenar formularios manualmente.

Para poder diseñar la estructura del controlador (endpoint) que recibirá estos bloques JSON y actualizará dinámicamente las tablas de tu sistema sin romper la integridad referencial, ¿qué ORM o framework de backend estás utilizando actualmente?

---
