# Sprint 12 - Inteligencia Territorial

Versión: 1.0

Estado: Pendiente

Prioridad: Muy Alta

Tiempo estimado: 3 Sprints

---

# Objetivo

Construir el módulo de Inteligencia Territorial de MateCode.

Este módulo permitirá organizar visitas comerciales utilizando geolocalización, optimización de recorridos y planificación inteligente.

El objetivo es minimizar el tiempo de viaje y maximizar la cantidad de clientes visitados.

Todo deberá integrarse automáticamente con el CRM.

---

# Dependencias

Debe estar finalizado:

✅ Sprint 00 al Sprint 11

---

# Filosofía

Una dirección no es solamente un dato.

Es un punto estratégico.

MateCode deberá ayudar al usuario a decidir:

• Qué clientes visitar.

• En qué orden.

• Cuánto demorará.

• Qué recorrido realizar.

• Qué negocios cercanos todavía no fueron contactados.

El sistema deberá pensar como un vendedor experimentado.

---

# Resultado esperado

Al finalizar este Sprint deberá existir:

✅ Geocodificación automática

✅ Mapa interactivo

✅ Agrupación por zonas

✅ Optimización de recorridos

✅ Agenda de visitas

✅ Historial de recorridos

✅ Sugerencias automáticas

✅ Detección de clientes cercanos

✅ Estadísticas territoriales

✅ Funciona Offline

---

# Módulos

## 1. Geocodificación

Toda dirección nueva deberá:

Normalizarse.

Geocodificarse automáticamente.

Guardar:

Latitud

Longitud

Precisión

Proveedor utilizado

Fecha

Estado

No volver a consultar una dirección ya geocodificada.

---

## 2. Mapa General

Mostrar:

Clientes

Leads

Prospectos

Visitas

Recorridos

Utilizar colores según estado.

Zoom automático.

Agrupación inteligente.

---

## 3. Optimización de Recorridos

El usuario podrá seleccionar.

Todos.

Por Estado.

Por Rubro.

Por Ciudad.

Por Etiqueta.

Por Responsable.

Por Prioridad.

Por Distancia.

Luego presionar:

Calcular recorrido.

El sistema deberá devolver:

Orden óptimo.

Tiempo estimado.

Kilómetros.

Duración.

Paradas.

---

## 4. Planificador Diario

Crear recorridos para:

Hoy.

Mañana.

Esta semana.

Permitir agregar.

Notas.

Objetivos.

Horario.

Duración.

---

## 5. Clientes Cercanos

Detectar automáticamente.

Clientes activos.

Prospectos.

Leads.

Negocios sin contactar.

Dentro de un radio configurable.

Ejemplo.

500 metros.

1 km.

5 km.

10 km.

---

## 6. Agrupación Territorial

Agrupar automáticamente.

Barrios.

Ciudades.

Zonas.

Sectores.

Preparado para futuras ventas territoriales.

---

## 7. Historial

Registrar.

Fecha.

Ruta.

Clientes visitados.

Kilómetros.

Tiempo.

Resultado.

Notas.

---

## 8. Registro de Visitas

Cada visita permitirá registrar.

Hora llegada.

Hora salida.

Resultado.

Notas.

Fotos.

Audio.

Próximo seguimiento.

Todo sincronizado con el CRM.

---

## 9. Modo Calle

Interfaz simplificada.

Botones grandes.

Acciones rápidas.

Pensado para celular.

Mostrar únicamente.

Cliente.

Distancia.

Teléfono.

WhatsApp.

Notas.

Siguiente parada.

---

## 10. Navegación

Abrir recorrido en.

Google Maps.

Waze.

OpenStreetMap.

Apple Maps.

Configurables.

---

# Inteligencia Territorial

El sistema deberá sugerir automáticamente.

Clientes olvidados.

Leads sin contactar.

Clientes cercanos.

Recorridos más eficientes.

Agrupaciones naturales.

Visitas recomendadas.

---

# Vista Mapa

Mostrar.

Marcadores.

Clusters.

Estados.

Filtros.

Ruta.

Leyenda.

---

# Filtros

Estado.

Ciudad.

Provincia.

