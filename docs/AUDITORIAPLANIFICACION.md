# AUDITORÍA DE PLANIFICACIÓN - NODEXA CORE

## 1. Información General del Proyecto

- **Nombre:** NODEXA CORE
- **Descripción:** No especificado

## 2. Stack Tecnológico Elegido

- **Frontend:** React, Next.js, TypeScript
- **Backend:** Next.js (API Routes / Server Actions)
- **Base de Datos:** PostgreSQL
- **Infraestructura:** Vercel, Supabase
- **Seguridad:** Supabase Auth, Row Level Security (RLS)
- **Integraciones:** Cloudinary, OpenAI

## 3. Modelo Físico de Base de Datos (SCHEMA.md)

```sql
Modelado de Base de Datos Completo - NODEXA (PostgreSQL / Supabase)
El siguiente modelo unificado ha sido diseñado en Tercera Forma Normal (3FN), garantizando la integridad referencial y soportando tanto productos simples como productos con múltiples variantes, junto con la gestión Multi-Sucursal.

Para cumplir estrictamente con el requisito de Row Level Security (RLS) y el aislamiento matemático de la arquitectura Multi-Tenant, todas las tablas incluyen la columna cliente_id (referencia al comercio). Se implementan campos de auditoría (creado_en, actualizado_en) y borrado lógico (eliminado_en) mediante el patrón Soft Delete.

1. Entidades Core y Locales Comerciales
Tabla: comercios
Representa al usuario principal (dueño del comercio o tenant). Se vincula directamente con Supabase Auth.

id (uuid, PK): Identificador único del comercio (Usado como cliente_id en el resto del sistema).

auth_user_id (uuid, FK, UNIQUE, NOT NULL): Vínculo con auth.users (Supabase).

nombre_fantasia (varchar(150), NOT NULL): Nombre comercial del negocio.

estado_pago (boolean, DEFAULT true): Bandera para suspender el servicio por morosidad.

creado_en (timestamp with time zone, DEFAULT now())

actualizado_en (timestamp with time zone, DEFAULT now())

Tabla: sucursales (Módulo Integrado: Multi-Sucursal)
Gestiona los locales físicos o depósitos pertenecientes a un comercio. Al registrar un comercio, se genera una por defecto.

id (uuid, PK): Identificador de la sucursal.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

nombre (varchar(100), NOT NULL): Ej: "Casa Matriz", "Sucursal Centro".

direccion (varchar(200), NULL): Ubicación física.

telefono (varchar(30), NULL): Contacto del local.

es_casa_matriz (boolean, DEFAULT false): Define la sucursal principal.

activa (boolean, DEFAULT true): Permite pausar una sucursal si frena operaciones.

creado_en (timestamp with time zone, DEFAULT now())

eliminado_en (timestamp with time zone, NULL): Borrado lógico.

Tabla: proveedores
Directorio para gestionar reposición de stock y aplicar filtros en actualizaciones masivas.

id (uuid, PK): Identificador único del proveedor.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

nombre_comercial (varchar(150), NOT NULL): Razón social o fantasía.

nombre_contacto (varchar(100), NULL): Persona de contacto.

telefono (varchar(30), NULL): Número de teléfono o WhatsApp.

email (varchar(150), NULL): Correo electrónico.

creado_en (timestamp with time zone, DEFAULT now())

actualizado_en (timestamp with time zone, DEFAULT now())

eliminado_en (timestamp with time zone, NULL): Borrado lógico.

Tabla: categorias
Agrupador lógico de productos. Fundamental para el catálogo web y aumentos masivos.

id (uuid, PK): Identificador único de la categoría.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

nombre (varchar(100), NOT NULL): Ej: "Bebidas", "Remeras".

creado_en (timestamp with time zone, DEFAULT now())

actualizado_en (timestamp with time zone, DEFAULT now())

eliminado_en (timestamp with time zone, NULL): Borrado lógico.

2. Catálogo e Inventario (Productos, Variantes y Stock)
Tabla: productos
Maestro de productos. Actúa como producto simple o como "Producto Padre" si se activan las variantes.

id (uuid, PK): Identificador del producto.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

categoria_id (uuid, FK, NULL): Referencia a categorias.id.

proveedor_id (uuid, FK, NULL): Referencia a proveedores.id.

sku (varchar(50), NULL): Código único. Nulo si usa variantes.

nombre (varchar(200), NOT NULL): Nombre del producto.

descripcion (text, NULL): Descripción para catálogo web.

costo (numeric(12,2), NOT NULL, >= 0): Costo base de adquisición.

precio_venta (numeric(12,2), NOT NULL, >= 0): Precio final de venta.

foto_url (varchar(500), NULL): Enlace a imagen en Cloudinary.

tiene_variantes (boolean, DEFAULT false): Delega gestión a la tabla de variantes si es true.

stock_actual (integer, DEFAULT 0): Caché del stock consolidado global de todas las sucursales.

creado_en (timestamp with time zone, DEFAULT now())

actualizado_en (timestamp with time zone, DEFAULT now())

eliminado_en (timestamp with time zone, NULL): Borrado lógico.

Tabla: atributos
Propiedades variables creadas por el comercio.

id (uuid, PK): Identificador del atributo.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

nombre (varchar(50), NOT NULL): Ej: "Talle", "Color", "Voltaje".

creado_en (timestamp with time zone, DEFAULT now())

Tabla: valores_atributo
Opciones concretas para un atributo.

id (uuid, PK): Identificador del valor.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

atributo_id (uuid, FK, NOT NULL): Referencia a atributos.id.

valor (varchar(100), NOT NULL): Ej: "XL", "Rojo", "220V".

creado_en (timestamp with time zone, DEFAULT now())

Tabla: variantes_producto
Combinación vendible física.

id (uuid, PK): Identificador único de la variante.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

producto_id (uuid, FK, NOT NULL): Referencia a productos.id (Padre).

sku (varchar(50), NOT NULL): Código único de la variante.

costo (numeric(12,2), NULL): Sobreescribe costo del padre si existe.

precio_venta (numeric(12,2), NULL): Sobreescribe precio del padre si existe.

stock_actual (integer, DEFAULT 0): Caché del stock global consolidado de esta variante.

foto_url (varchar(500), NULL): Foto específica.

creado_en (timestamp with time zone, DEFAULT now())

actualizado_en (timestamp with time zone, DEFAULT now())

eliminado_en (timestamp with time zone, NULL): Borrado lógico.

Tabla: variantes_combinaciones
Relación N a N que conecta la variante con sus atributos seleccionados.

variante_id (uuid, PK Compuesta, FK): Referencia a variantes_producto.id.

valor_atributo_id (uuid, PK Compuesta, FK): Referencia a valores_atributo.id.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

Tabla: stock_sucursales (Distribución Física)
Almacena la cantidad real de mercadería separada por cada local del comercio.

id (uuid, PK): Identificador único del registro de inventario.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

sucursal_id (uuid, FK, NOT NULL): Referencia a sucursales.id.

producto_id (uuid, FK, NOT NULL): Referencia a productos.id.

variante_id (uuid, FK, NULL): Referencia a variantes_producto.id (Nulo si es producto simple).

stock_actual (integer, DEFAULT 0): Cantidad física en este local.

actualizado_en (timestamp with time zone, DEFAULT now())

Tabla: movimientos_stock
Bitácora inmutable para garantizar trazabilidad total de entradas, salidas y traspasos entre locales.

id (uuid, PK): Identificador del movimiento.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

sucursal_id (uuid, FK, NOT NULL): Referencia a sucursales.id (Dónde ocurrió el movimiento).

producto_id (uuid, FK, NOT NULL): Producto afectado (Padre).

variante_id (uuid, FK, NULL): Variante afectada (Nulo si no aplica).

tipo_movimiento (varchar(30), NOT NULL): ENTRADA, SALIDA_MANUAL, VENTA, DEVOLUCION, TRASPASO_ENTRADA, TRASPASO_SALIDA.

cantidad (integer, NOT NULL): Cantidad sumada o restada.

venta_referencia_id (uuid, FK, NULL): Referencia a ventas.id (si aplica).

observaciones (varchar(255), NULL): Ej: "Rotura", "Envío a sucursal centro".

creado_en (timestamp with time zone, DEFAULT now())

3. Entidades Transaccionales (Ventas y Mostrador)
Tabla: ventas
Cabecera de los tickets o comprobantes generados.

id (uuid, PK): Identificador de la venta.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

sucursal_id (uuid, FK, NOT NULL): Referencia a sucursales.id (Local donde se vendió).

cliente_final_id (uuid, FK, NULL): Vinculación opcional (Módulo Cuentas Corrientes).

estado (varchar(30), NOT NULL): COMPLETADA, FIADO, DEVUELTA.

total (numeric(12,2), NOT NULL, >= 0): Monto total final.

creado_en (timestamp with time zone, DEFAULT now())

actualizado_en (timestamp with time zone, DEFAULT now())

Tabla: detalles_venta
Desglose (3FN) de cada ítem en el ticket.

id (uuid, PK): Identificador del renglón.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

venta_id (uuid, FK, NOT NULL): Referencia a ventas.id.

producto_id (uuid, FK, NOT NULL): Referencia a productos.id.

variante_id (uuid, FK, NULL): Referencia a variantes_producto.id.

cantidad (integer, NOT NULL, > 0): Unidades vendidas.

precio_unitario (numeric(12,2), NOT NULL, >= 0): Precio congelado al operar.

subtotal (numeric(12,2), NOT NULL, >= 0): cantidad * precio_unitario.

4. Entidades de Módulos ("A la Carta")
Tabla: modulos_comercio (Marketplace Interno)
Gestiona los módulos activos para el comercio.

cliente_id (uuid, PK Compuesta, FK): Referencia a comercios.id.

modulo_codigo (varchar(50), PK Compuesta): Ej: CATALOGO_WEB, IA_CARGA, MULTI_SUCURSAL.

activo (boolean, DEFAULT false): Define si está pagando el módulo.

creado_en (timestamp with time zone, DEFAULT now())

actualizado_en (timestamp with time zone, DEFAULT now())

Tabla: configuracion_catalogo (Catálogo Web Público)
Relación 1 a 1 con el comercio. Reemplaza variables de entorno para vistas públicas dinámicas.

cliente_id (uuid, PK, FK, NOT NULL): Referencia a comercios.id (RLS).

slug_url (varchar(100), UNIQUE, NOT NULL): Identificador único URL (Ej: el-reydel-jean).

plantilla_activa (varchar(50), DEFAULT 'MINIMALISTA'): Código del diseño a renderizar.

color_primario (varchar(7), DEFAULT '#000000'): Color Hexadecimal para acentos visuales.

logo_url (varchar(500), NULL): Enlace a imagen (Cloudinary).

banner_url (varchar(500), NULL): Enlace a imagen de portada.

mensaje_bienvenida (text, NULL): Texto introductorio editado por el dueño.

whatsapp_pedidos (varchar(30), NULL): Número para recibir carritos.

creado_en (timestamp with time zone, DEFAULT now())

actualizado_en (timestamp with time zone, DEFAULT now()): Obligatorio para invalidar la caché de Next.js.

Tabla: clientes_finales (Cuentas Corrientes)
Directorio de clientes compradores (deudores).

id (uuid, PK): Identificador del cliente.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

nombre_completo (varchar(150), NOT NULL): Nombre del cliente.

telefono (varchar(30), NULL): WhatsApp.

saldo_deuda (numeric(12,2), DEFAULT 0): Caché del saldo adeudado.

creado_en (timestamp with time zone, DEFAULT now())

eliminado_en (timestamp with time zone, NULL): Borrado lógico.

Tabla: pagos_cuenta_corriente (Cuentas Corrientes)
Ingresos de dinero para descontar deudas (Fiado).

id (uuid, PK): Identificador del pago.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

cliente_final_id (uuid, FK, NOT NULL): Referencia al cliente final.

monto_pagado (numeric(12,2), NOT NULL, > 0): Dinero entregado.

observaciones (varchar(255), NULL): Ej: "Entrega a cuenta parcial".

creado_en (timestamp with time zone, DEFAULT now())

Tabla: registros_uso_ia (Carga Mágica)
Historial transaccional para auditar límites de API OpenAI.

id (uuid, PK): Identificador del uso.

cliente_id (uuid, FK, NOT NULL): Referencia a comercios.id (RLS).

mes_anio (varchar(7), NOT NULL): Formato MM-YYYY.

estado_extraccion (varchar(20), NOT NULL): EXITO, ERROR.

creado_en (timestamp with time zone, DEFAULT now())
```

## 4. Desglose del Backlog Completo

### Épica: Épica 10: Carga Masiva de Productos (Excel)

_Descripción:_ Permite importar un archivo Excel (.xlsx) para crear o actualizar productos en bloque mediante mapeo de columnas. Incluye validación de formato de archivo (NX-BULK-001), plantilla descargable, reporte de errores por fila (SKU inexistente NX-BULK-002, valores inválidos NX-BULK-003) y omisión de filas fallidas sin interrumpir el proceso completo. Entidad afectada: productos.

#### Historia de Usuario: Omisión de filas fallidas sin interrumpir el proceso

- **Descripción:** Como sistema quiero omitir las filas con errores y continuar procesando el resto del archivo para maximizar la cantidad de productos importados correctamente
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Procesamiento resiliente fila por fila en importación Excel** (Estado: TODO)
   - _Descripción:_ En el parser de carga masiva, envolver el procesamiento de cada fila en try/catch individual, acumulando errores en un array y continuando con las filas restantes.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un archivo con filas válidas e inválidas mezcladas, When se procesa, Then las válidas se insertan y las inválidas se omiten
     - Given una fila con error, When ocurre, Then se acumula en el array de errores sin detener el proceso
     - Given el resultado final, When se retorna, Then incluye resumen de éxitos y fallos

#### Historia de Usuario: Reporte de errores por fila

- **Descripción:** Como Administrador quiero descargar un reporte de errores por fila tras la importación para corregir los datos que fallaron (NX-BULK-002, NX-BULK-003)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Generador de reporte descargable de errores de importación** (Estado: TODO)
   - _Descripción:_ Al finalizar el procesamiento del Excel, generar un archivo .xlsx con las filas fallidas y su motivo (NX-BULK-002/003) usando una librería de generación de hojas de cálculo en el backend, disponible para descarga.
   - _Criterios de Aceptación (QA/BDD):_
     - Given filas fallidas en una importación, When finaliza el proceso, Then se genera un .xlsx descargable con el detalle
     - Given el archivo generado, When se abre, Then incluye número de fila y motivo del error
     - Given una importación sin errores, When finaliza, Then no se genera archivo de errores

#### Historia de Usuario: Descarga de plantilla Excel

- **Descripción:** Como Administrador quiero descargar una plantilla Excel con las columnas requeridas para preparar correctamente mi archivo de carga masiva
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Endpoint de generación de plantilla .xlsx** (Estado: TODO)
   - _Descripción:_ Crear API Route que genere un archivo Excel con las columnas requeridas (nombre, sku, costo, precio_venta, etc.) usando librería de generación de hojas de cálculo y lo sirva para descarga.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una solicitud al endpoint, When se ejecuta, Then se descarga un archivo .xlsx con las columnas requeridas
     - Given el archivo generado, When se abre, Then los headers coinciden con los campos del DTO de producto
     - Given el endpoint, When se llama repetidamente, Then siempre genera el mismo formato

#### Historia de Usuario: Importación de productos desde Excel

- **Descripción:** Como Administrador quiero importar un archivo Excel con mis productos para crear o actualizar múltiples registros de una sola vez
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Parser de Excel a DTOs de producto con librería server-side** (Estado: TODO)
   - _Descripción:_ Implementar procesamiento server-side del archivo .xlsx usando librería de parsing, transformando cada fila a DTO validado con Zod antes de insertar/actualizar en productos.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un archivo .xlsx válido, When se procesa, Then cada fila se transforma en un DTO tipado
     - Given una fila con datos faltantes, When se procesa, Then el DTO falla validación Zod
     - Given el parser, When finaliza, Then entrega el resultado al procesamiento resiliente fila por fila

#### Historia de Usuario: Mapeo de columnas del archivo

- **Descripción:** Como Administrador quiero mapear las columnas de mi archivo con los campos del sistema para adaptar archivos con estructuras distintas
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **UI de mapeo dinámico de columnas Excel a campos del sistema** (Estado: TODO)
   - _Descripción:_ Crear componente que lea los headers del Excel subido, permita al usuario asociar cada columna a un campo del DTO de producto mediante selects, antes de ejecutar el procesamiento.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un archivo con headers no estándar, When se sube, Then se permite mapear cada columna a un campo del sistema
     - Given un mapeo incompleto, When se intenta procesar, Then se solicita completar los campos obligatorios
     - Given el mapeo confirmado, When se envía, Then se usa para procesar el archivo completo

#### Historia de Usuario: Validación de formato de archivo

- **Descripción:** Como sistema quiero validar que el archivo subido sea un Excel válido antes de procesarlo para evitar errores de importación (NX-BULK-001)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de extensión y mimetype .xlsx en carga masiva** (Estado: TODO)
   - _Descripción:_ En el input de carga de archivo, validar extensión .xlsx y mimetype antes de enviar al servidor, rechazando con NX-BULK-001 en caso contrario.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un archivo .csv o .txt, When se sube, Then se rechaza con NX-BULK-001
     - Given un archivo .xlsx válido, When se sube, Then se acepta para procesamiento
     - Given el mensaje de rechazo, When se muestra, Then indica el formato esperado

---

### Épica: Épica 20: Catálogo Web Público y Checkout por WhatsApp

_Descripción:_ Vista pública sin autenticación por comercio (mediante slug) que renderiza los productos y variantes disponibles según la plantilla configurada, permite a clientes finales navegar, agregar productos con stock al carrito y generar un mensaje estructurado hacia el WhatsApp del comerciante al finalizar. Entidades consultadas: productos, variantes_producto, configuracion_catalogo (solo lectura pública, sin exponer datos sensibles).

#### Historia de Usuario: Protección de datos sensibles en API pública del catálogo

- **Descripción:** Como sistema quiero exponer únicamente los campos necesarios en el endpoint público del catálogo para no filtrar información sensible del comercio
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **DTO restringido para endpoint público de catálogo** (Estado: TODO)
   - _Descripción:_ Crear un DTO de salida específico para /catalogo/[slug] que exponga solo campos públicos (nombre, precio_venta, foto_url), excluyendo costo y datos internos del comercio.
   - _Criterios de Aceptación (QA/BDD):_
     - Given la respuesta del endpoint público, When se inspecciona, Then no incluye costo ni cliente_id
     - Given un producto público, When se consulta, Then solo expone nombre, precio_venta, foto_url y descripcion
     - Given un intento de acceder a campos internos, When se solicita, Then no están disponibles en el DTO

#### Historia de Usuario: Generación de mensaje estructurado hacia WhatsApp

- **Descripción:** Como cliente final quiero finalizar mi pedido y que se genere un mensaje estructurado hacia el WhatsApp del comerciante para concretar la compra fácilmente
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Generador de deep link wa.me con mensaje estructurado** (Estado: TODO)
   - _Descripción:_ Implementar función utilitaria que arme un string con los items del carrito y genere un enlace https://wa.me/{numero}?text={mensaje_encodeado} usando el whatsapp_pedidos configurado.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un carrito con ítems, When se genera el link, Then incluye nombre, cantidad y precio de cada ítem
     - Given el número configurado, When se usa, Then el link apunta a https://wa.me/{numero}
     - Given caracteres especiales en el mensaje, When se genera, Then están correctamente url-encoded

