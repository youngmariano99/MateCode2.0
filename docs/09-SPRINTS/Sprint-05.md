# Sprint 05 - Infraestructura Frontend y Estado Global

Versión: 1.0

Estado: Pendiente

Prioridad: Muy Alta

Tiempo estimado: 1 Sprint

---

# Objetivo

Construir toda la infraestructura del Frontend que utilizarán los módulos funcionales de MateCode.

Este Sprint implementa el manejo de datos, estado global, formularios, validaciones, comunicación con el backend y herramientas reutilizables.

No desarrolla funcionalidades del negocio.

Su objetivo es que los próximos Sprints únicamente deban preocuparse por las reglas de negocio.

---

# Dependencias

Debe estar finalizado:

✅ Sprint 00

✅ Sprint 01

✅ Sprint 02

✅ Sprint 03

✅ Sprint 04

---

# Resultado esperado

Al finalizar este Sprint deberá existir:

✅ React Query configurado

✅ Zustand configurado

✅ Cliente HTTP

✅ Sistema de Caché

✅ Sistema Global de Errores

✅ Sistema Global de Loading

✅ Formularios reutilizables

✅ Validaciones centralizadas

✅ Uploads preparados

✅ Confirmaciones reutilizables

✅ Hooks reutilizables

✅ Providers globales

✅ Manejo uniforme de respuestas

---

# Filosofía

Toda pantalla futura deberá consumir esta infraestructura.

Nunca realizar llamadas HTTP directamente desde componentes.

Nunca manejar estados de carga manualmente.

Nunca duplicar lógica de formularios.

Nunca duplicar validaciones.

---

# Tareas

## 1. Configurar TanStack Query

Implementar:

QueryClient

QueryProvider

Persistencia de caché (preparado)

DevTools únicamente en desarrollo

Configuración global de:

Retry

Cache

Stale Time

Garbage Collection

---

## 2. Configurar Zustand

Crear Stores independientes.

No crear un Store gigante.

Ejemplos.

SesionStore

ConfiguracionStore

SidebarStore

TemaStore

ConexionStore

ToastStore

---

## 3. Cliente HTTP

Crear una única puerta de acceso para llamadas al backend.

Debe soportar:

GET

POST

PUT

PATCH

DELETE

Timeout

Reintentos

Interceptores

Cancelación

Manejo de errores

Nunca consumir fetch directamente desde componentes.

---

## 4. Manejo Global de Errores

Centralizar todos los errores.

Convertir errores técnicos en mensajes entendibles.

Ejemplos.

"No pudimos guardar los cambios."

"No hay conexión a Internet."

"No tenés permisos para realizar esta acción."

Nunca mostrar mensajes técnicos al usuario.

---

## 5. Sistema Global de Loading

Crear componentes para:

Loading de pantalla

Loading de botón

Loading de tabla

Loading de formulario

Loading de búsqueda

Todos reutilizables.

---

## 6. Formularios

Integrar:

React Hook Form

Zod

Todos los formularios deberán utilizar esta infraestructura.

No crear validaciones manuales.

---

## 7. Validaciones

Centralizar todas las validaciones reutilizables.

Ejemplos.

Correo

Teléfono

CUIT

Dinero

Fechas

URLs

Contraseñas

Markdown

Coordenadas

---

## 8. Sistema de Confirmaciones

Crear diálogos reutilizables para:

Eliminar

Guardar

Cancelar

Salir sin guardar

Acciones peligrosas

No utilizar window.confirm().

---

## 9. Sistema de Uploads

Preparar infraestructura para:

Imágenes

PDF

Logos

Documentos

No implementar almacenamiento definitivo.

Sólo la infraestructura.

---

## 10. Sistema de Descargas

Preparar:

PDF

CSV

Excel

Markdown

No implementar exportaciones reales.

---

## 11. Sistema de Notificaciones

Crear un servicio reutilizable para:

Toast

Banner

Alertas

Mensajes persistentes

Notificaciones del sistema

---

## 12. Sistema de Búsqueda

Crear infraestructura reutilizable.

Debe soportar:

Búsqueda local

Búsqueda remota

Debounce

Historial

Resultados vacíos

Preparado para IA.

---

## 13. Hooks reutilizables

Crear:

useFetch()

useMutation()

useDebounce()

useLoading()

useOnline()

useConfirmacion()

useToast()

useBusqueda()

useFiltros()

usePaginacion()

useModal()

Todos deberán ser genéricos.

---

## 14. Helpers

Crear helpers para:

Fechas

Dinero

Texto

Archivos

Markdown

URLs

Teléfonos

Geolocalización (estructura únicamente)

---

## 15. Sistema de Caché

Toda consulta deberá pasar por un sistema unificado.

