# 🎨 TEMPLATE OPERATIVO: LANDING PAGE

---

## 📋 FASE 1: INICIO (Días 1-2)

### Objetivo

Recopilar toda la información necesaria para que Claude genere un diseño profesional sin ambigüedades.

### Herramientas a usar

- **Recopilación**: Documentos, emails, links
- **Organización**: Markdown (crear archivo BRIEFING.md)
- **Validación**: Revisión manual con stakeholders

### 1.1 - RECOPILACIÓN DE CONTEXTO

**Archivo a crear: `BRIEFING.md`**

```markdown
# BRIEFING LANDING PAGE

## 1. INFORMACIÓN DE MARCA

### Identidad Visual

- **Nombre empresa**: [Nombre exacto]
- **Logo**: [Ruta archivo o descripción detallada]
- **Eslogan/Tagline**: [Frase corta de brand]

### Colores Brand

- **Color Primario**: #[HEX] - Nombre: [Azul corporativo]
- **Color Secundario**: #[HEX] - Nombre: [Verde menta]
- **Color Acento**: #[HEX] - Nombre: [Naranja]
- **Grises**: #[HEX] para texto, #[HEX] para fondo

### Tipografía

- **Headings**: [Montserrat Bold]
- **Body**: [Inter Regular]
- **Monospace** (si aplica): [Fira Code]

### Tone of Voice

- [ ] Profesional y corporativo
- [ ] Casual y amigable
- [ ] Técnico y detallado
- [ ] Audaz e innovador
- [ ] Minimalista y elegante

### Brand Values

1. [Valor 1]
2. [Valor 2]
3. [Valor 3]

## 2. OBJETIVO COMERCIAL

### Propósito principal

- [ ] Lead Generation (capturar emails)
- [ ] Ventas directas (e-commerce)
- [ ] Awareness (reconocimiento marca)
- [ ] App downloads
- [ ] Event registration

### Métrica de éxito

- Conversión deseada: [5%]
- Objetivo de visitas/mes: [N]
- Objetivo de leads/mes: [N]

### Call-to-Action (CTA) Principal

- **Texto CTA**: [Solicitar demo / Comprar ahora]
- **Acción**: [Abre modal / Redirige a checkout]
- **Destino**: [URL o email]

## 3. AUDIENCIA OBJETIVO

### Datos demográficos

- **Edad**: [25-45 años]
- **Profesión**: [Product managers, CTOs]
- **Industria**: [SaaS, Tech]
- **Ubicación**: [Global / Específica]
- **Nivel ingreso**: [Medio-Alto / Empresas]

### Pain points (Problemas que resuelves)

1. [Problema 1]: [Solución que ofreces]
2. [Problema 2]: [Solución que ofreces]
3. [Problema 3]: [Solución que ofreces]

### Beneficios esperados

1. [Ahorro de tiempo: 50%]
2. [Reducción de costos: 30%]
3. [Automatización: 80%]

## 4. ESTRUCTURA DE CONTENIDO

### Hero Section

- **Headline**: [Tu propuesta de valor principal en 10 palabras]
- **Subheadline**: [Beneficio principal en 2 líneas]
- **Copy adicional**: [Máx 50 palabras explicando qué es]
- **CTA primario**: [Texto botón]
- **Visual**: [Descripción: screenshot, ilustración, video]
- **Tiempo lectura**: [max 5 segundos]

### Sección 2: Beneficios (3-5 items)

- **Tipo**: Cards / Iconos / Números
- **Benefit 1**:
  - Título: [Corto]
  - Descripción: [2 líneas]
  - Icono/visual: [descripción]
- **Benefit 2**: [idem]
- **Benefit 3**: [idem]

### Sección 3: Cómo funciona (Opcional)

- **Paso 1**: [Descripción + visual]
- **Paso 2**: [Descripción + visual]
- **Paso 3**: [Descripción + visual]

### Sección 4: Testimonios / Social Proof

- **Tipo**: Cards, Slider, Grid
- **Cantidad**: [3-5 testimonios]
- **Contenido requerido**:
  - Texto testimonial: [Máx 50 palabras]
  - Nombre persona: [Nombre Apellido]
  - Cargo/empresa: [Director IT - TechCorp]
  - Foto**: [Si/No - opcional]
  - Resultado cuantificado: [Si/No]

### Sección 5: Casos de Uso / Use Cases

- **Industria 1**: Descripción caso
- **Industria 2**: Descripción caso
- **Industria 3**: Descripción caso

### Sección 6: FAQ (Preguntas frecuentes)

1. **P**: ¿Pregunta común 1?
   **R**: [Respuesta 2-3 líneas]
2. **P**: ¿Pregunta común 2?
   **R**: [Respuesta 2-3 líneas]
3. **P**: ¿Pregunta común 3?
   **R**: [Respuesta 2-3 líneas]

### Footer / CTA Final

- **Headline**: [Urgencia o beneficio final]
- **CTA final**: [Texto botón]
- **Links legales**: [Privacidad, Términos]
- **Redes sociales**: [Links a redes]

## 5. REFERENCIAS VISUALES

### Sitios que te GUSTAN

- Link 1: [URL + por qué te gusta]
- Link 2: [URL + por qué te gusta]
- Link 3: [URL + por qué te gusta]

### Sitios que te NO te gustan

- Link 1: [URL + qué NO quieres]
- Link 2: [URL + qué NO quieres]

### Inspiración de estilo

- [ ] Minimalista (mucho whitespace)
- [ ] Corporativo (formal, profesional)
- [ ] Moderno (animaciones, gradientes)
- [ ] Playful (colores vibrantes, iconos)
- [ ] Dark mode (tema oscuro)

## 6. ESPECIFICACIONES TÉCNICAS

### Hosting

- [ ] Vercel (recomendado para Next.js)
- [ ] Netlify
- [ ] Dominio propio: [tudominio.com]
- [ ] HTTPS: Sí

### SEO Requerido

- **Meta Title**: [Tu servicio - Empresa] (<60 caracteres)
- **Meta Description**: [Propuesta de valor] (<160 caracteres)
- **Keywords principales**: [palabra1, palabra2, palabra3]
- **Canonical URL**: [https://tudominio.com]

### Integraciones Necesarias

- [ ] Email (Mailchimp, SendGrid)
- [ ] Analytics (Google Analytics 4)
- [ ] Formularios (Typeform, HubSpot)
- [ ] Chat (Intercom, Drift)
- [ ] Pagos (Stripe) - Solo si venta directa

### Idiomas

- [ ] Español
- [ ] Inglés
- [ ] Otros: [listar]

## 7. RESTRICCIONES Y CONSIDERACIONES

### Performance

- Lighthouse Score: Mínimo 90
- Time to First Byte: < 600ms
- Largest Contentful Paint: < 2.5s

### Accesibilidad

- [ ] WCAG 2.1 AA mínimo
- [ ] Navegación por teclado
- [ ] Alt text en imágenes
- [ ] Contraste de colores

### Compatibilidad

- [ ] Chrome, Safari, Firefox, Edge
- [ ] Mobile (320px, 768px, 1024px+)
- [ ] Tablets
- [ ] Navegadores viejos: Sí/No

### Contenido a proporcionar

- Logo en formato: [SVG / PNG]
- Imágenes adicionales: [Cantidad, tipo]
- Testimonios**: [Textos preparados o debes conseguirlos]
- Copy**: [Preparado o debes escribirlo]

---

## FIRMA APROBACIÓN

- **Preparado por**: [Tu nombre]
- **Aprobado por**: [Stakeholder]
- **Fecha**: [DD/MM/YYYY]
- **Versión**: 1.0
```

