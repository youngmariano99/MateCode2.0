# Estándares de Desarrollo

Versión: 2.0

> "El código debe ser tan simple que otro desarrollador pueda entenderlo en cinco minutos."

---

# Objetivo

Este documento define las reglas obligatorias para el desarrollo de MateCode.

No son recomendaciones.

Son reglas.

Toda implementación deberá respetarlas.

Si una funcionalidad entra en conflicto con estas reglas, deberá replantearse antes de implementarse.

---

# Filosofía

MateCode prioriza:

- Simplicidad
- Legibilidad
- Escalabilidad
- Mantenibilidad
- Bajo acoplamiento
- Tipado fuerte

Nunca se priorizará escribir menos código si eso reduce la claridad.

El código se escribe para personas.

No para computadoras.

---

# Convenciones de Idioma

Todo el proyecto deberá escribirse en español latinoamericano.

Esto incluye:

- Carpetas
- Archivos
- Variables
- Funciones
- Interfaces
- Tipos
- Clases
- Casos de uso
- Tablas
- Columnas
- Eventos
- Mensajes
- Logs

Nunca mezclar idiomas.

Incorrecto

clientesRepository.ts

Correcto

cliente.repository.ts

---

Incorrecto

createClient()

Correcto

crearCliente()

---

# Convenciones de Archivos

Los archivos utilizarán siempre kebab-case.

Ejemplos:

crear-cliente.use-case.ts

cliente.repository.ts

cliente.entity.ts

editar-cliente-form.tsx

Nunca utilizar:

camelCase

PascalCase

snake_case

para nombres de archivos.

---

# Convenciones de Componentes

Los componentes React utilizarán PascalCase.

Ejemplos:

ClienteCard.tsx

FormularioCliente.tsx

TablaPagos.tsx

Sidebar.tsx

Header.tsx

---

# Convenciones de Funciones

Las funciones deberán comenzar con un verbo.

Ejemplos:

crearCliente()

editarCliente()

buscarClientes()

guardarContrato()

registrarPago()

calcularLogistica()

Nunca utilizar nombres ambiguos.

Incorrecto

data()

item()

test()

aux()

temp()

---

# Convenciones de Variables

Las variables deberán explicar exactamente qué contienen.

Incorrecto

a

b

tmp

x

lista

datos

Correcto

clientesFiltrados

proximoPago

estadoCliente

cantidadClientes

---

# Convenciones de Interfaces

Siempre utilizar nombres descriptivos.

Ejemplos:

ClienteRepository

ServicioGeolocalizacion

ProveedorIA

Nunca:

ICliente

IRepository

IData

---

# Tipado

Todo deberá estar tipado.

Queda prohibido:

any

unknown innecesario

castings forzados

@ts-ignore

El tipado deberá explicar el dominio.

---

# Tamaño de Archivos

Máximo recomendado:

500 líneas.

Si un archivo supera ese tamaño deberá dividirse.

---

# Tamaño de Componentes

Un componente debe representar una única responsabilidad.

Nunca crear componentes gigantes.

Ejemplo:

ClienteCard

FormularioCliente

TablaClientes

Cada uno separado.

---

# Casos de Uso

Cada caso de uso tendrá un único objetivo.

Ejemplo:

Crear Cliente

Editar Cliente

Eliminar Cliente

Buscar Cliente

No combinar múltiples acciones.

Incorrecto

gestionarCliente()

Correcto

crearCliente()

editarCliente()

---

# Hooks

Cada Hook deberá resolver un único problema.

Incorrecto

useClientes()

Que:

consulta

guarda

edita

borra

filtra

exporta

Correcto

useBuscarClientes()

useCrearCliente()

useEditarCliente()

---

# Responsabilidad Única

Cada archivo deberá responder una única pregunta.

Ejemplo.

¿Qué hace este archivo?

Si la respuesta tiene más de una acción.

Debe dividirse.

---

# Código Duplicado

Queda prohibido duplicar lógica.

Toda lógica repetida deberá abstraerse.

---

# Imports

Orden obligatorio.

1

React

2

Next

3

Librerías externas

4

Shared

5

Application

6

Domain