Preparar para funcionamiento Offline.

No implementar sincronización todavía.

---

## 16. Manejo de Estados

Crear una infraestructura para representar de forma uniforme:

Cargando

Éxito

Error

Vacío

Sin conexión

Permisos insuficientes

Todos los módulos deberán utilizar estos estados.

---

## 17. Cliente de Casos de Uso

Crear una capa que conecte el Frontend con los Casos de Uso del dominio.

Los componentes nunca deberán conocer la infraestructura de persistencia.

---

## 18. Sistema de Configuración Global

Crear un proveedor para:

Idioma

Formato de fecha

Formato monetario

Zona horaria

Preferencias de usuario

---

## 19. Gestión de Archivos Temporales

Preparar infraestructura para:

Previsualización

Cancelación

Reintentos

Limpieza automática

---

## 20. Instrumentación

Preparar puntos de extensión para:

Analytics

Métricas

Performance

Monitoreo

Sin integrar servicios externos todavía.

---

# Componentes técnicos obligatorios

Al finalizar este Sprint deberán existir:

QueryProvider

StoreProvider

HttpClient

ApiResponse

ApiError

ErrorMapper

LoadingProvider

NotificationService

ConfirmDialogService

UploadService

DownloadService

ValidationService

CacheService

SearchService

StorageService

PreferencesService

---

# Archivos que deberán crearse

```text
src/

application/

servicios/

http/

cache/

uploads/

downloads/

presentation/

providers/

QueryProvider.tsx

StoreProvider.tsx

LoadingProvider.tsx

NotificationProvider.tsx

stores/

sesion.store.ts

tema.store.ts

sidebar.store.ts

conexion.store.ts

configuracion.store.ts

hooks/

useFetch.ts

useMutation.ts

useLoading.ts

useBusqueda.ts

useToast.ts

useConfirmacion.ts

useOnline.ts

useFiltros.ts

usePaginacion.ts

services/

http-client.ts

notification.service.ts

upload.service.ts

download.service.ts

cache.service.ts

validation.service.ts

helpers/

formatters/

validators/

mappers/

```

---

# Archivos que podrán modificarse

package.json

src/application/

src/presentation/

src/shared/

---

# Dependencias a instalar

TanStack Query

Zustand

React Hook Form

Zod

Axios (o cliente HTTP definido por la arquitectura)

React Dropzone

date-fns

---

# Testing

Crear pruebas para:

Cliente HTTP

Stores

Hooks

Validaciones

Uploads

Sistema de caché

Confirmaciones

Notificaciones

Manejo de errores

---

# UX/UI

Toda operación deberá comunicar claramente su estado.

El usuario siempre debe saber:

Qué está ocurriendo.

Qué terminó correctamente.

Qué falló.

Cómo solucionarlo.

Nunca dejar al usuario esperando sin información.

---

# Seguridad

Nunca almacenar información sensible en Zustand.

Nunca persistir Tokens manualmente.

Nunca exponer errores internos.

Sanitizar toda entrada del usuario.

---

# Rendimiento

Minimizar renders.

Evitar consultas duplicadas.

Implementar caché inteligente.

Preparar lazy loading.

Preparar code splitting.

---

# Criterios de aceptación

El Sprint estará terminado únicamente si:

✓ Existe una única forma de consumir datos.

✓ Todos los formularios utilizan la misma infraestructura.

✓ Las validaciones están centralizadas.

✓ El manejo de errores está unificado.

✓ Los estados de carga son consistentes.

✓ Las notificaciones son reutilizables.

✓ El sistema está preparado para Offline.

✓ Ningún componente consume datos directamente.

---

# Definition of Done

☐ Sin errores TypeScript.

☐ Sin errores ESLint.

☐ Sin uso de any.

☐ Hooks reutilizables.

☐ Stores desacoplados.

☐ Cliente HTTP funcionando.

☐ React Query configurado.

☐ Zustand configurado.

☐ Formularios integrados.

☐ Validaciones centralizadas.

☐ Tests aprobados.

☐ Documentación actualizada.

---

# Entregables

Al finalizar este Sprint deberá existir una infraestructura de Frontend completamente funcional, reutilizable y desacoplada.

Todos los módulos futuros deberán consumir esta infraestructura sin implementar soluciones propias para manejo de datos, formularios o estado.

---

# Notas para la IA

- No implementar reglas de negocio.
- No crear lógica específica para Clientes, Pagos o Contratos.
- Toda la infraestructura debe ser genérica y reutilizable.
- Mantener una separación estricta entre la presentación, la lógica de aplicación y la infraestructura.
- Toda decisión debe favorecer la escalabilidad, la mantenibilidad y el funcionamiento Offline First que se implementará en el Sprint 06.
