# Base de Datos

Versión: 2.0

> "La base de datos es la memoria de MateCode. Debe ser consistente, escalable y preparada para crecer durante muchos años."

---

# Objetivo

Este documento define las reglas generales que deberá cumplir la base de datos de MateCode.

No describe tablas individuales.

Define la filosofía, convenciones y principios que deberán respetar todas las tablas presentes y futuras.

Toda nueva entidad deberá cumplir estas reglas.

---

# Objetivos de la Base de Datos

La base de datos deberá ser:

- Escalable
- Altamente normalizada
- Fácil de mantener
- Preparada para Offline First
- Preparada para IA
- Preparada para Automatizaciones
- Multi Agencia
- Multi Usuario
- Auditada
- Segura

El objetivo principal es que cualquier módulo futuro pueda incorporarse sin modificar la estructura existente.

---

# Motor

Proveedor:

Supabase

Motor:

PostgreSQL

Versión recomendada:

La versión estable más reciente compatible con Supabase.

---

# Filosofía

La Base de Datos representa únicamente información.

Nunca deberá contener lógica del negocio.

Las reglas de negocio pertenecen al Dominio.

Las tablas únicamente almacenan datos.

---

# Normalización

Toda la base deberá cumplir estrictamente con:

Tercera Forma Normal (3FN)

Objetivos:

- Eliminar redundancia.
- Evitar inconsistencias.
- Facilitar el mantenimiento.
- Reducir duplicidad.

No se aceptarán estructuras desnormalizadas salvo que exista una justificación documentada por motivos de rendimiento.

---

# Convenciones

## Idioma

Toda la base de datos utilizará español latinoamericano.

Nunca mezclar idiomas.

---

## Tablas

Siempre:

Plural

snake_case

Ejemplos

clientes

pagos

contratos

usuarios

agencias

historial

Nunca:

Clients

tbl_clientes

Cliente

CLIENTES

---

## Columnas

Siempre:

snake_case

Ejemplos

nombre_negocio

estado_cliente_id

proximo_pago

fecha_creacion

Nunca:

NombreNegocio

EstadoCliente

fechaCreacion

---

# Claves Primarias

Todas las tablas utilizarán:

UUID v7

Nunca utilizar IDs autoincrementales.

Motivos:

- Mejor sincronización offline.
- Mayor seguridad.
- Escalabilidad.
- Compatibilidad con Supabase.

---

# Claves Foráneas

Toda relación deberá utilizar Foreign Keys.

Nunca almacenar información duplicada.

Incorrecto

Cliente

Ciudad

Provincia

País

Correcto

cliente

↓

direccion

↓

ciudad

↓

provincia

↓

pais

---

# Auditoría

Todas las tablas deberán incluir:

id

creado_en

actualizado_en

eliminado_en

creado_por

actualizado_por

eliminado_por

Esto permitirá conocer:

Quién creó.

Quién modificó.

Quién eliminó.

Cuándo ocurrió.

---

# Soft Delete

Queda prohibido eliminar registros físicamente.

Todo registro deberá utilizar:

eliminado_en

eliminado_por

La eliminación física sólo podrá realizarse mediante procesos administrativos específicos.

---

# Relaciones

Siempre deberán utilizarse relaciones explícitas.

No almacenar listas dentro de una columna.

Incorrecto

telefonos

"2922...,2923..."

Correcto

contactos

↓

telefonos

---

# Catálogos

Toda información reutilizable deberá vivir en tablas independientes.

Ejemplos:

estados_cliente

tipos_agencia

tipos_pago

tipos_software

rubros

etiquetas

formas_pago

Esto permitirá ampliar el sistema sin modificar código.

---

# Historial Universal

MateCode contará con una tabla única de historial.

Todo cambio importante deberá registrarse.

Ejemplos:

Cliente creado.

Cliente editado.

Contrato firmado.

Pago registrado.

Proyecto iniciado.

Configuración modificada.

La aplicación nunca deberá perder trazabilidad.

---

# Actividad

Además del historial técnico existirá una tabla de actividad.

Su objetivo será mostrar al usuario qué ocurrió.

Ejemplos:

Kevin creó un cliente.

Mariano registró un pago.

Lucas editó un contrato.

Esta tabla alimentará el Inicio de MateCode.

---

# Offline First

La estructura deberá permitir:

Crear registros localmente.

Editar registros.

Eliminar registros.

Sincronizar posteriormente.

Todas las tablas deberán estar preparadas para resolver conflictos de sincronización.

---

