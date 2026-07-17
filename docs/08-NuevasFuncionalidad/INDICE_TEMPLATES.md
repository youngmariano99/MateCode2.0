# 📚 ÍNDICE MAESTRO: TEMPLATES OPERATIVOS

Bienvenido. Este es tu compendio de procedimientos para desarrollar software profesional con Claude.

---

## 🎯 ¿QUÉ TEMPLATE NECESITAS?

| Tipo Proyecto      | Template                      | Duración   | Complejidad | Empezar por |
| ------------------ | ----------------------------- | ---------- | ----------- | ----------- |
| 🎨 Landing page    | `TEMPLATE_LANDING_PAGE.md`    | 10 días    | Baja        | Fase 1      |
| 🏢 Sistema ERP/CRM | `TEMPLATE_SISTEMA_GESTION.md` | 11 semanas | Alta        | Fase 1      |
| 🔌 API REST        | `TEMPLATE_API_REST.md`        | 10 días    | Media       | Fase 1      |
| 📱 App móvil       | [En desarrollo]               | 8 semanas  | Alta        | -           |
| 🤖 Automatización  | [En desarrollo]               | 5 días     | Media       | -           |
| 📊 Dashboard/BI    | [En desarrollo]               | 2 semanas  | Media       | -           |

---

## 📖 CÓMO USAR ESTOS TEMPLATES

### Paso 1: Elige tu tipo de proyecto

Arriba tienes la matriz. Descarga el template correspondiente.

### Paso 2: Lee la FASE 1 completa

Es crítico. Aquí documentas TODO lo que necesitas antes de codificar.

### Paso 3: Sigue los pasos IN-ORDER

No saltes fases. Cada una depende de la anterior.

### Paso 4: Copia los prompts exactos

Son optimizados para Claude. Úsalos textualmente.

### Paso 5: Marca los checklists

Mientras completas cada sección, checkea. Así evitas olvidar pasos.

---

## 🎨 TEMPLATE: LANDING PAGE

**Archivo**: `TEMPLATE_LANDING_PAGE.md`

**Mejor para**:

- Sitios corporativos
- Páginas de venta
- Micrositios
- Páginas de captura (lead gen)

**Duración**: 10 días calendario (parte-time)

**Resultado final**: URL pública, optimizada para conversión, SEO ready

### Quick start:

```bash
# 1. Abre el template
cat TEMPLATE_LANDING_PAGE.md

# 2. Completa BRIEFING.md (Fase 1)
# Copia la estructura de TEMPLATE_LANDING_PAGE.md Fase 1.1
# Rellena con TU información

# 3. Pasa a Claude Design (Fase 2)
# Abre Claude.ai → Chat nuevo
# Copia el prompt exacto de la Fase 2.1

# 4. Itera prototipos (Fase 2.2)
# Artifacts React en Claude.ai

# 5. Genera código (Fase 3)
# Claude Code en terminal

# 6. Deploy (Fase 5)
# Vercel (automático con GitHub)
```

**Herramientas clave**:

- Claude Design (mockups)
- Artifacts (prototipo)
- Claude Code (código Next.js)
- Vercel (deploy)

**Checklist crítica**:

- [ ] BRIEFING.md aprobado por stakeholder
- [ ] Mockup validado
- [ ] Prototipo testado en mobile
- [ ] Lighthouse 90+
- [ ] SEO meta tags correctos
- [ ] Dominio DNS apuntado

---

## 🏢 TEMPLATE: SISTEMA DE GESTIÓN (ERP/CRM)

**Archivo**: `TEMPLATE_SISTEMA_GESTION.md`

**Mejor para**:

- Sistemas administrativos
- CRM internos
- ERP pequeño/mediano
- Portales de gestión

**Duración**: 11 semanas (time-box)

**Resultado final**: Sistema production-ready con backend, frontend, autenticación, reportes

**Estructura típica**:

