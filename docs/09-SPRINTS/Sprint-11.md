# Sprint 11 - Documentos Inteligentes

Versión: 1.0

Estado: Pendiente

Prioridad: Muy Alta

Tiempo estimado: 2 Sprints

---

# Objetivo

Construir el motor de documentos de MateCode.

Este módulo permitirá generar, editar, versionar, exportar y reutilizar documentos comerciales y administrativos utilizando plantillas dinámicas.

El objetivo es que el usuario nunca vuelva a copiar y pegar un contrato o presupuesto.

Toda la documentación deberá generarse automáticamente utilizando la información disponible del cliente, la agencia y el proyecto.

---

# Dependencias

Debe estar finalizado:

✅ Sprint 00 al Sprint 10

---

# Filosofía

Los documentos no son archivos.

Son datos estructurados.

El sistema deberá ser capaz de reconstruir un documento en cualquier momento utilizando la información almacenada.

El documento final (PDF) será únicamente una representación.

---

# Resultado esperado

Al finalizar este Sprint deberá existir:

✅ Editor Markdown

✅ Plantillas

✅ Variables dinámicas

✅ Vista previa

✅ Versionado

✅ Exportación PDF

✅ Exportación Markdown

✅ Historial

✅ Auditoría

✅ Compartir documento

Todo funcionando Offline.

---

# Tipos de Documento

El sistema deberá soportar:

Contrato

Presupuesto

Propuesta Comercial

NDA

Acta

Factura (estructura)

Documento libre

Plantilla personalizada

Todos configurables.

---

# Plantillas

Cada documento partirá desde una plantilla.

Ejemplos:

Contrato SaaS

Contrato Landing

Contrato Sistema Web

Propuesta Comercial

Presupuesto Web

Presupuesto Sistema

Acta de Entrega

NDA

Cada agencia podrá crear sus propias plantillas.

---

# Variables Dinámicas

Las plantillas deberán aceptar variables.

Ejemplos:

{{cliente.nombre}}

{{cliente.empresa}}

{{cliente.cuit}}

{{cliente.direccion}}

{{agencia.nombre}}

{{agencia.logo}}

{{agencia.email}}

{{proyecto.nombre}}

{{proyecto.fecha_entrega}}

{{fecha_actual}}

{{monto.total}}

{{forma_pago}}

{{responsable.nombre}}

Las variables deberán completarse automáticamente.

---

# Editor

Editor Markdown enriquecido.

Funciones:

Vista dividida

Vista previa

Autoguardado

Atajos

Inserción de variables

Bloques reutilizables

Historial

---

# Versionado

Cada modificación deberá generar una nueva versión.

Registrar:

Autor

Fecha

Cambios

Comentario opcional

Permitir restaurar versiones anteriores.

---

# Exportaciones

Generar:

PDF

Markdown

HTML

Preparar DOCX para una versión futura.

La exportación deberá respetar el Branding de la Agencia.

---

# Firma

Preparar infraestructura para:

Firma manual

Firma digital

Firma electrónica

No implementar integración externa todavía.

---

# Compartir

Permitir compartir documentos mediante:

Enlace seguro

Descarga directa

Correo electrónico (preparado)

---

# Historial

Registrar automáticamente:

Documento creado

Plantilla utilizada

Exportación

Cambio

Versión

Firma

Compartido

---

# Plantillas Inteligentes

El usuario podrá guardar cualquier documento como plantilla.

Ejemplo.

Crear un contrato.

↓

Guardar como plantilla.

↓

Utilizar nuevamente.

Las plantillas serán versionadas.

---

# Vista Previa

Actualizar en tiempo real.

No requerir guardar.

Mostrar exactamente cómo quedará el PDF.

---

# Integraciones futuras

Adobe Sign

DocuSign

Google Docs

Microsoft Word

Correo

WhatsApp

IA

---

# IA

La IA podrá:

Generar contratos.

Reescribir propuestas.

Corregir ortografía.

Resumir documentos.

Detectar inconsistencias.

Completar cláusulas.

Explicar contratos.

---

# Offline

Todo deberá poder editarse sin conexión.

Las exportaciones deberán funcionar Offline.

Los documentos pendientes se sincronizarán automáticamente.

---

# Componentes reutilizados

MarkdownEditor

MarkdownViewer

PDFPreview

Uploader

Timeline

VersionViewer

DiffViewer

Dialog

Toast

FileViewer

TemplateSelector

VariablesPanel

---

# Casos de Uso

Crear Documento.

Editar Documento.

Guardar Plantilla.

Crear desde Plantilla.

Exportar PDF.

Exportar Markdown.

Versionar.

Restaurar.

Compartir.

Eliminar.

Duplicar.

---

# Logs

Registrar:

Documento creado.

Documento editado.

Plantilla creada.

Exportación.

Firma.

Compartido.

Versión restaurada.

---

# Testing

Editor.

Variables.

Exportación.

Versionado.

Offline.

Plantillas.

PDF.

Responsive.

---

# UX

El usuario deberá poder crear un contrato completo en menos de cinco minutos.

Las variables deberán ser fáciles de insertar.

Mostrar sugerencias automáticas.

Evitar formularios complejos.

Todo deberá sentirse como escribir un documento común.

---

# Seguridad

Permisos por documento.

Historial obligatorio.

Soft Delete.

Versionado obligatorio.

Auditoría completa.

---

# Criterios de aceptación

✓ Editor Markdown funcionando.

✓ Variables dinámicas funcionando.

✓ PDF funcionando.

✓ Plantillas funcionando.

✓ Versionado funcionando.

✓ Offline funcionando.

✓ Responsive.

✓ Historial completo.

---

# Definition of Done

☐ Sin errores TypeScript.

☐ Sin uso de any.

☐ Exportación PDF funcionando.

☐ Variables funcionando.

☐ Offline funcionando.

☐ Responsive.

☐ Tests aprobados.

☐ Documentación actualizada.

---

# Entregables

Al finalizar este Sprint existirá un motor de documentos reutilizable que permitirá generar toda la documentación comercial y administrativa de la agencia a partir de datos existentes en el sistema.

Este motor será reutilizado por Presupuestos, Contratos, Propuestas, Actas, Facturación y futuras automatizaciones.

---

# Notas para la IA

- Nunca tratar un documento como un simple archivo.
- Separar claramente el contenido, la plantilla y la representación (PDF/HTML).
- Toda la información debe provenir de entidades del sistema y no duplicarse dentro del documento.
- El motor debe ser extensible para soportar nuevos tipos de documentos sin modificar la arquitectura existente.