#### Historia de Usuario: Selección de variantes de producto en catálogo público

- **Descripción:** Como cliente final quiero seleccionar la variante deseada de un producto (talle, color) antes de agregarlo al carrito para pedir exactamente lo que necesito
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Selector de variante en vista pública de producto** (Estado: TODO)
   - _Descripción:_ Crear componente React que consulte variantes_producto vía Server Component y permita seleccionar combinación de atributos, actualizando precio y foto mostrada dinámicamente.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un producto con variantes, When se selecciona una combinación, Then el precio y foto se actualizan dinámicamente
     - Given una combinación sin stock, When se selecciona, Then se deshabilita el agregado al carrito
     - Given el componente, When se renderiza, Then solo muestra combinaciones existentes

#### Historia de Usuario: Visualización pública del catálogo por slug

- **Descripción:** Como cliente final quiero navegar el catálogo público de un comercio mediante su URL única para conocer sus productos disponibles
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Component de renderizado de catálogo público** (Estado: TODO)
   - _Descripción:_ Implementar /catalogo/[slug]/page.tsx como Server Component que consulte configuracion_catalogo y productos activos vía API pública restringida, con ISR configurado.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un slug válido, When se accede, Then se renderiza el catálogo con configuración y productos activos
     - Given un slug inexistente, When se accede, Then se muestra una página de no encontrado
     - Given ISR configurado, When cambia el catálogo, Then se revalida correctamente

#### Historia de Usuario: Agregado de productos con stock al carrito público

- **Descripción:** Como cliente final quiero agregar productos disponibles a un carrito de compra para armar mi pedido antes de enviarlo
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de stock disponible al agregar al carrito público** (Estado: TODO)
   - _Descripción:_ En el componente de carrito del catálogo público, consultar stock consolidado antes de permitir agregar el producto/variante, deshabilitando el botón si no hay stock disponible.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un producto sin stock, When se intenta agregar, Then el botón está deshabilitado
     - Given un producto con stock, When se agrega, Then se suma correctamente al carrito
     - Given el mensaje de agotado, When se muestra, Then es claro y empático

#### Historia de Usuario: Navegación y filtrado de productos en el catálogo

- **Descripción:** Como cliente final quiero buscar y filtrar productos por categoría en el catálogo público para encontrar rápidamente lo que necesito
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Filtro de productos públicos por categoría** (Estado: TODO)
   - _Descripción:_ Implementar Server Component con query params para filtrar productos del catálogo público por categoria_id, respetando el DTO restringido de datos públicos.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un query param categoria_id, When se aplica, Then solo se muestran productos de esa categoría
     - Given ningún filtro, When se accede, Then se muestran todos los productos activos
     - Given una categoría sin productos, When se filtra, Then se muestra un estado vacío apropiado

#### Historia de Usuario: Renderizado dinámico según plantilla y personalización

- **Descripción:** Como cliente final quiero ver el catálogo con el diseño, colores y banner configurados por el comercio para reconocer su identidad de marca
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Selector de componente de plantilla según plantilla_activa** (Estado: TODO)
   - _Descripción:_ Implementar un mapeo de plantilla_activa a componentes React específicos (ej. MINIMALISTA, PREMIUM) renderizados dinámicamente en /catalogo/[slug]/page.tsx.
   - _Criterios de Aceptación (QA/BDD):_
     - Given plantilla_activa=MINIMALISTA, When se renderiza el catálogo, Then usa el componente correspondiente
     - Given plantilla_activa=PREMIUM, When se renderiza, Then usa el otro componente
     - Given un valor de plantilla no reconocido, When ocurre, Then se aplica una plantilla por defecto

---

### Épica: Épica 7: Gestión de Categorías

_Descripción:_ CRUD de categorías de productos utilizadas para agrupación, filtros de catálogo y actualizaciones masivas de precios. Incluye validación de nombre único por comercio (NX-CAT-001). Entidad: categorias.

#### Historia de Usuario: Edición de categoría existente

- **Descripción:** Como Administrador quiero editar el nombre de una categoría existente para corregir o mejorar su denominación
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de actualización de categoría** (Estado: TODO)
   - _Descripción:_ Implementar 'actualizarCategoria' validando nombre con Zod y verificando unicidad excluyendo el propio id antes del update.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un nombre válido y único, When se actualiza, Then se persiste el cambio
     - Given un nombre duplicado, When se envía, Then se rechaza con NX-CAT-001
     - Given una categoría de otro comercio, When se intenta editar, Then RLS bloquea

#### Historia de Usuario: Listado de categorías

- **Descripción:** Como Administrador quiero ver el listado de categorías de mi comercio para organizar mis productos
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de listado paginado de categorías** (Estado: TODO)
   - _Descripción:_ Crear consulta a categorias filtrando por cliente_id y eliminado_en IS NULL, con paginación estándar del proyecto.
   - _Criterios de Aceptación (QA/BDD):_
     - Given más de 10 categorías, When se solicita una página, Then se retorna el subconjunto correcto
     - Given categorías eliminadas, When se listan, Then no aparecen
     - Given un usuario de otro comercio, When consulta, Then RLS impide verlas

#### Historia de Usuario: Validación de nombre de categoría duplicado

- **Descripción:** Como sistema quiero impedir la creación de una categoría con nombre repetido para evitar confusión en el catálogo (NX-CAT-001)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Constraint único de nombre por cliente_id en categorias** (Estado: TODO)
   - _Descripción:_ Agregar índice UNIQUE compuesto (cliente_id, nombre) en categorias y validación previa en Server Action retornando NX-CAT-001.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un nombre de categoría ya existente en el comercio, When se intenta crear otra igual, Then se rechaza con NX-CAT-001
     - Given el mismo nombre en otro comercio, When se crea, Then se permite (aislamiento por cliente_id)
     - Given el índice UNIQUE, When se prueba a nivel de base de datos, Then existe y funciona

#### Historia de Usuario: Eliminación de categoría

- **Descripción:** Como Administrador quiero eliminar una categoría que ya no utilizo para mantener organizado mi catálogo
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de eliminación de categoría** (Estado: TODO)
   - _Descripción:_ Implementar 'eliminarCategoria' con soft delete (eliminado_en), validando rol admin/super_admin.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una categoría existente, When se elimina, Then se marca eliminado_en (soft delete)
     - Given productos asociados a la categoría, When se elimina la categoría, Then los productos no quedan inconsistentes (categoria_id nulo permitido)
     - Given un rol operador, When intenta eliminar, Then se rechaza

#### Historia de Usuario: Creación de nueva categoría

- **Descripción:** Como Administrador quiero crear una nueva categoría para agrupar productos similares en mi catálogo
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de alta de categoría** (Estado: TODO)
   - _Descripción:_ Implementar 'crearCategoria' validando nombre único con Zod e insertando con cliente_id del JWT.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un nombre único, When se crea, Then se inserta con cliente_id del JWT
     - Given un nombre duplicado, When se envía, Then se rechaza con NX-CAT-001
     - Given un rol operador, When intenta crear, Then se rechaza

---

### Épica: Épica 4: Configuración General del Comercio

_Descripción:_ Permite al Super Administrador editar los datos generales del comercio: nombre de fantasía, logo, estado de pago/suspensión por morosidad (NX-AUTH-003). Incluye la pantalla de bloqueo cuando el comercio está suspendido. Entidad: comercios.

#### Historia de Usuario: Pantalla de bloqueo por suspensión de servicio

- **Descripción:** Como comerciante suspendido por morosidad quiero ver una pantalla de bloqueo con un botón de contacto para poder regularizar mi situación (NX-AUTH-003)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Guard de estado_pago en middleware** (Estado: TODO)
   - _Descripción:_ En el middleware de Next.js, tras validar el JWT, consultar estado_pago del comercio y redirigir a pantalla de bloqueo mostrando NX-AUTH-003 si estado_pago es false.
   - _Criterios de Aceptación (QA/BDD):_
     - Given estado_pago=false, When cualquier usuario accede al dashboard, Then es redirigido con NX-AUTH-003
     - Given estado_pago=true, When se accede, Then el flujo continúa normal
     - Given la pantalla de bloqueo, When se muestra, Then incluye información de contacto

#### Historia de Usuario: Subida de logo vía Cloudinary

- **Descripción:** Como Super Administrador quiero subir el logo de mi comercio y que se optimice automáticamente para que cargue rápido en el catálogo y panel
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Componente de upload de logo con preview** (Estado: TODO)
   - _Descripción:_ Crear componente de carga de archivo que suba a Cloudinary, muestre preview y persista logo_url en configuracion_catalogo/comercios.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una imagen seleccionada, When se carga, Then se muestra un preview antes de confirmar
     - Given la confirmación, When se ejecuta, Then se sube a Cloudinary y se persiste logo_url
     - Given un archivo no válido, When se selecciona, Then se rechaza con mensaje claro

#### Historia de Usuario: Visualización del estado de pago del comercio

- **Descripción:** Como Super Administrador quiero visualizar el estado de pago de mi cuenta para saber si mi servicio está activo o suspendido
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Badge de estado_pago en configuración general** (Estado: TODO)
   - _Descripción:_ Crear componente que consuma comercios.estado_pago y renderice un badge semántico (activo/suspendido) en la pantalla de configuración del comercio.
   - _Criterios de Aceptación (QA/BDD):_
     - Given estado_pago=true, When se muestra el badge, Then aparece en verde con texto activo
     - Given estado_pago=false, When se muestra, Then aparece en rojo con texto suspendido
     - Given el badge, When se muestra, Then incluye texto además del color

#### Historia de Usuario: Edición de nombre de fantasía y logo del comercio

- **Descripción:** Como Super Administrador quiero editar el nombre de fantasía y el logo de mi comercio para mantener actualizada la identidad de mi negocio
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de actualización de datos del comercio** (Estado: TODO)
   - _Descripción:_ Implementar 'actualizarComercio' validando nombre_fantasia con Zod y gestionando reemplazo de logo_url vía Cloudinary, restringido a rol super_admin.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un rol super_admin, When actualiza nombre_fantasia, Then se persiste el cambio
     - Given un rol admin, When intenta actualizar, Then se rechaza
     - Given un nuevo logo, When se sube, Then reemplaza logo_url mediante Cloudinary

---

### Épica: Épica 24: Plataforma UX/UI, Accesibilidad y Estados del Sistema

_Descripción:_ Cubre los lineamientos transversales de experiencia obligatorios en todo el sistema: estados vacíos educativos con CTA (ej. '+ Crear mi primer producto'), diseño responsivo fluido con tablas convertidas a tarjetas en mobile, accesibilidad (tamaño mínimo 16px, áreas táctiles de 44x44px, soporte prefers-reduced-motion), manejo empático de errores con iconografía y sin depender solo del color, y presentación centralizada de mensajes según el diccionario de errores de ERRORS.md. No corresponde a una tabla específica sino a componentes UI compartidos de todo el sistema.

#### Historia de Usuario: Toasts semánticos de retroalimentación

- **Descripción:** Como usuario quiero recibir una confirmación visual mediante toasts de éxito, error o advertencia tras cada acción para saber si mi operación se completó correctamente
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Componente Toast reutilizable con variantes semánticas** (Estado: TODO)
   - _Descripción:_ Crear componente React 'Toast' con variantes éxito/error/advertencia usando tokens de DESIGN.md (colores semánticos), iconografía y mensaje empático; integrar como provider global en el layout del dashboard.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una acción exitosa, When se dispara, Then el toast se muestra en verde con ícono de éxito
     - Given una acción fallida, When se dispara, Then se muestra en rojo con ícono y texto descriptivo
     - Given el botón de cierre, When se mide, Then cumple mínimo 44x44px
     - Given prefers-reduced-motion activo, When se muestra, Then no presenta animación

#### Historia de Usuario: Mensajes de error con icono y texto según diccionario centralizado

- **Descripción:** Como usuario quiero que todo error se muestre con ícono, color y texto explicativo basados en un diccionario centralizado para entender siempre qué ocurrió y qué hacer
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Módulo centralizado de mapeo de errores NX-*** (Estado: TODO)
   - _Descripción:_ Crear archivo de dominio 'errores.ts' que mapee cada código NX-* a mensaje, ícono y severidad según ERRORS.md, consumido por el componente Toast y formularios.
   - _Criterios de Aceptación (QA/BDD):_
     - Given cualquier código NX-* usado en el backend, When se consulta el diccionario, Then existe una entrada con mensaje, ícono y severidad
     - Given un código no mapeado, When se usa, Then el test de cobertura lo detecta como faltante
     - Given el Toast, When consume el diccionario, Then muestra el mensaje correcto

#### Historia de Usuario: Estados vacíos educativos con CTA

- **Descripción:** Como usuario nuevo quiero ver un estado vacío claro con un botón de acción cuando no tengo datos cargados para saber cuál es el primer paso a seguir
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Componente EmptyState reutilizable** (Estado: TODO)
   - _Descripción:_ Crear componente React 'EmptyState' con borde discontinuo, icono, texto y botón CTA configurable, reutilizado en todos los listados vacíos (productos, ventas, etc.) según DESIGN.md.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un listado sin datos, When se renderiza, Then muestra borde discontinuo, icono, texto y CTA
     - Given el CTA, When se hace clic, Then navega a la acción de creación correspondiente
     - Given el botón CTA, When se mide, Then cumple 44x44px mínimo

#### Historia de Usuario: Soporte de prefers-reduced-motion

- **Descripción:** Como usuario con preferencia de movimiento reducido quiero que el sistema desactive las animaciones automáticamente para evitar molestias visuales
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Media query global de reducción de movimiento** (Estado: TODO)
   - _Descripción:_ Agregar regla CSS @media (prefers-reduced-motion: reduce) en los estilos globales de Tailwind que desactive transiciones y animaciones en todos los componentes.
   - _Criterios de Aceptación (QA/BDD):_
     - Given prefers-reduced-motion activo en el SO, When se navega la app, Then no se ven transiciones ni animaciones
     - Given prefers-reduced-motion inactivo, When se navega, Then las transiciones de 150-200ms funcionan normalmente
     - Given la regla CSS, When se inspecciona, Then está aplicada globalmente

#### Historia de Usuario: Placeholders educativos en formularios

- **Descripción:** Como usuario quiero ver ejemplos concretos en los campos de formulario (ej. SKU: PRD-001) para completar los datos correctamente sin dudas
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Estándar de placeholders concretos en inputs** (Estado: TODO)
   - _Descripción:_ Definir en los componentes de formulario reutilizables (Input, Select) props de placeholder con ejemplos concretos (ej. PRD-001, juan.perez@comercio.com) según DESIGN.md.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un input de tipo email, When se renderiza, Then muestra el placeholder juan.perez@comercio.com
     - Given un input de SKU, When se renderiza, Then muestra PRD-001 como ejemplo
     - Given un input de precio, When se renderiza, Then muestra 199.99 como ejemplo

#### Historia de Usuario: Cumplimiento de tamaños mínimos de tipografía y áreas táctiles

- **Descripción:** Como usuario quiero que todos los textos y botones cumplan con tamaños mínimos accesibles (16px y 44x44px) para poder leer e interactuar sin dificultad
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Auditoría de tokens Tailwind de tipografía y tamaño táctil** (Estado: TODO)
   - _Descripción:_ Configurar theme de Tailwind con font-size base 16px, mínimo 14px, y clases utilitarias min-h-11/min-w-11 (44px) aplicadas a todos los botones y controles interactivos.
   - _Criterios de Aceptación (QA/BDD):_
     - Given el theme de Tailwind, When se inspecciona, Then el font-size base es 16px y el mínimo 14px
     - Given los botones interactivos del sistema, When se miden, Then cumplen mínimo 44x44px
     - Given un componente que viole el estándar, When se detecta, Then se considera bug de accesibilidad

#### Historia de Usuario: Diseño responsivo con tablas convertidas a tarjetas en mobile

- **Descripción:** Como usuario en dispositivo móvil quiero ver las tablas de stock y listados transformadas en tarjetas apiladas para poder operar cómodamente desde mi celular
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Componente de tabla adaptable con vista de tarjetas** (Estado: TODO)
   - _Descripción:_ Crear componente de tabla que use CSS Grid/Flexbox y clases responsive de Tailwind para transformar filas en tarjetas apiladas por debajo del breakpoint md, sin anchos fijos.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un viewport menor al breakpoint md, When se renderiza la tabla, Then se muestra como tarjetas apiladas
     - Given un viewport mayor a md, When se renderiza, Then se muestra como tabla tradicional
     - Given el componente, When se inspecciona el CSS, Then no usa anchos fijos

---

### Épica: Épica 16: Historial de Ventas y Devoluciones

_Descripción:_ Listado paginado y filtrable (por sucursal o consolidado) del historial de ventas con sus estados (COMPLETADA, FIADO, DEVUELTA). Permite revertir una venta devolviendo automáticamente el stock y ajustando la caja, con validaciones de devolución duplicada (NX-SAL-004) y límite de tiempo permitido para devolver (NX-SAL-005). Entidades: ventas, detalles_venta, movimientos_stock.

#### Historia de Usuario: Límite de tiempo para devoluciones

- **Descripción:** Como sistema quiero impedir devoluciones fuera del plazo permitido para proteger la política comercial del negocio (NX-SAL-005)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de ventana temporal de devolución** (Estado: TODO)
   - _Descripción:_ En la Server Action de devolución, calcular la diferencia entre now() y ventas.creado_en, y rechazar con NX-SAL-005 si excede el límite configurable de días definido como constante de dominio.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una venta dentro del límite de días, When se solicita devolución, Then se permite
     - Given una venta fuera del límite, When se solicita, Then se rechaza con NX-SAL-005
     - Given el último día permitido, When se solicita, Then se permite (caso borde)

#### Historia de Usuario: Visualización de detalle de una venta

- **Descripción:** Como Administrador quiero ver el detalle completo de una venta con sus ítems para revisar exactamente qué se vendió
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Consulta de venta con join a detalles_venta** (Estado: TODO)
   - _Descripción:_ Implementar Server Action que obtenga la cabecera de 'ventas' junto a sus 'detalles_venta' mediante join tipado, validando pertenencia al cliente_id antes de renderizar en /dashboard/ventas/[id].
   - _Criterios de Aceptación (QA/BDD):_
     - Given una venta existente, When se consulta, Then se retornan cabecera e ítems asociados
     - Given una venta de otro comercio, When se accede por URL directa, Then RLS bloquea
     - Given una venta sin ítems, When se consulta, Then retorna array vacío sin error

#### Historia de Usuario: Validación de devolución duplicada

- **Descripción:** Como sistema quiero impedir devolver una venta que ya fue devuelta previamente para evitar ajustes incorrectos de stock (NX-SAL-004)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Chequeo de estado DEVUELTA antes de reprocesar** (Estado: TODO)
   - _Descripción:_ En la Server Action de devolución, validar que ventas.estado no sea ya 'DEVUELTA' antes de ejecutar la reversión, retornando NX-SAL-004.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una venta ya DEVUELTA, When se intenta devolver de nuevo, Then se rechaza con NX-SAL-004
     - Given una venta COMPLETADA, When se devuelve, Then el proceso continúa normalmente
     - Given el rechazo, When ocurre, Then no se generan movimientos de stock adicionales

#### Historia de Usuario: Devolución de venta con reversión de stock