7

Infrastructure

8

Componentes locales

9

Estilos

Siempre mantener el mismo orden.

---

# Errores

Nunca lanzar errores genéricos.

Incorrecto

throw new Error()

Correcto

throw new ClienteNoEncontradoError()

---

# Logs

Todo evento importante deberá registrarse.

Niveles permitidos:

INFO

WARNING

ERROR

BUG

Nunca utilizar console.log en producción.

---

# Comentarios

Los comentarios deberán explicar el por qué.

Nunca el qué.

Incorrecto

// Incrementa uno

contador++

Correcto

// Se incrementa para mantener la numeración consecutiva de pagos

contador++

---

# DRY

No repetir código.

Si una lógica aparece dos veces.

Probablemente deba abstraerse.

---

# KISS

Siempre elegir la solución más simple.

Evitar patrones innecesarios.

---

# YAGNI

No implementar funcionalidades "por si acaso".

Sólo desarrollar lo que el negocio necesita.

---

# SOLID

Todo el proyecto deberá respetar:

Responsabilidad Única

Abierto/Cerrado

Sustitución de Liskov

Segregación de Interfaces

Inversión de Dependencias

---

# Arquitectura

Nunca romper Clean Architecture.

Nunca acceder a Supabase desde React.

Nunca acceder a PostgreSQL desde un componente.

Nunca colocar lógica del negocio en Presentation.

---

# Testing

Toda funcionalidad importante deberá incluir:

Prueba unitaria

Prueba de integración

Datos mock

La IA deberá generar automáticamente datos de prueba.

---

# Accesibilidad

Todo componente deberá ser accesible.

Uso mediante teclado.

Focus visible.

Contraste suficiente.

ARIA cuando corresponda.

---

# Performance

Evitar renders innecesarios.

Evitar consultas duplicadas.

Evitar estados innecesarios.

Lazy Loading cuando sea posible.

Memoización sólo cuando aporte un beneficio real.

---

# Seguridad

Nunca almacenar credenciales.

Nunca escribir secretos en el código.

Nunca confiar en datos del cliente.

Toda entrada deberá validarse.

---

# Base de Datos

Toda tabla deberá cumplir Tercera Forma Normal (3FN).

No duplicar información.

Utilizar claves foráneas.

Mantener integridad referencial.

---

# Git

Commits pequeños.

Commits descriptivos.

Ejemplos:

feat(clientes): agregar creación de clientes

fix(pagos): corregir cálculo de próximo vencimiento

refactor(contactos): separar caso de uso

Nunca:

update

changes

fix

test

---

# Pull Requests

Toda funcionalidad deberá cumplir:

Código limpio.

Sin errores de lint.

Sin errores de TypeScript.

Tests aprobados.

Documentación actualizada.

---

# Checklist Obligatorio

Antes de finalizar cualquier Sprint, la IA deberá verificar:

☐ Respeta Clean Architecture.

☐ No utiliza any.

☐ No existen archivos mayores a 500 líneas.

☐ No existe código duplicado.

☐ Todos los nombres están en español.

☐ Se agregaron pruebas.

☐ Se actualizaron los tipos.

☐ Se respetó el Design System.

☐ Se respetó UX/UI.

☐ Funciona en móvil.

☐ Funciona offline.

☐ Se registran logs.

☐ No existen credenciales expuestas.

☐ Todos los casos de uso son independientes.

☐ La funcionalidad está documentada.

---

# Definición de Terminado (Definition of Done)

Una funcionalidad sólo podrá considerarse terminada cuando:

- Cumpla con todos los estándares definidos en este documento.
- Respete la arquitectura del proyecto.
- Sea completamente funcional en escritorio y móvil.
- Funcione correctamente en modo offline.
- Incluya pruebas automatizadas.
- No presente errores de TypeScript.
- No presente errores de ESLint.
- Esté documentada.
- Sea consistente con el Design System y la UX de MateCode.
- Pueda ser mantenida fácilmente por cualquier desarrollador.

Una funcionalidad que sólo "funciona" no está terminada.

Una funcionalidad está terminada cuando además es simple, mantenible, consistente y preparada para crecer.
