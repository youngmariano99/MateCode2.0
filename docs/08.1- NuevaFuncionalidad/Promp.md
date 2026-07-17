Contexto del Proyecto:
Actúa como un Desarrollador Full-Stack y Arquitecto de Software Experto. Necesito que diseñes la estructura de base de datos, la lógica de negocio (Backend) y la interfaz de usuario (Frontend) para un nuevo módulo dentro de mi Sistema de Gestión existente.

Este módulo se llama "Taller de Contacto" y funciona como un Micro-CRM especializado en Outbound Sales (Ventas en frío) orientado a redes sociales (principalmente Instagram) para mi agencia de desarrollo web.

A continuación, te detallo los requerimientos exactos y la lógica de cada sección que debes construir:

1. Módulo de Creación y Sesiones de Contacto
   Creación de Prospectos: Debo poder seleccionar potenciales clientes de una base existente o crearlos "al vuelo" (on the fly).

Agrupación por Sesiones: Los prospectos seleccionados se agrupan en una "Sesión de Contacto".

Límite Estricto: Cada sesión debe estar limitada por sistema a un máximo de 15 prospectos. Esto es para forzar el trabajo por lotes y evitar bloqueos por spam en Instagram.

Interfaz de la Sesión: Un listado visual de los prospectos de esa sesión con botones de acceso rápido (redirecciones) a sus perfiles de Instagram, WhatsApp, Email, etc.

2. Ficha del Prospecto y Checklist de Acción
   Al abrir un prospecto desde la lista, se despliega una ficha con un formulario.

Autocompletado: Los datos que ya tengo de la creación se precargan solos.

Campos a llenar: Nombre del negocio, Rubro, Gancho empático (qué vi en su perfil), Canal de venta actual, Dolor detectado y Servicio a ofrecer (este campo es un selector dinámico que lee de la base de datos de servicios, para no limitar la escalabilidad si el día de mañana agregamos nuevos).

Checklist de Calentamiento: Antes de generar el mensaje, hay un checklist (Ej: 1. Dar 2 Likes, 2. Responder Historia, 3. Detectar dolor).

Regla del Checklist: El usuario debe tildar estas opciones para habilitar el botón de generar mensaje. Sin embargo, debe existir un botón de "Saltar / Omitir" en cada ítem del checklist por si decido no realizar ese paso con un cliente en particular.

3. Generación Dinámica del Pitch (Un solo botón)
   Debe haber un único botón llamado "Generar Prompt de Pitch".

Este botón captura toda la información del formulario (incluyendo el "Servicio a ofrecer" dinámico) y la inyecta en una plantilla de "Prompt Maestro" predefinida en el backend.

El sistema debe copiar al portapapeles este texto final, listo para pegarlo en la IA que redactará el mensaje.

Guardado manual: Un campo de texto adicional donde el usuario pueda pegar el Pitch final generado por la IA y guardarlo en el registro del cliente por si decide enviarlo más tarde.

4. Estados de Contacto y Motor de Seguimiento (Follow-up)
   Por defecto, el estado inicial es "Por Contactar".

Una vez enviado el pitch, el usuario hace clic en un check que abre un modal preguntando qué pasó, cambiando el estado a:

Rechazado: Pide obligatoriamente un comentario del motivo (Ej: "No tienen presupuesto", "Ya tienen agencia"). Queda completado y pasa a histórico.

En Seguimiento (Nuevo Estado): Pasa a una vista especial de "Lista de Seguimientos". Esta lista debe estar ordenada por una variable calculada llamada dias_sin_respuesta (orden descendente). Los prospectos que lleven más días sin responder deben aparecer primero en la lista.

Reunión / Loom: Abre el flujo del Punto 5.

Aceptado: Dispara el modal de "Creación de Cliente" del sistema core, convirtiendo el prospecto en un cliente real.

5. Handoff al Módulo de Reuniones
   Si el usuario elige el estado "Reunión / Loom", el prospecto se marca como completado en el "Taller de Contacto" y es enviado a un submódulo de Reuniones.

Selector de Tipo: El usuario debe elegir si es una Reunión Sincrónica (videollamada) o un Video Loom (asincrónico).

Calendario/Agenda: Debe permitir agendar la fecha y hora de la reunión en vivo, o establecer una fecha límite (Due Date) para grabar y enviar el video de Loom. Debe permitir pegar el link del video generado para que quede registrado.

6. Dashboard, Trazabilidad y Auditoría
   Debe existir un panel superior (Dashboard) que lea la base de datos y muestre el embudo en tiempo real:

Total de prospectos en sesión actual.

Cantidad en estado "Esperando respuesta / Seguimiento".

Tasa de conversión a "Reunión/Loom".

Tasa de cierre ("Aceptados").

Motivos de rechazo más comunes (Gráfico de torta o lista leyendo los comentarios de rechazo).

Entregables esperados de tu parte (IA):

Modelo de Datos Relacional (Tablas, columnas y relaciones sugeridas).

Estructura del "Prompt Maestro" (la cadena de texto base donde se inyectarán las variables).

Lógica de estados y cómo manejar el cronograma de "días sin responder".

Wireframe en formato texto de cómo debería distribuirse la interfaz.