- **Descripción:** Como Administrador quiero anular una venta y devolver el stock correspondiente para corregir errores o atender reclamos de clientes
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Transacción de reversión de venta y stock** (Estado: TODO)
   - _Descripción:_ Implementar Server Action 'devolverVenta' que en una transacción actualice ventas.estado a DEVUELTA, inserte movimientos_stock tipo DEVOLUCION y reponga stock_sucursales correspondiente.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una venta COMPLETADA, When se devuelve, Then el estado cambia a DEVUELTA
     - Given la devolución, When se ejecuta, Then se genera movimiento tipo DEVOLUCION y se repone el stock
     - Given un fallo parcial, When ocurre, Then se revierte toda la transacción

#### Historia de Usuario: Autorización de devolución para Operador

- **Descripción:** Como Operador quiero solicitar autorización de un administrador para realizar una devolución para cumplir con el control de permisos del negocio
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Flujo de doble confirmación con validación de rol autorizante** (Estado: TODO)
   - _Descripción:_ Implementar modal de confirmación que solicite validación (PIN o sesión) de un usuario con rol admin/super_admin antes de que un operador ejecute la Server Action de devolución.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un operador que solicita devolución, When se activa el modal, Then requiere validación de un admin/super_admin
     - Given credenciales de autorizante inválidas, When se ingresan, Then se rechaza la devolución
     - Given la autorización exitosa, When se completa, Then se registra el usuario autorizante en el log

#### Historia de Usuario: Listado paginado de ventas con filtros

- **Descripción:** Como Administrador quiero ver el historial de ventas filtrado por sucursal y estado para analizar el desempeño de mi negocio
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de listado de ventas con filtros de estado y sucursal** (Estado: TODO)
   - _Descripción:_ Crear consulta paginada a ventas con filtros opcionales por estado y sucursal_id, respetando RLS por cliente_id.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un filtro por estado FIADO, When se aplica, Then solo se listan ventas en ese estado
     - Given un filtro por sucursal_id, When se aplica, Then solo se listan ventas de esa sucursal
     - Given ambos filtros combinados, When se aplican, Then el resultado cumple ambas condiciones

---

### Épica: Épica 18: Panel de Módulos y Marketplace Interno

_Descripción:_ Dashboard donde el Super Administrador visualiza los módulos activos, disponibles para contratar y el estado general de la cuenta, pudiendo activar o cancelar módulos 'a la carta' (CATALOGO_WEB, IA_CARGA, MULTI_SUCURSAL, TELEMETRIA). Incluye el mensaje de módulo no contratado al intentar acceder a una función bloqueada (NX-PER-002). Entidad: modulos_comercio.

#### Historia de Usuario: Vista de solo lectura de módulos para Administrador

- **Descripción:** Como Administrador quiero ver el estado de los módulos contratados en modo solo lectura para conocer las funcionalidades disponibles sin poder modificarlas
- **Prioridad:** Baja
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **RLS SELECT-only en modulos_comercio para rol admin** (Estado: TODO)
   - _Descripción:_ Definir policy RLS que permita SELECT en modulos_comercio para rol admin, sin permitir UPDATE, restringido en middleware a super_admin.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un rol admin, When consulta modulos_comercio, Then puede leer los registros
     - Given un rol admin, When intenta UPDATE, Then la policy lo rechaza
     - Given un rol super_admin, When intenta UPDATE, Then se permite

#### Historia de Usuario: Contratación de un módulo adicional

- **Descripción:** Como Super Administrador quiero contratar un módulo adicional para habilitar nuevas funcionalidades en mi comercio
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de activación de módulo** (Estado: TODO)
   - _Descripción:_ Implementar 'activarModulo' que actualice/inserte en modulos_comercio con activo=true, restringido a rol super_admin mediante middleware.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un rol super_admin, When activa un módulo, Then modulos_comercio se actualiza con activo=true
     - Given un rol admin, When intenta activar, Then se rechaza
     - Given la activación, When ocurre, Then se registra el evento de telemetría

#### Historia de Usuario: Bloqueo de acceso a funciones de módulo no contratado

- **Descripción:** Como sistema quiero bloquear el acceso a una funcionalidad cuyo módulo no está activo y mostrar un banner de contratación para guiar al usuario (NX-PER-002)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Guard de verificación de modulos_comercio.activo** (Estado: TODO)
   - _Descripción:_ Crear función server-side reutilizable que valide si un módulo está activo=true en modulos_comercio antes de ejecutar cualquier Server Action del módulo, retornando NX-PER-002.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un módulo inactivo, When se intenta ejecutar su Server Action, Then se rechaza con NX-PER-002
     - Given un módulo activo, When se ejecuta su Server Action, Then continúa normalmente
     - Given la función helper, When se reutiliza en distintos módulos, Then el comportamiento es consistente

#### Historia de Usuario: Cancelación de un módulo contratado

- **Descripción:** Como Super Administrador quiero cancelar un módulo que ya no utilizo para dejar de pagar por él
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de desactivación de módulo** (Estado: TODO)
   - _Descripción:_ Implementar 'cancelarModulo' que actualice activo=false en modulos_comercio, restringido a rol super_admin.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un rol super_admin, When cancela un módulo, Then activo se actualiza a false
     - Given un rol admin, When intenta cancelar, Then se rechaza
     - Given la cancelación, When ocurre, Then se registra el evento de telemetría

#### Historia de Usuario: Visualización de módulos activos y disponibles

- **Descripción:** Como Super Administrador quiero ver un dashboard con los módulos activos y disponibles para contratar para entender qué funcionalidades tengo y cuáles puedo sumar
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de consulta de estado de módulos** (Estado: TODO)
   - _Descripción:_ Crear consulta a modulos_comercio filtrando por cliente_id, complementada con catálogo estático de módulos disponibles no contratados para el dashboard.
   - _Criterios de Aceptación (QA/BDD):_
     - Given módulos activos e inactivos del comercio, When se consulta, Then se listan ambos estados claramente diferenciados
     - Given módulos no contratados, When se consulta, Then aparecen como disponibles para contratar
     - Given un usuario de otro comercio, When consulta, Then RLS impide ver módulos ajenos

---

### Épica: Épica 5: Gestión Multi-Sucursal

_Descripción:_ CRUD de sucursales (crear, editar, desactivar) reservado a Administrador y Super Administrador, incluyendo definición de casa matriz. Contempla la detección de sucursal activa en el contexto del usuario, aplicada transversalmente al Punto de Venta, Stock y Reportes. Entidad: sucursales. Incluye validaciones como impedir traspasos hacia una sucursal inactiva (NX-STK-005).

#### Historia de Usuario: Edición de datos de sucursal

- **Descripción:** Como Administrador quiero editar los datos de una sucursal existente para mantener actualizada su información de contacto
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de edición de sucursal** (Estado: TODO)
   - _Descripción:_ Crear 'actualizarSucursal' con validación Zod de nombre/dirección/teléfono, restricción de rol (admin/super_admin) vía middleware y RLS por cliente_id sobre la tabla sucursales.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un admin, When edita datos de sucursal, Then los cambios se persisten
     - Given un operador, When intenta editar, Then la acción se rechaza
     - Given una sucursal de otro comercio, When se intenta editar, Then RLS bloquea la operación

#### Historia de Usuario: Creación de nueva sucursal

- **Descripción:** Como Administrador quiero crear una nueva sucursal con nombre, dirección y teléfono para expandir la gestión de mi negocio a otro local
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de alta de sucursal** (Estado: TODO)
   - _Descripción:_ Crear 'crearSucursal' validando DTO con Zod, insertando en tabla sucursales con cliente_id del JWT y restringiendo la acción a roles admin/super_admin mediante RLS y middleware.
   - _Criterios de Aceptación (QA/BDD):_
     - Given datos válidos, When los envía un admin, Then se crea con activa=true
     - Given un operador, When intenta crear, Then se rechaza
     - Given un DTO inválido, When se envía, Then Zod lo rechaza antes del insert

#### Historia de Usuario: Definición de casa matriz

- **Descripción:** Como Administrador quiero marcar una sucursal como casa matriz para identificar el local principal del comercio
- **Prioridad:** Baja
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Toggle exclusivo de es_casa_matriz** (Estado: TODO)
   - _Descripción:_ Implementar Server Action que, al marcar una sucursal como casa matriz, desmarque atómicamente cualquier otra sucursal con es_casa_matriz=true del mismo cliente_id en una transacción.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una sucursal marcada como nueva casa matriz, When se confirma, Then la anterior se desmarca atómicamente
     - Given la operación, When finaliza, Then existe exactamente una casa matriz activa
     - Given un fallo a mitad de transacción, When ocurre, Then se revierte completo

#### Historia de Usuario: Listado de sucursales

- **Descripción:** Como Administrador quiero ver el listado de sucursales de mi comercio para conocer todos mis locales activos
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de listado de sucursales activas** (Estado: TODO)
   - _Descripción:_ Crear Server Action que consulte sucursales filtrando por cliente_id y eliminado_en IS NULL, ordenado por es_casa_matriz DESC.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un comercio con sucursales, When se listan, Then se ordenan con casa matriz primero
     - Given sucursales eliminadas, When se listan, Then no aparecen
     - Given un usuario de otro comercio, When consulta, Then RLS impide verlas

#### Historia de Usuario: Desactivación de sucursal

- **Descripción:** Como Administrador quiero desactivar una sucursal para pausar sus operaciones sin perder su historial de datos
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de cambio de estado activa=false** (Estado: TODO)
   - _Descripción:_ Implementar 'desactivarSucursal' que actualice el campo activa a false, validando rol admin/super_admin y bloqueando su selección como sucursal de traspaso/destino.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una sucursal activa, When se desactiva, Then su campo activa cambia a false
     - Given la sucursal desactivada, When se intenta seleccionar como destino de traspaso, Then se bloquea
     - Given un rol operador, When intenta desactivar, Then se rechaza

#### Historia de Usuario: Selección de sucursal activa en el contexto de trabajo

- **Descripción:** Como usuario operativo quiero seleccionar la sucursal en la que estoy trabajando para que el sistema aplique las operaciones al local correcto
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Selector de sucursal persistido en cookie de sesión** (Estado: TODO)
   - _Descripción:_ Crear componente selector en el header del dashboard que actualice una cookie httpOnly/estado de sesión con la sucursal_id activa, consumida por los Server Components del stock y ventas.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un usuario que cambia de sucursal, When confirma, Then la cookie httpOnly se actualiza
     - Given una nueva sesión, When se inicia, Then se lee la sucursal previamente guardada
     - Given los Server Components de stock/ventas, When se renderizan, Then consumen la sucursal de la cookie

---

### Épica: Épica 9: Gestión de Variantes y Atributos Dinámicos (Multirrubro)

_Descripción:_ Permite definir atributos dinámicos (Talle, Color, Sabor, etc.) y sus valores posibles, y generar combinaciones vendibles (variantes) asociadas a un producto padre, cada una con SKU, costo, precio y foto propios. Incluye el wizard de creación de producto con variantes, la validación de combinaciones duplicadas (NX-VAR-001) y la restricción de eliminar atributos con valores en uso (NX-ATR-001). Entidades: productos (tiene_variantes = true), atributos, valores_atributo, variantes_producto, variantes_combinaciones.

#### Historia de Usuario: Wizard de creación de producto con variantes

- **Descripción:** Como Administrador quiero seguir un asistente paso a paso para crear un producto padre con sus atributos y variantes para simplificar la carga de productos complejos
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Componente multi-step para alta de producto con variantes** (Estado: TODO)
   - _Descripción:_ Construir wizard en React con estado controlado por pasos (datos base, atributos, combinaciones), validando cada paso con Zod antes de avanzar, y persistiendo el producto padre + variantes en una transacción Supabase.
   - _Criterios de Aceptación (QA/BDD):_
     - Given el paso 1 incompleto, When se intenta avanzar, Then se bloquea con mensajes de validación
     - Given todos los pasos completos, When se finaliza, Then se crea producto padre y variantes en una transacción
     - Given un fallo en la persistencia final, When ocurre, Then no queda producto huérfano sin variantes

#### Historia de Usuario: Validación de combinación de variante duplicada

- **Descripción:** Como sistema quiero impedir la creación de una combinación de atributos ya existente para el mismo producto para evitar variantes duplicadas (NX-VAR-001)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Constraint único de combinación en variantes_combinaciones** (Estado: TODO)
   - _Descripción:_ Agregar índice UNIQUE compuesto sobre (producto_id, set de valor_atributo_id) o validación aplicativa previa en Server Action que detecte combinaciones idénticas antes del insert (NX-VAR-001).
   - _Criterios de Aceptación (QA/BDD):_
     - Given una combinación de atributos ya existente, When se intenta crear otra igual, Then se rechaza con NX-VAR-001
     - Given una combinación nueva, When se crea, Then se persiste correctamente
     - Given dos productos distintos con la misma combinación, When se crean, Then ambas son válidas

#### Historia de Usuario: Eliminación lógica de variante

- **Descripción:** Como Administrador quiero eliminar una variante específica sin afectar al producto padre para dar de baja presentaciones que ya no vendo
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de soft delete de variante** (Estado: TODO)
   - _Descripción:_ Implementar 'eliminarVariante' que actualice eliminado_en de variantes_producto en vez de DELETE físico, validando rol y cliente_id.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una variante existente, When se elimina, Then se actualiza eliminado_en sin borrado físico
     - Given la variante eliminada, When se consulta el producto padre, Then no se ve afectado
     - Given un rol operador, When intenta eliminar, Then se rechaza

#### Historia de Usuario: Edición individual de SKU, precio, costo y foto por variante

- **Descripción:** Como Administrador quiero editar el SKU, precio, costo y foto de cada variante de forma independiente para reflejar diferencias reales de costo o presentación
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de actualización parcial de variante** (Estado: TODO)
   - _Descripción:_ Implementar 'actualizarVariante' con DTO Zod parcial, validando unicidad de SKU y subiendo nueva foto a Cloudinary si se reemplaza.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un DTO parcial válido, When se envía, Then solo los campos enviados se actualizan
     - Given un SKU nuevo duplicado, When se envía, Then se rechaza
     - Given una nueva foto, When se sube, Then reemplaza la anterior en Cloudinary

#### Historia de Usuario: Restricción de eliminación de atributo en uso

- **Descripción:** Como sistema quiero impedir la eliminación de un atributo con valores asociados a variantes existentes para no romper la integridad del catálogo (NX-ATR-001)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de dependencia antes de eliminar atributo** (Estado: TODO)
   - _Descripción:_ En la Server Action de eliminación de atributo, verificar existencia de valores_atributo referenciados en variantes_combinaciones antes de permitir el borrado, retornando NX-ATR-001.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un atributo con valores en uso en variantes, When se intenta eliminar, Then se rechaza con NX-ATR-001
     - Given un atributo sin uso, When se elimina, Then se permite
     - Given el bloqueo, When se muestra, Then el mensaje es claro para el usuario

#### Historia de Usuario: Alerta de variante sin stock asignado

- **Descripción:** Como Operador quiero ser alertado si una variante no tiene stock asignado en mi sucursal al intentar venderla para evitar errores en el mostrador (NX-VAR-002)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Chequeo de stock_sucursales en selección de variante en POS** (Estado: TODO)
   - _Descripción:_ En el componente de búsqueda del Punto de Venta, consultar stock_sucursales de la variante y sucursal activa; si es 0 o inexistente, mostrar alerta NX-VAR-002.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una variante sin stock en la sucursal activa, When se selecciona, Then se muestra alerta NX-VAR-002
     - Given una variante con stock disponible, When se selecciona, Then se permite agregar al carrito
     - Given el bloqueo, When ocurre, Then no se agrega el ítem al carrito

#### Historia de Usuario: Generación de combinaciones de variantes

- **Descripción:** Como Administrador quiero generar automáticamente las combinaciones posibles entre valores de atributos para agilizar la creación de variantes vendibles
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Algoritmo de producto cartesiano de valores de atributo** (Estado: TODO)
   - _Descripción:_ Implementar función server-side que calcule el producto cartesiano entre los valores_atributo seleccionados, generando el set de variantes_producto y sus variantes_combinaciones a insertar.
   - _Criterios de Aceptación (QA/BDD):_
     - Given 2 atributos con 3 y 2 valores respectivamente, When se generan combinaciones, Then se crean 6 variantes
     - Given un solo atributo con 3 valores, When se generan, Then se crean 3 variantes
     - Given combinaciones ya existentes, When se regenera, Then no se duplican (respeta NX-VAR-001)

#### Historia de Usuario: Creación de atributos dinámicos

- **Descripción:** Como Administrador quiero crear atributos personalizados (Talle, Color, Sabor) para adaptar el sistema al rubro de mi negocio
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de alta de atributo** (Estado: TODO)
   - _Descripción:_ Implementar 'crearAtributo' validando nombre obligatorio con Zod e insertando en tabla atributos con cliente_id del JWT.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un nombre válido, When se crea el atributo, Then se inserta con cliente_id del JWT
     - Given nombre vacío, When se envía, Then se rechaza por Zod
     - Given el atributo creado, When se consulta, Then aparece en el listado de atributos del comercio

#### Historia de Usuario: Gestión de valores de atributo

- **Descripción:** Como Administrador quiero agregar y editar valores concretos para cada atributo (ej. XL, Rojo) para poder generar combinaciones de productos
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action CRUD de valores_atributo** (Estado: TODO)
   - _Descripción:_ Implementar Server Actions de creación/edición de valores_atributo asociados a un atributo_id, validando con Zod y cliente_id.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un atributo existente, When se crea un nuevo valor, Then se asocia correctamente al atributo_id
     - Given un valor existente, When se edita, Then se persiste el cambio
     - Given un valor vacío, When se envía, Then Zod lo rechaza

---

### Épica: Épica 13: Traspaso de Mercadería entre Sucursales

_Descripción:_ Permite registrar el envío de productos/variantes desde una sucursal de origen a una de destino, descontando e ingresando stock automáticamente en cada local y generando los movimientos de trazabilidad correspondientes (TRASPASO_SALIDA / TRASPASO_ENTRADA). Incluye validaciones de sucursal origen igual a destino (NX-STK-004) y sucursal destino inactiva (NX-STK-005). Entidades: stock_sucursales, movimientos_stock, sucursales.

#### Historia de Usuario: Bloqueo de traspaso a sucursal inactiva

- **Descripción:** Como sistema quiero impedir un traspaso hacia una sucursal inactiva para evitar mercadería enviada a un local no operativo (NX-STK-005)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de sucursal destino activa** (Estado: TODO)
   - _Descripción:_ En la Server Action de traspaso, verificar sucursales.activa=true de la sucursal destino antes de ejecutar el movimiento, rechazando con NX-STK-005.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una sucursal destino inactiva, When se intenta traspaso, Then se rechaza con NX-STK-005
     - Given una sucursal destino activa, When se ejecuta el traspaso, Then se permite
     - Given el rechazo, When ocurre, Then no se genera ningún movimiento de stock

#### Historia de Usuario: Validación de sucursal origen igual a destino

- **Descripción:** Como sistema quiero impedir un traspaso donde el origen y destino sean la misma sucursal para evitar movimientos sin sentido (NX-STK-004)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación Zod refine de sucursales distintas** (Estado: TODO)
   - _Descripción:_ En el schema Zod del traspaso, usar .refine() para validar sucursal_origen_id !== sucursal_destino_id, retornando NX-STK-004.
   - _Criterios de Aceptación (QA/BDD):_
     - Given sucursal_origen_id igual a sucursal_destino_id, When se valida, Then se rechaza con NX-STK-004
     - Given sucursales distintas, When se valida, Then se acepta
     - Given el error, When se muestra, Then es claro para el usuario

#### Historia de Usuario: Registro de movimientos por traspaso

