# Sprint 09 - CRM Comercial Inteligente

Versión: 1.0

Estado: Pendiente

Prioridad: Máxima

Tiempo estimado: 3 Sprints

---

# Objetivo

Construir el CRM principal de MateCode.

Este módulo será el núcleo comercial del sistema y permitirá gestionar todo el ciclo de vida de una oportunidad comercial, desde el primer contacto hasta convertirse en un cliente activo y posteriormente en un cliente recurrente.

No será un listado de clientes.

Será un asistente para organizar y potenciar el proceso comercial.

---

# Dependencias

Debe estar finalizado:

✅ Sprint 00

✅ Sprint 01

✅ Sprint 02

✅ Sprint 03

✅ Sprint 04

✅ Sprint 05

✅ Sprint 06

✅ Sprint 07

✅ Sprint 08

---

# Filosofía

Cada registro representa una relación comercial.

No simplemente una empresa.

El objetivo es que nunca vuelva a perderse un contacto, una llamada o una oportunidad de venta.

El sistema deberá ayudar al usuario a decidir cuál es el siguiente paso.

---

# Flujo Comercial

Todo registro deberá atravesar un ciclo de vida.

Contacto Detectado

↓

Pendiente de Contacto

↓

Primer Contacto

↓

Lead

↓

Reunión Agendada

↓

Propuesta Enviada

↓

Negociación

↓

Aceptado

↓

Proyecto en Curso

↓

Cliente Activo

↓

Seguimiento

↓

Cliente Recurrente

↓

Archivado

Los estados deberán ser configurables.

---

# Resultado esperado

Al finalizar este Sprint deberá existir:

✅ CRM completo

✅ Vista Kanban

✅ Vista Tabla

✅ Vista Tarjetas

✅ Vista Mapa

✅ Vista Calendario

✅ Búsqueda Inteligente

✅ Filtros Avanzados

✅ Historial completo

✅ Seguimientos

✅ Recordatorios

✅ Etiquetas

✅ Favoritos

✅ Acciones masivas

---

# Módulos

## 1. Contactos Comerciales

Registrar cualquier persona o empresa.

No importa si todavía no es cliente.

Campos mínimos:

Nombre

Empresa

Cargo

Teléfono

WhatsApp

Correo

Redes

Dirección

Observaciones

Origen del contacto

Estado

Responsable

---

## 2. Clientes

Cuando un contacto avance.

Convertirlo automáticamente en Cliente.

Nunca duplicar información.

---

## 3. Historial

Registrar automáticamente:

Llamadas

Correos

WhatsApp

Visitas

Notas

Propuestas

Contratos

Pagos

Cambios

Todo cronológicamente.

---

## 4. Seguimientos

Crear seguimientos.

Ejemplo.

"Llamar dentro de 3 días."

"Enviar propuesta."

"Volver a visitar."

Mostrar automáticamente en el Dashboard.

---

## 5. Notas

Editor Markdown.

Versionado.

Historial.

Búsqueda.

Etiquetas.

---

## 6. Etiquetas

Permitir crear etiquetas personalizadas.

Ejemplos.

Urgente

Cliente VIP

Industria

Frío

Caliente

Pendiente

Recomendado

---

## 7. Adjuntos

Guardar.

PDF

Imágenes

Audios

Videos

Presentaciones

Documentos

Todo asociado al cliente.

---

## 8. Contactos

Cada empresa podrá tener múltiples contactos.

Ejemplo.

Dueño

Administración

Ventas

Marketing

Cada contacto tendrá su historial independiente.

---

## 9. Ubicación

Guardar dirección completa.

Geocodificar automáticamente.

Guardar:

Latitud

Longitud

Precisión

Permitir abrir directamente en Google Maps.

Preparar para Logística.

---

## 10. Sistema Comercial

Registrar.

Origen.

Campaña.

Referido.

Publicidad.

Instagram.

Facebook.

Web.

Llamado en frío.

Recomendación.

Todo configurable.

---

# Vistas

## Tabla

Pensada para trabajo masivo.

---

## Kanban

Arrastrar entre estados.

