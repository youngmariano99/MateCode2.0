# Sprint 07 - Workspace de Agencia

Versión: 1.0

Estado: Pendiente

Prioridad: Muy Alta

Tiempo estimado: 2 Sprints

---

# Objetivo

Construir el módulo principal de Agencia, que actuará como el espacio de trabajo central de MateCode.

Este módulo permitirá configurar completamente una agencia, personalizar su identidad, administrar la información comercial y preparar el sistema para la generación de contratos, presupuestos, propuestas comerciales y futuras integraciones.

Toda la información del sistema pertenecerá a una Agencia.

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

---

# Resultado esperado

Al finalizar este Sprint deberá existir:

✅ Creación de Agencia

✅ Edición

✅ Branding

✅ Configuración General

✅ Datos Comerciales

✅ Datos Fiscales

✅ Gestión de Logo

✅ Design.md

✅ Configuración Regional

✅ Historial de cambios

✅ Auditoría

Todo funcionando tanto Online como Offline.

---

# Filosofía

La Agencia representa una empresa real.

No es simplemente un registro en la base de datos.

Toda la configuración realizada aquí será utilizada automáticamente por el resto del sistema.

---

# Funcionalidades

## 1. Crear Agencia

Permitir crear una nueva agencia.

Campos mínimos:

- Nombre comercial
- Tipo de agencia
- Nombre legal (opcional)
- Descripción
- Sitio web
- Email principal
- Teléfono
- Estado

---

## 2. Branding

Permitir configurar:

Logo

Isotipo

Favicon

Color principal

Color secundario

Color de éxito

Color de advertencia

Color de error

Imagen de portada

---

## 3. Design.md

Cada Agencia podrá subir un archivo Design.md.

El sistema deberá:

Guardar el archivo.

Versionarlo.

Mostrar la última versión.

Permitir reemplazarlo.

Preparar su uso para IA.

---

## 4. Datos Comerciales

Configurar:

Razón Social

CUIT

IVA

Dirección Fiscal

Ciudad

Provincia

País

Código Postal

Sitio Web

Redes Sociales

Correo Comercial

Teléfono Comercial

---

## 5. Firma Comercial

Permitir configurar:

Nombre del responsable

Cargo

Firma digital

Pie de correo

Información para contratos

---

## 6. Configuración Regional

Seleccionar:

Idioma

Zona horaria

Formato de fecha

Formato monetario

Moneda

Separador decimal

---

## 7. Preferencias

Configurar:

Tema

Modo oscuro

Modo claro

Sidebar colapsado

Animaciones

Sonidos

Recordatorios

Notificaciones

---

## 8. IA

Configurar:

Proveedor IA

Modelo preferido

Prompt institucional

Temperatura

Contexto permanente

El Prompt institucional utilizará automáticamente el Design.md.

---

## 9. Archivos

Permitir almacenar:

Logo

Contratos

Manual de Marca

Plantillas

PDF

Presentaciones

---

## 10. Historial

Registrar automáticamente:

Cambios de Branding.

Cambios fiscales.

Carga de archivos.

Cambio de logo.

Cambio de colores.

Cambio de Design.md.

---

# Pantallas

## Dashboard de Agencia

Resumen.

Datos rápidos.

Estado.

Actividad reciente.

---

## Información General

Formulario principal.

---

## Branding

Gestión completa del branding.

Vista previa en tiempo real.

---

## Datos Comerciales

Formulario.

---

## Preferencias

Configuración general.

---

## IA

Configuración del contexto institucional.

---

## Historial

Timeline completo.

---

# Componentes reutilizados

Button

Card

Input

Tabs

Upload

Avatar

Color Picker

Markdown Viewer

Markdown Upload

Timeline

Alert

Toast

Dialog

Sidebar

Header

---

# Casos de Uso

Crear Agencia

Actualizar Agencia

Actualizar Branding

Subir Logo

Eliminar Logo

Actualizar Design.md

Actualizar Configuración

Consultar Agencia

Consultar Branding

Consultar Historial

---

# Validaciones

El nombre es obligatorio.

No permitir dos agencias con el mismo identificador.

Validar formatos de email.

Validar sitio web.

Validar tamaños de imágenes.

Validar formato Markdown.

---

# Estrategia Offline

Toda la configuración podrá modificarse sin conexión.

Los archivos quedarán pendientes de sincronización.

El usuario siempre conocerá el estado de sincronización.

---

# Logs

Registrar:

Agencia creada.

Branding actualizado.

Logo cambiado.

Design.md actualizado.

Configuración modificada.

Archivos cargados.

---

# Testing

Crear pruebas para:

Creación.

Edición.

Uploads.

Sincronización.

Versionado.

Branding.

Preferencias.

---

# UX

La configuración deberá dividirse en pestañas claras.

Nunca mostrar formularios largos.

Cada sección deberá poder guardarse independientemente.

Mostrar siempre el estado de sincronización.

Permitir deshacer cambios antes de guardar.

---

# Seguridad

Solo Administradores podrán modificar la configuración de la Agencia.

Los demás usuarios tendrán permisos específicos según su rol.

Toda acción deberá quedar auditada.

---

# Criterios de aceptación

✓ Agencia completamente configurable.

✓ Branding funcionando.

✓ Design.md versionado.

✓ Datos fiscales configurables.

✓ Configuración Offline.

✓ Auditoría funcionando.

✓ Historial funcionando.

✓ Responsive.

✓ Accesibilidad.

---

# Definition of Done

☐ Sin errores TypeScript.

☐ Sin uso de any.

☐ Responsive completo.

☐ Offline funcionando.

☐ Branding reutilizable.

☐ Tests aprobados.

☐ Auditoría funcionando.

☐ Documentación actualizada.

---

# Entregables

Al finalizar este Sprint existirá un Workspace completo para administrar una Agencia.

Toda la información configurada aquí será reutilizada automáticamente por los módulos de Clientes, Contratos, IA, Presupuestos, Logística y futuras funcionalidades.

---

# Notas para la IA

- La Agencia es el núcleo del sistema y no debe tratarse como un simple CRUD.
- Todo el módulo debe estar preparado para múltiples agencias por usuario en el futuro.
- Cada sección debe ser independiente y reutilizable.
- Toda la configuración debe estar disponible para el resto de los módulos mediante servicios y casos de uso, evitando dependencias directas entre componentes.