- **Descripción:** Como sistema quiero generar los movimientos de trazabilidad de salida y entrada por cada traspaso para mantener un historial auditable
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Transacción de doble movimiento TRASPASO_SALIDA/ENTRADA** (Estado: TODO)
   - _Descripción:_ Implementar Server Action que, dentro de una única transacción SQL, inserte movimientos_stock de tipo TRASPASO_SALIDA en origen y TRASPASO_ENTRADA en destino.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un traspaso válido, When se ejecuta, Then se insertan ambos movimientos en una sola transacción
     - Given un fallo en cualquiera de los dos inserts, When ocurre, Then se revierte la transacción completa
     - Given los movimientos generados, When se consultan, Then están vinculados al mismo evento de traspaso

#### Historia de Usuario: Descuento e ingreso automático de stock por traspaso

- **Descripción:** Como sistema quiero descontar el stock del local de origen e ingresarlo al de destino automáticamente al confirmar un traspaso para mantener el inventario correcto en ambos locales
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Transacción de doble update en stock_sucursales por traspaso** (Estado: TODO)
   - _Descripción:_ Dentro de la Server Action de traspaso, ejecutar en una transacción el UPDATE de decremento en stock_sucursales de origen y el UPDATE/INSERT de incremento en destino.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un traspaso válido, When se ejecuta, Then se decrementa stock en origen y se incrementa en destino en la misma transacción
     - Given un fallo parcial, When ocurre, Then se revierte ambos updates
     - Given el resultado final, When se consulta, Then el stock total del comercio permanece constante

#### Historia de Usuario: Registro de traspaso entre sucursales

- **Descripción:** Como Operador quiero registrar el envío de productos desde una sucursal de origen a una de destino para redistribuir mercadería entre mis locales
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de creación de traspaso** (Estado: TODO)
   - _Descripción:_ Implementar 'registrarTraspaso' que reciba sucursal_origen_id, sucursal_destino_id, producto/variante y cantidad, orquestando las validaciones y la transacción de movimiento.
   - _Criterios de Aceptación (QA/BDD):_
     - Given sucursales distintas y destino activo, When se registra el traspaso, Then se ejecuta la transacción completa
     - Given sucursal origen igual a destino, When se intenta, Then se rechaza con NX-STK-004
     - Given stock insuficiente en origen, When se intenta, Then se rechaza

---

### Épica: Épica 21: Carga Mágica de Productos con IA

_Descripción:_ Permite subir la foto de un producto o etiqueta para que el sistema extraiga automáticamente sus datos (nombre, precio, etc.) usando OpenAI, precargando el formulario de alta. Incluye bloqueo al alcanzar el límite mensual por comercio (NX-IA-001), manejo de imagen no procesable (NX-IA-002) y caída temporal del servicio de IA (NX-IA-003). Entidad: registros_uso_ia.

#### Historia de Usuario: Visualización de consumo y límite mensual de IA

- **Descripción:** Como Administrador quiero ver cuántas cargas con IA llevo usadas en el mes para controlar mi consumo antes de llegar al límite
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Consulta agregada de registros_uso_ia por mes** (Estado: TODO)
   - _Descripción:_ Implementar Server Action que cuente registros de registros_uso_ia con mes_anio actual y estado EXITO, comparando contra el límite configurado del plan.
   - _Criterios de Aceptación (QA/BDD):_
     - Given registros del mes actual con estado EXITO, When se cuentan, Then el total es correcto
     - Given el conteo, When se compara contra el límite del plan, Then determina si está disponible o bloqueado
     - Given un mes sin registros, When se consulta, Then retorna 0

#### Historia de Usuario: Subida de foto para extracción automática de datos

- **Descripción:** Como Administrador quiero subir la foto de un producto o etiqueta para que la IA extraiga automáticamente sus datos y agilizar el alta de productos
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Endpoint de integración con OpenAI Vision para extracción** (Estado: TODO)
   - _Descripción:_ Crear API Route server-side que reciba la imagen, la envíe a la API de OpenAI para extracción de datos estructurados (nombre, precio) y registre el resultado en registros_uso_ia.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una imagen válida de producto, When se envía, Then se obtiene un JSON con datos extraídos
     - Given la extracción exitosa, When finaliza, Then se registra estado_extraccion=EXITO en registros_uso_ia
     - Given un límite mensual alcanzado, When se invoca, Then se bloquea antes de llamar a OpenAI

#### Historia de Usuario: Manejo de caída del servicio de IA

- **Descripción:** Como sistema quiero mostrar un mensaje de error controlado cuando el servicio de OpenAI no está disponible para que el usuario pueda reintentar más tarde (NX-IA-003)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Manejo de excepción y fallback ante error de OpenAI** (Estado: TODO)
   - _Descripción:_ Envolver la llamada a la API de OpenAI en try/catch con timeout, capturando errores 5xx/timeout y retornando NX-IA-003 sin bloquear el flujo del usuario.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un timeout de la API de OpenAI, When ocurre, Then se retorna NX-IA-003 sin bloquear al usuario
     - Given un error 5xx de OpenAI, When ocurre, Then se captura y maneja apropiadamente
     - Given el fallback, When se activa, Then no deja el registros_uso_ia en estado inconsistente

#### Historia de Usuario: Manejo de imagen no procesable

- **Descripción:** Como sistema quiero informar con sugerencias de mejora cuando una imagen no puede ser procesada por la IA para orientar al usuario a intentarlo de nuevo (NX-IA-002)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de respuesta vacía/errónea de extracción IA** (Estado: TODO)
   - _Descripción:_ Tras invocar la API de OpenAI, validar que la respuesta contenga los campos esperados; si no, registrar estado_extraccion=ERROR en registros_uso_ia y retornar NX-IA-002 con sugerencias.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una respuesta de OpenAI sin los campos esperados, When se procesa, Then se registra estado_extraccion=ERROR
     - Given el error, When ocurre, Then se retorna NX-IA-002 con sugerencias de mejora
     - Given una respuesta válida y completa, When se procesa, Then se registra estado_extraccion=EXITO

#### Historia de Usuario: Bloqueo por límite mensual alcanzado

- **Descripción:** Como sistema quiero bloquear la función de carga con IA al alcanzar el límite mensual del comercio y mostrar un banner de upgrade para gestionar el uso del servicio (NX-IA-001)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de conteo mensual de registros_uso_ia** (Estado: TODO)
   - _Descripción:_ Antes de invocar la API de OpenAI, contar registros_uso_ia con estado EXITO del mes_anio actual; si alcanza el límite del plan, bloquear con NX-IA-001.
   - _Criterios de Aceptación (QA/BDD):_
     - Given el límite del plan alcanzado, When se intenta usar carga IA, Then se bloquea con NX-IA-001 antes de invocar OpenAI
     - Given consumo bajo el límite, When se usa, Then se permite la operación
     - Given un nuevo mes, When comienza, Then el conteo se reinicia

#### Historia de Usuario: Precarga de formulario con datos extraídos

- **Descripción:** Como Administrador quiero que el formulario de alta de producto se precargue con los datos detectados por la IA para revisarlos y confirmarlos rápidamente
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Autocompletado de formulario con respuesta de IA** (Estado: TODO)
   - _Descripción:_ Mapear la respuesta estructurada de OpenAI a los campos del formulario de alta de producto (React Hook Form/state), permitiendo edición manual antes de guardar.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una respuesta estructurada de OpenAI, When se recibe, Then los campos del formulario se precargan automáticamente
     - Given los campos precargados, When el usuario los edita, Then los cambios manuales prevalecen
     - Given una respuesta incompleta, When se recibe, Then solo se precargan los campos disponibles

---

### Épica: Épica 11: Actualización Masiva de Precios

_Descripción:_ Permite incrementar o ajustar precios de forma global o filtrando por categoría y/o proveedor, aplicando un porcentaje o monto fijo de manera instantánea. Incluye la validación que impide dejar precios en cero o negativo (NX-UPD-001). Entidades: productos, variantes_producto, categorias, proveedores.

#### Historia de Usuario: Actualización de precios filtrada por categoría o proveedor

- **Descripción:** Como Administrador quiero aplicar un ajuste de precios filtrando por categoría o proveedor para actualizar solo un subconjunto específico de productos
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de actualización masiva filtrada** (Estado: TODO)
   - _Descripción:_ Implementar 'actualizarPreciosMasivo' que reciba filtros (categoria_id, proveedor_id) y porcentaje/monto, ejecutando un UPDATE parametrizado sobre productos y variantes_producto dentro de una transacción con RLS respetada.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un filtro por categoria_id, When se ajusta el precio, Then solo esos productos cambian
     - Given un filtro por proveedor_id, When se aplica, Then solo esos productos se actualizan
     - Given un resultado <= 0, When se intenta ejecutar, Then se rechaza con NX-UPD-001
     - Given la actualización, When se ejecuta, Then afecta también las variantes

#### Historia de Usuario: Vista previa de impacto antes de aplicar cambios

- **Descripción:** Como Administrador quiero previsualizar el impacto de un ajuste masivo de precios antes de confirmarlo para evitar errores costosos
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Endpoint de simulación de actualización masiva de precios** (Estado: TODO)
   - _Descripción:_ Crear Server Action de solo lectura que calcule y retorne el precio resultante por producto/variante según filtros, sin ejecutar el UPDATE, para renderizar tabla de previsualización.
   - _Criterios de Aceptación (QA/BDD):_
     - Given filtros aplicados, When se simula, Then se retorna la tabla de precios resultantes sin ejecutar UPDATE
     - Given la simulación, When se ejecuta, Then no persiste cambios en base de datos
     - Given un resultado negativo, When se simula, Then se marca visualmente como inválido

#### Historia de Usuario: Actualización de precios por monto fijo

- **Descripción:** Como Administrador quiero aplicar un ajuste de monto fijo a mis precios para incrementar o reducir valores de forma uniforme
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de ajuste de precio por monto absoluto** (Estado: TODO)
   - _Descripción:_ Extender 'actualizarPreciosMasivo' para soportar modo monto fijo, sumando/restando un valor numérico a precio_venta con validación de resultado positivo.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un monto fijo positivo, When se aplica, Then los precios aumentan ese monto
     - Given un monto que dejaría precio <= 0, When se aplica, Then se rechaza con NX-UPD-001
     - Given el ajuste, When se ejecuta, Then afecta productos y variantes según filtros

#### Historia de Usuario: Actualización global de precios por porcentaje

- **Descripción:** Como Administrador quiero aplicar un incremento porcentual a todos mis precios para ajustar mi catálogo ante cambios de costos generales
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de ajuste porcentual masivo sin filtros** (Estado: TODO)
   - _Descripción:_ Extender 'actualizarPreciosMasivo' para aplicar porcentaje sobre todos los productos del cliente_id cuando no se especifiquen filtros, validando NX-UPD-001.
   - _Criterios de Aceptación (QA/BDD):_
     - Given ningún filtro aplicado, When se ejecuta el ajuste, Then afecta a todos los productos del comercio
     - Given un resultado <= 0, When se calcula, Then se rechaza con NX-UPD-001
     - Given el ajuste ejecutado, When se consulta, Then los precios reflejan el porcentaje aplicado

#### Historia de Usuario: Validación de precio final positivo

- **Descripción:** Como sistema quiero impedir que una actualización masiva deje precios en cero o negativo para proteger la integridad del catálogo (NX-UPD-001)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación Zod refine de precio resultante mayor a cero** (Estado: TODO)
   - _Descripción:_ En el schema de actualización masiva de precios, usar .refine() para calcular el precio resultante y rechazar si es <= 0, retornando NX-UPD-001.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un ajuste que dejaría precio en 0, When se calcula, Then se rechaza con NX-UPD-001
     - Given un ajuste que deja precio positivo, When se calcula, Then se acepta
     - Given un descuento excesivo (mayor al 100%), When se aplica, Then se rechaza

---

### Épica: Épica 1: Autenticación, Sesión y Seguridad Base

_Descripción:_ Cubre el inicio de sesión, cierre de sesión, recuperación y actualización de contraseña delegados a Supabase Auth. Incluye el middleware centralizado de verificación de sesión (expiración a 1 hora de inactividad), decodificación y verificación criptográfica de tokens JWT, manejo de claims 'cliente_id' y 'rol', protección de rutas privadas bajo (dashboard), rate limiting anti fuerza bruta y política de CORS con allowlist. Entidades involucradas: comercios (auth_user_id), usuarios_comercio. No incluye gestión CRUD de usuarios internos, cubierta en la épica de Administración de Usuarios.

#### Historia de Usuario: Expiración automática de sesión por inactividad

- **Descripción:** Como sistema quiero expirar la sesión de un usuario tras 1 hora de inactividad para reducir el riesgo de accesos no autorizados (NX-AUTH-001)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Configuración de expiración de sesión en Supabase Auth** (Estado: TODO)
   - _Descripción:_ Configurar el TTL de sesión de Supabase Auth a 1 hora y validar en el middleware Next.js el campo 'exp' del JWT en cada request, forzando logout y limpieza de estado si expiró.
   - _Criterios de Aceptación (QA/BDD):_
     - Given más de 60 minutos de inactividad, When el usuario hace una petición, Then es redirigido a login con NX-AUTH-001
     - Given una sesión dentro del límite, When se hace una petición, Then continúa sin interrupciones
     - Given el JWT expirado, When llega al middleware, Then se limpia el estado local

#### Historia de Usuario: Actualización de contraseña con token

- **Descripción:** Como comerciante quiero definir una nueva contraseña usando el enlace recibido para recuperar el acceso a mi cuenta
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Página de actualización de contraseña vía Supabase Auth** (Estado: TODO)
   - _Descripción:_ Implementar /actualizar-contraseña/page.tsx que use supabase.auth.updateUser con el token de recuperación de la URL, validando el nuevo password con Zod (mínimo de seguridad) antes de enviar.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un token válido, When se define nueva contraseña, Then se actualiza y redirige a login
     - Given una contraseña débil, When se envía, Then se rechaza con mensaje claro
     - Given un token expirado, When se usa, Then se muestra NX-AUTH-004

#### Historia de Usuario: Recuperación de contraseña por correo

- **Descripción:** Como comerciante quiero solicitar un enlace de recuperación de contraseña a mi correo para poder acceder nuevamente si la olvidé
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de solicitud de recuperación vía Supabase Auth** (Estado: TODO)
   - _Descripción:_ Implementar Server Action que invoque supabase.auth.resetPasswordForEmail, validando el email con Zod y mostrando mensaje genérico independientemente de si el correo existe (evitar user enumeration).
   - _Criterios de Aceptación (QA/BDD):_
     - Given un email registrado, When se solicita recuperación, Then se envía el correo
     - Given un email no registrado, When se solicita, Then se muestra el mismo mensaje genérico
     - Given un email inválido, When se envía, Then se rechaza por Zod

#### Historia de Usuario: Cierre de sesión

- **Descripción:** Como usuario autenticado quiero cerrar sesión de forma segura para proteger mi cuenta cuando termino de usar el sistema
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de logout con Supabase Auth** (Estado: TODO)
   - _Descripción:_ Implementar Server Action que invoque supabase.auth.signOut(), limpie cookies de sesión y redirija a /login, sin exponer tokens en logs.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una sesión activa, When cierra sesión, Then se invoca signOut y se limpian cookies
     - Given el logout, When el usuario intenta acceder al dashboard, Then es redirigido a /login
     - Given el proceso, When se ejecuta, Then no se loguean tokens

#### Historia de Usuario: Verificación criptográfica de JWT

- **Descripción:** Como sistema quiero decodificar y verificar criptográficamente cada token JWT recibido para garantizar que las peticiones sean legítimas
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de firma JWT en middleware** (Estado: TODO)
   - _Descripción:_ En el middleware Next.js, usar la librería de verificación de Supabase (jwtVerify) para validar firma y expiración del token en cada request antes de extraer claims, no solo decodificar.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un JWT con firma inválida, When se procesa, Then se rechaza con NX-AUTH-001
     - Given un JWT válido y no expirado, When se procesa, Then se permite el acceso
     - Given un token manipulado, When se intenta usar, Then la verificación criptográfica lo detecta

#### Historia de Usuario: Redirección de usuario ya autenticado

- **Descripción:** Como usuario ya autenticado quiero ser redirigido al dashboard si intento acceder al login para evitar acciones redundantes (NX-AUTH-005)
- **Prioridad:** Baja
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Guard de sesión activa en rutas públicas de auth** (Estado: TODO)
   - _Descripción:_ En middleware, si existe sesión válida y la ruta es /login o /registro, redirigir a /dashboard/inicio (NX-AUTH-005).
   - _Criterios de Aceptación (QA/BDD):_
     - Given una sesión válida, When se accede a /login, Then se redirige a /dashboard/inicio
     - Given una sesión válida, When se accede a /registro, Then se redirige a /dashboard/inicio
     - Given sin sesión, When se accede a /login, Then se muestra el formulario normalmente

#### Historia de Usuario: Inicio de sesión con email y contraseña

- **Descripción:** Como comerciante quiero iniciar sesión con mi correo y contraseña para acceder al panel de administración de mi negocio
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de login vía Supabase Auth** (Estado: TODO)
   - _Descripción:_ Implementar Server Action que invoque supabase.auth.signInWithPassword validando credenciales con Zod, manejando NX-AUTH-002 en caso de error.
   - _Criterios de Aceptación (QA/BDD):_
     - Given credenciales válidas, When se envían, Then se autentica exitosamente y se genera sesión
     - Given credenciales inválidas, When se envían, Then se retorna NX-AUTH-002
     - Given el DTO de login, When se valida con Zod, Then rechaza formatos de email inválidos

#### Historia de Usuario: Bloqueo de credenciales incorrectas

- **Descripción:** Como comerciante quiero recibir un mensaje claro si mi email o contraseña son incorrectos para corregir mis datos de acceso (NX-AUTH-002)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Manejo de error de autenticación con mensaje NX-AUTH-002** (Estado: TODO)
   - _Descripción:_ Capturar el error retornado por supabase.auth.signInWithPassword y mapearlo al mensaje estandarizado NX-AUTH-002, limpiando el campo contraseña en el formulario.
   - _Criterios de Aceptación (QA/BDD):_
     - Given credenciales incorrectas, When se envían, Then se muestra NX-AUTH-002
     - Given el error, When se muestra, Then el campo contraseña se limpia
     - Given credenciales correctas posteriores, When se envían, Then el login se completa normalmente

#### Historia de Usuario: Bloqueo de cuenta suspendida por morosidad

- **Descripción:** Como comerciante moroso quiero ver una pantalla de bloqueo con información de contacto al iniciar sesión para poder regularizar mi servicio (NX-AUTH-003)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de estado_pago en el flujo de login** (Estado: TODO)
   - _Descripción:_ Tras autenticar con Supabase Auth, consultar comercios.estado_pago; si es false, redirigir a pantalla de bloqueo con NX-AUTH-003 antes de dar acceso al dashboard.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un login exitoso con estado_pago=false, When se completa la autenticación, Then se redirige a la pantalla de bloqueo con NX-AUTH-003
     - Given estado_pago=true, When se completa el login, Then se accede al dashboard normalmente
     - Given el chequeo, When ocurre, Then sucede inmediatamente después de autenticar

#### Historia de Usuario: Rate limiting en endpoints de autenticación

