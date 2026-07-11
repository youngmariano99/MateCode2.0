# Sprint 13 - Centro de Ingeniería del Proyecto

Versión: 1.0

Estado: Pendiente

Prioridad: Crítica

Tiempo estimado: 4 Sprints

---

# Objetivo

Construir el Centro de Ingeniería de MateCode.

Este módulo será el núcleo técnico de cada desarrollo y permitirá administrar toda la información funcional, comercial y técnica de un proyecto desde su creación hasta su finalización.

El sistema deberá centralizar el contexto utilizado por la IA y evitar que el usuario tenga que escribir varias veces la misma información.

---

# Dependencias

Debe estar finalizado:

✅ Sprint 00 al Sprint 12

---

# Filosofía

Un proyecto no es solamente un conjunto de tareas.

Es una fuente de conocimiento.

Toda la información deberá estar conectada y reutilizarse automáticamente en todo el sistema.

El usuario cargará cada dato una única vez.

---

# Resultado esperado

Al finalizar este Sprint deberá existir:

✅ Centro de Ingeniería

✅ Configuración técnica

✅ Configuración de negocio

✅ Backlog

✅ Historias de Usuario

✅ Épicas

✅ Sprint Planning

✅ Kanban

✅ Contexto IA

✅ Exportación Markdown

✅ Importación JSON

Todo funcionando Online y Offline.

---

# Estructura del Proyecto

Cada proyecto podrá existir de forma independiente o estar asociado a un cliente.

La asociación deberá ser opcional.

Desde la ficha de un cliente deberá existir la acción rápida:

"Crear Proyecto"

Al crear un proyecto desde un cliente, la información comercial deberá completarse automáticamente.

---

# Sección 1 - Información General

Campos:

- Nombre del proyecto
- Cliente (opcional)
- Tipo de proyecto
- Fecha de inicio
- Estado

---

# Tipos de Proyecto

El sistema deberá incluir por defecto:

Landing Page

Sitio Web Institucional

Sistema Web

Aplicación Móvil

E-commerce

API

Automatización

Migración

Integración

Otro

El usuario podrá crear nuevos tipos.

Nunca estarán hardcodeados.

---

# Sección 2 - Configuración Técnica

## Stack Tecnológico

El Stack deberá dividirse por categorías.

### Frontend

Ejemplos:

Next.js

React

Vue

Angular

Astro

Svelte

HTML

Tailwind

Bootstrap

Otros

---

### Backend

NestJS

Node.js

Express

Fastify

Laravel

Spring

Django

ASP.NET

Go

Otros

---

### Base de Datos

PostgreSQL

MySQL

MariaDB

SQL Server

MongoDB

SQLite

Firebase

Supabase

Otros

---

### Infraestructura / DevOps

Docker

Vercel

Netlify

AWS

Azure

Cloudflare

GitHub Actions

Coolify

Nginx

Otros

---

### Seguridad

JWT

OAuth

Supabase Auth

Clerk

Firebase Auth

RBAC

Rate Limiting

CORS

Helmet

Otros

---

### Integraciones

Stripe

Mercado Pago

Twilio

OpenAI

Claude

Gemini

WhatsApp

Google Maps

Resend

SMTP

Otros

---

# Biblioteca Inteligente

Cada tecnología agregada manualmente deberá guardarse automáticamente.

El usuario podrá reutilizarla posteriormente.

El sistema deberá sugerir tecnologías utilizadas anteriormente.

---

# Sección 3 - Estándares

Dividir por categorías.

## Arquitectura

Clean Architecture

Hexagonal

DDD

MVC

Vertical Slice

Feature First

Otra

---

## Patrones de Diseño

Repository

Adapter

Strategy

Factory

Builder

Singleton

Facade

Observer

Command

Otros

---

## Buenas Prácticas

SOLID

DRY

KISS

YAGNI

Clean Code

Código fuertemente tipado

No usar any

Máximo 500 líneas por archivo

Nombres descriptivos

Otros

---

## Principios OO

SRP

OCP

LSP

ISP

DIP

---

## Testing

Unitarios

Integración

E2E

Vitest

Playwright

Jest

Cobertura mínima configurable

---

## DevOps

CI/CD

Lint

Prettier

Husky

Versionado Semántico

Conventional Commits

Docker

Deploy automático

---

Cada elemento agregado deberá quedar guardado para reutilizarse.

---

# Sección 4 - Negocio (Opcional)

## Product Owner

Registrar.

Problema.

Dolor.

Objetivos.

Usuarios.

Restricciones.

Competencia.

Notas.

Ideas.

Reuniones.

Archivos.

Todo mediante un editor Markdown enriquecido.

---

## Generador de Prompt

El sistema deberá generar automáticamente un Prompt profesional utilizando toda la información cargada.

El Prompt deberá seguir buenas prácticas de Prompt Engineering.

Objetivo:

Solicitar a la IA la generación de un Backlog estructurado en formato JSON.

---

## Importación del Backlog

El usuario podrá importar un JSON generado por IA.

El sistema deberá validar.

Épicas.

Historias.

Prioridades.

Dependencias.

Estimaciones.

Todo antes de insertarlo.

---

# Parte Financiera

Registrar.

Precio total.

Moneda.

Forma de pago.

Cantidad de pagos.