### 1.2 - VALIDACIÓN CON STAKEHOLDERS

**Checklist de aprobación:**

- [ ] Briefing completado en 100%
- [ ] Stakeholder principal aprobó objetivo
- [ ] Contenido (copy/imágenes) confirmado disponible
- [ ] Colores de marca validados
- [ ] Referencias visuales consensuadas
- [ ] Timeline acordado
- [ ] Presupuesto definido

---

## 📐 FASE 2: DESARROLLO DISEÑO (Días 3-4)

### Objetivo

Generar mockups visuales y prototipo interactivo que valide el diseño antes de codificar.

### Herramientas a usar

| Tarea                | Herramienta                 | Entrega                |
| -------------------- | --------------------------- | ---------------------- |
| Mockup visual        | Claude Design (Claude.ai)   | PNG/PDF mockup         |
| Prototipo clickeable | Artifacts React (Claude.ai) | Componente interactivo |
| Validación           | Manual (tu navegador)       | Feedback               |

### 2.1 - MOCKUP VISUAL CON CLAUDE DESIGN

**Herramienta:** Claude.ai → Chat normal

**Contexto a pasar:**

Archivo: `DESIGN_BRIEF.md`

```markdown
# BRIEF PARA DISEÑADOR (Claude Design)

## Copia TODO el BRIEFING.md aquí

[Pega el contenido completo de BRIEFING.md del Paso 1.1]

## INSTRUCCIONES ESPECÍFICAS PARA DISEÑADOR

### Qué generar exactamente

Crea mockups profesionales (PNG/PDF) mostrando TODAS las secciones:

1. Hero section completo
2. Beneficios (3 items lado a lado)
3. Cómo funciona (3 pasos)
4. Testimonios (carousel visual)
5. CTA final

### Estilo visual obligatorio

- Paleta: Usa exactamente los colores del brief
- Tipografía: Headings en [Montserrat], Body en [Inter]
- Espaciado: Generoso (16px minimum entre secciones)
- Alineación: Grid de 12 columnas

### Elementos NO genéricos

- NO uses templates estándar
- NO uses colores por defecto
- Personaliza CADA elemento según brand
- Incluye micro-detalles (shadows, gradientes sutiles)

### Validación de diseño

Asegúrate que:
✓ Jerarquía visual es clara
✓ CTA principal destaca
✓ Mobile view es legible
✓ Colores tienen suficiente contraste
```