- **Descripción:** Como sistema quiero limitar la cantidad de intentos de login en un período corto para prevenir ataques de fuerza bruta
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Middleware de rate limiting sobre /login y /recuperar** (Estado: TODO)
   - _Descripción:_ Implementar rate limiting (ej. basado en IP y ventana deslizante) en el middleware de Next.js sobre los endpoints de autenticación, retornando NX-SYS-001 al exceder el límite.
   - _Criterios de Aceptación (QA/BDD):_
     - Given múltiples intentos de login desde la misma IP en poco tiempo, When se exceden, Then se rechaza con NX-SYS-001
     - Given intentos dentro del límite, When ocurren, Then se procesan normalmente
     - Given el límite excedido, When ocurre, Then se aplica también sobre /recuperar

#### Historia de Usuario: Política de CORS con allowlist

- **Descripción:** Como sistema quiero restringir los orígenes permitidos mediante una lista blanca de CORS para evitar peticiones desde dominios no autorizados
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Configuración de headers CORS en API Routes públicas** (Estado: TODO)
   - _Descripción:_ Configurar en next.config.js o middleware los headers Access-Control-Allow-Origin restringidos a una lista blanca de dominios permitidos para los endpoints públicos (/api/track, /api/webhook).
   - _Criterios de Aceptación (QA/BDD):_
     - Given un origen en la allowlist, When realiza una petición a /api/track, Then se permite
     - Given un origen fuera de la allowlist, When realiza una petición, Then se rechaza
     - Given /api/webhook, When se consulta desde origen no autorizado, Then también se rechaza

#### Historia de Usuario: Middleware de protección de rutas privadas

- **Descripción:** Como sistema quiero validar la sesión en un middleware centralizado para proteger todas las rutas del panel sin duplicar lógica en cada componente
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Middleware centralizado de Next.js para rutas (dashboard)** (Estado: TODO)
   - _Descripción:_ Implementar middleware.ts que intercepte todas las rutas bajo /dashboard, valide sesión y JWT, y redirija a /login si no es válida, evitando validaciones repetidas por componente.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una ruta bajo /dashboard sin sesión válida, When se accede, Then se redirige a /login
     - Given una ruta bajo /dashboard con sesión válida, When se accede, Then se permite el acceso
     - Given rutas públicas como /catalogo/[slug], When se accede, Then no requieren pasar por esta validación

#### Historia de Usuario: Manejo de enlace de recuperación expirado

- **Descripción:** Como comerciante quiero recibir un mensaje claro si mi enlace de recuperación expiró para poder solicitar uno nuevo (NX-AUTH-004)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de token expirado en actualización de contraseña** (Estado: TODO)
   - _Descripción:_ Capturar el error de token expirado retornado por Supabase Auth al intentar updateUser y redirigir a pantalla de solicitud de nuevo enlace con NX-AUTH-004.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un token vencido, When se intenta actualizar contraseña, Then se muestra NX-AUTH-004
     - Given el error, When se muestra, Then ofrece opción de solicitar nuevo enlace
     - Given un token válido, When se usa dentro del plazo, Then la actualización se completa normalmente

---

### Épica: Épica 15: Punto de Venta / Panel de Mostrador Multi-Local

_Descripción:_ Pantalla rápida de ventas físicas que detecta la sucursal activa del usuario, permite armar un carrito, seleccionar cliente final opcional (para fiado) y confirmar la venta descontando stock automáticamente solo del local correspondiente. Incluye prevención de race conditions en doble clic de cobro, validación de carrito vacío (NX-SAL-001), cantidades inválidas (NX-SAL-002) y conflicto de stock modificado durante la operación (NX-SAL-003). Entidades: ventas, detalles_venta, stock_sucursales, movimientos_stock.

#### Historia de Usuario: Validación de carrito vacío

- **Descripción:** Como sistema quiero impedir confirmar una venta sin productos en el carrito para evitar registros vacíos (NX-SAL-001)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de esquema Zod para carrito de venta** (Estado: TODO)
   - _Descripción:_ Definir DTO de venta con Zod exigiendo array de items con longitud mínima 1; rechazar en la Server Action de confirmación con NX-SAL-001 antes de tocar base de datos (Fail-Fast).
   - _Criterios de Aceptación (QA/BDD):_
     - Given un carrito vacío, When se confirma la venta, Then se rechaza con NX-SAL-001
     - Given un carrito con al menos un ítem, When se valida, Then el schema pasa correctamente
     - Given el schema, When se reutiliza en cliente y servidor, Then el comportamiento es consistente

#### Historia de Usuario: Detección automática de sucursal activa en el mostrador

- **Descripción:** Como Operador quiero que el sistema detecte automáticamente la sucursal en la que trabajo para que la venta descuente el stock del local correcto
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Contexto de sucursal activa en sesión de usuario** (Estado: TODO)
   - _Descripción:_ Almacenar sucursal_id activa en el JWT/claims o en cookie httpOnly tras login/selección, y consumirla en el componente de Punto de Venta vía Server Component para filtrar stock.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un usuario que selecciona sucursal, When navega al POS, Then el contexto refleja la selección
     - Given el cierre y reingreso de sesión, When se inicializa, Then usa la última sucursal o casa matriz por defecto
     - Given un cambio de sucursal, When ocurre, Then los componentes dependientes se actualizan

#### Historia de Usuario: Validación de cantidad mayor a cero

- **Descripción:** Como sistema quiero exigir que la cantidad de cada ítem del carrito sea mayor a cero para evitar líneas de venta inválidas (NX-SAL-002)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación Zod de cantidad positiva en carrito** (Estado: TODO)
   - _Descripción:_ Definir schema Zod para item de venta con cantidad z.number().positive(), validando en cliente y servidor antes de persistir el detalle de venta (NX-SAL-002).
   - _Criterios de Aceptación (QA/BDD):_
     - Given cantidad=0, When se agrega al carrito, Then se rechaza con NX-SAL-002
     - Given cantidad negativa, When se envía, Then se rechaza
     - Given cantidad positiva, When se valida, Then se acepta

#### Historia de Usuario: Selección de cliente final para venta a crédito

- **Descripción:** Como Operador quiero seleccionar un cliente final registrado al vender a crédito para asignar la deuda correctamente a su cuenta corriente
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Buscador de cliente_final_id en el formulario de venta** (Estado: TODO)
   - _Descripción:_ Crear componente de búsqueda con autocompletado que consulte clientes_finales filtrando por nombre_completo, asignando cliente_final_id al DTO de la venta.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un término de búsqueda, When se escribe, Then se filtran clientes por nombre_completo
     - Given un cliente seleccionado, When se elige, Then su id se asigna al DTO de venta
     - Given ningún resultado, When se busca, Then se ofrece la opción de alta rápida

#### Historia de Usuario: Prevención de doble cobro por doble clic

- **Descripción:** Como sistema quiero bloquear peticiones duplicadas de cobro simultáneas para evitar ventas y descuentos de stock duplicados
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Deshabilitación de botón y lock de Server Action de venta** (Estado: TODO)
   - _Descripción:_ Deshabilitar el botón 'Cobrar' inmediatamente al primer clic (estado de loading) y validar en el servidor un lock/idempotency key para evitar procesar la misma venta dos veces.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un primer clic en Cobrar, When ocurre, Then el botón se deshabilita inmediatamente
     - Given un segundo clic simulado antes de la respuesta, When ocurre, Then el servidor bloquea el procesamiento duplicado por idempotency key
     - Given la venta confirmada, When finaliza, Then el botón se re-habilita solo si corresponde a una nueva venta

#### Historia de Usuario: Búsqueda y agregado de productos al carrito

- **Descripción:** Como Operador quiero buscar productos y agregarlos al carrito de venta para armar rápidamente el pedido de un cliente
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Componente de búsqueda de productos con debounce en POS** (Estado: TODO)
   - _Descripción:_ Crear componente de búsqueda con debounce que consulte productos/variantes por nombre o SKU y permita agregarlos al estado del carrito (React state) del Punto de Venta.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un término de búsqueda, When se escribe, Then la consulta se ejecuta tras el debounce configurado
     - Given un producto encontrado, When se selecciona, Then se agrega al estado del carrito
     - Given ninguna coincidencia, When se busca, Then se muestra mensaje de sin resultados

#### Historia de Usuario: Confirmación de venta al contado

- **Descripción:** Como Operador quiero confirmar una venta al contado descontando el stock automáticamente para registrar la operación de forma rápida y precisa
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action transaccional de confirmación de venta** (Estado: TODO)
   - _Descripción:_ Implementar 'confirmarVenta' que en una transacción inserte ventas y detalles_venta, descuente stock_sucursales y genere movimientos_stock tipo VENTA.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un carrito válido, When se confirma, Then se insertan ventas y detalles_venta en una transacción
     - Given la venta confirmada, When se ejecuta, Then se descuenta stock y se genera movimiento tipo VENTA
     - Given un fallo en cualquier paso, When ocurre, Then se revierte toda la transacción

#### Historia de Usuario: Manejo de conflicto de stock durante la venta

- **Descripción:** Como sistema quiero detectar si el stock de un producto cambió mientras estaba en el carrito y notificar al Operador para evitar vender mercadería inexistente (NX-SAL-003)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Revalidación de stock previo al commit de la venta** (Estado: TODO)
   - _Descripción:_ Antes de ejecutar la transacción final de venta, re-consultar stock_sucursales de cada ítem del carrito; si difiere de lo cacheado en cliente, abortar y retornar NX-SAL-003 con datos actualizados.
   - _Criterios de Aceptación (QA/BDD):_
     - Given el stock modificado externamente durante la sesión del carrito, When se intenta confirmar, Then se rechaza con NX-SAL-003 y datos actualizados
     - Given el stock sin cambios, When se confirma, Then la venta se procesa normalmente
     - Given la revalidación, When ocurre, Then sucede justo antes de la transacción final

---

### Épica: Épica 17: Clientes Finales y Cuentas Corrientes (El Fiado)

_Descripción:_ CRUD de clientes finales recurrentes con datos de contacto y saldo deudor. Permite asignar ventas no pagadas (modalidad FIADO) generando deuda, y registrar pagos que descuentan el saldo. Incluye validación de cliente no registrado (NX-CLI-001), deuda activa existente (NX-CLI-002), monto de pago mayor al saldo (NX-CLI-003) e imposibilidad de eliminar pagos ya conciliados (NX-PAG-001). Entidades: clientes_finales, pagos_cuenta_corriente, ventas.

#### Historia de Usuario: Registro de cliente final

- **Descripción:** Como Administrador quiero registrar un cliente final con sus datos de contacto para poder ofrecerle ventas a crédito
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de alta de cliente final** (Estado: TODO)
   - _Descripción:_ Implementar 'crearClienteFinal' validando DTO con Zod (nombre_completo obligatorio), insertando en clientes_finales con saldo_deuda inicial en 0.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un nombre_completo válido, When se crea, Then se inserta con saldo_deuda=0
     - Given un nombre vacío, When se envía, Then Zod lo rechaza
     - Given el rol operador, When crea un cliente, Then la acción es permitida

#### Historia de Usuario: Confirmación ante deuda activa existente

- **Descripción:** Como Operador quiero recibir una alerta si el cliente ya tiene deuda activa antes de registrar una nueva venta a crédito para decidir cómo proceder (NX-CLI-002)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Chequeo de saldo_deuda antes de nueva venta fiada** (Estado: TODO)
   - _Descripción:_ En la Server Action de venta a crédito, consultar saldo_deuda del cliente_final_id y retornar advertencia NX-CLI-002 si es mayor a 0, requiriendo confirmación explícita del frontend.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un cliente con saldo_deuda > 0, When se intenta nueva venta fiada, Then se muestra advertencia NX-CLI-002
     - Given un cliente con saldo_deuda = 0, When se vende a crédito, Then no se muestra advertencia
     - Given la advertencia, When se confirma explícitamente, Then la venta continúa

#### Historia de Usuario: Alerta de cliente no registrado en venta a crédito

- **Descripción:** Como Operador quiero que el sistema me sugiera crear un cliente si no está registrado al intentar una venta a crédito para no interrumpir la operación (NX-CLI-001)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Búsqueda de cliente con sugerencia de alta rápida** (Estado: TODO)
   - _Descripción:_ En el buscador de cliente del POS, si no hay coincidencias, mostrar modal de alta rápida de clientes_finales precargando el término buscado como nombre (NX-CLI-001).
   - _Criterios de Aceptación (QA/BDD):_
     - Given un término sin coincidencias, When se busca, Then se muestra modal de alta rápida con NX-CLI-001
     - Given el modal, When se abre, Then precarga el término buscado como nombre
     - Given una coincidencia existente, When se busca, Then se selecciona directamente sin mostrar el modal

#### Historia de Usuario: Detalle de cliente con historial de ventas y pagos

- **Descripción:** Como Administrador quiero ver el detalle de un cliente con su historial de ventas y pagos para conocer su comportamiento de pago
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Consulta agregada de cliente con joins a ventas y pagos** (Estado: TODO)
   - _Descripción:_ Crear Server Action que obtenga clientes_finales junto con sus ventas (estado FIADO) y pagos_cuenta_corriente mediante joins tipados, respetando RLS.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un cliente con historial, When se consulta el detalle, Then se retornan ventas FIADO y pagos asociados
     - Given un cliente sin historial, When se consulta, Then retorna arrays vacíos sin error
     - Given un cliente de otro comercio, When se intenta acceder, Then RLS lo bloquea

#### Historia de Usuario: Validación de monto de pago no mayor al saldo

- **Descripción:** Como sistema quiero impedir registrar un pago mayor al saldo deudor actual del cliente para evitar saldos negativos incorrectos (NX-CLI-003)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación Zod refine contra saldo_deuda** (Estado: TODO)
   - _Descripción:_ En el schema de registro de pago, usar .refine() comparando monto_pagado contra el saldo_deuda actual consultado del cliente, rechazando con NX-CLI-003.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un monto_pagado mayor al saldo_deuda, When se envía, Then se rechaza con NX-CLI-003
     - Given un monto igual al saldo, When se envía, Then se acepta
     - Given un monto menor al saldo, When se envía, Then se acepta y descuenta parcialmente

#### Historia de Usuario: Bloqueo de eliminación de pago conciliado

- **Descripción:** Como sistema quiero impedir eliminar un pago ya conciliado con la cuenta corriente para preservar la integridad contable del cliente (NX-PAG-001)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de estado de conciliación antes de eliminar pago** (Estado: TODO)
   - _Descripción:_ En la Server Action de eliminación de pagos_cuenta_corriente, verificar si el pago ya afectó el saldo_deuda consolidado y bloquear eliminación retornando NX-PAG-001.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un pago ya conciliado con el saldo, When se intenta eliminar, Then se rechaza con NX-PAG-001
     - Given un pago no conciliado, When se elimina, Then se permite
     - Given el bloqueo, When ocurre, Then se sugiere anulación con justificación

#### Historia de Usuario: Registro de pago a cuenta corriente

- **Descripción:** Como Operador quiero registrar un pago de un cliente para descontar su deuda pendiente
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de registro de pago con actualización de saldo** (Estado: TODO)
   - _Descripción:_ Implementar 'registrarPago' que inserte en pagos_cuenta_corriente y descuente atómicamente saldo_deuda en clientes_finales dentro de la misma transacción.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un pago válido, When se registra, Then se inserta en pagos_cuenta_corriente y se descuenta saldo_deuda
     - Given un monto mayor al saldo, When se envía, Then se rechaza con NX-CLI-003
     - Given el registro, When se ejecuta, Then ambas operaciones ocurren en la misma transacción

#### Historia de Usuario: Alerta de umbral de deuda superado

- **Descripción:** Como Administrador quiero ver una alerta en el listado cuando un cliente supera el umbral de deuda configurado para gestionar el riesgo de cuentas por cobrar
- **Prioridad:** Baja
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Indicador visual de saldo_deuda sobre umbral configurable** (Estado: TODO)
   - _Descripción:_ En el listado de clientes_finales, comparar saldo_deuda contra un umbral configurable por comercio y renderizar un badge/ícono de alerta cuando se supere.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un cliente con saldo_deuda mayor al umbral, When se lista, Then muestra ícono de alerta
     - Given un cliente bajo el umbral, When se lista, Then no muestra alerta
     - Given el umbral, When se configura, Then se aplica dinámicamente a todo el listado

#### Historia de Usuario: Listado de clientes con saldo deudor

- **Descripción:** Como Administrador quiero ver el listado de clientes con su saldo deudor para conocer el estado de mis cuentas por cobrar
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de listado paginado de clientes_finales** (Estado: TODO)
   - _Descripción:_ Crear consulta paginada a clientes_finales ordenada por saldo_deuda DESC, filtrando por cliente_id y eliminado_en IS NULL.
   - _Criterios de Aceptación (QA/BDD):_
     - Given más de 15 clientes, When se solicita una página, Then se retorna el subconjunto ordenado por saldo_deuda DESC
     - Given clientes eliminados, When se listan, Then no aparecen
     - Given un usuario de otro comercio, When consulta, Then RLS impide verlos

#### Historia de Usuario: Edición y eliminación lógica de cliente

- **Descripción:** Como Administrador quiero editar o eliminar (soft delete) un cliente final para mantener actualizado mi directorio de clientes
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Actions de actualización y soft delete de cliente final** (Estado: TODO)
   - _Descripción:_ Implementar 'actualizarClienteFinal' y 'eliminarClienteFinal' (soft delete vía eliminado_en) validando DTO con Zod.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un DTO válido, When se actualiza un cliente, Then se persisten los cambios
     - Given un cliente con saldo_deuda=0, When se elimina, Then se marca eliminado_en
     - Given un rol operador, When intenta eliminar, Then se rechaza la acción

---

### Épica: Épica 22: Reportes y Analíticas Internas (Consolidados y por Sucursal)

_Descripción:_ Reportes de facturación, ventas y movimientos de stock filtrables por sucursal específica o consolidados a nivel comercio, disponibles para Administrador y Super Administrador. Entidades: ventas, detalles_venta, movimientos_stock, sucursales.

#### Historia de Usuario: Reporte de movimientos de stock por período

- **Descripción:** Como Administrador quiero ver un reporte de movimientos de stock por período para analizar la rotación de mi inventario
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de reporte con filtro de rango de fechas** (Estado: TODO)
   - _Descripción:_ Crear consulta agregada sobre movimientos_stock filtrando por creado_en BETWEEN fechas, agrupando por tipo_movimiento, respetando RLS por cliente_id.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un rango con movimientos, When se genera el reporte, Then se agrupa por tipo_movimiento
     - Given un rango sin movimientos, When se consulta, Then retorna vacío sin error
     - Given un usuario de otro comercio, When consulta, Then RLS impide ver datos ajenos

#### Historia de Usuario: Reporte de ventas filtrado por sucursal

- **Descripción:** Como Administrador quiero filtrar el reporte de ventas por una sucursal específica para evaluar el desempeño individual de cada local
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de reporte de ventas por sucursal_id** (Estado: TODO)
   - _Descripción:_ Implementar consulta agregada sobre ventas y detalles_venta filtrando por sucursal_id opcional, calculando totales con SUM parametrizado.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un sucursal_id específico, When se filtra, Then solo incluye ventas de esa sucursal
     - Given ningún filtro, When se consulta, Then retorna el total consolidado
     - Given montos decimales, When se suman, Then el total es preciso

#### Historia de Usuario: Reporte de facturación consolidado

- **Descripción:** Como Administrador quiero ver un reporte de facturación consolidado de todas mis sucursales para conocer el rendimiento global de mi negocio
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de agregación consolidada de ventas** (Estado: TODO)
   - _Descripción:_ Crear consulta SQL agregada (SUM(total)) sobre 'ventas' sin filtro de sucursal, agrupando por período, respetando RLS de cliente_id.
   - _Criterios de Aceptación (QA/BDD):_
     - Given ventas en varias sucursales, When se consulta el consolidado, Then el total suma todas
     - Given un período mensual, When se agrupa, Then los totales corresponden al mes correcto
     - Given un usuario de otro comercio, When consulta, Then RLS impide ver datos ajenos

