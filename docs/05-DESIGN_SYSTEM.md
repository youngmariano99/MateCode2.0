# Design System

# Design System

Versión: 2.0

> "La interfaz debe desaparecer. El trabajo debe ser el protagonista."

---

# Objetivo

El Design System de MateCode tiene un único objetivo:

Construir una interfaz consistente, limpia y extremadamente intuitiva.

No buscamos sorprender.

Buscamos reducir el esfuerzo mental.

Toda pantalla debe sentirse parte del mismo producto.

La IA nunca deberá inventar estilos nuevos.

Siempre deberá utilizar este sistema.

---

# Filosofía Visual

MateCode transmite:

☕

Calma

Orden

Profesionalismo

Tecnología

Minimalismo

Confianza

La interfaz debe sentirse como sentarse con un mate a organizar el día.

Nunca debe sentirse agresiva.

Nunca debe sentirse ruidosa.

Nunca debe sentirse pesada.

---

# Inspiración

MateCode toma inspiración de:

• Linear

• Raycast

• Vercel

• Notion

• Stripe Dashboard

• GitHub

No debe copiar ninguno.

Debe construir una identidad propia.

---

# Personalidad

MateCode habla como un compañero.

No como un software.

No utiliza palabras técnicas.

No intenta parecer "corporativo".

Debe sentirse cercano.

---

# Paleta Principal

## Fondo Principal

#09090B

---

## Fondo Secundario

#111113

---

## Tarjetas

#18181B

---

## Hover

#232326

---

## Bordes

#2A2A2E

---

## Texto Principal

#FAFAFA

---

## Texto Secundario

#A1A1AA

---

## Verde MateCode

#10B981

Es el color principal del sistema.

Representa:

acción

confirmación

continuar

crear

guardar

nunca debe utilizarse como decoración.

---

## Verde Hover

#059669

---

## Azul

#3B82F6

Información

Lead

Ayuda

---

## Celeste

#38BDF8

Contacto realizado

---

## Amarillo

#F59E0B

Pendiente

Seguimiento

Advertencia

---

## Naranja

#FB923C

En progreso

---

## Rojo

#EF4444

Error

Rechazado

Eliminar

---

## Gris

#71717A

Finalizado

Archivado

Inactivo

---

## Violeta

#8B5CF6

Propuesta enviada

IA

Automatizaciones

---

# Colores de Estados

Lead

Azul

Contacto

Celeste

Propuesta

Violeta

Aceptado

Verde

En progreso

Naranja

Seguimiento

Amarillo

Terminado

Gris

Rechazado

Rojo

Estos colores nunca deberán modificarse.

---

# Tipografía

Fuente principal

Inter

Fallback

System UI

Nunca utilizar más de una familia tipográfica.

---

# Escala

Título Principal

36

---

Título

30

---

Subtítulo

24

---

Título de tarjeta

20

---

Texto normal

16

---

Texto secundario

14

---

Ayuda

12

---

# Radios

Botones

12px

Inputs

12px

Cards

16px

Modales

20px

Nunca utilizar esquinas totalmente cuadradas.

---

# Sombras

Muy sutiles.

La profundidad deberá generarse mediante contraste.

No mediante sombras exageradas.

---

# Espaciado

Utilizar una escala de 8px.

4

8

16

24

32

40

48

64

Nunca utilizar medidas arbitrarias.

---

# Iconografía

Lucide React

Toda la aplicación utilizará la misma librería.

Nunca mezclar iconos.

---

# Botones

Existen cuatro variantes.

Primario

Verde MateCode

Secundario

Gris

Outline

Sólo borde

Ghost

Sin fondo

No crear variantes adicionales.

---

# Inputs

Siempre deberán mostrar:

Label

Placeholder

Ejemplo

Mensaje de ayuda

Error

Nunca únicamente un cuadro vacío.

---

# Cards

Toda información importante deberá mostrarse dentro de Cards.