Fechas.

Estado.

Si el proyecto pertenece a un cliente que ya posee un plan de pagos registrado, la información deberá sugerirse automáticamente.

Nunca duplicar datos.

---

# Presupuesto

Generar un presupuesto simplificado.

Mostrar únicamente:

Épicas.

Grandes funcionalidades.

Precio.

Totales.

Sin detalles técnicos.

Exportable en PDF.

---

# Exportación Markdown

El sistema deberá generar automáticamente un archivo Markdown.

El objetivo es entregar a una IA todo el contexto del proyecto.

Deberá incluir.

Información general.

Cliente.

Negocio.

Stack.

Estándares.

Arquitectura.

Backlog.

Historias.

Sprint actual.

Configuración.

Notas.

Todo organizado.

---

# Desarrollo

## Backlog

Mostrar.

Épicas.

Historias.

Prioridad.

Estimación.

Dependencias.

Etiquetas.

---

## Sprint Planning

Crear Sprint.

Campos.

Nombre.

Duración.

Fecha inicio.

Fecha fin.

Objetivo.

Descripción.

Capacidad.

Miembros.

Seleccionar historias.

Mover automáticamente desde el Backlog.

---

## Sprint Activo

Una vez iniciado.

Bloquear cambios estructurales.

Mostrar.

Kanban.

Burndown (preparado).

Actividad.

Tiempo.

Comentarios.

Archivos.

---

## Finalización del Sprint

Al finalizar.

Las historias completadas pasarán automáticamente al historial.

Las pendientes volverán al Backlog.

Manteniendo prioridad y estimación.

---

## Kanban

Columnas configurables.

Backlog

Por hacer

En desarrollo

En revisión

Testing

Bloqueado

Finalizado

Drag & Drop.

Offline.

Tiempo real.

---

# IA

El sistema podrá.

Generar Backlog.

Generar Historias.

Generar Épicas.

Generar Sprints.

Sugerir dependencias.

Detectar riesgos.

Actualizar documentación.

Generar contexto para cualquier modelo de IA.

---

# Componentes

ProjectHeader

StackSelector

StandardSelector

MarkdownEditor

PromptGenerator

BacklogBoard

EpicCard

UserStoryCard

SprintPlanner

KanbanBoard

BudgetSummary

FinancialPanel

MarkdownExporter

JsonImporter

---

# Casos de Uso

Crear Proyecto.

Asociar Cliente.

Configurar Stack.

Configurar Estándares.

Registrar Negocio.

Generar Prompt.

Importar Backlog.

Crear Sprint.

Iniciar Sprint.

Finalizar Sprint.

Exportar Markdown.

---

# Offline

Toda la planificación deberá funcionar sin conexión.

Los cambios se sincronizarán automáticamente.

Las exportaciones deberán poder realizarse localmente.

---

# UX

Toda la configuración deberá dividirse en pasos claros.

Nunca mostrar formularios extensos.

Utilizar asistentes (wizard) para la creación inicial.

Permitir volver atrás en cualquier momento.

Mostrar el progreso de configuración.

Reducir al mínimo la cantidad de clics.

Priorizar la reutilización de información ya existente.

---

# Seguridad

Respetar permisos por proyecto.

Auditar todos los cambios.

Soft Delete.

Historial obligatorio.

---

# Logs

Registrar.

Proyecto creado.

Stack actualizado.

Estándares modificados.

Prompt generado.

Backlog importado.

Sprint iniciado.

Sprint finalizado.

Exportación Markdown.

---

# Testing

Crear pruebas para:

Creación del proyecto.

Asociación con clientes.

Importación JSON.

Exportación Markdown.

Kanban.

Sprint Planning.

Offline.

Responsive.

---

# Criterios de aceptación

✓ Proyecto asociado o independiente.

✓ Stack reutilizable.

✓ Estándares reutilizables.

✓ Prompt generado automáticamente.

✓ Importación JSON funcionando.

✓ Sprint Planning funcionando.

✓ Kanban funcionando.

✓ Exportación Markdown completa.

✓ Offline funcionando.

✓ Responsive.

---

# Definition of Done

☐ Sin errores TypeScript.

☐ Sin uso de any.

☐ Responsive completo.

☐ Offline funcionando.

☐ Importación JSON validada.

☐ Exportación Markdown funcionando.

☐ Kanban operativo.

☐ Tests aprobados.

☐ Documentación actualizada.

---

# Entregables

Al finalizar este Sprint existirá un Centro de Ingeniería completamente funcional.

Toda la información técnica, comercial y funcional del proyecto estará centralizada y preparada para alimentar automáticamente a cualquier modelo de IA, reduciendo la duplicación de datos y estandarizando el proceso completo de desarrollo de software.

---

# Notas para la IA

- El proyecto es la fuente única de verdad (Single Source of Truth) para todo el desarrollo.
- Nunca duplicar información que ya exista en Clientes, Agencia o módulos financieros; siempre reutilizarla mediante relaciones.
- Diseñar el flujo de trabajo para que un proyecto pueda comenzar manualmente o asistido por IA, sin obligar al usuario a seguir un único camino.
- Toda la información debe ser exportable e importable mediante formatos estructurados (Markdown y JSON) para facilitar la interoperabilidad con modelos de IA y futuras integraciones.