#### Historia de Usuario: Exportación de reportes

- **Descripción:** Como Administrador quiero exportar mis reportes para compartirlos o analizarlos fuera del sistema
- **Prioridad:** Baja
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Endpoint de exportación de reportes a Excel/CSV** (Estado: TODO)
   - _Descripción:_ Crear API Route que genere el reporte solicitado en formato .xlsx/.csv usando librería server-side de generación de hojas de cálculo, sirviendo el archivo para descarga.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un reporte solicitado en formato xlsx, When se genera, Then se descarga correctamente con los datos
     - Given un reporte solicitado en formato csv, When se genera, Then respeta la codificación y separadores esperados
     - Given un rol operador, When intenta exportar, Then se rechaza el acceso

---

### Épica: Épica 14: Historial y Trazabilidad de Movimientos de Stock

_Descripción:_ Bitácora inmutable con listado paginado y filtrable de todos los movimientos de stock (entradas, salidas, ventas, devoluciones, traspasos), con referencia a venta cuando corresponda. Entidad: movimientos_stock.

#### Historia de Usuario: Inmutabilidad de registros de movimientos

- **Descripción:** Como sistema quiero garantizar que los movimientos de stock no puedan editarse ni eliminarse una vez creados para preservar la integridad de la auditoría
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Política RLS de solo INSERT/SELECT en movimientos_stock** (Estado: TODO)
   - _Descripción:_ Configurar RLS en 'movimientos_stock' habilitando únicamente políticas SELECT e INSERT, sin políticas UPDATE/DELETE, para garantizar inmutabilidad a nivel de base de datos.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un usuario autenticado, When intenta UPDATE, Then RLS lo rechaza
     - Given un usuario autenticado, When intenta DELETE, Then RLS lo rechaza
     - Given un rol permitido, When inserta un movimiento, Then se persiste correctamente

#### Historia de Usuario: Listado paginado de movimientos de stock

- **Descripción:** Como Administrador quiero ver un listado paginado de todos los movimientos de stock para auditar la actividad de mi inventario
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Endpoint paginado de movimientos_stock** (Estado: TODO)
   - _Descripción:_ Crear Server Action con paginación cursor-based sobre movimientos_stock ordenada por creado_en DESC, aplicando RLS por cliente_id y filtros opcionales de sucursal_id.
   - _Criterios de Aceptación (QA/BDD):_
     - Given más de 50 movimientos, When se solicita una página, Then se retorna el subconjunto ordenado por creado_en DESC
     - Given un filtro por sucursal_id, When se aplica, Then solo se listan movimientos de esa sucursal
     - Given un usuario de otro comercio, When consulta, Then RLS impide ver movimientos ajenos

#### Historia de Usuario: Visualización de referencia de venta en movimientos

- **Descripción:** Como Administrador quiero ver la venta asociada a un movimiento de tipo VENTA para rastrear el origen exacto del descuento de stock
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Join de movimientos_stock con venta_referencia_id** (Estado: TODO)
   - _Descripción:_ Extender la consulta de historial de movimientos para incluir join opcional con ventas cuando venta_referencia_id no sea nulo, mostrando el número de venta asociado.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un movimiento tipo VENTA con venta_referencia_id, When se consulta, Then incluye el número de venta asociado
     - Given un movimiento sin venta_referencia_id, When se consulta, Then el campo aparece nulo sin error
     - Given el listado combinado, When se muestra, Then distingue visualmente los movimientos con referencia

#### Historia de Usuario: Filtrado de movimientos por tipo y fecha

- **Descripción:** Como Administrador quiero filtrar los movimientos de stock por tipo (entrada, salida, venta, traspaso) y rango de fechas para analizar la actividad de un período específico
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Filtros combinados en consulta de movimientos_stock** (Estado: TODO)
   - _Descripción:_ Extender la Server Action de listado de movimientos para aceptar filtros tipo_movimiento y rango de creado_en, aplicados como WHERE parametrizado.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un filtro por tipo_movimiento y rango de fechas combinados, When se aplican, Then el resultado cumple ambas condiciones
     - Given solo un filtro aplicado, When se usa, Then funciona independientemente
     - Given ningún filtro, When se consulta, Then retorna todos los movimientos paginados

---

### Épica: Épica 26: Infraestructura, Rendimiento y Observabilidad

_Descripción:_ Cubre la carga modular optimizada (code splitting) por módulo en Next.js, paginación obligatoria en listados de productos y otras entidades de alto volumen, gestión de imágenes vía Cloudinary (compresión y formato WebP), middleware de autenticación centralizado, prevención de dobles peticiones simultáneas (race conditions), logging estructurado con OpenTelemetry sin exposición de datos sensibles en consola, y manejo genérico de errores de sistema (NX-SYS-001 a NX-SYS-004). Es transversal a toda la aplicación.

#### Historia de Usuario: Logging estructurado con OpenTelemetry

- **Descripción:** Como equipo de desarrollo quiero contar con logs estructurados y trazables mediante OpenTelemetry para diagnosticar problemas sin exponer datos sensibles
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Configuración de instrumentación OpenTelemetry en Next.js** (Estado: TODO)
   - _Descripción:_ Instalar y configurar SDK de OpenTelemetry en las Server Actions y API Routes, definir spans por operación de negocio y exportar logs estructurados en JSON sin exponer datos sensibles del usuario.
   - _Criterios de Aceptación (QA/BDD):_
     - Given instrumentation.ts configurado, When arranca la app, Then el SDK se inicializa sin errores
     - Given una Server Action crítica, When se ejecuta, Then genera un span correspondiente
     - Given los logs, When se inspeccionan, Then están estructurados en JSON sin datos sensibles

#### Historia de Usuario: Paginación obligatoria en listados de alto volumen

- **Descripción:** Como sistema quiero paginar los listados de productos y otras entidades de alto volumen para evitar sobrecargar la memoria del dispositivo del usuario
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Utilidad genérica de paginación tipada** (Estado: TODO)
   - _Descripción:_ Crear hook/función utilitaria reutilizable 'usePaginacion' y helper server-side que aplique .range() de Supabase en todas las consultas de listados de alto volumen.
   - _Criterios de Aceptación (QA/BDD):_
     - Given el hook usePaginacion, When se usa en cualquier listado, Then expone page y pageSize consistentemente
     - Given el helper server-side, When se aplica, Then usa .range() de Supabase correctamente
     - Given distintos listados (productos, ventas, movimientos), When se prueban, Then todos usan la misma utilidad

#### Historia de Usuario: Manejo genérico de errores de sistema

- **Descripción:** Como usuario quiero ver mensajes empáticos y controlados ante errores de red o del servidor, sin exponer detalles técnicos, para no sentirme confundido ante una falla (NX-SYS-001 a NX-SYS-004)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Error boundary y handler global de excepciones** (Estado: TODO)
   - _Descripción:_ Implementar error.tsx global de Next.js y un wrapper de Server Actions que capture excepciones no controladas, logueando con OpenTelemetry y devolviendo NX-SYS-003 sin exponer stack trace.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una excepción no controlada en una Server Action, When ocurre, Then se captura por el wrapper y no rompe la app
     - Given el error, When se retorna al usuario, Then muestra NX-SYS-003 sin stack trace
     - Given error.tsx, When se activa, Then ofrece opción de recargar o volver al inicio

#### Historia de Usuario: Compresión y optimización de imágenes vía Cloudinary

- **Descripción:** Como sistema quiero comprimir y convertir a WebP toda imagen subida para reducir el ancho de banda consumido por el catálogo y el panel
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Integración de upload con transformaciones Cloudinary** (Estado: TODO)
   - _Descripción:_ Configurar el SDK de Cloudinary en Server Actions para subir imágenes aplicando transformaciones f_auto,q_auto (WebP) y límite de resolución antes de guardar la URL en foto_url.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una imagen subida, When se procesa, Then se aplica f_auto,q_auto (WebP)
     - Given una imagen de alta resolución, When se sube, Then se limita a la resolución máxima configurada
     - Given la URL resultante, When se guarda, Then corresponde a la versión optimizada

#### Historia de Usuario: Prevención de dobles peticiones simultáneas

- **Descripción:** Como sistema quiero bloquear peticiones duplicadas en acciones críticas para evitar transacciones repetidas o errores de stock
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Lock optimista con idempotency key en Server Actions críticas** (Estado: TODO)
   - _Descripción:_ Implementar un token de idempotencia generado en cliente y verificado en servidor (o debounce+disabled de botón) para acciones críticas como cobrar venta, evitando ejecuciones duplicadas.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una acción crítica ejecutada dos veces con la misma idempotency key, When ocurre, Then solo se procesa una vez
     - Given una nueva idempotency key, When se envía, Then se procesa normalmente
     - Given la acción de cobrar venta, When se prueba con doble clic simulado, Then no se duplica la venta

#### Historia de Usuario: Code splitting por módulo en Next.js

- **Descripción:** Como sistema quiero cargar únicamente el código del módulo en uso para reducir el tiempo de carga y mejorar el rendimiento del panel
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Configuración de carga dinámica por ruta de módulo** (Estado: TODO)
   - _Descripción:_ Usar dynamic() de Next.js para componentes pesados por módulo (ej. editor WYSIWYG, wizard de variantes) asegurando que Next.js App Router realice code splitting automático por ruta.
   - _Criterios de Aceptación (QA/BDD):_
     - Given el wizard de variantes, When se accede a su ruta, Then su código se carga de forma diferida
     - Given el bundle inicial, When se mide, Then no incluye el código de módulos no visitados
     - Given la navegación a la ruta, When ocurre, Then el componente se carga sin errores

#### Historia de Usuario: Bloqueo optimista ante edición concurrente

- **Descripción:** Como sistema quiero implementar bloqueo optimista con versionado en recursos críticos para evitar que dos usuarios sobrescriban cambios simultáneamente (NX-SYS-004)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Versionado optimista con campo actualizado_en** (Estado: TODO)
   - _Descripción:_ Implementar validación en Server Actions de UPDATE que comparen el actualizado_en recibido del cliente contra el actual en base de datos, rechazando con NX-SYS-004 si no coincide.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un actualizado_en desactualizado enviado por el cliente, When se intenta UPDATE, Then se rechaza con NX-SYS-004
     - Given un actualizado_en coincidente, When se envía, Then el UPDATE se ejecuta normalmente
     - Given dos usuarios editando el mismo recurso, When uno guarda primero, Then el segundo recibe el conflicto

---

### Épica: Épica 12: Control de Stock e Inventario por Sucursal

_Descripción:_ Registro manual de entradas (compras) y salidas (roturas/pérdidas) de stock, apuntando a producto simple o variante específica, discriminado por sucursal. Incluye consulta de stock consolidado y por local, validación de stock insuficiente o negativo (NX-STK-002, NX-STK-003) y actualización del caché de stock_actual en productos/variantes. Entidades: stock_sucursales, movimientos_stock, productos, variantes_producto.

#### Historia de Usuario: Validación de stock negativo

- **Descripción:** Como sistema quiero impedir un movimiento de stock que deje una cantidad negativa para evitar inconsistencias en el inventario (NX-STK-002)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Constraint y validación aplicativa de stock >= 0** (Estado: TODO)
   - _Descripción:_ Agregar CHECK constraint stock_actual >= 0 en stock_sucursales y validación previa en la Server Action de movimiento, rechazando con NX-STK-002 antes de ejecutar el update.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una salida mayor al stock disponible, When se ejecuta, Then se rechaza con NX-STK-002
     - Given el CHECK en base de datos, When se fuerza un valor negativo directo, Then la base de datos lo rechaza
     - Given un movimiento que deja stock en 0, When se ejecuta, Then se permite

#### Historia de Usuario: Registro de entrada de stock

- **Descripción:** Como Operador quiero registrar una entrada de stock por compra a proveedor para mantener actualizado el inventario disponible
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de movimiento tipo ENTRADA** (Estado: TODO)
   - _Descripción:_ Crear 'registrarEntradaStock' que inserte en movimientos_stock (tipo_movimiento=ENTRADA) y actualice stock_sucursales y el caché stock_actual en una transacción atómica.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una entrada de stock válida, When se registra, Then se inserta en movimientos_stock y se actualiza stock_sucursales
     - Given la entrada registrada, When se consulta el producto, Then su stock_actual se recalcula
     - Given un rol operador, When registra la entrada, Then la acción es permitida

#### Historia de Usuario: Registro de salida manual de stock

- **Descripción:** Como Operador quiero registrar una salida manual de stock por rotura o pérdida para reflejar la cantidad real disponible
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de movimiento tipo SALIDA_MANUAL** (Estado: TODO)
   - _Descripción:_ Crear 'registrarSalidaStock' que valide stock suficiente, inserte movimiento SALIDA_MANUAL y descuente stock_sucursales en transacción atómica.
   - _Criterios de Aceptación (QA/BDD):_
     - Given stock suficiente, When se registra la salida, Then se descuenta correctamente
     - Given stock insuficiente, When se intenta, Then se rechaza con NX-STK-002
     - Given la salida registrada, When se consulta el historial, Then aparece con tipo SALIDA_MANUAL

#### Historia de Usuario: Consulta de stock por sucursal y consolidado

- **Descripción:** Como Administrador quiero consultar el stock de un producto por sucursal o de forma consolidada para tomar decisiones de reposición
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de consulta de stock agregado y desagregado** (Estado: TODO)
   - _Descripción:_ Crear consulta que obtenga stock_sucursales filtrado por sucursal_id o, si no se especifica, agrupe y sume por producto/variante consolidando todas las sucursales del cliente_id.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un sucursal_id específico, When se consulta, Then retorna el stock de ese local
     - Given ningún sucursal_id, When se consulta, Then retorna el stock consolidado de todas las sucursales
     - Given un producto sin registros de stock, When se consulta, Then retorna 0 sin error

#### Historia de Usuario: Actualización de caché de stock consolidado

- **Descripción:** Como sistema quiero recalcular el stock consolidado del producto o variante tras cada movimiento para mantener consistentes los datos mostrados
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Trigger/función de recálculo de stock_actual** (Estado: TODO)
   - _Descripción:_ Crear función SQL o lógica server-side que, tras cada insert/update en stock_sucursales, recalcule y actualice el campo stock_actual en productos/variantes_producto sumando todas las sucursales.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un movimiento de stock en cualquier sucursal, When se ejecuta, Then stock_actual del producto/variante se recalcula
     - Given múltiples movimientos consecutivos, When ocurren, Then el stock_actual final refleja la suma correcta de todas las sucursales
     - Given una consulta directa de stock_actual, When se hace, Then coincide con la suma de stock_sucursales

#### Historia de Usuario: Estado vacío para producto sin stock registrado

- **Descripción:** Como Operador quiero ver un estado vacío con acción sugerida cuando un producto no tiene stock físico registrado en ninguna sucursal para saber cómo proceder (NX-STK-003)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **EmptyState específico con CTA de registrar entrada** (Estado: TODO)
   - _Descripción:_ Reutilizar el componente EmptyState mostrando NX-STK-003 con botón CTA que redirija a /dashboard/stock/entradas precargando el producto.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un producto sin stock en ninguna sucursal, When se visualiza, Then se muestra NX-STK-003 con CTA
     - Given el CTA, When se hace clic, Then redirige a /dashboard/stock/entradas con el producto precargado
     - Given el producto ya con stock, When se visualiza, Then no se muestra este EmptyState

---

### Épica: Épica 19: Configuración y Personalización del Catálogo Web

_Descripción:_ Permite configurar los datos base del catálogo público (slug único de URL, plantilla activa, color primario, logo, banner, mensaje de bienvenida, WhatsApp de pedidos) mediante un editor visual WYSIWYG con vista previa en tiempo real y publicación que invalida la caché de Next.js. Incluye validación de slug ya en uso (NX-WEB-001), configuración inexistente (NX-WEB-002), error de publicación (NX-WEB-003) y número de WhatsApp inválido (NX-WEB-004). Entidad: configuracion_catalogo.

#### Historia de Usuario: Manejo de error al publicar catálogo

- **Descripción:** Como Administrador quiero ver un mensaje claro si falla la publicación de mi catálogo, sin perder mis cambios locales, para reintentar más tarde (NX-WEB-003)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Captura y feedback de error en publicación de catálogo** (Estado: TODO)
   - _Descripción:_ Envolver la Server Action de publicación en try/catch, loguear con OpenTelemetry sin datos sensibles, retornar código NX-WEB-003 al frontend y preservar el estado del formulario en memoria (React state) sin perder cambios locales.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un fallo simulado en la publicación, When ocurre, Then se captura sin romper la UI
     - Given el error capturado, When se retorna, Then se muestra NX-WEB-003 al usuario
     - Given el error, When ocurre, Then los cambios locales no se pierden
     - Given el error, When se loguea, Then no expone datos sensibles

#### Historia de Usuario: Configuración de slug único del catálogo

- **Descripción:** Como Administrador quiero definir la URL personalizada (slug) de mi catálogo para compartir un enlace único con mis clientes
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Formulario de slug con validación de unicidad** (Estado: TODO)
   - _Descripción:_ Crear Server Action que valide unicidad de slug_url contra 'configuracion_catalogo' mediante constraint UNIQUE en PostgreSQL y validación previa con Zod + consulta async antes de submit.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un slug ya registrado, When se escribe, Then se muestra NX-WEB-001 y se bloquea el submit
     - Given un slug disponible, When se valida, Then se habilita el botón de guardar
     - Given el input, When el usuario escribe, Then la validación usa debounce

#### Historia de Usuario: Publicación de cambios con invalidación de caché

- **Descripción:** Como Administrador quiero publicar mis cambios de catálogo para que se reflejen inmediatamente en la vista pública
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Revalidación de ISR/caché con revalidatePath** (Estado: TODO)
   - _Descripción:_ Al confirmar la publicación del catálogo, invocar revalidatePath/revalidateTag de Next.js sobre la ruta /catalogo/[slug] para forzar regeneración de la vista pública tras actualizar configuracion_catalogo.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una publicación exitosa, When se ejecuta, Then se invoca revalidatePath sobre /catalogo/[slug]
     - Given la revalidación, When se consulta la vista pública, Then refleja los cambios de inmediato
     - Given un fallo en la revalidación, When ocurre, Then retorna NX-WEB-003 sin afectar los datos ya persistidos

#### Historia de Usuario: Redirección ante configuración de catálogo inexistente

- **Descripción:** Como Administrador quiero ser redirigido a completar la configuración básica si mi catálogo aún no está configurado para poder activarlo (NX-WEB-002)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Guard de existencia de configuracion_catalogo** (Estado: TODO)
   - _Descripción:_ En el layout de /dashboard/configuracion/catalogo, consultar si existe registro en configuracion_catalogo para el cliente_id; si no existe, redirigir al wizard inicial con mensaje NX-WEB-002.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un comercio sin configuracion_catalogo, When accede a la sección, Then se redirige con NX-WEB-002
     - Given un comercio con configuración existente, When accede, Then se muestra el editor normalmente
     - Given el estado sin configurar, When se muestra, Then incluye CTA de configuración inicial

#### Historia de Usuario: Validación de formato de número de WhatsApp

