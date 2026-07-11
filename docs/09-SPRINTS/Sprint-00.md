# Sprint 00

# Sprint 00 - Preparación del Proyecto

Versión: 1.0

Estado: Pendiente

Prioridad: Crítica

Tiempo estimado: 1 Sprint

---

# Objetivo

Preparar toda la infraestructura inicial de MateCode.

Al finalizar este Sprint deberá existir un proyecto completamente configurado, compilando correctamente y listo para comenzar el desarrollo del sistema.

Este Sprint NO incluye lógica de negocio.

NO incluye pantallas funcionales.

NO incluye Base de Datos.

NO incluye autenticación.

Su único objetivo es dejar el proyecto preparado para comenzar el Sprint 01.

---

# Resultado esperado

Al finalizar este Sprint deberá existir:

✅ Proyecto NextJS funcionando

✅ TypeScript configurado

✅ Tailwind configurado

✅ Shadcn/UI instalado

✅ ESLint funcionando

✅ Prettier configurado

✅ Husky configurado

✅ lint-staged funcionando

✅ Alias de imports

✅ Arquitectura de carpetas creada

✅ Variables de entorno preparadas

✅ Proyecto ejecutando correctamente

Sin errores.

---

# Stack

Frontend

- NextJS (App Router)

- React

- TypeScript

Backend

- NextJS Server Actions

Base de Datos

No implementar todavía.

Autenticación

No implementar todavía.

---

# Versiones recomendadas

Node.js LTS

NextJS estable

React estable

TypeScript estable

Tailwind CSS estable

Shadcn/UI estable

ESLint estable

Prettier estable

---

# Tareas

## 1. Crear el proyecto

Crear el proyecto utilizando:

```bash
npx create-next-app@latest matecode
```

Opciones:

TypeScript

Sí

ESLint

Sí

Tailwind

Sí

App Router

Sí

src/

Sí

Import Alias

@

Turbopack

Sí

---

## 2. Instalar dependencias

Instalar únicamente las dependencias necesarias para comenzar.

Dependencias principales

- shadcn/ui

- lucide-react

- zod

- react-hook-form

- clsx

- tailwind-merge

- class-variance-authority

- sonner

Dependencias de desarrollo

- prettier

- prettier-plugin-tailwindcss

- husky

- lint-staged

No instalar librerías que aún no se utilizarán.

Ejemplo:

Supabase

Dexie

Playwright

Vitest

React Query

Zustand

Se instalarán en Sprints posteriores.

---

## 3. Configurar Prettier

Crear la configuración del proyecto.

Toda la aplicación deberá respetar el mismo formato.

---

## 4. Configurar ESLint

No deberá existir ningún Warning.

No deberá existir ningún Error.

---

## 5. Configurar Husky

Agregar:

pre-commit

Ejecutar automáticamente:

- lint

- typecheck

---

## 6. Configurar lint-staged

Sólo analizar archivos modificados.

---

## 7. Crear estructura de carpetas

Crear únicamente la estructura.

No crear lógica.

Estructura:

```text
src/

app/

application/

domain/

infrastructure/

presentation/

shared/

components/

hooks/

providers/

styles/

config/

types/

utils/

```

---

## 8. Configurar Alias

@

Para todo src.

---

## 9. Variables de entorno

Crear:

.env.example

Con las variables necesarias para el proyecto.

Sin valores reales.

---

## 10. Página temporal

Crear una pantalla temporal.

Contenido:

Logo de MateCode

Texto:

MateCode

"Tomate un mate mientras la IA escribe el código."

Indicador:

Sprint 00 finalizado correctamente.

No agregar funcionalidades.

---

# Exclusiones

Este Sprint NO debe implementar:

Base de Datos

Supabase

Login

Usuarios

Clientes

Pagos

Contratos

Offline

IA

Logística

Dashboard

APIs

Casos de Uso

Repositories

No crear código innecesario.

---

# Estructura esperada

Al finalizar el Sprint la estructura deberá ser similar a:

```text
matecode/

src/

app/

application/

domain/

infrastructure/

presentation/

shared/

components/

hooks/

providers/

styles/

config/

types/

utils/

public/

docs/

```

---

# Scripts esperados

El proyecto deberá contar como mínimo con:

```json
dev

build

start

lint

typecheck

format

prepare
```

---

# Criterios de aceptación

El Sprint estará terminado únicamente si:

✓ El proyecto compila.

✓ No existen errores de TypeScript.

✓ No existen errores de ESLint.

✓ Tailwind funciona correctamente.

✓ Shadcn funciona correctamente.

✓ Husky ejecuta el pre-commit.

✓ Los alias funcionan.

✓ La estructura está creada.

✓ Existe la pantalla temporal.

✓ No existe lógica de negocio.

---

# Definition of Done

Antes de finalizar este Sprint la IA deberá verificar:

☐ Proyecto compilando.

☐ Sin errores.

☐ Sin warnings.

☐ Arquitectura creada.

☐ Scripts funcionando.

☐ Variables de entorno creadas.

☐ Husky funcionando.

☐ ESLint funcionando.

☐ Prettier funcionando.

☐ Tailwind funcionando.

☐ Shadcn funcionando.

☐ Código tipado.

☐ Sin uso de any.

☐ Documentación actualizada.

---

# Entregables

Al finalizar este Sprint deberán existir:

- Proyecto inicial completamente funcional.
- Arquitectura de carpetas.
- Herramientas de desarrollo configuradas.
- Pantalla temporal de bienvenida.
- Proyecto listo para comenzar el Sprint 01.

---

# Notas para la IA

- No anticipar funcionalidades de Sprints futuros.
- No instalar dependencias que aún no se utilizarán.
- Mantener el proyecto lo más limpio posible.
- Priorizar una base sólida sobre la velocidad de desarrollo.
- Si surge una decisión arquitectónica que afecte a futuros Sprints, documentarla en lugar de implementarla sin consenso.
