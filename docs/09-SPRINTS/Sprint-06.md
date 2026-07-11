# Sprint 06 - Motor Offline First y Sincronización Inteligente

Versión: 1.0

Estado: Pendiente

Prioridad: Crítica

Tiempo estimado: 2 Sprints

---

# Objetivo

Construir el motor Offline First de MateCode.

Este Sprint permitirá que toda la aplicación continúe funcionando aun cuando el dispositivo no tenga conexión a Internet.

El usuario deberá poder:

• Navegar.

• Buscar.

• Crear registros.

• Editar registros.

• Eliminar registros.

Todo funcionando sin conexión.

Cuando Internet vuelva, el sistema sincronizará automáticamente todos los cambios.

---

# Filosofía

La aplicación debe asumir siempre que Internet puede fallar.

Nunca depender de una conexión permanente.

Toda operación deberá ejecutarse primero de manera local.

Luego sincronizarse con el servidor.

No al revés.

---

# Dependencias

Debe estar terminado:

✅ Sprint 00

✅ Sprint 01

✅ Sprint 02

✅ Sprint 03

✅ Sprint 04

✅ Sprint 05

---

# Resultado esperado

Al finalizar este Sprint deberá existir:

✅ Aplicación instalable (PWA)

✅ Base local

✅ Sincronización automática

✅ Cola de eventos

✅ Resolución de conflictos

✅ Estado Online / Offline

✅ Indicadores visuales

✅ Reintentos automáticos

✅ Caché inteligente

✅ Descarga inicial

✅ Actualización automática

---

# Arquitectura

La sincronización deberá ser completamente desacoplada.

Los módulos del negocio nunca conocerán si los datos provienen de:

Servidor

Base Local

Cache

Toda esa lógica deberá vivir dentro del Motor Offline.

---

# Tecnologías

Dexie.js

IndexedDB

Service Worker

Background Sync

TanStack Query Persist

Workbox

---

# Tareas

## 1. Configurar PWA

La aplicación deberá poder instalarse.

Generar:

Manifest

Iconos

Splash Screen

Shortcuts

Theme Color

Offline Page

---

## 2. Service Worker

Implementar.

Debe manejar:

Assets

API

Fonts

Imágenes

Manifest

---

## 3. IndexedDB

Crear Base Local.

Preparar tablas para:

Clientes

Contactos

Contratos

Pagos

Configuración

Eventos

Logs

No guardar información sensible sin cifrar.

---

## 4. Dexie

Crear Adaptador.

Nunca utilizar IndexedDB directamente.

Toda consulta deberá pasar por un Repository.

---

## 5. Estado Online

Detectar automáticamente:

Online

Offline

Conectando

Sincronizando

Error

Mostrar siempre el estado.

---

## 6. Indicador Visual

Mostrar permanentemente.

Ejemplo:

🟢 Conectado

🟡 Sincronizando

🔴 Sin conexión

Nunca ocultarlo.

---

## 7. Cola de Eventos

Toda modificación deberá almacenarse.

Ejemplo.

Crear Cliente

↓

Editar Cliente

↓

Registrar Pago

↓

Crear Contrato

↓

Actualizar Cliente

Todo quedará pendiente hasta recuperar conexión.

---

## 8. Sincronización

Al recuperar Internet:

Enviar operaciones pendientes.

Actualizar información.

Descargar cambios.

Resolver conflictos.

Actualizar UI.

Todo automáticamente.

---

## 9. Resolución de Conflictos

Implementar estrategia.

Por defecto:

Última modificación gana.

Preparar para futuras estrategias.

Nunca perder información.

---

## 10. Motor de Caché

Toda consulta deberá pasar por Cache.

El usuario nunca deberá notar diferencia entre Online y Offline.

---

## 11. Descarga Inicial

La primera vez que inicia sesión.

Descargar:

Clientes

Contactos

Configuración

Branding

Catálogos

Permisos

Roles

Todo listo para trabajar.

---

## 12. Actualizaciones Incrementales

Nunca descargar toda la Base nuevamente.