Una Card debe responder una única pregunta.

Nunca mezclar demasiada información.

---

# Tablas

Sólo utilizar tablas cuando sea realmente necesario.

Si la información puede mostrarse mediante Cards.

Siempre elegir Cards.

---

# Badges

Los badges representan estados.

Nunca acciones.

Nunca utilizar botones con apariencia de Badge.

---

# Modales

Sólo utilizar cuando realmente sea necesario.

Si una acción puede realizarse en la misma pantalla.

Evitar el modal.

---

# Formularios

Todos los formularios deberán seguir exactamente el mismo diseño.

Label

↓

Placeholder

↓

Texto de ayuda

↓

Validación

↓

Error

Nunca cambiar este orden.

---

# Sidebar

Siempre visible en escritorio.

Colapsable.

En móvil.

Drawer.

Nunca dos menús distintos.

---

# Header

Muy limpio.

Debe contener únicamente:

Breadcrumb

Buscador

Estado Online

Perfil

Nada más.

---

# Dashboard

No utilizar gráficos por decoración.

Toda información debe responder:

¿Qué tengo que hacer?

No:

¿Qué tan lindo queda este gráfico?

---

# Estados

Loading

Skeleton

No Spinner.

---

Éxito

Toast Verde.

---

Advertencia

Toast Amarillo.

---

Error

Toast Rojo.

---

Información

Toast Azul.

---

# Skeletons

Toda carga superior a 300ms deberá mostrar Skeleton.

Nunca mostrar pantalla vacía.

---

# Animaciones

Duración

200ms

Curva

ease-out

Sólo utilizar animaciones para mejorar comprensión.

Nunca para decorar.

---

# Responsive

MateCode es Mobile First.

Cada componente deberá diseñarse primero para:

390px

Luego:

768px

Luego:

1024px

Luego:

1440px

Nunca al revés.

---

# Accesibilidad

Todo deberá cumplir WCAG AA.

Contraste suficiente.

Navegación mediante teclado.

Estados Focus visibles.

Áreas táctiles mínimas de 44x44px.

---

# Oscuro

El modo oscuro será el modo principal.

El modo claro será opcional.

Toda nueva pantalla deberá diseñarse primero para Dark Mode.

---

# Principios

La IA nunca deberá crear componentes nuevos si ya existe uno similar.

Siempre deberá reutilizar.

El objetivo no es construir muchas pantallas.

Es construir pocas pantallas extremadamente consistentes.

---

# Biblioteca de Componentes

Componentes base obligatorios:

- Button
- Card
- Input
- Textarea
- Select
- Combobox
- Checkbox
- Switch
- Badge
- Avatar
- Tooltip
- Dropdown Menu
- Dialog
- Drawer
- Sheet
- Tabs
- Accordion
- Calendar
- Date Picker
- Data Table
- Toast
- Alert
- Skeleton
- Empty State
- Loading Overlay
- Search Input
- Filters Bar
- Status Badge
- Timeline
- Activity Feed
- Stepper
- File Upload
- Markdown Editor
- Map
- KPI Card
- Quick Action Card

La IA deberá reutilizar estos componentes en todos los módulos.

Nunca rediseñarlos.

---

# Regla de Oro

Antes de diseñar una nueva pantalla la IA deberá responder:

1. ¿Respeta el Design System?

2. ¿Está reutilizando componentes existentes?

3. ¿Puede entenderse en menos de cinco segundos?

4. ¿Existe una única acción principal?

5. ¿Se siente como MateCode?

Si alguna respuesta es negativa.

La pantalla deberá rediseñarse.

---

# Objetivo Final

Un usuario debe poder abrir cualquier módulo de MateCode y sentir que siempre está utilizando la misma aplicación.

No importa si administra clientes, contratos, pagos o logística.

Todo debe sentirse familiar.

Todo debe sentirse simple.

Todo debe sentirse MateCode.