Actualizar automáticamente.

---

## Tarjetas

Ideal para móvil.

---

## Calendario

Seguimientos.

Llamadas.

Visitas.

---

## Mapa

Visualizar todos los clientes.

Agrupar cercanos.

Preparado para optimización de recorridos.

---

# Filtros Inteligentes

Estado.

Responsable.

Ciudad.

Provincia.

País.

Rubro.

Origen.

Software.

Tiene sistema.

Necesita sistema.

Último contacto.

Próximo seguimiento.

Monto esperado.

Cliente activo.

Cliente inactivo.

Favoritos.

Etiquetas.

Distancia.

---

# Acciones rápidas

Llamar

WhatsApp

Correo

Google Maps

Registrar Nota

Registrar Pago

Crear Contrato

Crear Proyecto

Crear Seguimiento

Programar Visita

---

# Acciones masivas

Editar Estado

Asignar Responsable

Agregar Etiquetas

Exportar

Eliminar

Archivar

Mover

---

# Búsqueda Global

Buscar por:

Empresa

Persona

Teléfono

WhatsApp

Email

Red Social

Dirección

Notas

Etiquetas

Software

Dolor

Observaciones

Todo desde un único buscador.

---

# Casos de Uso

Crear Cliente.

Editar Cliente.

Eliminar Cliente.

Archivar.

Crear Seguimiento.

Registrar Nota.

Agregar Contacto.

Agregar Dirección.

Geocodificar.

Convertir Lead.

Buscar.

Filtrar.

Exportar.

Importar.

---

# Offline

Todo deberá funcionar sin conexión.

Los seguimientos se sincronizarán automáticamente.

Las coordenadas permanecerán disponibles localmente.

---

# Integraciones futuras

WhatsApp

Google Calendar

Google Maps

OpenStreetMap

Correo

IA

Contratos

Pagos

Proyectos

---

# UX

La creación de un cliente deberá requerir menos de un minuto.

El sistema deberá sugerir automáticamente información repetitiva.

Nunca mostrar formularios interminables.

Utilizar asistentes paso a paso cuando sea necesario.

Mostrar siempre cuál es la próxima acción recomendada.

---

# Seguridad

Respetar permisos.

Toda modificación deberá quedar auditada.

Soft Delete obligatorio.

---

# Logs

Registrar.

Cliente creado.

Estado cambiado.

Seguimiento creado.

Nota agregada.

Visita registrada.

Coordenadas actualizadas.

Conversión a Cliente.

---

# Testing

CRUD.

Kanban.

Filtros.

Búsqueda.

Offline.

Geolocalización.

Acciones masivas.

Responsive.

---

# Criterios de aceptación

✓ CRM completamente funcional.

✓ Kanban funcionando.

✓ Búsqueda instantánea.

✓ Geolocalización funcionando.

✓ Historial completo.

✓ Seguimientos funcionando.

✓ Offline funcionando.

✓ Responsive.

✓ Acciones rápidas.

✓ Acciones masivas.

---

# Definition of Done

☐ Sin errores TypeScript.

☐ Sin uso de any.

☐ Responsive completo.

☐ Offline funcionando.

☐ Kanban operativo.

☐ Mapa operativo.

☐ Historial funcionando.

☐ Tests aprobados.

☐ Documentación actualizada.

---

# Entregables

Al finalizar este Sprint existirá un CRM comercial completo que permitirá gestionar de forma simple todo el ciclo de vida de una oportunidad comercial, desde el primer contacto hasta la fidelización del cliente.

El módulo quedará preparado para integrarse con Proyectos, Contratos, Pagos, Logística Inteligente y Automatizaciones IA.

---

# Notas para la IA

- El CRM debe ser extremadamente rápido y fácil de usar.
- Reducir al mínimo la cantidad de clics para registrar información.
- Favorecer acciones rápidas y automatizaciones.
- Toda la información debe estar preparada para alimentar futuros módulos como IA, analítica y optimización de recorridos.
- Nunca tratar Clientes, Leads y Contactos como módulos separados; representan distintas etapas de una misma relación comercial.