- **Descripción:** Como sistema quiero validar que el número de WhatsApp incluya código de país sin espacios para asegurar que los pedidos lleguen correctamente (NX-WEB-004)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validador Zod regex de número internacional** (Estado: TODO)
   - _Descripción:_ Definir schema Zod con regex ^\+?[1-9]\d{7,14}$ para validar whatsapp_pedidos, rechazando formatos inválidos con NX-WEB-004.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un número con formato +5491112345678, When se valida, Then se acepta
     - Given un número con espacios o sin código de país, When se valida, Then se rechaza con NX-WEB-004
     - Given el campo, When se muestra, Then incluye placeholder de ejemplo

#### Historia de Usuario: Validación de slug ya en uso

- **Descripción:** Como sistema quiero validar en tiempo real que el slug elegido esté disponible para evitar conflictos entre comercios (NX-WEB-001)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Endpoint de verificación de disponibilidad de slug en tiempo real** (Estado: TODO)
   - _Descripción:_ Crear Server Action de consulta ligera que verifique existencia de slug_url en configuracion_catalogo, invocada con debounce desde el input del formulario (NX-WEB-001).
   - _Criterios de Aceptación (QA/BDD):_
     - Given un slug ya en uso, When se consulta, Then retorna no disponible con NX-WEB-001
     - Given un slug disponible, When se consulta, Then retorna disponible
     - Given múltiples consultas rápidas, When se hacen con debounce, Then no saturan el backend

#### Historia de Usuario: Selección de plantilla de catálogo

- **Descripción:** Como Administrador quiero elegir la plantilla visual de mi catálogo para adaptar el diseño al estilo de mi negocio
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Selector de plantilla_activa con persistencia** (Estado: TODO)
   - _Descripción:_ Crear Server Action que actualice el campo plantilla_activa en configuracion_catalogo según selección del usuario en un listado predefinido de plantillas soportadas.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una plantilla seleccionada, When se confirma, Then se persiste en configuracion_catalogo
     - Given una plantilla no soportada, When se intenta asignar, Then se rechaza
     - Given el cambio, When se publica, Then el catálogo público refleja la nueva plantilla

#### Historia de Usuario: Edición de mensaje de bienvenida y WhatsApp de pedidos

- **Descripción:** Como Administrador quiero editar el mensaje de bienvenida y el número de WhatsApp de mi catálogo para comunicarme correctamente con mis clientes
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de actualización de campos de configuracion_catalogo** (Estado: TODO)
   - _Descripción:_ Implementar 'actualizarConfiguracionCatalogo' validando mensaje_bienvenida y whatsapp_pedidos con Zod antes del update.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un mensaje_bienvenida y whatsapp_pedidos válidos, When se actualizan, Then se persisten correctamente
     - Given un whatsapp_pedidos con formato inválido, When se envía, Then se rechaza con NX-WEB-004
     - Given la actualización, When ocurre, Then actualizado_en se refresca

#### Historia de Usuario: Editor WYSIWYG de colores, logo y banner

- **Descripción:** Como Administrador quiero personalizar el color primario, logo y banner de mi catálogo con vista previa en tiempo real para reflejar la identidad de mi marca
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Editor visual con preview en tiempo real vía React state** (Estado: TODO)
   - _Descripción:_ Construir editor con controles de color, upload de logo/banner y mensaje, reflejando cambios en un iframe/preview en vivo mediante estado React antes de publicar.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un cambio de color primario, When se realiza, Then el preview se actualiza inmediatamente sin persistir
     - Given un cambio de logo o banner, When se sube, Then se refleja en el preview antes de guardar
     - Given el usuario navega fuera sin publicar, When ocurre, Then los cambios no persisten en base de datos

---

### Épica: Épica 25: Seguridad Transversal, RLS y Cumplimiento Multi-Tenant

_Descripción:_ Implementación y auditoría de políticas Row Level Security en todas las tablas de negocio, garantizando aislamiento estricto por cliente_id y rol, prohibiendo políticas con USING(true) en INSERT/UPDATE/DELETE. Incluye protección OWASP (anti-inyección con queries parametrizadas, DOMPurify contra XSS, prevención de IDOR/BOLA), manejo seguro de secretos (prohibición de hardcodeo y de exponer claves sensibles vía NEXT_PUBLIC, uso exclusivo server-side de la Service Role Key) y mensajes de permisos insuficientes (NX-PER-001). Es transversal a todas las tablas del esquema.

#### Historia de Usuario: Prevención de inyección SQL con queries parametrizadas

- **Descripción:** Como sistema quiero usar exclusivamente consultas parametrizadas en toda la aplicación para prevenir ataques de inyección SQL
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Auditoría y uso exclusivo de Supabase Query Builder / RPC parametrizado** (Estado: TODO)
   - _Descripción:_ Revisar todas las consultas del backend asegurando el uso del cliente Supabase con parámetros bindeados o funciones RPC parametrizadas, prohibiendo concatenación de strings SQL; agregar test de integración anti-inyección.
   - _Criterios de Aceptación (QA/BDD):_
     - Given el código base, When se audita, Then no existen concatenaciones de SQL crudo
     - Given un input malicioso ' OR 1=1--, When se envía, Then no produce inyección
     - Given el checklist, When se completa, Then queda documentado en el repositorio

#### Historia de Usuario: Mensaje de permisos insuficientes

- **Descripción:** Como usuario quiero ver un mensaje claro cuando intento realizar una acción sin los permisos suficientes para entender por qué fue bloqueada (NX-PER-001)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Middleware de autorización con respuesta NX-PER-001** (Estado: TODO)
   - _Descripción:_ En el middleware centralizado de Next.js, validar el claim 'rol' del JWT contra la matriz de permisos y retornar 403 con el mensaje estandarizado NX-PER-001 cuando el rol no tenga permiso sobre la acción solicitada.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un rol sin permiso, When accede a una acción restringida, Then recibe 403 con NX-PER-001
     - Given un rol permitido, When accede, Then la petición continúa normalmente
     - Given un JWT sin claim rol, When se procesa, Then se rechaza la solicitud

#### Historia de Usuario: Sanitización de HTML de usuario con DOMPurify

- **Descripción:** Como sistema quiero sanitizar todo HTML ingresado por el usuario antes de renderizarlo para prevenir ataques XSS
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Integración de DOMPurify en renderizado de contenido de usuario** (Estado: TODO)
   - _Descripción:_ Instalar DOMPurify e integrarlo en los componentes que rendericen HTML proveniente de campos como descripcion o mensaje_bienvenida, sanitizando en el servidor antes de persistir y en cliente antes de renderizar.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un texto con <script>alert(1)</script>, When se renderiza, Then el script es removido
     - Given HTML válido simple, When se sanitiza, Then se conserva el formato permitido
     - Given mensaje_bienvenida con HTML malicioso, When se muestra públicamente, Then se sanitiza antes

#### Historia de Usuario: Funciones helper para extracción de claims del JWT

- **Descripción:** Como sistema quiero contar con funciones reutilizables que extraigan cliente_id y rol del JWT para simplificar la escritura de políticas RLS
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Funciones SQL get_cliente_id() y get_rol()** (Estado: TODO)
   - _Descripción:_ Crear las funciones SQL STABLE auth.get_cliente_id() y auth.get_rol() en PostgreSQL/Supabase según plantilla de ROLES.md, para reutilizar en todas las policies RLS.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un JWT válido, When se invoca get_cliente_id(), Then retorna el UUID correcto
     - Given el mismo JWT, When se invoca get_rol(), Then retorna el rol correcto
     - Given las funciones, When se usan en una policy RLS, Then filtran correctamente

#### Historia de Usuario: Manejo seguro de secretos y claves

- **Descripción:** Como sistema quiero evitar el hardcodeo de claves y el uso de NEXT_PUBLIC para credenciales sensibles, usando la Service Role Key solo en server-side, para proteger la infraestructura
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Auditoría de variables de entorno y Service Role Key** (Estado: TODO)
   - _Descripción:_ Revisar .env y código fuente asegurando que ninguna clave sensible use prefijo NEXT_PUBLIC_, que SUPABASE_SERVICE_ROLE_KEY solo se use en Server Actions/API Routes, y configurarlas como secrets en Vercel.
   - _Criterios de Aceptación (QA/BDD):_
     - Given el código fuente, When se audita, Then ninguna clave sensible usa prefijo NEXT_PUBLIC_
     - Given SUPABASE_SERVICE_ROLE_KEY, When se busca su uso, Then solo aparece en contexto server-side
     - Given las variables en Vercel, When se revisan, Then están configuradas como secrets

#### Historia de Usuario: Políticas RLS diferenciadas por rol

- **Descripción:** Como sistema quiero restringir las operaciones INSERT, UPDATE y DELETE según el rol del usuario autenticado para respetar la matriz de permisos definida
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Policies RLS con validación de auth.get_rol()** (Estado: TODO)
   - _Descripción:_ Definir en cada tabla de negocio policies de INSERT/UPDATE/DELETE que incluyan condición auth.get_rol() IN (roles permitidos), según matriz de ROLES.md.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un rol sin permiso de escritura, When intenta INSERT/UPDATE/DELETE, Then la policy lo rechaza
     - Given un rol autorizado, When ejecuta la operación, Then se permite
     - Given la matriz de ROLES.md, When se contrasta contra las policies, Then coinciden en 100%

#### Historia de Usuario: Implementación de políticas RLS por cliente_id en todas las tablas

- **Descripción:** Como sistema quiero aplicar políticas RLS que filtren por cliente_id en todas las tablas de negocio para garantizar el aislamiento matemático entre comercios
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Script de migración de políticas RLS base** (Estado: TODO)
   - _Descripción:_ Crear migración SQL que habilite RLS (ENABLE ROW LEVEL SECURITY) y agregue policy SELECT/INSERT/UPDATE con cliente_id = auth.get_cliente_id() en cada tabla de negocio del SCHEMA.md.
   - _Criterios de Aceptación (QA/BDD):_
     - Given la migración ejecutada, When se aplica, Then RLS queda habilitado en todas las tablas de negocio
     - Given las policies generadas, When se inspeccionan, Then ninguna usa using(true) en INSERT/UPDATE/DELETE
     - Given un usuario de otro comercio, When intenta acceder a cualquier tabla, Then es bloqueado

#### Historia de Usuario: Validación de propiedad de objetos (IDOR/BOLA)

- **Descripción:** Como sistema quiero validar siempre que el objeto solicitado pertenezca al comercio del usuario autenticado para prevenir accesos indebidos a datos de otros comercios
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Verificación de cliente_id en cada Server Action antes de operar** (Estado: TODO)
   - _Descripción:_ Crear función helper 'verificarPropiedad' que compare el cliente_id del recurso solicitado contra el cliente_id del JWT antes de cualquier lectura/escritura, además de la protección RLS.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un recurso de otro comercio, When se solicita mediante manipulación de id, Then la verificación adicional lo bloquea antes de tocar RLS
     - Given un recurso propio, When se solicita, Then la verificación pasa correctamente
     - Given un intento de IDOR simulado en test, When se ejecuta, Then es detectado y rechazado

---

### Épica: Épica 3: Gestión de Usuarios Internos y Roles (RBAC)

_Descripción:_ CRUD de usuarios internos (crear, editar, eliminar) restringido al rol Super Administrador, incluyendo asignación de rol (super_admin, admin, operador). Contempla la regla de negocio que impide eliminar al único administrador del comercio (NX-USR-002) y la validación de email único por comercio (NX-USR-001). Entidad principal: usuarios_comercio. Implementa las políticas RLS específicas para esta tabla según ROLES.md.

#### Historia de Usuario: Ver perfil propio

- **Descripción:** Como usuario interno quiero visualizar mi propio perfil con mi rol asignado para conocer mis permisos en el sistema
- **Prioridad:** Baja
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de consulta de perfil del usuario autenticado** (Estado: TODO)
   - _Descripción:_ Crear Server Action que obtenga los datos de usuarios_comercio del auth_user_id actual, mostrando rol y datos básicos en solo lectura.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un usuario autenticado, When consulta su perfil, Then obtiene rol y datos básicos
     - Given el perfil, When se muestra, Then es de solo lectura
     - Given un usuario sin registro en usuarios_comercio, When consulta, Then maneja el caso sin error

#### Historia de Usuario: Eliminación de usuario interno

- **Descripción:** Como Super Administrador quiero eliminar un usuario interno para revocar su acceso cuando deja de trabajar en el comercio
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de baja de usuario interno con validación de único admin** (Estado: TODO)
   - _Descripción:_ Implementar 'eliminarUsuarioInterno' que verifique que no sea el único super_admin activo del comercio antes de eliminar (NX-USR-002), restringido a rol super_admin.
   - _Criterios de Aceptación (QA/BDD):_
     - Given el único super_admin del comercio, When se intenta eliminar, Then se rechaza con NX-USR-002
     - Given un usuario no crítico, When se elimina, Then se revoca su acceso correctamente
     - Given un rol distinto a super_admin, When intenta eliminar usuarios, Then se rechaza la acción

#### Historia de Usuario: Creación de usuario interno con rol asignado

- **Descripción:** Como Super Administrador quiero crear un nuevo usuario interno asignándole un rol (admin u operador) para delegar tareas del negocio
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de alta de usuario interno con Supabase Admin API** (Estado: TODO)
   - _Descripción:_ Implementar Server Action que use supabase.auth.admin.createUser (service role, server-side) e inserte en usuarios_comercio con rol asignado, validando email único (NX-USR-001).
   - _Criterios de Aceptación (QA/BDD):_
     - Given un email no existente, When se crea el usuario, Then se persiste en Auth y en usuarios_comercio con el rol asignado
     - Given un email ya usado, When se intenta crear, Then se rechaza con NX-USR-001
     - Given un rol distinto a super_admin, When intenta crear usuarios, Then se rechaza

#### Historia de Usuario: Listado de usuarios internos

- **Descripción:** Como Super Administrador quiero ver el listado de usuarios internos de mi comercio para conocer quién tiene acceso al sistema
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de listado de usuarios_comercio** (Estado: TODO)
   - _Descripción:_ Crear consulta a usuarios_comercio filtrando por cliente_id, restringida a rol super_admin vía RLS y middleware.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un rol super_admin, When lista usuarios, Then obtiene todos los usuarios del comercio
     - Given un rol admin u operador, When intenta acceder, Then se rechaza por RLS/middleware
     - Given usuarios de otro comercio, When se consulta, Then no aparecen

#### Historia de Usuario: Protección del único administrador del comercio

- **Descripción:** Como sistema quiero impedir la eliminación del único Super Administrador de un comercio para evitar que el negocio quede sin control administrativo (NX-USR-002)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de conteo de super_admin activos** (Estado: TODO)
   - _Descripción:_ En Server Action de eliminación/cambio de rol de usuario, contar usuarios_comercio con rol=super_admin del cliente_id; si es 1, bloquear la operación con NX-USR-002.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un único super_admin, When se intenta degradar o eliminar, Then se rechaza con NX-USR-002
     - Given más de un super_admin, When se degrada uno, Then se permite
     - Given la validación, When se ejecuta, Then cuenta correctamente solo usuarios activos

#### Historia de Usuario: Validación de email duplicado al crear usuario

- **Descripción:** Como sistema quiero impedir el registro de un usuario interno con un correo ya existente para evitar duplicados de acceso (NX-USR-001)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Chequeo de email único antes de crear usuario interno** (Estado: TODO)
   - _Descripción:_ Antes de invocar supabase.auth.admin.createUser, consultar si el email ya existe en usuarios_comercio del cliente_id y retornar NX-USR-001 si aplica.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un email ya registrado en el comercio, When se intenta crear, Then se rechaza con NX-USR-001 antes de invocar Supabase Admin API
     - Given un email nuevo, When se intenta crear, Then se procede a la creación
     - Given el mismo email en otro comercio, When se crea, Then se permite

#### Historia de Usuario: Edición de rol de usuario interno

- **Descripción:** Como Super Administrador quiero modificar el rol de un usuario interno existente para ajustar sus permisos según cambien sus responsabilidades
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de actualización de rol con validación de único admin** (Estado: TODO)
   - _Descripción:_ Implementar 'actualizarRolUsuario' que, al degradar a un super_admin, valide que no sea el único administrador restante (NX-USR-002).
   - _Criterios de Aceptación (QA/BDD):_
     - Given el único super_admin del comercio, When se intenta degradar su rol, Then se rechaza con NX-USR-002
     - Given más de un super_admin, When se degrada uno, Then se permite
     - Given un rol distinto a super_admin, When intenta cambiar roles, Then se rechaza la acción

#### Historia de Usuario: Restricción de acceso a la gestión de usuarios

- **Descripción:** Como Administrador u Operador quiero que el sistema me impida acceder a la gestión de usuarios internos para respetar el alcance de mi rol (NX-PER-001)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Guard de ruta /dashboard/configuracion/usuarios solo super_admin** (Estado: TODO)
   - _Descripción:_ En el middleware, validar que auth.get_rol() === 'super_admin' para acceder a las rutas bajo /dashboard/configuracion/usuarios, retornando NX-PER-001 en caso contrario.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un rol admin, When intenta acceder a la ruta, Then se rechaza con NX-PER-001
     - Given un rol super_admin, When accede, Then se permite el acceso
     - Given un rol operador, When intenta acceder, Then también se rechaza

---

### Épica: Épica 6: Gestión de Proveedores

_Descripción:_ CRUD de proveedores (registrar, editar, eliminar mediante soft delete) con datos de contacto (nombre comercial, contacto, teléfono, email). Operadores tienen acceso de solo lectura. Incluye la validación que impide eliminar un proveedor con productos asociados (NX-SUP-002) y el manejo de proveedor no encontrado (NX-SUP-001). Entidad: proveedores.

#### Historia de Usuario: Listado y filtrado de proveedores

- **Descripción:** Como Administrador quiero ver y filtrar el listado de proveedores para ubicar rápidamente al proveedor que necesito
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Endpoint paginado de proveedores con filtros** (Estado: TODO)
   - _Descripción:_ Crear Server Action 'listarProveedores' en Next.js que consulte Supabase con paginación (limit/offset), filtros por nombre_comercial y RLS activo por cliente_id; tipar respuesta con DTO fuertemente tipado.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un comercio con más de 10 proveedores, When se solicita la página 1 con pageSize=10, Then se retornan 10 registros y el total disponible
     - Given un filtro por nombre_comercial, When se aplica, Then solo se retornan coincidencias parciales case-insensitive
     - Given un usuario de otro comercio, When intenta listar, Then RLS impide ver proveedores ajenos
     - Given proveedores eliminados lógicamente, When se lista, Then no aparecen en el resultado

#### Historia de Usuario: Edición de datos de proveedor

- **Descripción:** Como Administrador quiero editar los datos de un proveedor existente para mantener actualizada su información de contacto
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de actualización de proveedor con Zod** (Estado: TODO)
   - _Descripción:_ Crear Server Action 'actualizarProveedor' validando el DTO de entrada con Zod, verificando cliente_id vía RLS, y actualizando campo actualizado_en; retornar error tipado si falla la validación (Fail-Fast).
   - _Criterios de Aceptación (QA/BDD):_
     - Given un DTO válido, When se envía, Then el proveedor se actualiza y actualizado_en cambia
     - Given un DTO inválido, When se envía, Then se rechaza antes de tocar la base de datos
     - Given un proveedor de otro comercio, When se intenta actualizar, Then RLS bloquea la operación

#### Historia de Usuario: Acceso de solo lectura para Operador