País.

Rubro.

Responsable.

Etiqueta.

Cliente.

Lead.

Prospecto.

Distancia.

Última visita.

Sin visitar.

Tiene sistema.

Necesita sistema.

---

# Acciones rápidas

Llamar.

WhatsApp.

Correo.

Abrir GPS.

Registrar visita.

Agregar nota.

Crear seguimiento.

Cambiar estado.

---

# Offline

Todo el mapa deberá seguir funcionando.

Las rutas calculadas permanecerán disponibles.

Las visitas se sincronizarán automáticamente.

---

# IA

La IA podrá sugerir.

Qué clientes visitar.

Qué recorrido realizar.

Qué clientes conviene reagendar.

Qué zonas están poco explotadas.

Qué negocios similares existen cerca.

---

# Integraciones

Google Maps API

OpenStreetMap

Mapbox

GraphHopper

OSRM

Google Directions

Preparar arquitectura mediante Strategy.

Nunca depender de un único proveedor.

---

# Strategy Pattern

Implementar estrategias intercambiables para.

Geocodificación.

Optimización.

Navegación.

Mapas.

El sistema deberá poder cambiar de proveedor sin modificar el dominio.

---

# Componentes reutilizados

Map

Marker

RouteViewer

DirectionsPanel

VisitCard

Cluster

FiltersBar

FloatingActionButton

OfflineBanner

Timeline

StatsCard

SearchBar

Drawer

Dialog

Toast

---

# Casos de Uso

Geocodificar dirección.

Actualizar coordenadas.

Calcular recorrido.

Crear recorrido.

Editar recorrido.

Registrar visita.

Buscar clientes cercanos.

Mostrar mapa.

Exportar recorrido.

---

# Logs

Registrar.

Dirección geocodificada.

Ruta calculada.

Ruta iniciada.

Ruta finalizada.

Visita registrada.

Coordenadas actualizadas.

Error de geocodificación.

---

# Testing

Geocodificación.

Mapa.

Recorridos.

Offline.

Filtros.

Agrupaciones.

Visitas.

Responsive.

---

# UX

La creación de un recorrido deberá requerir menos de un minuto.

El usuario deberá entender inmediatamente.

Dónde ir.

Qué hacer.

Qué cliente visitar primero.

La interfaz móvil tendrá prioridad absoluta.

---

# Seguridad

No compartir ubicación del usuario.

Solicitar permisos únicamente cuando sean necesarios.

Guardar únicamente la información indispensable.

---

# Rendimiento

El mapa deberá soportar miles de clientes.

Utilizar clustering.

Carga progresiva.

Lazy Loading.

Cache local.

---

# Criterios de aceptación

✓ Geocodificación automática.

✓ Mapa funcionando.

✓ Optimización funcionando.

✓ Offline.

✓ Historial.

✓ Visitas.

✓ Responsive.

✓ Integraciones desacopladas.

---

# Definition of Done

☐ Sin errores TypeScript.

☐ Sin uso de any.

☐ Offline funcionando.

☐ Responsive.

☐ Optimización operativa.

☐ Strategy Pattern implementado.

☐ Tests aprobados.

☐ Documentación actualizada.

---

# Entregables

Al finalizar este Sprint existirá un módulo de Inteligencia Territorial completamente integrado con el CRM.

El usuario podrá planificar recorridos óptimos, registrar visitas y gestionar su trabajo en campo desde una única interfaz, reduciendo tiempos de traslado y mejorando el seguimiento comercial.

---

# Notas para la IA

- Nunca acoplar el dominio a un proveedor específico de mapas, geocodificación o cálculo de rutas.
- Implementar adaptadores y estrategias para permitir cambiar entre Google Maps, OpenStreetMap, GraphHopper, OSRM u otros servicios sin modificar la lógica del negocio.
- Optimizar la experiencia Mobile First, ya que este módulo se utilizará principalmente desde dispositivos móviles.
- Priorizar la rapidez de uso y la claridad visual durante recorridos en la calle.
- Toda visita registrada debe actualizar automáticamente el historial del cliente y generar eventos para el Dashboard, el CRM y futuras automatizaciones de IA.