**Prompt exacto a pasar a Claude:**

```markdown
Eres un diseñador gráfico senior especializado en landing pages de alto impacto.

# CONTEXTO COMPLETO

[Pega contenido de DESIGN_BRIEF.md]

# TAREA: GENERAR MOCKUP VISUAL PROFESIONAL

## Requisitos:

1. Crea mockups en formato PNG mostrando:
   - Desktop view (1200px)
   - Mobile view (375px)

2. Para CADA sección (hero, beneficios, testimonios, etc):
   - Incluye tipografía, colores, espaciado exacto
   - Usa elementos visuales (iconos, ilustraciones, fotos)
   - Valida contraste (mínimo 4.5:1 para texto)

3. Estilo visual:
   - Usa EXACTAMENTE estos colores: [paste colors]
   - Headings: Montserrat Bold
   - Body: Inter Regular, 16px
   - Espaciado: múltiplos de 8px

4. Detalles importantes:
   - CTA principal debe estar destacado (color diferente)
   - Whitespace adecuado (no amontonado)
   - Coherencia visual en toda la página

## ESTRUCTURA A MOSTRAR EN MOCKUPS:

### 1. HERO SECTION

- Header con logo + navegación (hamburger en mobile)
- Headline grande
- Subheadline
- Botón CTA primario
- Imagen/visual fondo
- Altura: 600px (desktop)

### 2. BENEFICIOS

- 3 columnas (1 en mobile)
- Cada card con ícono + título + descripción
- Fondo: blanco o color claro
- Borde/sombra sutil

### 3. TESTIMONIOS

- Slider/carrusel visual
- Cards con: foto, testimonio, nombre, cargo
- Estrellas de rating (5 estrellas)

### 4. CTA FINAL

- Headline urgencia/beneficio
- Botón secundario CTA
- Background: color primario o contraste

### 5. FOOTER

- Links: Privacidad, Términos, Redes
- Copyright

## VALIDACIONES FINALES

Confirma en tu respuesta:
☑ ¿Respeta paleta de colores?
☑ ¿Jerarquía visual clara?
☑ ¿CTA destacado?
☑ ¿Mobile-friendly visualmente?
☑ ¿Tipografía legible?

Genera los mockups ahora.
```

**QUÉ ESPERAR:**

- Claude genera código SVG que visualiza como mockup profesional
- Verás cada sección claramente
- Colores, tipografía, espaciado coherentes

**VALIDAR:**

- ✅ ¿Se parece al brief?
- ✅ ¿Respeta los colores?
- ✅ ¿La jerarquía visual es clara?
- ✅ ¿Mobile se ve bien?

Si hay cambios necesarios:

```
"El hero section necesita más contraste en el texto.
El fondo es muy claro. Cambia a un gradiente más oscuro o
agrega un overlay semi-transparente."
```

---

### 2.2 - PROTOTIPO INTERACTIVO CON ARTIFACTS

**Herramienta:** Claude.ai → Nuevo chat → Artifacts

**Contexto a pasar:**

