# Guía de Funcionalidades Adicionales (Fuera de Sprints)

Este documento detalla todas las funcionalidades a medida que han sido incorporadas en la plataforma **MateCode 2.0** por fuera del alcance original de los Sprints. Estas adiciones expanden las capacidades comerciales, de prospección en la vía pública, de geocodificación preventiva e importación de datos.

---

## 1. Módulo Comercial de "Potenciales Clientes" (Prospectos)

- **Propósito:** Separar los prospectos fríos o leads temporales de la base consolidada de clientes del CRM, evitando saturar la base operativa del sistema.
- **Componentes Clave:**
  - [ModalPotencialCliente.tsx](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/src/presentation/components/territorio/ModalPotencialCliente.tsx): Formulario de alta manual con soporte de geolocalización por GPS y Nominatim.
  - [ModalRegistrarVisitaProspecto.tsx](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/src/presentation/components/territorio/ModalRegistrarVisitaProspecto.tsx): Gestión de visitas comerciales. Permite marcar prospectos como visitados, registrar visitas acumuladas, agendar nuevas fechas de visita o registrar motivos por los cuales se salteó el local.
  - **Estrategia de Conversión:** Posibilidad de convertir cualquier prospecto activo en cliente oficial del CRM con un solo clic, abriendo un modal pre-completado con su dirección e historial.

---

## 2. Geocodificación Interactiva y Preventiva (Nominatim Test)

- **Propósito:** Validar en caliente si el formato de la dirección ingresada puede ser interpretado correctamente por la API de mapas (Nominatim), previniendo coordenadas inválidas o en el océano.
- **Detalles Técnicos:**
  - Añadido el botón **"Geocodificar Dirección"** en los formularios.
  - Realiza una consulta directa a la API de Nominatim y muestra el resultado devuelto en texto claro ("Dirección encontrada", "Coordenadas: Lat X, Lng Y").
  - **Autocompletado inteligente:** Si el navegador tiene los permisos de ubicación activados, la app pre-carga automáticamente la provincia y la ciudad actual para acelerar la carga de direcciones.
  - **Historial de Ubicaciones:** Almacena dinámicamente provincias y ciudades registradas previamente en el dispositivo para seleccionarlas rápidamente desde menús desplegables.

---

## 3. Integración de Código Postal (Exactitud Geográfica)

- **Propósito:** Resolver problemas de geocodificación ambigua donde calles con nombres repetidos eran ubicadas en la Capital Federal (Buenos Aires) en lugar de la ciudad local (Bahía Blanca).
- **Soluciones:**
  - Se agregó la propiedad `direccionCodigoPostal` a los modelos de datos tanto en Clientes como en Potenciales Clientes.
  - La dirección enviada a la API de Nominatim concatena el código postal de manera estructurada (`Calle Número, Código Postal, Ciudad, Provincia, País`), erradicando ubicaciones erróneas y optimizando las búsquedas.

---

## 4. Importación Masiva e Inteligente de JSON

- **Propósito:** Cargar múltiples clientes o potenciales clientes simultáneamente desde archivos JSON con herramientas de corrección en vivo.
- **Características:**
  - **Exportación de Plantillas:** Permite descargar plantillas JSON simplificadas (básicas, solo con campos obligatorios de contacto y dirección) y completas, diseñadas específicamente para proveer como contexto a asistentes de Inteligencia Artificial (ChatGPT, Gemini, Claude, etc.).
  - **Grilla Interactiva de Validación Offline:** Al cargar un archivo JSON, la aplicación simula la geocodificación en lote. Si alguna dirección falla o le faltan coordenadas/código postal, se renderiza una tabla interactiva donde el usuario puede corregir los datos directamente celda por celda antes de realizar la escritura final en IndexedDB.

---

## 5. Ruteo Vial Preciso y Alternativa Caminando (OSRM / FOSSGIS)

- **Propósito:** Calcular recorridos óptimos para el vendedor o preventista que sigue la traza de las calles, evitando líneas rectas aéreas que crucen manzanas.
- **Implementación:**
  - [optimizacion.strategy.ts](file:///c:/Users/mari_/OneDrive/Escritorio/t/PROYECTS/ACTIVOS/PERSONALES/MateCode2.0/src/application/services/territorio/optimizacion.strategy.ts): Conecta con el servidor público de FOSSGIS en OpenStreetMap Alemania (`routing.openstreetmap.de`).
  - **Perfiles de Desplazamiento:**
    - **En Auto (`routed-car`):** Respeta los sentidos vehiculares (calles de una sola mano, prohibiciones de giro).
    - **Caminando (`routed-foot`):** Ignora los sentidos de tránsito vehicular, priorizando senderos, veredas y cruces peatonales para minimizar la distancia a pie.

---

## 6. Visor de Mapas Legible con Inicio GPS

- **Propósito:** Facilitar la lectura de las rutas planificadas desde dispositivos móviles en calle.
- **Mejoras Visuales:**
  - **Marcadores Ampliados:** Se incrementó el tamaño de los pines con números de paradas a **24px** y su tipografía a **11px (negrita)**.
  - **Inicio en GPS:** Si el ruteo se inicia desde la ubicación actual del usuario, el mapa destaca la posición GPS con un círculo azul y un marcador número **"1"** de **28px** de diámetro.
  - **Filtrado por Rubro e Historial:** El mapa interactúa dinámicamente con los filtros de rubro (ej. Gastronomía, Retail) y visitas ("No visitados aún"), permitiendo limpiar la visualización y concentrarse en el cuadrante comercial objetivo.