Sólo descargar diferencias.

---

## 13. Logs

Registrar.

Inicio sincronización.

Fin sincronización.

Errores.

Conflictos.

Reintentos.

---

## 14. Reintentos

Si una sincronización falla.

Reintentar automáticamente.

Esperar:

5 segundos

15 segundos

30 segundos

60 segundos

120 segundos

---

## 15. Conflictos

Preparar infraestructura para.

Servidor cambió.

Usuario cambió.

Ambos modificaron.

Nunca bloquear al usuario.

---

## 16. Banner Offline

Cuando no exista conexión.

Mostrar.

Trabajando sin conexión.

Los cambios se sincronizarán automáticamente.

---

## 17. Actualización Automática

Detectar nuevas versiones.

Permitir actualizar.

Nunca interrumpir al usuario.

---

## 18. Limpieza

Eliminar:

Eventos sincronizados.

Cache vencido.

Archivos temporales.

---

## 19. Preparación para Logística

Guardar coordenadas localmente.

Permitir generar recorridos Offline.

La optimización podrá ejecutarse cuando vuelva Internet.

---

## 20. Preparación para IA

Toda conversación deberá quedar pendiente de sincronización.

Nunca perder mensajes.

---

# Componentes obligatorios

EstadoConexion

BannerOffline

SyncIndicator

ProgressSync

QueueViewer

ConflictDialog

OfflineBadge

---

# Archivos que deberán crearse

```text
src/

offline/

motor/

sincronizacion/

cache/

queue/

events/

indexeddb/

dexie/

service-worker/

pwa/

hooks/

useOnline.ts

useOffline.ts

useSync.ts

useQueue.ts

providers/

OfflineProvider.tsx

SyncProvider.tsx

services/

sync.service.ts

queue.service.ts

cache.service.ts

offline.service.ts

conflict.service.ts
```

---

# Dependencias

Dexie

dexie-react-hooks

workbox

next-pwa

idb

TanStack Query Persist

---

# Testing

Probar:

Sin Internet

Con Internet

Sincronización

Conflictos

Reintentos

Cache

Cola

Instalación PWA

Actualización

---

# UX

El usuario siempre deberá saber:

Estoy conectado.

Estoy sin conexión.

Estoy sincronizando.

Tengo cambios pendientes.

Nunca deberá preguntarse qué está ocurriendo.

---

# Seguridad

Nunca guardar Tokens en IndexedDB.

Nunca guardar contraseñas.

Cifrar información sensible.

Validar integridad de los datos sincronizados.

---

# Rendimiento

Nunca bloquear la UI.

Toda sincronización deberá ejecutarse en segundo plano.

La aplicación deberá seguir siendo fluida.

---

# Criterios de aceptación

✓ Funciona completamente Offline.

✓ Se sincroniza automáticamente.

✓ No pierde datos.

✓ Detecta conflictos.

✓ Es instalable.

✓ El usuario conoce el estado de conexión.

✓ No existen bloqueos.

✓ La sincronización es transparente.

---

# Definition of Done

☐ Aplicación instalable.

☐ Offline funcionando.

☐ Sincronización funcionando.

☐ Queue funcionando.

☐ Service Worker funcionando.

☐ IndexedDB funcionando.

☐ Dexie funcionando.

☐ Sin errores TypeScript.

☐ Sin uso de any.

☐ Tests aprobados.

☐ Documentación actualizada.

---

# Entregables

Al finalizar este Sprint, MateCode deberá comportarse como una aplicación profesional Offline First.

Todos los módulos futuros heredarán automáticamente esta capacidad sin necesidad de implementar lógica adicional.

---

# Notas para la IA

- Toda la sincronización debe ser transparente para el usuario.
- Ningún módulo del negocio debe conocer si los datos provienen del servidor o de la base local.
- El motor Offline debe ser completamente reutilizable y desacoplado.
- Preparar la infraestructura para soportar sincronización selectiva, resolución de conflictos configurable y crecimiento futuro sin modificar la arquitectura existente.
