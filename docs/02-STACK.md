# Stack Tecnológico

Versión: 2.0

---

# Objetivo

Este documento define las tecnologías oficiales del proyecto MateCode.

Ninguna IA ni desarrollador podrá reemplazar una tecnología sin una ADR (Architecture Decision Record).

El objetivo NO es utilizar la mayor cantidad de librerías posibles.

El objetivo es mantener un stack pequeño, moderno, escalable y mantenible durante muchos años.

Siempre deberá priorizarse:

- Simplicidad
- Performance
- Tipado fuerte
- Escalabilidad
- Bajo acoplamiento
- Facilidad de mantenimiento

---

# Stack Oficial

| Capa                   | Tecnología                |
| ---------------------- | ------------------------- |
| Frontend               | Next.js (App Router)      |
| Lenguaje               | TypeScript                |
| UI                     | React                     |
| Estilos                | TailwindCSS               |
| Componentes            | shadcn/ui                 |
| Base de datos          | PostgreSQL                |
| Backend as a Service   | Supabase                  |
| Autenticación          | Supabase Auth             |
| Storage                | Supabase Storage          |
| ORM                    | Drizzle ORM               |
| Validaciones           | Zod                       |
| Formularios            | React Hook Form           |
| Estado Global          | Zustand                   |
| Estado del Servidor    | TanStack Query            |
| Offline                | Dexie.js                  |
| Mapas                  | Leaflet                   |
| Geolocalización        | OpenStreetMap + Nominatim |
| Optimización logística | OSRM                      |
| PDF                    | React PDF                 |
| Testing Unitario       | Vitest                    |
| Testing E2E            | Playwright                |
| Linter                 | ESLint                    |
| Formateador            | Prettier                  |
| Git Hooks              | Husky                     |
| Deploy                 | Vercel                    |

---

# Filosofía del Stack

Cada tecnología fue seleccionada porque resuelve un problema específico.

No se permiten tecnologías duplicadas.

Ejemplo:

Si Zustand administra el estado global, queda prohibido agregar Redux.

Si React Hook Form administra formularios, queda prohibido agregar Formik.

Si Drizzle administra la base de datos, queda prohibido Prisma.

---

# Frontend

## Next.js

Será el framework oficial.

Siempre deberá utilizarse:

- App Router
- Server Components cuando sea posible
- Client Components únicamente cuando sea necesario
- Route Groups
- Layouts
- Loading
- Error Boundaries

No utilizar Pages Router.

---

# React

Toda la interfaz deberá desarrollarse utilizando React.

Reglas:

- Componentes pequeños
- Componentes reutilizables
- Componentes altamente tipados
- Componentes desacoplados

Nunca crear componentes gigantes.

---

# TypeScript

Todo el proyecto deberá escribirse en TypeScript.

Es obligatorio.

---

Queda prohibido:

```ts
any;
```

También queda prohibido:

```ts
// @ts-ignore
```

Excepto casos extremadamente justificados.

---

Todo deberá estar correctamente tipado.

---

# TailwindCSS

Todo el diseño deberá realizarse mediante Tailwind.

No utilizar CSS tradicional salvo casos excepcionales.

No utilizar Bootstrap.

No utilizar Material UI.

No utilizar estilos inline.

---

# shadcn/ui

Todos los componentes base deberán provenir de shadcn.

Ejemplos:

- Button
- Card
- Dialog
- Table
- Input
- Select
- Dropdown
- Tabs
- Popover
- Tooltip

Siempre deberán personalizarse para respetar el Design System de MateCode.

Nunca utilizar el estilo por defecto.

---

# Backend

El backend será construido utilizando Supabase.

Servicios utilizados:

- PostgreSQL
- Auth
- Storage
- Edge Functions (cuando sea necesario)

Toda la lógica de negocio deberá permanecer dentro del proyecto.

Supabase será únicamente un proveedor de infraestructura.

Nunca depender directamente de Supabase desde los componentes.

Siempre utilizar Adaptadores y Repositories.

---

# Base de Datos

Motor oficial:

PostgreSQL.