```markdown
# BRIEF PARA PROTOTIPO INTERACTIVO

[Pega BRIEFING.md completo]

## ESPECIFICACIONES TÉCNICAS

### Framework

- React con Hooks
- Tailwind CSS (utility-first)
- shadcn/ui para componentes (si necesario)

### Comportamiento esperado

- Smooth scroll a secciones
- Botones funcionan (consolelog por ahora)
- Formulario en CTA guarda datos en estado
- Mobile responsive
- Navegación por teclado funciona

### Contenido

Usa contenido REAL del brief, no Lorem ipsum:

- Headline exacta: [copia del brief]
- Beneficios: [copia del brief]
- Testimonios: [copia del brief]

### Estructura exacta
```

Landing page
├── Header
│ ├── Logo
│ └── Nav (collapse en mobile)
├── Hero Section
├── Beneficios
├── Cómo funciona
├── Testimonios
├── FAQ (accordions)
├── CTA Final
└── Footer

```

### Validaciones
- Responsive: 320px, 768px, 1024px+
- Accesibilidad: botones clickeables, inputs accesibles
- Performance: animaciones suaves
```

**Prompt exacto:**

````markdown
Eres un frontend engineer senior especializado en landing pages performantes.

# CONTEXTO

[Pega el BRIEF PARA PROTOTIPO INTERACTIVO]

# TAREA: CREAR LANDING PAGE REACT INTERACTIVA

## Requisitos:

### 1. COMPONENTES

Crea un componente React que incluya:

- Header con navegación (responsive hamburger menu)
- Hero section con CTA button
- 3 benefit cards
- Steps section (3 pasos)
- Testimonials slider/carousel
- FAQ con accordions (expandibles)
- Contact form con validación básica
- Footer

### 2. ESTILO

- Usa Tailwind CSS con tema personalizado
- Colores: Define vars CSS con tus brand colors
- Tipografía: Headings Montserrat, Body Inter
- Responsive: Mobile-first approach

### 3. INTERACTIVIDAD

- Menu mobile expande/colapsa
- Smooth scroll al hacer click en links
- Formulario: valida email, guarda en useState
- Testimonios: swipeable (left/right arrows)
- FAQ: click abre/cierra

### 4. SIN ERRORES

- TypeScript (si usas)
- Prop types documentadas
- No console.errors
- Accesible (buttons, links, inputs)

### 5. CONTENIDO

Usa contenido REAL:

- Headline: [copia exacta]
- Benefits: [lista completa]
- Testimonios: [con nombres, cargos]
- FAQ: [preguntas y respuestas]

## CÓDIGOS ÚTILES A INCLUIR

```javascript
// Colores brand como variables CSS
const brandColors = {
  primary: "[color primario]",
  secondary: "[color secundario]",
  accent: "[color acento]",
};

// Form state
const [formData, setFormData] = useState({
  email: "",
  message: "",
});

// Handle click con smooth scroll
const scrollToSection = (id) => {
  document.getElementById(id).scrollIntoView({ behavior: "smooth" });
};
```
````

## CHECKLIST FINAL

- ☑ Responsive (probado visual)
- ☑ Todos los botones funcionan
- ☑ Formulario valida email
- ☑ Mobile menu funciona
- ☑ Texto legible en todos los tamaños

Genera ahora.

```

**RESULTADO EN ARTIFACTS:**
- Componente React ejecutable
- Verás en tiempo real la landing funcionando
- Puedes redimensionar y probar responsive

**FEEDBACK RÁPIDO:**
```

"El formulario debería ser más prominente.
Muévelo al hero section.
También el color de botones no contrasta lo suficiente en mobile."

````

---

### 2.3 - VALIDACIÓN Y AJUSTES

**Checklist de validación:**

- [ ] Mockup visual aprobado por stakeholder
- [ ] Prototipo funcional sin errores
- [ ] Responsive probado (móvil, tablet, desktop)
- [ ] Textos correctos (sin typos)
- [ ] Imágenes/colores correctos
- [ ] Flujo de usuario claro
- [ ] CTAs visibles y clickeables
- [ ] Accesibilidad básica (botones, contraste)

---

## 💻 FASE 3: DESARROLLO CÓDIGO (Días 5-7)

### Objetivo
Generar código Next.js production-ready con optimizaciones.

### Herramientas a usar
| Tarea | Herramienta | Entrega |
|-------|-------------|---------|
| Setup proyecto | Claude Code (Terminal) | Estructura carpetas |
| Componentes | Claude Code | React components |
| Optimizaciones | Claude Code | Images, Meta tags, SEO |
| Integraciones | Claude Code | APIs, Forms |

### 3.1 - SETUP PROYECTO