- **Descripción:** Como Operador quiero visualizar el listado de proveedores en modo solo lectura para consultar información sin poder modificarla
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Restricción de UI y RLS de solo SELECT para rol operador** (Estado: TODO)
   - _Descripción:_ Ocultar botones de creación/edición en el frontend según rol y aplicar policy RLS SELECT-only para operador sobre productos y proveedores.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un rol operador, When visualiza productos o proveedores, Then no ve botones de creación/edición
     - Given un intento de edición directa vía API con rol operador, When ocurre, Then RLS lo rechaza
     - Given un rol admin, When visualiza los mismos módulos, Then ve las acciones completas

#### Historia de Usuario: Registro de nuevo proveedor

- **Descripción:** Como Administrador quiero registrar un nuevo proveedor con sus datos de contacto para poder asociarlo a mis productos
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de alta de proveedor** (Estado: TODO)
   - _Descripción:_ Implementar 'crearProveedor' validando DTO con Zod (nombre_comercial obligatorio) e insertando con cliente_id del JWT.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un nombre_comercial válido, When se crea, Then se inserta con cliente_id del JWT
     - Given nombre_comercial vacío, When se envía, Then se rechaza
     - Given un rol operador, When intenta crear, Then se rechaza

#### Historia de Usuario: Manejo de proveedor no encontrado

- **Descripción:** Como usuario quiero ver un mensaje claro si el proveedor que busco no existe o fue eliminado para poder volver al listado (NX-SUP-001)
- **Prioridad:** Baja
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Estado 404 tipado para detalle de proveedor** (Estado: TODO)
   - _Descripción:_ En la consulta de detalle de proveedor, si no existe registro con eliminado_en IS NULL, renderizar componente de No Encontrado con NX-SUP-001.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un proveedor inexistente o eliminado, When se accede al detalle, Then se muestra NX-SUP-001
     - Given el estado, When se muestra, Then incluye botón de volver al listado
     - Given un proveedor existente, When se accede, Then se muestra normalmente

#### Historia de Usuario: Eliminación lógica de proveedor

- **Descripción:** Como Administrador quiero eliminar un proveedor mediante borrado lógico para dejar de usarlo sin perder la trazabilidad histórica
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de soft delete de proveedor** (Estado: TODO)
   - _Descripción:_ Implementar 'eliminarProveedor' que verifique ausencia de productos asociados y actualice eliminado_en, retornando NX-SUP-002 si hay dependencias.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un proveedor sin productos asociados, When se elimina, Then se marca eliminado_en
     - Given un proveedor con productos asociados, When se intenta eliminar, Then se rechaza con NX-SUP-002
     - Given el rechazo, When ocurre, Then sugiere reasignar productos primero

#### Historia de Usuario: Bloqueo de eliminación de proveedor con productos asociados

- **Descripción:** Como sistema quiero impedir la eliminación de un proveedor con productos asociados y sugerir reasignarlos para evitar inconsistencias de datos (NX-SUP-002)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de dependencia antes de eliminar proveedor** (Estado: TODO)
   - _Descripción:_ En la Server Action de eliminación de proveedor, consultar existencia de productos con proveedor_id asociado y bloquear con NX-SUP-002 si existen.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un proveedor con productos asociados, When se intenta eliminar, Then se rechaza con NX-SUP-002
     - Given el rechazo, When ocurre, Then se sugiere el listado de productos afectados
     - Given un proveedor sin productos, When se elimina, Then se permite

---

### Épica: Épica 23: Telemetría Transversal (Tráfico, Conversión y Uso de Producto)

_Descripción:_ Módulo transversal que rastrea de forma anónima y asíncrona ('fire and forget') el tráfico del catálogo web (visitas, visitantes únicos), la conversión comercial (clics en productos, agregados al carrito, redirecciones a WhatsApp) y las métricas de uso de funciones clave del Core (cargas IA, actualizaciones masivas, cobros de fiado) para generar reportes de valor hacia una 'Nave Nodriza' central, sin bloquear el flujo del usuario. Entidades: registros_uso_ia (como fuente de métricas) y endpoints públicos api/track.

#### Historia de Usuario: Tracking anónimo de visitas al catálogo

- **Descripción:** Como sistema quiero registrar de forma anónima las visitas y visitantes únicos del catálogo web para medir su alcance
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Endpoint API Route /api/track para tracking de visitas** (Estado: TODO)
   - _Descripción:_ Crear API Route pública POST /api/track que reciba slug y evento 'visita', registre sin PII y responda de forma no bloqueante (fire and forget) sin exponer estructura interna.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un POST con slug válido, When se envía, Then se registra la visita sin PII
     - Given la solicitud, When se procesa, Then responde 202 sin bloquear al cliente
     - Given un origen no permitido, When se envía, Then CORS lo rechaza

#### Historia de Usuario: Contabilización de uso de funciones clave del Core

- **Descripción:** Como sistema quiero contabilizar el uso de funciones como cargas IA, actualizaciones masivas y cobros de fiado para generar reportes de valor del producto
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Servicio de métricas de uso de producto** (Estado: TODO)
   - _Descripción:_ Crear función server-side reutilizable 'registrarUsoFuncion' invocada de forma asíncrona tras acciones clave (carga IA, actualización masiva, pago de fiado), persistida en tabla de métricas o enviada al endpoint de telemetría.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una carga IA exitosa, When finaliza, Then se registra el uso de forma asíncrona
     - Given el registro de métrica, When se envía, Then no bloquea la respuesta de la acción principal
     - Given un fallo en el envío de métrica, When ocurre, Then no afecta la operación principal del usuario

#### Historia de Usuario: Visualización de métricas de tráfico y conversión

- **Descripción:** Como Administrador quiero visualizar métricas de tráfico y conversión de mi catálogo web en el panel de telemetría para entender el comportamiento de mis visitantes
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Dashboard de telemetría con agregación de eventos** (Estado: TODO)
   - _Descripción:_ Crear Server Action de agregación sobre datos de tracking (visitas, clics, conversiones) y renderizar gráficos en /dashboard/telemetria usando componentes de visualización del stack aprobado.
   - _Criterios de Aceptación (QA/BDD):_
     - Given eventos de tracking registrados, When se accede al dashboard, Then se muestran agregados de visitas, clics y conversiones
     - Given un rol operador, When intenta acceder, Then se rechaza el acceso
     - Given un rango de fechas, When se selecciona, Then los gráficos se actualizan acorde

#### Historia de Usuario: Registro de eventos de conversión comercial

- **Descripción:** Como sistema quiero registrar clics en productos, agregados al carrito y redirecciones a WhatsApp para medir la efectividad del catálogo
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Endpoint API Route de tracking de conversión** (Estado: TODO)
   - _Descripción:_ Extender /api/track para aceptar eventos de tipo 'clic_producto', 'agregado_carrito' y 'redireccion_whatsapp', procesados de forma asíncrona y no bloqueante.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un evento clic_producto, When se envía, Then se registra correctamente
     - Given un evento agregado_carrito, When se envía, Then se registra correctamente
     - Given un payload incompleto, When se envía, Then se rechaza sin bloquear al cliente

#### Historia de Usuario: Envío asíncrono de datos analíticos (fire and forget)

- **Descripción:** Como sistema quiero enviar los datos de telemetría de forma asíncrona hacia el servidor central para no interrumpir el flujo del usuario ni saturar la base de datos del comercio
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Cliente HTTP no bloqueante para eventos de telemetría** (Estado: TODO)
   - _Descripción:_ Implementar función utilitaria que envíe eventos a /api/track usando fetch con keepalive:true o navigator.sendBeacon, sin esperar la respuesta ni bloquear la interacción del usuario.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un evento de telemetría, When se envía, Then usa fetch con keepalive:true o sendBeacon
     - Given el envío, When ocurre, Then no bloquea la interacción del usuario ni espera respuesta
     - Given un cierre de pestaña justo después de un evento, When ocurre, Then el evento se envía igualmente

---

### Épica: Épica 2: Registro y Alta de Comercio (Onboarding)

_Descripción:_ Permite el registro de un nuevo comercio (tenant) con email, contraseña y nombre de fantasía. Al completarse, crea automáticamente el registro en 'comercios', genera la sucursal por defecto 'Casa Matriz' en 'sucursales' y activa los módulos base en 'modulos_comercio'. Incluye la redirección post-registro al login y luego al dashboard inicial.

#### Historia de Usuario: Creación automática de sucursal por defecto

- **Descripción:** Como sistema quiero crear automáticamente la sucursal 'Casa Matriz' al registrar un comercio para que el usuario pueda operar sin configuración adicional
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Trigger/Server Action de alta de sucursal Casa Matriz** (Estado: TODO)
   - _Descripción:_ Implementar función server-side que, tras el insert en 'comercios', ejecute automáticamente un insert en 'sucursales' con es_casa_matriz=true dentro de una transacción atómica para garantizar consistencia.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un registro exitoso de comercio, When se ejecuta, Then se crea automáticamente la sucursal con es_casa_matriz=true
     - Given un fallo en el insert de sucursal, When ocurre, Then se revierte también el insert de comercio
     - Given la sucursal creada, When se consulta, Then activa=true por defecto

#### Historia de Usuario: Activación de módulos base al registrarse

- **Descripción:** Como sistema quiero activar los módulos base del comercio recién creado para que el usuario cuente con las funcionalidades esenciales desde el inicio
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Insert transaccional de modulos_comercio en onboarding** (Estado: TODO)
   - _Descripción:_ Dentro de la transacción de registro, insertar en modulos_comercio los códigos base (ej. CATALOGO_WEB) con activo=true para el nuevo cliente_id.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un registro exitoso, When se ejecuta, Then se insertan los módulos base con activo=true
     - Given un fallo en el insert de módulos, When ocurre, Then se revierte toda la transacción de registro
     - Given los módulos insertados, When se consultan, Then coinciden con MODULOS_BASE definidos

#### Historia de Usuario: Redirección post-registro al login y dashboard

- **Descripción:** Como nuevo comerciante quiero ser redirigido al login tras registrarme y luego al dashboard inicial al autenticarme para comenzar a usar el sistema de forma guiada
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Flujo de navegación post-registro** (Estado: TODO)
   - _Descripción:_ Configurar en la Server Action de registro la redirección con redirect() de Next.js hacia /login, y en el login exitoso hacia /dashboard/inicio.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un registro exitoso, When finaliza, Then redirige a /login
     - Given un login exitoso posterior, When ocurre, Then redirige a /dashboard/inicio
     - Given el flujo completo, When se navega hacia atrás, Then no queda un estado intermedio inconsistente

#### Historia de Usuario: Formulario de registro de nuevo comercio

- **Descripción:** Como nuevo comerciante quiero registrarme con mi correo, contraseña y nombre de fantasía para crear mi cuenta en NODEXA
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de registro con transacción comercio+auth** (Estado: TODO)
   - _Descripción:_ Implementar Server Action que cree el usuario en Supabase Auth y en la misma operación inserte el registro en comercios vinculando auth_user_id, validando el DTO con Zod.
   - _Criterios de Aceptación (QA/BDD):_
     - Given datos válidos de registro, When se ejecuta, Then se crea el usuario en Auth y el comercio vinculado
     - Given un fallo en cualquiera de los dos pasos, When ocurre, Then se revierte toda la operación
     - Given un email ya registrado en Auth, When se intenta, Then se muestra error apropiado

#### Historia de Usuario: Validación de datos de registro

- **Descripción:** Como sistema quiero validar en la puerta los campos del formulario de registro (email válido, contraseña segura, nombre obligatorio) para evitar datos inconsistentes
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Schema Zod completo para formulario de registro** (Estado: TODO)
   - _Descripción:_ Definir DTO Zod con validaciones de email, contraseña segura (mínimo de caracteres, mayúscula, número) y nombre_fantasia obligatorio, aplicado en cliente y servidor (Fail-Fast).
   - _Criterios de Aceptación (QA/BDD):_
     - Given un email inválido, When se envía, Then se rechaza
     - Given una contraseña débil (sin mayúscula o número), When se envía, Then se rechaza
     - Given nombre_fantasia vacío, When se envía, Then se rechaza
     - Given todos los campos válidos, When se envía, Then el schema pasa

---

### Épica: Épica 8: Maestro de Productos Simples

_Descripción:_ CRUD completo de productos sin variantes: nombre, SKU único, costo, precio de venta, proveedor asociado, categoría y foto (vía Cloudinary). Incluye listado paginado con filtros, validación de SKU duplicado (NX-PRD-002), campos obligatorios (NX-PRD-004), manejo de producto no encontrado (NX-PRD-001) y bloqueo de eliminación física cuando existen movimientos de stock asociados, aplicando soft delete/archivado (NX-PRD-003). Entidad principal: productos (tiene_variantes = false).

#### Historia de Usuario: Manejo de producto no encontrado

- **Descripción:** Como usuario quiero ver un mensaje claro si el producto que busco no existe o fue eliminado para volver al listado (NX-PRD-001)
- **Prioridad:** Baja
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Página y estado 404 tipado para producto** (Estado: TODO)
   - _Descripción:_ Implementar en /dashboard/productos/[id]/page.tsx la consulta del producto filtrando eliminado_en IS NULL; si no existe, renderizar componente de 'No encontrado' con NX-PRD-001 y CTA de volver al listado.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un id inexistente, When se accede al detalle, Then se muestra NX-PRD-001
     - Given un producto eliminado lógicamente, When se accede, Then se trata como no encontrado
     - Given el estado no encontrado, When se muestra, Then incluye CTA de volver al listado

#### Historia de Usuario: Bloqueo de eliminación física con movimientos de stock

- **Descripción:** Como sistema quiero impedir la eliminación física de un producto con movimientos de stock y ofrecer archivarlo en su lugar para preservar la trazabilidad (NX-PRD-003)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Validación de dependencia antes de soft delete de producto** (Estado: TODO)
   - _Descripción:_ En la Server Action de eliminación de producto, consultar existencia de registros en movimientos_stock asociados; si existen, forzar soft delete (eliminado_en) y retornar NX-PRD-003 en vez de eliminación física.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un producto con movimientos asociados, When se elimina, Then se aplica soft delete y retorna NX-PRD-003
     - Given un producto sin movimientos, When se elimina, Then se marca eliminado_en
     - Given un producto eliminado, When se consulta en listados activos, Then no aparece

#### Historia de Usuario: Creación de producto simple

- **Descripción:** Como Administrador quiero crear un producto simple con nombre, SKU, costo, precio, proveedor y foto para incorporarlo a mi catálogo
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de alta de producto simple** (Estado: TODO)
   - _Descripción:_ Implementar 'crearProductoSimple' con DTO Zod (nombre, sku, costo, precio_venta obligatorios), validando unicidad de SKU antes del insert y subiendo la foto a Cloudinary.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un DTO válido con SKU único, When se crea, Then el producto se persiste con tiene_variantes=false
     - Given un SKU duplicado, When se envía, Then se rechaza con NX-PRD-002
     - Given nombre vacío, When se envía, Then se rechaza con NX-PRD-004

#### Historia de Usuario: Validación de nombre obligatorio

- **Descripción:** Como sistema quiero exigir el nombre del producto como campo obligatorio para evitar registros incompletos (NX-PRD-004)
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Schema Zod con nombre requerido en DTO de producto** (Estado: TODO)
   - _Descripción:_ Agregar validación z.string().min(1) sobre el campo nombre en el DTO de creación/edición de producto, retornando NX-PRD-004 en frontend antes del submit.
   - _Criterios de Aceptación (QA/BDD):_
     - Given nombre vacío, When se envía el formulario, Then se rechaza con NX-PRD-004 antes del submit
     - Given nombre válido, When se envía, Then pasa la validación
     - Given el schema, When se reutiliza en creación y edición, Then el comportamiento es consistente

#### Historia de Usuario: Edición de producto simple

- **Descripción:** Como Administrador quiero editar los datos de un producto existente para mantener actualizada su información
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de actualización de producto simple** (Estado: TODO)
   - _Descripción:_ Implementar 'actualizarProductoSimple' con Zod, validando SKU único excluyendo el propio id, y actualizando actualizado_en.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un DTO válido, When se actualiza, Then se persisten los cambios y actualizado_en se refresca
     - Given un SKU duplicado (de otro producto), When se envía, Then se rechaza con NX-PRD-002
     - Given un producto de otro comercio, When se intenta editar, Then RLS bloquea

#### Historia de Usuario: Validación de SKU duplicado

- **Descripción:** Como sistema quiero impedir el registro de un producto con SKU repetido para mantener la unicidad de códigos en el catálogo (NX-PRD-002)
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Constraint único de SKU y validación previa en Server Action** (Estado: TODO)
   - _Descripción:_ Agregar índice UNIQUE compuesto (cliente_id, sku) en productos y validación previa en la Server Action de creación retornando NX-PRD-002 antes del insert.
   - _Criterios de Aceptación (QA/BDD):_
     - Given un SKU ya existente en el comercio, When se intenta crear otro producto con el mismo SKU, Then se rechaza con NX-PRD-002
     - Given el mismo SKU en otro comercio, When se crea, Then se permite
     - Given el índice UNIQUE, When se prueba a nivel de base de datos, Then existe y funciona

#### Historia de Usuario: Acceso de solo lectura para Operador

- **Descripción:** Como Operador quiero consultar el listado de productos en modo solo lectura para conocer precios y disponibilidad sin poder modificarlos
- **Prioridad:** Media
- **Estimación:** 3 pts

  _Sin actividades técnicas desglosadas aún._

#### Historia de Usuario: Visualización de detalle de producto

- **Descripción:** Como Administrador quiero ver el detalle completo de un producto, incluyendo su stock, para revisar toda su información en un solo lugar
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Consulta de detalle de producto con stock agregado** (Estado: TODO)
   - _Descripción:_ Crear Server Action que obtenga el producto junto a su stock consolidado (o listado de variantes) mediante joins tipados para /dashboard/productos/[id].
   - _Criterios de Aceptación (QA/BDD):_
     - Given un producto simple, When se consulta el detalle, Then incluye su stock consolidado
     - Given un producto con variantes, When se consulta, Then incluye el listado de variantes con su stock
     - Given un producto de otro comercio, When se consulta, Then RLS lo bloquea

#### Historia de Usuario: Listado paginado de productos con filtros

- **Descripción:** Como Administrador quiero ver un listado paginado de productos con filtros por categoría y proveedor para encontrar rápidamente lo que busco
- **Prioridad:** Alta
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Server Action de listado de productos con filtros combinados** (Estado: TODO)
   - _Descripción:_ Crear consulta paginada a productos con filtros por categoria_id, proveedor_id y texto de búsqueda, aplicando RLS por cliente_id y eliminado_en IS NULL.
   - _Criterios de Aceptación (QA/BDD):_
     - Given filtros de categoria_id y proveedor_id combinados, When se aplican, Then el resultado cumple ambas condiciones
     - Given un texto de búsqueda, When se aplica, Then filtra por coincidencia en nombre
     - Given productos eliminados, When se listan, Then no aparecen

#### Historia de Usuario: Subida de foto de producto vía Cloudinary

- **Descripción:** Como Administrador quiero subir una foto de mi producto y que se comprima automáticamente para no afectar el rendimiento del catálogo
- **Prioridad:** Media
- **Estimación:** 3 pts

##### Actividades Técnicas Desglosadas:

1. **Componente de upload de imagen de producto con Cloudinary** (Estado: TODO)
   - _Descripción:_ Implementar componente de carga que suba la imagen a Cloudinary con transformación WebP/compresión y persista foto_url en el producto.
   - _Criterios de Aceptación (QA/BDD):_
     - Given una imagen seleccionada, When se sube, Then se aplica transformación WebP/compresión
     - Given la subida exitosa, When finaliza, Then foto_url se persiste en el producto
     - Given un archivo no soportado, When se selecciona, Then se rechaza con mensaje claro

---
