# Sprint 03 - Identidad, Seguridad y Control de Acceso

Versión: 1.0

Estado: Pendiente

Prioridad: Crítica

Tiempo estimado: 1 Sprint

---

# Objetivo

Implementar el sistema completo de autenticación, autorización y gestión de sesiones de MateCode.

Al finalizar este Sprint existirá un sistema seguro de acceso que permitirá identificar usuarios, administrar sesiones, gestionar permisos y proteger la información de cada agencia.

Este Sprint no implementa funcionalidades del negocio.

Su objetivo es garantizar que todos los módulos futuros trabajen sobre una base de seguridad sólida.

---

# Dependencias

Debe estar finalizado:

✅ Sprint 00

✅ Sprint 01

✅ Sprint 02

---

# Resultado esperado

Al finalizar este Sprint deberá existir:

✅ Login

✅ Logout

✅ Recuperación de contraseña

✅ Persistencia de sesión

✅ Renovación automática de sesión

✅ Protección de rutas

✅ Roles

✅ Permisos

✅ Middleware de autenticación

✅ Middleware de autorización

✅ Gestión del usuario autenticado

✅ Gestión de la agencia activa

---

# Objetivos Técnicos

La autenticación deberá utilizar Supabase Auth.

La autorización deberá implementarse mediante Roles y Permisos propios del sistema.

Nunca depender únicamente de Supabase para controlar permisos.

---

# Funcionalidades

## Inicio de sesión

El usuario podrá iniciar sesión mediante:

Correo electrónico

Contraseña

No se permitirá autenticación mediante usuario.

---

## Cerrar sesión

Cerrar la sesión actual.

Eliminar datos sensibles del almacenamiento local.

Redirigir al Login.

---

## Recuperar contraseña

Enviar correo de recuperación.

Permitir cambiar la contraseña mediante enlace seguro.

---

## Mantener sesión iniciada

El sistema deberá mantener la sesión activa durante:

60 minutos de inactividad.

Cinco minutos antes del vencimiento deberá mostrar un aviso.

Ejemplo:

"Tu sesión está por finalizar."

Botones:

Seguir trabajando

Cerrar sesión

---

## Renovación automática

Si el usuario continúa trabajando, la sesión deberá renovarse automáticamente.

El usuario no deberá volver a iniciar sesión innecesariamente.

---

## Agencia activa

Un usuario podrá pertenecer a varias agencias (preparado para futuras versiones).

Por el momento deberá existir una única agencia activa.

Toda consulta utilizará esa agencia.

---

## Usuario autenticado

Crear un contexto global con:

ID

Nombre

Correo

Rol

Permisos

Agencia

Avatar

Estado

---

## Roles

Implementar la infraestructura para:

Administrador

Gerente

Vendedor

Diseñador

Desarrollador

Invitado

Los nombres podrán modificarse posteriormente desde la configuración.

---

## Permisos

Los permisos deberán ser independientes del rol.

Ejemplos:

Crear clientes

Editar clientes

Eliminar clientes

Ver pagos

Editar pagos

Crear contratos

Exportar PDF

Administrar usuarios

Configurar agencia

Los roles únicamente agrupan permisos.

---

## Protección de rutas

Toda pantalla privada deberá estar protegida.

No deberá poder accederse escribiendo la URL.

---

## Middleware

Implementar middleware para:

Autenticación

Autorización

Sesión

Agencia activa

---

## Guards

Crear Guards reutilizables.

Ejemplo:

RequiereAutenticacion

RequierePermiso

RequiereRol

---

# Tareas

## 1. Configurar Supabase Auth

Inicializar cliente.

Configurar Server Client.

Configurar Browser Client.

Preparar Cookies.

---

## 2. Implementar Login

Pantalla limpia.

Minimalista.

Con:

Correo

Contraseña

Recordarme

Olvidé mi contraseña

Iniciar sesión

---

## 3. Implementar Logout

Cerrar sesión correctamente.

Eliminar caché.

Eliminar datos sensibles.

---

## 4. Implementar recuperación de contraseña

Crear flujo completo.

---