**Herramienta:** Terminal + Claude Code

```bash
# Crear proyecto Next.js
npx create-next-app@latest landing-page \
  --typescript \
  --tailwind \
  --eslint

cd landing-page

# Abrir Claude Code
claude-code
````

**Contexto a pasar: `CODING_BRIEF.md`**

```markdown
# BRIEF PARA DESARROLLO

## PROYECTO

Landing page: [nombre marca]

## STACK ELEGIDO

- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS
- Componentes: React + Hooks
- Tipado: TypeScript
- Deployment: Vercel

## ESTRUCTURA DE CARPETAS REQUERIDA
```

landing-page/
├── src/
│ ├── app/
│ │ ├── layout.tsx (root con meta tags)
│ │ ├── page.tsx (landing principal)
│ │ └── api/
│ │ └── contact/route.ts (endpoint formulario)
│ │
│ ├── components/
│ │ ├── Header.tsx
│ │ ├── Hero.tsx
│ │ ├── Benefits.tsx
│ │ ├── Steps.tsx
│ │ ├── Testimonials.tsx
│ │ ├── FAQ.tsx
│ │ ├── CTA.tsx
│ │ ├── Footer.tsx
│ │ └── ContactForm.tsx
│ │
│ ├── lib/
│ │ ├── constants.ts (contenido)
│ │ └── utils.ts (funciones útiles)
│ │
│ └── styles/
│ └── globals.css (Tailwind)
│
├── public/
│ ├── logo.svg
│ ├── favicon.ico
│ └── images/
│
├── .env.example
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── README.md

````

## ESTÁNDARES DE CÓDIGO

### TypeScript
- Strict mode: true
- Prop types documentadas

### React
- Componentes funcionales
- Hooks (useState, useEffect)
- Prop destructuring

### Tailwind
- Solo classes (no custom CSS)
- Dark mode: sí
- Breakpoints: sm(640px), md(768px), lg(1024px), xl(1280px)

### Archivos necesarios

1. **src/lib/constants.ts** - Todo el contenido en un lugar
```typescript
export const siteConfig = {
  name: 'Marca',
  description: 'Descripción',
  ogImage: 'https://...',
}

export const heroContent = {
  headline: '...',
  subheadline: '...',
  cta: 'Button text',
}

export const benefits = [
  { title: '...', description: '...' },
  { title: '...', description: '...' },
  { title: '...', description: '...' },
]

export const testimonials = [
  { text: '...', author: '...', company: '...' },
  // ...
]

export const faqItems = [
  { q: '...?', a: '...' },
  // ...
]
````

2. **src/app/layout.tsx** - Configuración global

```typescript
- Meta tags SEO
- Google Analytics
- Favicon
- Font imports (Inter, Montserrat)
- Tailwind setup
```

3. **src/app/page.tsx** - Página principal

```typescript
import { Hero, Benefits, Steps, Testimonials, FAQ, CTA, Footer }
from '@/components'

export default function Home() {
  return (
    <main>
      <Hero />
      <Benefits />
      <Steps />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  )
}
```

## OPTIMIZACIONES REQUERIDAS

### Performance

- Image optimization (Next.js Image)
- Code splitting automático
- Lazy loading de componentes
- CSS minificado

### SEO

- Meta tags dinámicos
- Open Graph tags
- Schema.org structured data
- Sitemap (si aplica)

### Formulario

- Validación client-side
- Endpoint API para envío
- Mensaje de éxito/error
- Rate limiting básico

## COLORES BRAND (vars CSS)

```css
:root {
  --color-primary: #[hex];
  --color-secondary: #[hex];
  --color-accent: #[hex];
  --color-bg: #ffffff;
  --color-text: #000000;
}
```

## QUÉ GENERAR EXACTAMENTE

Necesito que generes:

1. [ ] Setup inicial del proyecto
2. [ ] src/lib/constants.ts (contenido centralizado)
3. [ ] src/app/layout.tsx (SEO + setup)
4. [ ] Todos los componentes (Header, Hero, Benefits, etc)
5. [ ] src/app/api/contact/route.ts (endpoint)
6. [ ] Tailwind config con colores brand
7. [ ] .env.example

Código production-ready con:

- TypeScript tipos correctos
- Componentes reutilizables
- Sin errores
- Optimizaciones web

````

**Prompt a Claude Code:**

