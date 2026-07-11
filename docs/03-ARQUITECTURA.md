# Arquitectura de Software

# Arquitectura

Versión: 2.0

---

# Objetivo

La arquitectura de MateCode tiene un único objetivo:

Construir un sistema que pueda mantenerse durante muchos años, crecer mediante módulos independientes y permitir reemplazar tecnologías sin modificar la lógica del negocio.

Toda decisión técnica deberá priorizar:

- Bajo acoplamiento.
- Alta cohesión.
- Escalabilidad.
- Testabilidad.
- Reutilización.
- Legibilidad.

La arquitectura tiene prioridad sobre la velocidad de desarrollo.

Nunca deberá romperse la arquitectura para implementar una funcionalidad rápidamente.

---

# Arquitectura General

MateCode implementará una variante de Clean Architecture.

El dominio será completamente independiente de cualquier tecnología.

La aplicación deberá poder migrar:

- Base de datos
- Framework
- Librería de mapas
- Sistema de autenticación
- Storage

sin modificar las reglas de negocio.

---

# Principio Fundamental

El Dominio nunca conoce la Infraestructura.

La Infraestructura siempre conoce al Dominio.

Nunca al revés.

---

# Capas

La aplicación estará dividida en cinco capas.

```

```

┌────────────────────────────┐
│ Presentation │
├────────────────────────────┤
│ Application │
├────────────────────────────┤
│ Domain │
├────────────────────────────┤
│ Infrastructure │
├────────────────────────────┤
│ Shared │
└────────────────────────────┘