## 5. Crear Middleware

Middleware.ts

Validar:

Sesión.

Usuario.

Agencia.

Permisos.

---

## 6. Crear Contexto Global

Usuario autenticado.

Sesión.

Permisos.

Agencia.

Estado Online.

---

## 7. Implementar Roles

Preparar infraestructura.

No hardcodear permisos.

---

## 8. Implementar Permisos

Basados en Base de Datos.

No en constantes.

---

## 9. Crear Hooks

useSesion()

useUsuario()

usePermisos()

useRol()

useAgencia()

---

## 10. Implementar protección de Layouts

Todo Layout privado deberá validar autenticación.

---

## 11. Implementar manejo de errores

Errores esperados:

Credenciales incorrectas.

Usuario inexistente.

Cuenta deshabilitada.

Sesión vencida.

Permisos insuficientes.

Error de conexión.

Cada error deberá mostrar mensajes claros y orientados al usuario.

---

## 12. Logs

Registrar:

Inicio de sesión.

Cierre de sesión.

Intentos fallidos.

Cambio de contraseña.

Recuperación.

Renovación de sesión.

---

# Exclusiones

No implementar:

Clientes

CRM

Pagos

Contratos

Dashboard

Offline

IA

Logística

React Query

Zustand

Módulos del negocio

---

# Archivos que deberán crearse

```text
src/

application/

casos-de-uso/

autenticacion/

domain/

entidades/

usuario/

rol/

permiso/

infrastructure/

auth/

middleware/

presentation/

paginas/

login/

recuperar-password/

components/

auth/

hooks/

use-sesion.ts

use-usuario.ts

use-permisos.ts

use-rol.ts

providers/

AuthProvider.tsx

middleware.ts
```

---

# Archivos que podrán modificarse

.env.example

package.json

middleware.ts

src/infrastructure/

src/presentation/

---

# Testing

Crear pruebas para:

Login

Logout

Permisos

Roles

Middleware

Sesión

Recuperación

Protección de rutas

---

# UX/UI

El Login deberá seguir el Design System.

Características:

Pantalla limpia.

Fondo oscuro.

Logo MateCode.

Frase:

"Tomate un mate mientras la IA escribe el código."

Formulario simple.

Máximo dos campos visibles.

Mensajes claros.

Nunca mostrar errores técnicos.

---

# Seguridad

Nunca guardar contraseñas.

Nunca almacenar Tokens manualmente.

Utilizar únicamente Supabase Auth.

Validar permisos tanto en Cliente como en Servidor.

Nunca confiar únicamente en el Frontend.

---

# Criterios de aceptación

El Sprint estará terminado únicamente si:

✓ Login funciona.

✓ Logout funciona.

✓ Recuperación funciona.

✓ Middleware protege rutas.

✓ Roles funcionan.

✓ Permisos funcionan.

✓ Sesión persiste.

✓ Renovación automática funciona.

✓ Logs funcionan.

✓ Usuario autenticado disponible globalmente.

✓ Agencia activa disponible.

---

# Definition of Done

☐ Sin errores TypeScript.

☐ Sin errores ESLint.

☐ Sin uso de any.

☐ Middleware funcionando.

☐ Login protegido.

☐ Logout protegido.

☐ Recuperación funcionando.

☐ Roles desacoplados.

☐ Permisos desacoplados.

☐ Código documentado.

☐ Tests aprobados.

☐ Responsive.

☐ Accesible.

---

# Entregables

Al finalizar este Sprint existirá un sistema completo de autenticación y autorización preparado para soportar todos los módulos de MateCode.

Toda funcionalidad futura podrá validar identidad, permisos y agencia activa utilizando la infraestructura creada en este Sprint.

---

# Notas para la IA

- No implementar lógica del negocio.
- No crear usuarios mockeados en producción.
- Toda autorización deberá basarse en permisos, no en nombres de roles.
- Mantener la autenticación desacoplada del resto de los módulos.
- Preparar la infraestructura para soportar múltiples agencias por usuario en futuras versiones.
- Toda pantalla privada deberá estar protegida desde el primer momento.