```markdown
# GENERAR LANDING PAGE NEXT.JS PRODUCTION-READY

## CONTEXTO COMPLETO
[Pega CODING_BRIEF.md]

[Pega BRIEFING.md con contenido]

## TAREA 1: CREAR ESTRUCTURA Y SETUP

Genera:
1. Configuración de TypeScript (strict)
2. Tailwind config con colores custom
3. src/lib/constants.ts con TODO el contenido:
   - Hero, benefits, testimonials, FAQ, etc
   - URLs, emails, textos exactos del brief
4. src/app/layout.tsx con:
   - Meta tags SEO (title, description)
   - Viewport para mobile
   - Font imports
   - Analytics (Google Analytics 4)
   - Favicon setup

## TAREA 2: CREAR COMPONENTES

Genera archivos en src/components/:
1. Header.tsx
   - Logo
   - Nav items (Links)
   - Mobile hamburger menu
   - Sticky en scroll

2. Hero.tsx
   - Headline, subheadline
   - CTA button
   - Background image/gradient
   - Responsive layout

3. Benefits.tsx
   - Grid 3 columnas (1 en mobile)
   - Cards con ícono, title, desc
   - Hover effects

4. Steps.tsx
   - 3 pasos con números
   - Descripción de cada paso
   - Iconos o ilustraciones

5. Testimonials.tsx
   - Slider/carousel de testimonios
   - Navegación arrows
   - Muestra autor + cargo
   - Foto circular

6. FAQ.tsx
   - Accordion items (expand/collapse)
   - Smooth animation
   - Ícono + y - animado

7. CTA.tsx
   - Headline urgencia
   - Botón CTA
   - Background destacado

8. ContactForm.tsx
   - Input email
   - Textarea mensaje
   - Validación básica
   - Submit button con loading state
   - Mensaje éxito/error

9. Footer.tsx
   - Links legales
   - Redes sociales
   - Copyright
   - Newsletter signup (opcional)

## TAREA 3: CREAR API ENDPOINT

src/app/api/contact/route.ts
- POST endpoint
- Recibe: email, message
- Validación Zod
- Envía email via SendGrid o console.log
- Respuesta: { success: true/false, message: '...' }

## ESTÁNDARES OBLIGATORIOS

TypeScript:
✓ Strict mode
✓ Props interfaceadas
✓ Return types en funciones

React:
✓ Funcionales
✓ Hooks solo en componentes funcionales
✓ Prop destructuring

Tailwind:
✓ Responsive classes (sm:, md:, lg:)
✓ Dark mode support
✓ No custom CSS (solo clases)

Accesibilidad:
✓ Semantic HTML
✓ ARIA labels si necesario
✓ Keyboard navigation
✓ Color contrasts 4.5:1

## ARCHIVOS FINALES ESPERADOS

- package.json (con dependencias)
- tsconfig.json
- next.config.ts
- tailwind.config.ts
- .env.example
- src/lib/constants.ts
- src/app/layout.tsx
- src/app/page.tsx
- src/app/api/contact/route.ts
- src/components/*.tsx (todos)

Genera todo ahora.
````

**QUÉ ESPERAR:**

- Estructura Next.js lista
- Componentes sin errores
- TypeScript feliz
- Listo para `npm run dev`

---

### 3.2 - REFINAMIENTO Y AJUSTES

**En Claude Code, según cambios:**

```markdown
# AJUSTE COMPONENTE X

Cambios necesarios:

1. [Descripción del cambio]
2. [Descripción del cambio]

Por favor actualiza solo el archivo:
src/components/[NombreComponente].tsx
```

**Ejemplo real:**

```
El Hero section debería tener una imagen de fondo.
Actualiza el componente para que use la imagen en public/hero-bg.jpg
con un overlay semi-transparente negro (opacity 40%).
```

---

## ✅ FASE 4: TESTING (Días 8-9)

### Objetivo

Validar que todo funciona correctamente antes de deploy.

### Herramientas a usar

| Tarea          | Herramienta        | Validación            |
| -------------- | ------------------ | --------------------- |
| Funcionalidad  | Manual (navegador) | Checklist             |
| Performance    | Lighthouse         | Score 90+             |
| Accesibilidad  | WAVE / Manual      | WCAG AA               |
| Responsiveness | Manual (DevTools)  | Todos los breakpoints |
| SEO            | Herramientas SEO   | Meta tags correctos   |

### 4.1 - TESTING FUNCIONAL

**Checklist manual:**

```markdown
# TESTING FUNCIONAL

## Header