# Integridad Referencial

No deberán existir registros huérfanos.

Toda relación deberá mantenerse consistente.

Se utilizarán:

FOREIGN KEY

ON UPDATE

ON DELETE

según corresponda.

---

# Índices

Toda tabla deberá contar únicamente con índices realmente necesarios.

Prioridad:

Claves primarias.

Claves foráneas.

Campos de búsqueda frecuente.

Campos utilizados en filtros.

Evitar índices innecesarios.

---

# Seguridad

Toda tabla deberá implementar políticas RLS (Row Level Security).

Los usuarios únicamente podrán acceder a la información perteneciente a su agencia.

Nunca permitir acceso cruzado entre agencias.

Toda consulta deberá respetar el aislamiento por agencia.

---

# Multi Agencia

MateCode será Multi Tenant.

Toda información pertenecerá a una Agencia.

Toda tabla funcional deberá incluir:

agencia_id

Esto permitirá que múltiples agencias compartan la misma infraestructura sin acceder a los datos de otras.

---

# Multi Usuario

Un registro podrá ser creado por cualquier miembro autorizado.

Las relaciones entre usuarios y registros deberán mantenerse mediante claves foráneas.

Nunca almacenar información redundante del usuario.

---

# Preparada para IA

La estructura deberá permitir registrar:

- conversaciones
- prompts
- respuestas
- análisis
- sugerencias
- automatizaciones futuras

Sin modificar el núcleo de la base.

---

# Preparada para Automatizaciones

Toda entidad importante deberá poder generar eventos.

Ejemplos:

Cliente creado.

Pago vencido.

Contrato firmado.

Proyecto terminado.

La base deberá facilitar futuras automatizaciones.

---

# Convención de Fechas

Todas las fechas deberán almacenarse en UTC.

La conversión horaria será responsabilidad de la aplicación.

---

# Tipos de Datos

Utilizar el tipo más específico posible.

Ejemplos:

UUID

BOOLEAN

DATE

TIMESTAMP

TEXT

INTEGER

NUMERIC

JSONB únicamente cuando exista una justificación clara.

Nunca utilizar TEXT para almacenar estructuras complejas que puedan modelarse relacionalmente.

---

# Datos Duplicados

Queda prohibido duplicar información.

Toda información deberá tener una única fuente de verdad.

Si un dato puede obtenerse mediante una relación, no deberá almacenarse nuevamente.

---

# Migraciones

Toda modificación estructural deberá realizarse mediante migraciones versionadas.

Nunca modificar tablas manualmente en producción.

---

# Seeds

El proyecto deberá incluir datos iniciales para facilitar el desarrollo.

Ejemplos:

Estados de clientes.

Tipos de agencias.

Rubros.

Tipos de software.

Formas de pago.

Roles.

Permisos.

Estos datos deberán poder regenerarse automáticamente.

---

# Backup

La estrategia de respaldo será responsabilidad de Supabase.

No obstante, la estructura deberá facilitar exportaciones futuras.

---

# Escalabilidad

La base deberá permitir agregar nuevos módulos sin modificar tablas existentes.

Siempre que sea posible, la ampliación deberá realizarse mediante nuevas entidades y relaciones.

---

# Prohibiciones

Queda prohibido:

- IDs autoincrementales.
- Datos duplicados.
- Columnas ambiguas.
- Campos genéricos como dato1, dato2.
- Relaciones implícitas.
- Lógica de negocio en la base.
- Eliminación física de registros.
- JSONB como reemplazo de un modelo relacional.
- Saltarse la 3FN por comodidad.

---

# Regla de Oro

Antes de crear una nueva tabla, la IA deberá responder:

1. ¿Cumple la Tercera Forma Normal?
2. ¿La información ya existe en otra tabla?
3. ¿Está preparada para crecer?
4. ¿Respeta las convenciones?
5. ¿Es compatible con Offline First?
6. ¿Es compatible con Multi Agencia?
7. ¿Incluye auditoría?
8. ¿Incluye Soft Delete?
9. ¿Puede utilizarse durante muchos años sin rediseñarse?

Si alguna respuesta es negativa, el diseño deberá replantearse.

---

# Objetivo Final

La base de datos de MateCode deberá convertirse en una plataforma sólida sobre la cual puedan construirse nuevos módulos durante años sin comprometer la consistencia, la seguridad ni el rendimiento.

El diseño de la base de datos siempre priorizará la claridad, la integridad y la escalabilidad por encima de soluciones rápidas o simplificaciones temporales.
