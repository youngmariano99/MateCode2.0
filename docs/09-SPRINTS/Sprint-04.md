# Sprint 04 - Sistema de Diseño, Componentes y Experiencia Base

Versión: 1.0

Estado: Pendiente

Prioridad: Muy Alta

Tiempo estimado: 1 Sprint

---

# Objetivo

Construir toda la identidad visual y la biblioteca de componentes reutilizables de MateCode.

Este Sprint no implementa funcionalidades del negocio.

Su objetivo es crear una base visual consistente sobre la que se desarrollarán todos los módulos futuros.

Al finalizar este Sprint deberá ser posible construir cualquier pantalla del sistema únicamente reutilizando componentes existentes.

---

# Dependencias

Debe estar finalizado:

✅ Sprint 00

✅ Sprint 01

✅ Sprint 02

✅ Sprint 03

---

# Resultado esperado

Al finalizar este Sprint deberá existir:

✅ Tema oscuro principal

✅ Tema claro (opcional)

✅ Tokens de diseño

✅ Sidebar completo

✅ Header

✅ Layout principal

✅ Biblioteca completa de componentes

✅ Sistema de iconografía

✅ Sistema de formularios

✅ Sistema de tablas

✅ Sistema de Cards

✅ Sistema de Empty States

✅ Sistema de Skeletons

✅ Sistema de Badges

✅ Sistema de Toasts

✅ Sistema de Modales

✅ Responsive completo

Todo reutilizable.

---

# Filosofía

Este Sprint no desarrolla pantallas.

Desarrolla herramientas para construir pantallas.

Toda pantalla futura deberá reutilizar estos componentes.

Nunca crear variantes nuevas innecesarias.

---

# Diseño

Seguir estrictamente:

05-DESIGN_SYSTEM.md

No modificar colores.

No modificar tipografía.

No crear estilos fuera del Design System.

---

# Tareas

## 1. Configurar Tema

Crear sistema de temas.

Modo oscuro (principal)

Modo claro (preparado)

Persistencia del tema.

---

## 2. Tokens de Diseño

Implementar:

Colores

Tipografía

Espaciados

Radios

Sombras

Animaciones

Breakpoints

Z-index

Opacidades

Nunca utilizar valores "mágicos".

Todo deberá salir de los Tokens.

---

## 3. Layout Principal

Crear:

Sidebar

Header

Área de contenido

Breadcrumb

Footer (si corresponde)

Responsive

---

## 4. Sidebar

Debe soportar:

Expandido

Colapsado

Drawer móvil

Íconos

Tooltips

Estado activo

Animaciones

---

## 5. Header

Debe contener:

Breadcrumb

Buscador global

Estado Online / Offline

Avatar

Menú del usuario

Nada más.

---

## 6. Sistema de Botones

Crear variantes:

Primary

Secondary

Outline

Ghost

Destructive

Icon

Loading

Disabled

Todos deberán compartir la misma API.

---

## 7. Sistema de Inputs

Crear:

Input

Password

Textarea

Number

Email

Search

Currency

Phone

Date

Autocomplete

Todos deberán incluir:

Label

Placeholder

Descripción

Mensaje de error

Estado de carga

---

## 8. Sistema de Selectores

Crear:

Select

MultiSelect

Combobox

Autocomplete

Checkbox

Radio

Switch

---

## 9. Formularios

Crear componentes reutilizables para:

Formulario

Grupo

Sección

Validación

Errores

Ayudas

Paso a paso (Stepper)

No crear formularios específicos.

---

## 10. Sistema de Cards

Crear:

Card Base

Card KPI

Card Cliente

Card Acción Rápida

Card Información

Card Estado Vacío

---

## 11. Sistema de Badges

Crear Badges para:

Lead

Contacto

Propuesta

Aceptado

En progreso

Seguimiento

Terminado

Rechazado

Utilizar los colores definidos en el Design System.

---

## 12. Sistema de Tablas

Crear DataTable reutilizable.

Debe soportar:

Ordenar

Buscar

Filtrar

Paginación

Ocultar columnas

Estados vacíos

Loading

Acciones

Responsive

---

## 13. Sistema de Listas

Crear:

Lista simple

Lista con acciones

Lista virtualizada

Timeline

Actividad

---

## 14. Sistema de Modales

Crear:

Dialog

Drawer

Confirmación

Alert

Modal formulario

---

## 15. Sistema de Feedback

Crear:

Toast

Alert

Banner

Snackbar

Notificación

Todos reutilizables.

---

## 16. Estados Visuales

Crear:

Loading

Skeleton

Error

Vacío

Sin conexión

Sin resultados

Permisos insuficientes

---

## 17. Sistema de Iconografía

Utilizar exclusivamente:

Lucide React

Crear wrapper propio.

Nunca utilizar iconos directamente.

---

## 18. Sistema de Tipografía

Crear componentes:

Título

Subtítulo

Texto

Ayuda

Etiqueta

Descripción

No escribir estilos manuales.

---

## 19. Responsive

Todos los componentes deberán funcionar correctamente en:

390px

768px

1024px

1440px

Mobile First obligatorio.

---

## 20. Accesibilidad

Todos los componentes deberán cumplir:

WCAG AA

Focus visible

ARIA

Teclado

Screen Readers

---

# Componentes Obligatorios

Al finalizar el Sprint deberán existir como mínimo:

Button

IconButton

Input

Textarea

InputPassword

InputSearch

InputCurrency

PhoneInput

Checkbox

Radio

Switch

Select

MultiSelect

Autocomplete

Combobox

Card

Badge

Avatar

Tooltip

Dropdown

Popover

Dialog

Drawer

Alert

Toast

Snackbar

Breadcrumb

Tabs

Accordion

Table

Pagination

Timeline

Activity

Progress

Skeleton

Spinner

EmptyState

LoadingOverlay

StatCard

QuickActionCard

MapPlaceholder

MarkdownViewer

MarkdownEditor

Calendar

DatePicker

FileUpload

SearchBar

FiltersBar

StatusBadge

---

# Exclusiones

No implementar:

Clientes

Pagos

Contratos

CRM

Dashboard

Offline

IA

Logística

Casos de Uso

Repositorios

Base de Datos

---

# Archivos que deberán crearse

```text
src/

presentation/

components/

button/

card/

badge/

input/

select/

checkbox/

switch/

dialog/

drawer/

table/

toast/

timeline/

calendar/

layout/

sidebar/

header/

empty-state/

skeleton/

typography/

icons/

theme/

providers/

```

---

# Archivos que podrán modificarse

styles/

tailwind.config.ts

globals.css

presentation/

components/

providers/

---

# Testing

Crear pruebas para:

Botones

Inputs

Selects

Tablas

Layouts

Sidebar

Header

Responsividad

Accesibilidad

---

# Criterios de aceptación

El Sprint estará terminado únicamente si:

✓ Todos los componentes existen.

✓ Todos siguen el Design System.

✓ Todos funcionan en móvil.

✓ Todos funcionan en escritorio.

✓ Todos poseen estados Loading.

✓ Todos poseen estados Error.

✓ Todos poseen Empty State.

✓ Todos son accesibles.

✓ No existen estilos duplicados.

✓ Toda la UI reutiliza Tokens.

---

# Definition of Done

☐ Sin errores TypeScript.

☐ Sin errores ESLint.

☐ Sin uso de any.

☐ Todos los componentes reutilizables.

☐ Sin CSS duplicado.

☐ Responsive completo.

☐ Accesibilidad validada.

☐ Design System respetado.

☐ Componentes documentados.

☐ Tests aprobados.

---

# Entregables

Al finalizar este Sprint deberá existir una biblioteca completa de componentes reutilizables que permita construir cualquier pantalla futura de MateCode sin volver a diseñar elementos visuales.

Toda la identidad visual del sistema deberá quedar consolidada en este Sprint.

---

# Notas para la IA

- Nunca crear componentes específicos de un módulo de negocio.
- Todo componente debe ser reutilizable.
- Toda decisión visual debe seguir el archivo `05-DESIGN_SYSTEM.md`.
- Evitar duplicación de estilos y lógica.
- Favorecer composición sobre herencia.
- Priorizar accesibilidad, claridad y consistencia antes que efectos visuales.