- [ ] Logo clickea a home
- [ ] Links nav funcionan (scroll suave)
- [ ] Menu mobile abre/cierra
- [ ] Menu cierra al clickear un link
- [ ] Logo visible en mobile

## Hero

- [ ] Imagen/fondo carga correctamente
- [ ] Textos legibles
- [ ] Botón CTA clickeable
- [ ] Responsive en mobile

## Beneficios

- [ ] 3 cards visibles desktop
- [ ] 1 card por fila mobile
- [ ] Ícono + texto visible
- [ ] Hover effect funciona desktop

## Testimonios

- [ ] Slider navega left/right
- [ ] Muestra autor + cargo
- [ ] Foto carga
- [ ] Responsive

## FAQ

- [ ] Click abre acordeón
- [ ] Click cierra acordeón
- [ ] Solo 1 abierto a la vez
- [ ] Ícono +/- cambia

## Formulario

- [ ] Input email acepta input
- [ ] Textarea acepta multi-line
- [ ] Email validation funciona
- [ ] Submit button deshabilitado si vacío
- [ ] Loading state visible en submit
- [ ] Mensaje éxito muestra
- [ ] Mensaje error muestra

## Footer

- [ ] Links funcionan
- [ ] Redes abren en nueva pestaña
- [ ] Copyright visible

## Cross-browser

- [ ] Chrome
- [ ] Safari
- [ ] Firefox
- [ ] Edge

## Mobile

- [ ] iPhone 12 (390px)
- [ ] iPad (768px)
- [ ] Desktop (1280px)
```

### 4.2 - LIGHTHOUSE REPORT

**En navegador (F12 → Lighthouse):**

```markdown
# LIGHTHOUSE CHECKLIST

## Performance

- [ ] Score: 90+
- [ ] Largest Contentful Paint: < 2.5s
- [ ] First Contentful Paint: < 1.8s
- [ ] Cumulative Layout Shift: < 0.1

## Accessibility

- [ ] Score: 90+
- [ ] Color contrast ok
- [ ] Alt text en imágenes
- [ ] Labels en inputs

## Best Practices

- [ ] Score: 90+
- [ ] HTTPS
- [ ] No console errors
- [ ] No deprecations

## SEO

- [ ] Score: 90+
- [ ] Meta description presente
- [ ] Viewport config
- [ ] Title presente
```

**Si score bajo, ajusta:**

```
Herramienta: Claude Code

Problemas Lighthouse:
1. LCP alto (2.8s) - Hero image muy grande
   Solución: Comprime imagen, usa Next.js Image

2. CLS alto (0.15) - Cambio de layout en load
   Solución: Define altura en componentes

Por favor optimiza estos puntos.
```

### 4.3 - ACCESIBILIDAD

**Manual WCAG 2.1 AA:**

- [ ] Contraste 4.5:1 en texto
- [ ] Navegación por Tab funciona
- [ ] Focus visible en botones
- [ ] Alt text descriptivo en imágenes
- [ ] Headings en orden (H1 → H2 → H3)
- [ ] Links descriptivos (no "click aquí")
- [ ] Inputs tienen labels
- [ ] Color no es única forma de info

**Herramienta:** Chrome Extension "WAVE"

### 4.4 - SEO CHECKLIST

```markdown
# SEO VALIDATION

## Meta Tags

- [ ] Title: <60 chars, incluye keyword principal
- [ ] Meta description: <160 chars, incluye CTA
- [ ] Viewport: width=device-width, initial-scale=1
- [ ] Charset: UTF-8
- [ ] Open Graph: og:title, og:description, og:image
- [ ] Twitter Card: si aplica

## Contenido

- [ ] H1 único
- [ ] Keywords en headings
- [ ] Alt text en imágenes descriptivo
- [ ] Links internos con anchor text relevante
- [ ] Mobile-friendly

## Técnico

- [ ] Sitemap (si aplica)
- [ ] Robots.txt
- [ ] Canonical URL
- [ ] HTTPS
- [ ] Velocidad > 3 segundos

## Google Search Console (opcional)

- [ ] Indexable
- [ ] No errores 404
- [ ] Mobile compatible
```

---

## 🚀 FASE 5: DEPLOYMENT (Día 10)

### Objetivo

Publicar la landing en producción con monitoreo.

### Herramientas a usar

| Tarea     | Herramienta       | Entrega        |
| --------- | ----------------- | -------------- |
| Deploy    | Vercel            | URL pública    |
| DNS       | Tu registrador    | Dominio propio |
| SSL       | Vercel (auto)     | HTTPS          |
| Analytics | Google Analytics  | Tracking       |
| Monitoreo | Sentry (opcional) | Error tracking |

### 5.1 - PREPARAR PARA DEPLOY

**Archivo: `.env.example`**

```env
# Google Analytics
NEXT_PUBLIC_GA_ID=G_XXXXXXXXXXXX

