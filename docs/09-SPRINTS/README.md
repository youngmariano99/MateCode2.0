# Roadmap de Desarrollo

Versión: 2.0

> "MateCode se desarrolla mediante Sprints pequeños, independientes y completamente funcionales."

---

# Objetivo

Este documento define la planificación oficial del desarrollo de MateCode.

Cada Sprint representa una etapa completa del proyecto.

La IA únicamente podrá trabajar sobre un Sprint a la vez.

Queda prohibido implementar funcionalidades pertenecientes a Sprints futuros.

Cada Sprint deberá finalizar completamente antes de comenzar el siguiente.

---

# Filosofía

Cada Sprint debe:

- Tener un objetivo claro.
- Ser completamente funcional.
- Poder probarse.
- Poder documentarse.
- No romper la arquitectura existente.

Los Sprints se organizan por dependencias técnicas y de negocio.

Nunca por cantidad de funcionalidades.

---

# Estructura de cada Sprint

Todos los Sprints deberán seguir exactamente la misma estructura.

## Objetivo

Describe qué problema resuelve.

---

## Alcance

Lista completa de funcionalidades.

---

## Exclusiones

Qué NO debe implementarse.

---

## Dependencias

Qué Sprints deben estar terminados.

---

## Cambios en Base de Datos

Tablas nuevas.

Migraciones.

Seeds.

RLS.

---

## Backend

Casos de uso.

Repositorios.

Servicios.

Eventos.

---

## Frontend

Pantallas.

Componentes.

Layouts.

Formularios.

---

## Offline

Qué funcionalidades funcionan sin conexión.

---

## Testing

Unitarios.

Integración.

E2E.

---

## Documentación

Archivos que deben actualizarse.

---

## Definition of Done

Lista completa de validaciones.

---

# Roadmap

## Sprint 00

Preparación del Proyecto

Objetivo

Crear toda la infraestructura inicial del proyecto.

Incluye

- Crear proyecto NextJS
- Configurar TypeScript
- Configurar Tailwind
- Configurar Shadcn
- Configurar ESLint
- Configurar Prettier
- Configurar Husky
- Configurar estructura Clean Architecture
- Variables de entorno
- Scripts
- Configuración inicial

No incluye

Lógica de negocio.

---

## Sprint 01

Arquitectura Base

Incluye

- Clean Architecture
- Repositories
- Adapters
- Strategy
- Singleton
- Logger
- Error Handling
- Casos de uso base
- Dependency Injection

---

## Sprint 02

Sistema de Diseño

Incluye

- Tokens
- Tema
- Colores
- Tipografía
- Componentes Base
- Sidebar
- Header
- Layout
- Cards
- Botones
- Inputs
- Empty States
- Skeletons

---

## Sprint 03

Base de Datos

Incluye

- Supabase
- PostgreSQL
- Migraciones
- Seeds
- RLS
- Índices
- Auditoría
- Soft Delete

No incluye

Pantallas.

---

## Sprint 04

Autenticación

Incluye

- Login
- Logout
- Registro
- Recuperar contraseña
- Sesiones
- Refresh Token
- Permanencia de sesión (60 minutos)
- Roles
- Permisos

---

## Sprint 05

Infraestructura Base

Incluye

- React Query
- Zustand
- Formularios
- Validaciones
- Toasts
- Sistema de Logs
- Sistema de Eventos
- Storage
- Uploads

---

## Sprint 06

Offline First

Incluye

- Dexie
- Sincronización
- Cola de eventos
- Resolución de conflictos
- Estado Online
- Estado Offline

---

## Sprint 07

Dashboard

Incluye

- Inicio
- Actividad
- Acciones rápidas
- KPIs
- Agenda del día
- Próximos pagos
- Próximas tareas

---

## Sprint 08

Agencias

Incluye

- CRUD Agencia
- Branding
- Design.md
- Datos fiscales
- Configuración

---

## Sprint 09

Equipo

Incluye

- Usuarios
- Invitaciones
- Roles
- Permisos
- Perfil
- Auditoría

---

## Sprint 10

Clientes

Incluye

- CRUD
- Estados
- Filtros
- Etiquetas
- Historial
- Timeline
- Búsqueda inteligente

---

## Sprint 11

Contactos

Incluye

- Contactos múltiples
- Teléfonos
- Correos
- Redes sociales
- Direcciones
- Geolocalización

---

## Sprint 12

CRM Comercial

Incluye

- Contactos en frío
- Leads
- Embudo
- Seguimientos
- Llamadas
- Visitas
- Conversión a Cliente

---

## Sprint 13

Contratos

Incluye

- Editor Markdown
- Plantillas
- Variables
- Exportación PDF
- Historial
- Versionado

---

## Sprint 14

Pagos

Incluye

- Pagos únicos
- Mensuales
- Anuales
- Cuotas
- Recordatorios
- Calendario
- Próximos vencimientos

---

## Sprint 15

Logística

Incluye

- Direcciones
- Geolocalización
- Optimización de rutas
- Filtros
- Recorridos
- Navegación

---

## Sprint 16

IA

Incluye

- Asistente
- Resúmenes
- Sugerencias
- Automatizaciones
- Consultas inteligentes
- Análisis

---

## Sprint 17

Testing

Incluye

- Unit Testing
- Integration Testing
- Playwright
- Datos Mock
- Performance
- Optimización

---

## Sprint 18

Release Candidate

Incluye

- Revisión general
- Corrección de errores
- Optimización
- Accesibilidad
- Responsive
- Auditoría
- Documentación final
- Checklist de Producción

---

# Regla de Oro

La IA únicamente podrá trabajar sobre un Sprint activo.

No podrá adelantarse.

No podrá implementar funcionalidades futuras.

Todo Sprint deberá finalizar completamente antes de comenzar el siguiente.

---

# Objetivo Final

El desarrollo de MateCode deberá avanzar mediante incrementos pequeños, funcionales y completamente probados.

Cada Sprint deberá dejar el sistema en un estado estable, documentado y listo para continuar con el siguiente sin necesidad de realizar retrabajos.