Todos los nombres deberán escribirse en español latinoamericano.

Ejemplo:

clientes

contactos

proyectos

pagos

contratos

usuarios

agencias

Nunca utilizar nombres en inglés.

---

# ORM

Drizzle ORM será el ORM oficial.

Motivos:

- Excelente tipado
- Simplicidad
- Performance
- SQL cercano al original
- Fácil mantenimiento

---

# Validaciones

Todas las validaciones deberán realizarse utilizando Zod.

No duplicar validaciones.

El mismo esquema deberá utilizarse para:

- formularios
- backend
- API
- sincronización

---

# Formularios

React Hook Form será la única librería permitida.

Siempre deberá combinarse con:

- Zod
- Componentes reutilizables

---

# Estado Global

Estado global:

Zustand.

Sólo deberá utilizarse para:

- sesión
- preferencias
- tema
- usuario
- configuraciones
- estado offline

No utilizar Zustand para datos provenientes del servidor.

---

# Estado del servidor

Toda la comunicación con la API deberá utilizar TanStack Query.

Ventajas:

- cache
- reintentos
- sincronización
- invalidación automática

Nunca realizar fetch manual repetido.

---

# Offline First

MateCode debe funcionar sin Internet.

Para ello se utilizará:

Dexie.js

La aplicación deberá poder:

- consultar
- editar
- eliminar
- crear

sin conexión.

Cuando Internet vuelva, deberá sincronizar automáticamente.

---

# Geolocalización

Proveedor:

OpenStreetMap

Geocodificación:

Nominatim

Mapas:

Leaflet

Optimización de rutas:

OSRM

No utilizar Google Maps para evitar costos innecesarios.

La arquitectura deberá permitir cambiar fácilmente el proveedor mediante el patrón Strategy.

---

# Generación de PDF

Todos los documentos deberán generarse mediante React PDF.

Ejemplos:

- contratos
- presupuestos
- reportes

---

# Testing

Testing unitario:

Vitest.

Testing End To End:

Playwright.

Toda funcionalidad importante deberá incluir pruebas.

---

# Deploy

Proveedor oficial:

Vercel.

No utilizar Docker salvo necesidad futura.

---

# Variables de entorno

Todas las variables deberán almacenarse en:

.env.local

Nunca subir:

.env

Nunca subir:

.env.local

Nunca escribir credenciales dentro del código.

---

# Librerías permitidas

- Next.js
- React
- TypeScript
- TailwindCSS
- shadcn/ui
- Drizzle
- Zod
- Zustand
- TanStack Query
- React Hook Form
- Dexie
- Leaflet
- React PDF
- Supabase
- Vitest
- Playwright
- Husky
- Prettier
- ESLint

---

# Librerías prohibidas

Para evitar duplicidad y aumentar la mantenibilidad, queda prohibido incorporar tecnologías que resuelvan problemas ya cubiertos por el stack oficial.

Ejemplos:

- Redux
- MobX
- Formik
- Material UI
- Bootstrap
- jQuery
- Prisma
- Sequelize
- Styled Components
- Emotion

Toda nueva dependencia deberá justificarse mediante una ADR.

---

# Principios del Stack

Antes de incorporar una nueva tecnología deberán responderse las siguientes preguntas:

1. ¿Ya existe una herramienta que resuelva este problema?
2. ¿Reduce realmente la complejidad?
3. ¿Será fácil de mantener dentro de cinco años?
4. ¿Es compatible con Clean Architecture?
5. ¿Respeta el tipado fuerte?
6. ¿Funciona correctamente con Offline First?

Si alguna respuesta es negativa, la dependencia no deberá incorporarse.

---

# Objetivo final

El stack tecnológico de MateCode debe mantenerse pequeño, consistente y altamente tipado.

Cada tecnología deberá tener una única responsabilidad.

La arquitectura debe permitir reemplazar cualquier proveedor (base de datos, autenticación, mapas o almacenamiento) sin modificar la lógica de negocio de la aplicación.

La tecnología nunca debe condicionar el dominio.

El dominio siempre tendrá prioridad sobre la infraestructura.
