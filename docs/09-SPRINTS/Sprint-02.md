# Sprint 02 - Base de Datos e Infraestructura de Persistencia

Versión: 1.0

Estado: Pendiente

Prioridad: Crítica

Tiempo estimado: 1 Sprint

---

# Objetivo

Construir toda la infraestructura de persistencia de MateCode.

Al finalizar este Sprint deberá existir una Base de Datos completamente preparada para comenzar el desarrollo de los módulos del negocio.

Este Sprint implementa únicamente la infraestructura de datos.

No desarrolla funcionalidades visibles para el usuario.

---

# Dependencias

Debe estar terminado:

✅ Sprint 00

✅ Sprint 01

---

# Resultado esperado

Al finalizar este Sprint deberá existir:

✅ Proyecto Supabase conectado

✅ PostgreSQL configurado

✅ Sistema completo de migraciones

✅ Row Level Security (RLS)

✅ Seeds

✅ Índices

✅ Relaciones

✅ Auditoría

✅ Soft Delete

✅ Repositories concretos

✅ Adaptadores de persistencia

Todo listo para comenzar el desarrollo funcional.

---

# Objetivos Técnicos

La Base de Datos deberá cumplir:

- 3FN
- Multi Agencia
- Multi Usuario
- Offline Ready
- Auditoría completa
- Escalable
- Preparada para IA
- Preparada para Automatizaciones

---

# Tareas

## 1. Configurar Supabase

Crear el proyecto.

Configurar:

- Proyecto
- Base PostgreSQL
- Variables de entorno
- Cliente
- Server Client
- Browser Client

No implementar autenticación.

---

## 2. Crear infraestructura de migraciones

Toda modificación deberá realizarse mediante migraciones.

Nunca modificar tablas manualmente.

Preparar:

```
supabase/

migrations/

seed/

functions/

policies/

```

---

## 3. Configurar Row Level Security

Preparar RLS para todas las tablas.

Aunque todavía no exista Login.

Todas las tablas deberán quedar preparadas.

---

## 4. Crear tablas del núcleo

Únicamente crear estructura.

No desarrollar reglas de negocio.

Crear:

agencias

usuarios

roles

permisos

sesiones

branding

configuracion

historial

actividad

logs

notificaciones

---

## 5. Crear tablas de Clientes

Crear:

clientes

contactos

telefonos

correos

redes_sociales

direcciones

cliente_etiquetas

etiquetas

estados_cliente

rubros

tipos_software

---

## 6. Crear tablas Comerciales

Crear:

contactos_frio

seguimientos

llamadas

visitas

propuestas

---

## 7. Crear tablas de Proyectos

Crear:

proyectos

comentarios

archivos

---

## 8. Crear tablas de Pagos

Crear:

pagos

cuotas

formas_pago

facturas

---

## 9. Crear tablas de Contratos

Crear:

contratos

plantillas

firmas

---

## 10. Crear tablas IA

Preparar únicamente estructura.

Crear:

conversaciones_ia

prompts

respuestas_ia

automatizaciones

---

## 11. Crear Relaciones

Implementar todas las claves foráneas.

No deberá existir ninguna relación implícita.

---

## 12. Auditoría

Agregar automáticamente a todas las tablas:

id

creado_en

actualizado_en

eliminado_en

creado_por

actualizado_por

eliminado_por

---

## 13. Soft Delete

Toda tabla deberá soportarlo.

Nunca eliminar registros físicamente.

---

## 14. Índices

Crear índices para:

UUID

Foreign Keys

Filtros frecuentes

Búsquedas

No crear índices innecesarios.

---

## 15. Seeds

Crear Seeds para:

Estados Cliente

Rubros

Roles

Permisos

Tipos Software

Tipos Agencia

Formas Pago

Estados Proyecto

Estados Pago

---

## 16. Adaptadores

Implementar:

Repositorio Supabase

Adaptador PostgreSQL

Mapeadores

DTO

Entidades

Sin lógica de negocio.

---

## 17. Repositories

Implementar versiones concretas de:

RepositorioCliente

RepositorioPago

RepositorioContrato

RepositorioProyecto

RepositorioContacto

RepositorioUsuario

RepositorioAgencia

Utilizando Supabase.

---

# Exclusiones

NO implementar:

Login

Pantallas

React Query

Zustand

Offline

Geolocalización

Clientes

CRUD

Pagos

Contratos

IA

Dashboard

Casos de Uso

No escribir lógica del negocio.

---

# Archivos que deberán crearse

```
supabase/

config.toml

migrations/

seed.sql

policies/

functions/

src/infrastructure/persistencia/

supabase/

clientes/

usuarios/

pagos/

contratos/

proyectos/

branding/

```

---

# Archivos que podrán modificarse

.env.example

package.json

src/infrastructure/

src/domain/

src/application/

---

# Testing

Crear pruebas para:

Migraciones

Repositorios

Relaciones

RLS

Seeds

Soft Delete

---

# Criterios de aceptación

Este Sprint estará terminado cuando:

✓ Todas las tablas existan.

✓ Todas las relaciones existan.

✓ Todas las migraciones funcionen.

✓ RLS esté activo.

✓ Existan Seeds.

✓ Los repositorios funcionen.

✓ No existan datos duplicados.

✓ Se cumpla 3FN.

✓ Todas las tablas soporten auditoría.

✓ Todas las tablas soporten Soft Delete.

---

# Definition of Done

☐ Todas las migraciones ejecutan correctamente.

☐ No existen tablas sin auditoría.

☐ No existen tablas sin Soft Delete.

☐ Todas las relaciones utilizan Foreign Keys.

☐ Todos los UUID funcionan correctamente.

☐ RLS habilitado.

☐ Seeds funcionando.

☐ Repositories compilando.

☐ Sin errores TypeScript.

☐ Sin uso de any.

☐ Sin dependencias circulares.

☐ Documentación actualizada.

---

# Entregables

Al finalizar este Sprint existirá una Base de Datos completamente preparada para comenzar el desarrollo funcional de MateCode.

Toda la infraestructura de persistencia quedará desacoplada mediante Repositories y preparada para crecer durante muchos años.

---

# Notas para la IA

- No crear pantallas.
- No implementar lógica de negocio.
- No crear casos de uso.
- Priorizar una estructura de datos sólida sobre la velocidad de desarrollo.
- Todas las tablas deben seguir estrictamente las reglas definidas en `07-BASE_DATOS.md` y `07.1-MODELO-RELACIONAL.md`.
- Toda decisión debe favorecer la escalabilidad, la mantenibilidad y la independencia entre módulos.