# Si usas formulario
NEXT_PUBLIC_API_URL=https://tudominio.com/api

# Opcional: SendGrid
SENDGRID_API_KEY=SG_XXXXXXXXXXXXXX
```

**Checklist pre-deploy:**

- [ ] No hay console.logs
- [ ] No hay errores TypeScript
- [ ] No hay warnings ESLint
- [ ] `npm run build` sin errores
- [ ] Todas las imágenes optimizadas
- [ ] ENV variables configuradas
- [ ] SEO meta tags correctos
- [ ] Analytics setup correcto

### 5.2 - DEPLOY A VERCEL

```bash
# Push a GitHub
git add .
git commit -m "Deploy landing page"
git push origin main

# Conectar en Vercel.com
# 1. Crea cuenta en vercel.com
# 2. Importa repositorio GitHub
# 3. Configura variables de entorno
# 4. Deploy automático

# O deploy directo:
npm install -g vercel
vercel
```

**En Vercel dashboard:**

- [ ] Proyecto importado
- [ ] Variables de entorno configuradas
- [ ] Dominio personalizado configurado
- [ ] HTTPS automático
- [ ] Redirects configurados (si aplica)

### 5.3 - VALIDAR DEPLOY

```markdown
# CHECKLIST POST-DEPLOY

## URL Viva

- [ ] https://tudominio.com carga
- [ ] Redirecciona http → https
- [ ] Tiempo carga < 3 segundos
- [ ] No errores 404

## Funcionalidad

- [ ] Todos links funcionan
- [ ] Formulario envía email
- [ ] CTA buttons funcionan
- [ ] Mobile responsive

## Analytics

- [ ] Google Analytics registra visitas
- [ ] Page views se cuentan
- [ ] Conversión/CTA se trackea

## SEO

- [ ] Google Search Console: indexado
- [ ] Meta tags correctos (F12)
- [ ] Open Graph tags correctos
```

### 5.4 - MONITOREO POST-DEPLOY

**Configurar alertas:**

- Uptime monitoring (Pingdom, UptimeRobot)
- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics)

---

## 📊 RESUMEN TIMELINE

| Fase      | Duración    | Herramientas              | Entrega            |
| --------- | ----------- | ------------------------- | ------------------ |
| Inicio    | 2 días      | BRIEFING.md + validación  | Documento aprobado |
| Diseño    | 2 días      | Claude Design + Artifacts | Mockup + Prototipo |
| Código    | 3 días      | Claude Code + Next.js     | Código production  |
| Testing   | 2 días      | Manual + Lighthouse       | Validación 100%    |
| Deploy    | 1 día       | Vercel                    | URL pública        |
| **TOTAL** | **10 días** |                           | **Landing live**   |

---

## 🎯 CHECKLIST FINAL COMPLETE

```markdown
# LANDING PAGE - CHECKLIST FINAL

## INICIO ✓

- [ ] BRIEFING.md completado
- [ ] Stakeholder aprobó
- [ ] Contenido recopilado
- [ ] Referencias validadas

## DISEÑO ✓

- [ ] Mockup visual aprobado
- [ ] Prototipo interactivo validado
- [ ] Feedback incorporado

## DESARROLLO ✓

- [ ] Proyecto Next.js creado
- [ ] Componentes generados
- [ ] TypeScript sin errores
- [ ] ESLint pasando
- [ ] Responsive probado

## TESTING ✓

- [ ] Testing funcional completo
- [ ] Lighthouse 90+
- [ ] WCAG AA validado
- [ ] SEO checklist ok

## DEPLOYMENT ✓

- [ ] ENV variables configuradas
- [ ] Dominio apuntado
- [ ] SSL funciona
- [ ] Analytics activo
- [ ] Monitoreo configurado

## POST-LAUNCH ✓

- [ ] Métricas de conversión rastreadas
- [ ] Feedback usuarios recopilado
- [ ] Plan de mejoras definido
```

---

**Usa este template para cada landing page. Los pasos son siempre iguales, solo cambia el contenido del BRIEFING.**