```
Semana 1-2: Análisis + Arquitectura
Semana 3: Diseño UI/UX
Semana 4-6: Backend desarrollo
Semana 7-9: Frontend desarrollo
Semana 10: Testing
Semana 11: Deploy + Monitoreo
```

### Quick start:

```bash
# 1. Recopila requisitos (Fase 1.1)
# Crea PROJECT_SCOPE.md

# 2. Obtén arquitectura (Fase 1.2)
# Claude Opus → razonamiento complejo
# Te entrega: diagrama, schema BD, decisiones técnicas

# 3. Diseño (Fase 2)
# Wireframes + mockups

# 4. Backend (Fase 3)
# Claude Code → APIs REST con Prisma

# 5. Frontend (Fase 4)
# Claude Code → Next.js con componentes

# 6. Testing (Fase 5)
# Jest + manual testing

# 7. Deploy (Fase 6)
# Backend: Docker a servidor
# Frontend: Vercel
```

**Herramientas clave**:

- Claude Opus (arquitectura)
- Claude Design (UI)
- Claude Code (backend + frontend)
- Vercel + Docker
- PostgreSQL

**Checklist crítica**:

- [ ] PROJECT_SCOPE completado 100%
- [ ] Arquitectura aprobada
- [ ] Tests cobertura 80%+
- [ ] WCAG AA validado
- [ ] E2E tests verdes
- [ ] Backups configurados

---

## 🔌 TEMPLATE: API REST

**Archivo**: `TEMPLATE_API_REST.md`

**Mejor para**:

- APIs para aplicaciones
- Integraciones entre sistemas
- Backends de servicios
- Microservicios

**Duración**: 10 días

**Resultado final**: API documentada, testada, deployada

### Quick start:

```bash
# 1. Especificación completa (Fase 1)
# API_SPEC.md → TODOS los endpoints

# 2. Desarrollo (Fase 2)
# Claude Code → Express + TypeScript + Prisma

# 3. Testing (Fase 3)
# Jest → 80% coverage

# 4. Documentación (Fase 2.2)
# Swagger/OpenAPI automático

# 5. Deploy (Fase 4)
# Docker → servidor
```

**Herramientas clave**:

- Node.js + Express
- TypeScript
- Prisma
- Jest
- Docker

**Checklist crítica**:

- [ ] API_SPEC.md completa
- [ ] Todos los endpoint documentados
- [ ] Tests 80%+ cobertura
- [ ] Swagger generado
- [ ] Rate limiting activo
- [ ] Autenticación JWT funcionando

---

## 🌐 FLUJO UNIVERSAL: Inicio → Fin

Todos los templates siguen este patrón:

```
FASE 1: INICIO ────────────────→ Documentación
         ↓
FASE 2: DISEÑO ────────────────→ Validación visual
         ↓
FASE 3: DESARROLLO ────────────→ Código
         ↓
FASE 4: TESTING ───────────────→ Validación completa
         ↓
FASE 5: DEPLOYMENT ────────────→ Production live
```

---

## 🛠️ HERRAMIENTAS RECOMENDADAS (Por tipo)

### 🎨 Diseño & UI

- **Claude Design**: Mockups visuales
- **Artifacts React**: Prototipo interactivo
- **Figma**: Diseño detallado (opcional)

### 💻 Código Backend

- **Claude Code**: Generación y edición
- **Node.js/Express**: Default recomendado
- **Python/FastAPI**: Alternativa

### 💻 Código Frontend

- **Claude Code**: Generación
- **Next.js**: Default recomendado
- **React SPA**: Alternativa

### 🗄️ Base de datos

- **PostgreSQL**: Default recomendado
- **MongoDB**: Si NoSQL
- **Firebase**: Si serverless

### 🚀 Deployment

- **Vercel**: Frontend (Next.js)
- **Railway/Render**: Backend
- **AWS/GCP**: Escala grande
- **Heroku**: Quick deploy

### 📊 Testing

- **Jest**: Unit tests
- **Playwright**: E2E tests
- **k6**: Load testing