```
Domain

Es el corazón de MateCode.

Aquí viven únicamente las reglas del negocio.

No conoce React.

No conoce Supabase.

No conoce PostgreSQL.

No conoce Tailwind.

No conoce NextJS.

No conoce APIs.

No conoce librerías.

Sólo conoce el negocio.

Ejemplos:

Cliente
Pago
Contrato
Proyecto
Contacto
Agencia
Equipo

domain/

clientes/

cliente.ts

cliente.repository.ts

cliente.errors.ts

cliente.rules.ts

pagos/

proyectos/

contratos/

...Nunca deberá existir código de infraestructura dentro del dominio.

Application

Contiene los Casos de Uso.

Aquí vive la lógica de la aplicación.

Ejemplos:

Crear Cliente

Editar Cliente

Eliminar Cliente

Buscar Cliente

Registrar Pago

Generar Contrato

Calcular Ruta

Todos los casos de uso deben ser independientes.

Un caso de uso nunca deberá depender de otro.

Ejemplo

application/

clientes/

crear-cliente/

crear-cliente.use-case.ts

editar-cliente/

buscar-cliente/

Infrastructure

Aquí viven las implementaciones concretas.

Ejemplos:

Supabase

PostgreSQL

Leaflet

OSRM

Storage

Servicios externos

Repositorios

Adapters

Nunca deberá existir lógica de negocio aquí.

Sólo implementación.

Ejemplo

infrastructure/

database/

supabase/

repositories/

clientes/

supabase-cliente.repository.ts

services/

maps/

storage/

logger/

Presentation

Todo lo relacionado con la interfaz.

Nunca deberá contener reglas de negocio.

Sólo presentación.

Incluye:

páginas
componentes
layouts
hooks visuales
formularios
tablas
modales

Ejemplo

presentation/

components/

pages/

layouts/

features/

clientes/

Shared

Contiene elementos reutilizables.

Ejemplos:

Constantes

Helpers

Tipos

Utilidades

Errores comunes

Configuraciones

Nunca lógica de negocio.

Flujo de dependencias

Siempre deberá cumplirse este flujo.

Presentation

↓

Application

↓

Domain

↑

Infrastructure


Presentation nunca accede directamente a Infrastructure.

Siempre deberá pasar por Application.

Patrones Obligatorios

MateCode implementará únicamente patrones realmente necesarios.

No utilizar patrones por moda.

Repository

Todo acceso a datos deberá realizarse mediante Repository.

Nunca acceder directamente a Supabase desde un componente.

Correcto

ClienteRepository

↓

Supabase

Incorrecto

Componente React

↓

Supabase
Adapter

Toda integración externa deberá pasar por un Adapter.

Ejemplos

Google

Leaflet

OpenStreetMap

Supabase

Storage

Mail

WhatsApp

Esto permitirá reemplazar proveedores fácilmente.

Strategy

Toda funcionalidad que pueda cambiar deberá utilizar Strategy.

Ejemplos

Mapas

Geocodificación

IA

Exportación

PDF

Storage

Correo

Nunca acoplar el dominio a un proveedor.

Singleton

Sólo podrá utilizarse para servicios globales.

Ejemplos

Logger

Configuración

Cache

Cliente Supabase

Nunca utilizar Singleton para lógica de negocio.

Factory

Cuando existan múltiples implementaciones.

Ejemplo

Proveedor IA

OpenAI

Claude

Gemini

Todos utilizando la misma interfaz.

Inyección de Dependencias

Queda prohibido crear dependencias manualmente dentro de los casos de uso.

Incorrecto

const repo = new SupabaseClienteRepository()

Correcto

constructor(
    private readonly clienteRepository: ClienteRepository
)

Toda dependencia deberá ingresar desde afuera.

Comunicación entre módulos

Los módulos nunca deberán acceder directamente entre sí.

Siempre deberán comunicarse mediante interfaces.

Incorrecto

Cliente

↓

Pago

↓

Proyecto

↓

Contrato


Correcto

ClienteRepository

↓

Caso de uso

↓

Interfaces

Organización por Feature

MateCode se organizará por funcionalidades.

Nunca por tipo de archivo.

Correcto

clientes/

contactos/

pagos/

contratos/


Incorrecto

components/

hooks/

pages/

utils/

models/


Cada módulo deberá contener todo lo necesario para funcionar.

Responsabilidad Única

Todo archivo deberá tener una única responsabilidad.

Reglas:

Máximo recomendado:

500 líneas.

Máximo recomendado:

Una clase por archivo.

Un componente por archivo.

Un hook por archivo.

Un caso de uso por archivo.

Eventos

Cuando un módulo necesite informar algo al resto de la aplicación deberá utilizar eventos.

Ejemplo

Cliente creado

↓

Crear historial

↓

Actualizar dashboard

↓

Mostrar notificación

↓

Registrar log

No llamar directamente a otros módulos.

Logs

Toda excepción deberá registrarse.

Niveles permitidos

INFO

WARNING

ERROR

BUG

Nunca utilizar console.log en producción.

Testing

Cada Caso de Uso deberá poder probarse de forma independiente.

El dominio deberá poder ejecutarse sin React.

Sin Next.

Sin Supabase.

Offline First

Toda escritura deberá pasar primero por la capa de Application.

Application decidirá:

Guardar localmente

o

Guardar en Supabase

La interfaz nunca deberá conocer esta diferencia.

Escalabilidad

Todo módulo nuevo deberá cumplir:

No modificar otros módulos.
No romper interfaces existentes.
No depender directamente de infraestructura.
Poder eliminarse sin afectar al resto.
Prohibiciones

Queda prohibido:

Componentes Dios.
Hooks gigantes.
Archivos de más de 500 líneas (salvo excepciones justificadas).
Lógica de negocio dentro de componentes React.
Acceso directo a Supabase desde la UI.
Consultas SQL dentro de componentes.
Uso de any.
Código duplicado.
Dependencias circulares.
Regla de Oro

Antes de implementar cualquier funcionalidad, la IA deberá validar internamente:

¿Respeta Clean Architecture?
¿El dominio sigue siendo independiente?
¿La infraestructura puede reemplazarse fácilmente?
¿El código puede probarse sin interfaz gráfica?
¿Se mantiene el bajo acoplamiento?
¿La nueva funcionalidad puede crecer sin reescribirse?

Si alguna respuesta es negativa, la implementación deberá replantearse.
```
