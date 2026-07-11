# Sprint 08 - Dashboard Ejecutivo (Centro de Operaciones)

Versión: 1.0

Estado: Pendiente

Prioridad: Muy Alta

Tiempo estimado: 2 Sprints

---

# Objetivo

Construir el Centro de Operaciones de MateCode.

Esta será la primera pantalla que verá el usuario al ingresar al sistema.

Su propósito no es mostrar gráficos, sino convertirse en el lugar donde el usuario entiende rápidamente qué está pasando en su negocio y qué acciones debe realizar.

El Dashboard deberá responder tres preguntas en menos de cinco segundos:

• ¿Qué está pasando?

• ¿Qué tengo que hacer?

• ¿Qué necesita atención?

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

---

# Filosofía

El Dashboard no es una pantalla de bienvenida.

Es el centro operativo de la empresa.

Cada tarjeta debe responder una necesidad real.

Si una tarjeta no ayuda a tomar una decisión o realizar una acción, no debe existir.

---

# Resultado esperado

Al finalizar este Sprint deberá existir:

✅ Dashboard completamente funcional

✅ Widgets configurables

✅ Actividad reciente

✅ Acciones rápidas

✅ Agenda del día

✅ Próximos vencimientos

✅ Próximos seguimientos

✅ Estado de sincronización

✅ Estado de la IA

✅ Estado del sistema

Todo funcionando Online y Offline.

---

# Diseño

El Dashboard deberá utilizar un sistema modular basado en tarjetas.

Cada tarjeta será independiente y reutilizable.

El usuario podrá reorganizar las tarjetas en futuras versiones.

---

# Widgets Obligatorios

## 1. Bienvenida

Mostrar:

Nombre del usuario

Nombre de la agencia

Fecha actual

Mensaje dinámico

Ejemplo.

Buen día Mariano 👋

Hoy tenés 12 tareas pendientes.

---

## 2. Resumen General

Mostrar:

Clientes activos

Leads

Propuestas

Proyectos

Pagos pendientes

Contratos pendientes

Todo mediante KPIs.

---

## 3. Actividad Reciente

Timeline.

Mostrar:

Cliente creado.

Cliente editado.

Contrato enviado.

Pago registrado.

Proyecto creado.

Usuario agregado.

Todo ordenado cronológicamente.

---

## 4. Acciones Rápidas

Botones:

Nuevo Cliente

Nuevo Lead

Nuevo Contrato

Nuevo Pago

Nueva Visita

Nueva Nota

Nueva Tarea

Todo accesible con un clic.

---

## 5. Agenda del Día

Mostrar:

Llamadas

Visitas

Seguimientos

Pagos

Reuniones

Ordenadas por horario.

---

## 6. Próximos Pagos

Mostrar.

Cliente.

Monto.

Fecha.

Estado.

Botón:

Registrar pago.

---

## 7. Próximos Seguimientos

Mostrar.

Cliente.

Estado.

Último contacto.

Acción recomendada.

Botón:

Contactar.

---

## 8. Clientes Recientes

Últimos clientes creados.

Acceso rápido.

---

## 9. Estado de Sincronización

Mostrar.

Online.

Offline.

Cantidad de cambios pendientes.

Última sincronización.

---

## 10. Estado de IA

Mostrar.

Proveedor activo.

Modelo.

Cantidad de consultas realizadas.

Consumo estimado.

---

## 11. Estado del Sistema

Mostrar.

Versión.

Base de Datos.

Sincronización.

Actualizaciones.

---

## 12. Notificaciones

Mostrar únicamente notificaciones importantes.

Nunca mostrar spam.

---

# Barra Superior

Deberá incluir.

Buscador Global.

Estado Online.

Notificaciones.

Usuario.

Configuración.

Nada más.

---

# Buscador Global

Debe permitir buscar:

Clientes.

Leads.

Contactos.

Contratos.

Pagos.

Proyectos.

Acciones.

El buscador deberá prepararse para IA en futuros Sprints.

---

# Casos de Uso

Obtener Dashboard.

Obtener KPIs.

Obtener Actividad.

Obtener Agenda.

Obtener Próximos Pagos.

Obtener Próximos Seguimientos.

Obtener Estado de Sincronización.

---

# Estados Vacíos

Cuando no existan datos.

Guiar al usuario.

Ejemplo.

Todavía no tenés clientes.

Crear mi primer cliente.

Nunca mostrar una pantalla vacía.

---

# Skeletons

Cada widget deberá tener su Skeleton.

No bloquear toda la pantalla.

Cada tarjeta carga independientemente.

---

# Responsive

Desktop.

Dos o tres columnas.

Tablet.

Dos columnas.

Celular.

Una sola columna.

Las tarjetas deberán reorganizarse automáticamente.

---

# Offline

Toda la información disponible deberá obtenerse desde la Base Local.

Mostrar claramente cuándo un dato puede estar desactualizado.

---

# Rendimiento

Cada Widget deberá consultar únicamente la información necesaria.

Nunca volver a cargar toda la pantalla.

Cada Widget será independiente.

---

# Componentes reutilizados

Card

StatCard

Timeline

Badge

Avatar

Button

Skeleton

EmptyState

QuickActionCard

StatusBadge

Toast

SearchBar

NotificationCenter

---

# Testing

Crear pruebas para:

Carga del Dashboard.

Widgets.

Skeletons.

Offline.

Buscador.

Responsive.

---

# UX

El usuario deberá entender el estado completo de su empresa en menos de cinco segundos.

Nunca saturar la pantalla.

Utilizar espacios amplios.

Jerarquía visual clara.

Los colores deberán indicar prioridad.

No utilizar gráficos innecesarios.

Las acciones importantes deberán estar siempre visibles.

---

# Seguridad

Mostrar únicamente la información permitida según el Rol.

No cargar información innecesaria.

---

# Criterios de aceptación

✓ Dashboard carga en menos de dos segundos.

✓ Widgets independientes.

✓ Funciona Offline.

✓ Responsive.

✓ Skeletons funcionando.

✓ Estados vacíos educativos.

✓ Acciones rápidas accesibles.

✓ Actividad actualizada.

---

# Definition of Done

☐ Sin errores TypeScript.

☐ Sin uso de any.

☐ Responsive completo.

☐ Skeletons funcionando.

☐ Offline funcionando.

☐ Widgets reutilizables.

☐ Accesibilidad validada.

☐ Tests aprobados.

☐ Documentación actualizada.

---

# Entregables

Al finalizar este Sprint existirá un Centro de Operaciones completamente funcional.

El usuario podrá ingresar al sistema y comprender inmediatamente el estado de su empresa, las tareas pendientes y las acciones prioritarias sin necesidad de navegar entre diferentes módulos.

---

# Notas para la IA

- Priorizar información accionable sobre gráficos decorativos.
- Cada widget debe ser independiente y reutilizable.
- Diseñar pensando en un uso intensivo durante toda la jornada laboral.
- Preparar la arquitectura para que el usuario pueda personalizar el Dashboard en futuras versiones.
- Mantener una experiencia limpia, minimalista y enfocada en la productividad.