---

## 📋 CHECKLIST UNIVERSAL (Todos los proyectos)

### ✓ Antes de empezar

- [ ] Requisitos documentados
- [ ] Stakeholders alineados
- [ ] Timeline acordado
- [ ] Presupuesto definido

### ✓ Durante desarrollo

- [ ] Código sin errores TypeScript
- [ ] Linter pasando (ESLint)
- [ ] Tests escritos (80%+ coverage)
- [ ] README actualizado
- [ ] Documentación inline

### ✓ Antes de deploy

- [ ] Build producción probado
- [ ] Variables ENV configuradas
- [ ] Base de datos migrations ready
- [ ] Backups setup
- [ ] Monitoreo configurado

### ✓ Después de deploy

- [ ] URL pública accesible
- [ ] Logs monitoreando
- [ ] Alertas configuradas
- [ ] Usuarios pueden acceder
- [ ] Performance OK

---

## 🎯 ESTRATEGIA: MÁS PROVECHO DE LOS TEMPLATES

### 1. Personalización vs. Template

✅ **USAR TAL CUAL:**

- Estructura de carpetas
- Pasos de cada fase
- Prompts a Claude
- Checklists

❌ **NO COPIAR TEXTUALMENTE:**

- Nombres de entidades (cambiar a los tuyos)
- Valores de ejemplo (reemplazar con reales)
- Campos de BD (adaptar a tu modelo)

### 2. Adaptar a tu stack

Los templates usan:

- **Backend**: Node.js + Express
- **Frontend**: Next.js
- **BD**: PostgreSQL

Si usas otro stack (Python, Django, Vue, etc):

- Mantén la estructura (mismas fases)
- Adapta tech stack (mismas principles)
- Usa mismo flujo de prompts

### 3. Reutilizar templates

Una vez que uses UN template, los otros son más fáciles porque:

- Mismo flujo: Análisis → Diseño → Código → Testing → Deploy
- Mismos principios: documentación primero, iteración rápida
- Mismos prompts: solo cambias el contenido

**Resultado**: Segundo proyecto 40% más rápido.

### 4. Optimizar para tu workflow

Personaliza los templates:

- Agrega tus estándares de código
- Agrega tus librerías preferidas
- Agrega tus checklist empresariales

Ejemplo:

```markdown
# MIS ESTÁNDARES PERSONALES

Backend:

- Prettier config [miembro]
- ESLint rules [miembro]
- Convención nombres [tuya]
- Testing framework [tuyo]

Frontend:

- Tailwind setup [personalizado]
- Component library [tuya]
- State management [tuya]
- Build process [tuyo]

Security:

- Obligatorio 2FA
- Encriptación [especial]
- Audit logging en [sistema]
```

---

## 📞 ¿PREGUNTAS COMUNES?

### P: ¿Puedo saltarme la Fase 1?

**R**: NO. La Fase 1 es donde se define TODO. Saltarla = problemas luego.

### P: ¿Cuánto tiempo ahorro usando templates?

**R**: 30-40% de tiempo vs. sin templates.

- Primer proyecto con template: full time
- Segundo proyecto: 60% del tiempo
- Tercero en adelante: rápido

### P: ¿Funcionan para proyectos pequeños?

**R**: SÍ. Escala según proyecto:

- **Landing page pequeña**: 3-5 días (no 10)
- **API simple**: 5 días (no 10)
- **Sistema completo**: 11 semanas

### P: ¿Debo seguir exactamente?

**R**: La estructura SÍ. Los detalles NO.

- Fases deben ser en orden
- Checklists deben completarse
- Prompts pueden adaptarse

### P: ¿Y si mi proyecto no encaja?

**R**: Usa el más similar y adapta:

- Landing page + funcionalidad = template Landing + partes de Sistema
- API + Frontend = template API + template Landing
- Combina elementos según necesidad

---

## 🚀 PRÓXIMOS PASOS

### Ya descargaste todos estos archivos:

1. **`TEMPLATE_LANDING_PAGE.md`** ← Úsalo para sitios
2. **`TEMPLATE_SISTEMA_GESTION.md`** ← Úsalo para sistemas
3. **`TEMPLATE_API_REST.md`** ← Úsalo para APIs
4. **`INDICE_TEMPLATES.md`** ← Estás aquí
5. **`UTILIDADES_Y_BEST_PRACTICES.md`** ← Herramientas generales

### Empezar ahora:

```bash
# Opción 1: Landing page
cat TEMPLATE_LANDING_PAGE.md | head -100
# → Completar Fase 1 → BRIEFING.md
# → Copiar prompt Fase 2 → Claude.ai

# Opción 2: Sistema de gestión
cat TEMPLATE_SISTEMA_GESTION.md | head -100
# → Completar Fase 1 → PROJECT_SCOPE.md
# → Copiar prompt Fase 1.2 → Claude Opus

# Opción 3: API REST
cat TEMPLATE_API_REST.md | head -100
# → Completar Fase 1 → API_SPEC.md
# → Copiar prompt Fase 2 → Claude Code
```

---

## 📚 ESTRUCTURA DE ARCHIVOS RECOMENDADA

Guarda los templates así:

```
mi-empresa/
├── TEMPLATES/
│   ├── LANDING_PAGE.md
│   ├── SISTEMA_GESTION.md
│   ├── API_REST.md
│   ├── INDICE_TEMPLATES.md
│   └── UTILIDADES.md
│
├── PROYECTOS/
│   ├── proyecto-1/
│   │   ├── BRIEFING.md (copiado de template)
│   │   ├── backend/
│   │   └── frontend/
│   │
│   └── proyecto-2/
│       ├── PROJECT_SCOPE.md
│       ├── backend/
│       └── frontend/
```

---

## ✨ TIPS FINALES

### 1. Claude Code es tu mejor aliado

No es solo para editar. Úsalo para:

- Generar estructura completa
- Crear componentes
- Escribir tests
- Refactorizar código

### 2. Copia prompts exactamente

Los prompts están optimizados. Si cambias mucho:

- Calidad baja
- Output incompleto
- Errores sin sentido

### 3. Valida después de cada fase

- Mockup → Aprueba con stakeholder
- Código → Tests pasan
- Deploy → URL funciona

### 4. Mantén templates versionados

Después de cada proyecto:

- Qué funcionó bien
- Qué cambiarías
- Actualiza tus templates personales

### 5. Documenta TODO

Los templates te piden documentar.
Es por una razón:

- Código sin contexto = ilegible
- APIs sin spec = integraciones rotas
- Diseño sin wireframes = sorpresas costosas

---

## 🎓 APRENDIZAJE CONTINUO

Cada proyecto mejora tu siguiente:

**Proyecto 1**: Aprendes estructura + flow
**Proyecto 2**: Aprendes optimizaciones
**Proyecto 3+**: Automático y rápido

---

## 🎯 RESUMEN EJECUTIVO

| Aspectos                     | Valor                   |
| ---------------------------- | ----------------------- |
| Templates disponibles        | 3 (más en desarrollo)   |
| Tipos de proyectos cubiertos | Landing, Sistemas, APIs |
| Ahorro de tiempo             | 30-40%                  |
| Fases por proyecto           | 5-6                     |
| Checklists totales           | 50+                     |
| Prompts optimizados          | 15+                     |

**Tu nuevo superpoder**: Ir de idea a production en semanas, no meses.

---

**¿Listo? Elige tu template y empieza la Fase 1.** 🚀

---

## 📞 CONTACTO & ACTUALIZACIONES

Estos templates se actualizarán con:

- Nuevos templates (App móvil, Automatización, BI)
- Mejoras según feedback
- Nuevas herramientas de Anthropic
- Best practices evolucionar

Guarda este índice. Lo usarás en cada proyecto.

**Buena suerte. 🎉**
