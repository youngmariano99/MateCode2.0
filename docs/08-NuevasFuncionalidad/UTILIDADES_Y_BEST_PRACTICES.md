# 🛠️ UTILIDADES Y BEST PRACTICES

Herramientas, técnicas y checklists generales que aplican a CUALQUIER proyecto.

---

## 📝 PARTE 1: PLANTILLAS MARKDOWN REUTILIZABLES

Copia/pega estas en tus proyectos:

### 1.1 - BRIEF GENÉRICO

```markdown
# PROJECT BRIEF

## Datos básicos

- Nombre: [Nombre del proyecto]
- Cliente: [Nombre o interno]
- Objetivo: [Qué se logra]
- Timeline: [Fechas]
- Presupuesto: [Rango]

## Problema a resolver

1. [Pain point 1]
2. [Pain point 2]
3. [Pain point 3]

## Solución propuesta

[Descripción ejecutiva]

## Requisitos

### Funcionales

- [ ] [Feature 1]
- [ ] [Feature 2]
- [ ] [Feature 3]

### No-funcionales

- Performance: [requisitos]
- Escalabilidad: [requisitos]
- Seguridad: [requisitos]
- Disponibilidad: [requisitos]

## Stakeholders

- Product Owner: [Nombre - email]
- Tech Lead: [Nombre - email]
- Ejecutivo: [Nombre - email]

## Referencias

- Link 1: [URL - descripción]
- Link 2: [URL - descripción]

## Aprobación

- [ ] Product Owner aprobó
- [ ] Tech Lead aprobó
- [ ] Ejecutivo aprobó
- Fecha: [DD/MM/YYYY]
```

### 1.2 - README TEMPLATE

````markdown
# [Nombre Proyecto]

[Descripción corta 1-2 líneas]

## 🎯 Objetivo

[Qué resuelve]

## 🚀 Features

- [Feature 1]
- [Feature 2]
- [Feature 3]

## 📋 Requisitos previos

- Node.js 18+
- PostgreSQL 15+
- [Otros]

## 🔧 Instalación

### Desarrollo local

```bash
# Clonar repositorio
git clone [repo-url]
cd [proyecto]

# Instalar dependencias
npm install

# Configurar variables
cp .env.example .env
# Editar .env con valores locales

# Correr base de datos
docker-compose up -d db

# Migrations
npm run db:migrate

# Seed (datos de prueba)
npm run db:seed

# Iniciar
npm run dev
```
````

## 🧪 Testing

```bash
# Tests unitarios
npm test

# Tests con coverage
npm test -- --coverage

# E2E tests
npm run test:e2e

# Load testing
npm run test:load
```

## 📚 Documentación

- [API Docs](./docs/API.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Setup guide](./docs/SETUP.md)

## 🚀 Deployment

### Staging

```bash
git push origin develop
# Deploy automático a staging
```

### Producción

```bash
git push origin main
# Deploy automático a producción
# Requiere aprobación
```

## 🤝 Contributing

- Branch: `feature/nombre-descriptivo`
- Commits: Formato convencional
- PR: Requiere 2 aprobaciones

## 📄 Licencia

[Tu licencia]

## 📞 Soporte

- Issues: [link]
- Email: support@example.com
- Docs: [link]

## 📝 Changelog

Ver [CHANGELOG.md](./CHANGELOG.md)

---

**Última actualización**: [Fecha]
**Versión**: [1.0.0]

````

### 1.3 - GIT WORKFLOW

```markdown
# GIT WORKFLOW ESTÁNDAR

## Branches

````

main (producción)
↑
├── hotfix/[nombre]
│ └── → main + develop
│
develop (staging)
↑
├── feature/[nombre]
│ └── → develop
│
├── bugfix/[nombre]
│ └── → develop
│
└── chore/[nombre]
└── → develop

```

## Commits

Formato convencional:
```

feat: agregar autenticación JWT
fix: corregir validación de email
docs: actualizar README
style: formatear código
refactor: optimizar queries DB
perf: cachear resultados API
test: agregar tests de login
chore: actualizar dependencias

````

Ejemplo:
```bash
git commit -m "feat: agregar endpoint GET /usuarios con paginación"
````

## Pull Requests

Template:

```markdown
## Descripción

[Qué cambios hace]

## Tipo de cambio

- [ ] Feature
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentation

## Testing

- [ ] Tests unitarios verdes
- [ ] Tests E2E verdes
- [ ] Manual testing completado

## Checklist

- [ ] Código formateado
- [ ] Linter pasando
- [ ] Sin console.logs
- [ ] Sin commented code
- [ ] Tests con 80%+ coverage

## Screenshots (si aplica)

[Adjunta imágenes]

## Revisor asignado

@persona
```

## Merge

```bash
# Actualizar develop
git checkout develop
git pull origin develop

# Crear rama
git checkout -b feature/nombre

# Hacer cambios
git add .
git commit -m "feat: descripción clara"

# Push a remote
git push origin feature/nombre

# Abrir PR en GitHub/GitLab
# → Esperar reviews
# → Merge con "Squash" si wanted

# Eliminar rama
git branch -d feature/nombre
git push origin --delete feature/nombre
```

````

### 1.4 - ESTÁNDARES DE CÓDIGO

```markdown
# ESTÁNDARES DE CÓDIGO

## TypeScript

```typescript
// ✓ BIEN
interface User {
  id: string
  email: string
  createdAt: Date
}

const createUser = async (userData: CreateUserInput): Promise<User> => {
  // implementation
}

// ✗ MAL
interface User {
  id,
  email,
  createdAt
}

const createUser = async (data) => {
  // implementation
}
````

## React

```typescript
// ✓ BIEN
interface UserCardProps {
  user: User
  onDelete: (id: string) => void
}

export const UserCard: React.FC<UserCardProps> = ({ user, onDelete }) => {
  return <div>...</div>
}

// ✗ MAL
export function UserCard(props) {
  return <div>...</div>
}
```

## Naming

- Variables/functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files (components): `PascalCase.tsx`
- Files (utils): `camelCase.ts`

## Comentarios

```typescript
// ✓ BIEN
// Valida que el email tenga formato correcto
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Calcula el total con impuestos
 * @param subtotal - Monto sin impuestos
 * @param taxRate - Tasa de impuestos (0.0-1.0)
 * @returns Total con impuestos aplicados
 */
const calculateTotal = (subtotal: number, taxRate: number): number => {
  return subtotal * (1 + taxRate);
};

// ✗ MAL
const isValidEmail = (email) => {
  // check email
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

## Archivos

```
✓ BIEN:
src/
├── components/
│   ├── Button.tsx
│   ├── Form.tsx
│   └── Modal.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useForm.ts
├── utils/
│   ├── validators.ts
│   └── formatters.ts
└── types/
    └── index.ts

✗ MAL:
src/
├── components.tsx
├── hooks.tsx
├── utils.tsx
└── types.tsx
```

## Imports

```typescript
// ✓ BIEN
import { useState, useEffect } from "react";
import { UserCard } from "@/components";
import { useAuth } from "@/hooks";

// ✗ MAL
import useState from "react";
import UserCard from "../../components/UserCard";
import useAuth from "../../hooks/useAuth";
```

## Tamaño de funciones

- Máximo 20 líneas (considerar refactor)
- Una responsabilidad por función
- Fácil de testear

## Error handling

```typescript
// ✓ BIEN
try {
  const user = await fetchUser(id);
  return user;
} catch (error) {
  if (error instanceof NotFoundError) {
    throw new NotFoundError(`Usuario ${id} no existe`);
  }
  logger.error("Error fetching user", { id, error });
  throw new InternalError("Error en base de datos");
}

// ✗ MAL
try {
  const user = await fetchUser(id);
  return user;
} catch (error) {
  console.log(error);
  return null;
}
```

````

---

## 🔒 PARTE 2: SEGURIDAD CHECKLIST

Antes de deploy, valida CADA punto:

### 2.1 - AUTENTICACIÓN & AUTORIZACIÓN

```markdown
# SEGURIDAD CHECKLIST

## Autenticación
- [ ] Passwords hasheadas (bcrypt, scrypt, argon2)
- [ ] JWT tokens con expiración
- [ ] Refresh tokens separados
- [ ] Logout revoca tokens
- [ ] 2FA opcional/obligatorio
- [ ] Password reset con token temporal
- [ ] Limita intentos login fallidos

## Autorización
- [ ] Verifica rol en cada endpoint
- [ ] No confía en datos del cliente
- [ ] Row-level security en BD
- [ ] API keys con scopes limitados

## Encriptación
- [ ] TLS 1.2+ para todas conexiones HTTPS
- [ ] Encripta datos sensibles en BD
- [ ] Encripta en tránsito (HTTPS)
- [ ] Keys en variables ENV (no código)
- [ ] Rotate keys regularmente

## Contraseñas
- [ ] Min 12 caracteres
- [ ] Acepta espacios
- [ ] Permite caracteres especiales
- [ ] No pidas requerimientos complejos
- [ ] Password manager compatible

## Sessions
- [ ] Timeout después de X minutos
- [ ] Invalidar sesión al logout
- [ ] CSRF tokens en forms
- [ ] HttpOnly cookies (no JavaScript)
- [ ] SameSite=Strict en cookies

## API Security
- [ ] Rate limiting (100 req/min)
- [ ] Request validation en todos endpoints
- [ ] SQL injection prevention (ORM)
- [ ] XSS prevention (sanitización)
- [ ] CORS whitelist configurado
- [ ] Content Security Policy headers
- [ ] No expongas stack traces
````

### 2.2 - DATA PROTECTION

```markdown
# DATA PROTECTION CHECKLIST

## Base de datos

- [ ] Backups diarios
- [ ] Backups en otra ubicación
- [ ] Backups encriptados
- [ ] Test restore regularmente
- [ ] Replicación activa (optional)

## Logging

- [ ] NO loguees passwords
- [ ] NO loguees tokens
- [ ] NO loguees datos sensibles
- [ ] Logs accesibles solo a admin
- [ ] Retention política (30 días)

## Acceso datos

- [ ] PII (Personally Identifiable Info) protected
- [ ] GDPR compliance (si aplica)
- [ ] Derecho a ser olvidado
- [ ] Exportar datos del usuario
- [ ] Audit logs de accesos

## Monitoreo

- [ ] Alertas por intentos acceso fallidos
- [ ] Alertas por acceso datos sensibles
- [ ] Alertas por cambios significativos
- [ ] IP whitelisting (si crítico)
- [ ] Geo-blocking (si aplica)
```

### 2.3 - DEPLOYMENT SECURITY

```markdown
# DEPLOYMENT SECURITY

## Antes de deploy

- [ ] Dependencies scaneadas (npm audit)
- [ ] Código scaneado (SonarQube, Snyk)
- [ ] Secrets NO en repositorio
- [ ] .env NO en git
- [ ] .gitignore correcto
- [ ] Build optimizado (sin fuentes)

## Infraestructura

- [ ] Firewall configurado
- [ ] Solo puertos necesarios abiertos
- [ ] WAF (Web Application Firewall)
- [ ] DDoS protection
- [ ] VPN para admin access
- [ ] SSH keys (no passwords)

## Monitoreo post-deploy

- [ ] Error tracking (Sentry)
- [ ] Security scanning
- [ ] Uptime monitoring
- [ ] Performance monitoring
- [ ] Log aggregation
- [ ] Alertas 24/7
```

---

## ⚡ PARTE 3: PERFORMANCE OPTIMIZATION

### 3.1 - FRONTEND OPTIMIZATION

```markdown
# FRONTEND PERFORMANCE

## Images

- [ ] Optimizadas (WebP, AVIF)
- [ ] Responsive srcset
- [ ] Lazy loading
- [ ] Compression (TinyPNG, ImageOptim)

## Code splitting

- [ ] Componentes lazy loaded
- [ ] Routes lazy loaded
- [ ] Bundle size < 250KB (gzipped)

## Caching

- [ ] Static assets cached (1 año)
- [ ] HTML cached (1 hora)
- [ ] API responses cached (10 min)
- [ ] Service workers

## Metrics (Web Vitals)

- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] FCP < 1.8s

## Testing

- [ ] Lighthouse 90+
- [ ] PageSpeed insights 90+
- [ ] GTmetrix A rating
```

### 3.2 - BACKEND OPTIMIZATION

```markdown
# BACKEND PERFORMANCE

## Database

- [ ] Índices creados (profiling)
- [ ] N+1 queries prevención
- [ ] Connection pooling
- [ ] Query optimization
- [ ] Particionamiento (si >100GB)

## Caching

- [ ] Redis para sesiones
- [ ] Redis para caché de queries
- [ ] Cache invalidation estrategia
- [ ] TTL definido

## API Endpoints

- [ ] Paginación en listas
- [ ] Proyección de campos
- [ ] Rate limiting
- [ ] Gzip compression
- [ ] HTTP caching headers

## Load testing

- [ ] k6 test 100 usuarios
- [ ] Response time < 200ms
- [ ] Error rate = 0%
- [ ] Peak load handling

## Monitoring

- [ ] APM (Application Performance Monitoring)
- [ ] Database slow query log
- [ ] API endpoint timing
- [ ] Memory usage
- [ ] CPU usage
```

---

## 🧪 PARTE 4: TESTING CHECKLIST

### 4.1 - UNIT TESTS

````markdown
# UNIT TESTING

## Qué testear

- [ ] Funciones puras
- [ ] Validators
- [ ] Utility functions
- [ ] Services (lógica compleja)

## Ejemplo estructura

```typescript
describe("validators", () => {
  describe("isValidEmail", () => {
    it("debe aceptar email válido", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
    });

    it("debe rechazar email sin @", () => {
      expect(isValidEmail("userexample.com")).toBe(false);
    });

    it("debe rechazar email vacío", () => {
      expect(isValidEmail("")).toBe(false);
    });
  });
});
```
````

## Coverage

- [ ] Mínimo 80%
- [ ] Todos los happy paths
- [ ] Todos los error paths

````

### 4.2 - INTEGRATION TESTS

```markdown
# INTEGRATION TESTING

## API endpoints
```typescript
describe('POST /api/v1/usuarios', () => {
  it('debe crear usuario válido', async () => {
    const response = await request(app)
      .post('/api/v1/usuarios')
      .send({
        email: 'user@example.com',
        password: 'SecurePass123!',
        nombre: 'Juan García'
      })

    expect(response.status).toBe(201)
    expect(response.body.data.id).toBeDefined()
  })

  it('debe rechazar email duplicado', async () => {
    // First user
    await request(app)
      .post('/api/v1/usuarios')
      .send({ email: 'user@example.com', ... })

    // Second user same email
    const response = await request(app)
      .post('/api/v1/usuarios')
      .send({ email: 'user@example.com', ... })

    expect(response.status).toBe(409)
  })
})
````

## Database

- [ ] Tests contra BD real (o testcontainers)
- [ ] Transactions rollback
- [ ] Migrations probadas

````

### 4.3 - E2E TESTS

```markdown
# E2E TESTING (Playwright)

```typescript
test('usuario puede registrarse y hacer login', async ({ page }) => {
  // Ir a registro
  await page.goto('http://localhost:3000/register')

  // Llenar formulario
  await page.fill('input[type="email"]', 'user@example.com')
  await page.fill('input[type="password"]', 'SecurePass123!')
  await page.fill('input[name="nombre"]', 'Juan García')

  // Submit
  await page.click('button[type="submit"]')

  // Verificar redirección
  await expect(page).toHaveURL('http://localhost:3000/login')

  // Login
  await page.fill('input[type="email"]', 'user@example.com')
  await page.fill('input[type="password"]', 'SecurePass123!')
  await page.click('button[type="submit"]')

  // Verificar dashboard
  await expect(page).toHaveURL('http://localhost:3000/dashboard')
  await expect(page.locator('h1')).toContainText('Dashboard')
})
````

Flujos a testear:

- [ ] User registration
- [ ] User login
- [ ] Create item
- [ ] Edit item
- [ ] Delete item
- [ ] Logout

````

---

## 📊 PARTE 5: DOCUMENTACIÓN

### 5.1 - TIPOS DE DOCUMENTACIÓN

```markdown
# DOCUMENTACIÓN REQUERIDA

## 1. README (repositorio)
- Qué es el proyecto
- Cómo instalar
- Cómo correr
- Cómo testear
- Cómo deployar

## 2. API Documentation
- Todos los endpoints
- Request/response ejemplos
- Error codes
- Rate limits
- Authentication

Herramientas:
- Swagger/OpenAPI
- Postman
- API Blueprint
- GraphQL Playground

## 3. Architecture Documentation
- Diagrama general
- Decisiones técnicas
- Trade-offs considerados
- Alternativas rechazadas
- Riesgos

## 4. Setup Guide
- Prerequisitos
- Paso a paso instalación
- Configuración ENV
- BD migrations
- Seed data
- Verificación

## 5. Deployment Guide
- Ambientes
- Checklist pre-deploy
- Deployment steps
- Rollback procedure
- Health checks

## 6. Code Comments
- Explicar el "por qué", no el "qué"
- Functions: JSDoc
- Complex logic: inline comments
- No para código obvio

## 7. Changelog
```markdown
# Changelog

All notable changes documented here.

## [1.1.0] - 2024-01-15
### Added
- User profile page
- 2FA support

### Fixed
- Login email validation bug
- Password reset token expiry

### Deprecated
- Old API v1 endpoints

### Removed
- Legacy authentication method
````

## 8. Troubleshooting

Common issues y soluciones

## 9. FAQs

Preguntas frecuentes de usuarios

## 10. Contributing Guide

Cómo contribuir al proyecto

````

### 5.2 - HERRAMIENTAS DOCUMENTACIÓN

| Tipo | Herramienta | Uso |
|------|-----------|-----|
| API | Swagger/OpenAPI | Documentación interactiva |
| Código | JSDoc | Comments en functions |
| Arquitectura | Mermaid/Lucidchart | Diagramas |
| Procesos | Markdown | Guías paso a paso |
| Cambios | Changelog.md | Historial versiones |
| Wiki | Notion/Confluence | Colaborativa |

---

## 🎯 PARTE 6: CHECKLISTS POR HITO

### 6.1 - ANTES DE CÓDIGO

```markdown
# PRE-CODING CHECKLIST

- [ ] Requisitos documentados
- [ ] Stakeholders alineados
- [ ] Architecture aprobada
- [ ] UI/UX validada
- [ ] BD schema revisada
- [ ] Timeline acordado
- [ ] Team assignments hechos
- [ ] Tools configuradas (repo, CI/CD)
- [ ] Estándares definidos
- [ ] Testing strategy definida
````

### 6.2 - DURANTE DESARROLLO

```markdown
# DEVELOPMENT CHECKLIST

DIARIAMENTE:

- [ ] Code reviewed por peer
- [ ] Tests escritos (TDD idealmente)
- [ ] Linter/formatter pasando
- [ ] Build exitoso
- [ ] No breaking changes

POR FEATURE:

- [ ] Tests 80%+ coverage
- [ ] Documentación actualizada
- [ ] CHANGELOG.md updated
- [ ] PR con descripción clara
- [ ] 2 approvals mínimo
```

### 6.3 - PRE-DEPLOYMENT

```markdown
# PRE-DEPLOYMENT CHECKLIST

CÓDIGO

- [ ] Todos los tests verdes
- [ ] Linter sin warnings
- [ ] No console.logs
- [ ] No commented code
- [ ] Build optimizado
- [ ] Bundle size OK

INFRAESTRUCTURA

- [ ] ENV variables configuradas
- [ ] Secrets en lugar seguro
- [ ] BD backups setup
- [ ] SSL certificate válido
- [ ] Monitoring configurado

VALIDACIÓN

- [ ] Smoke tests pasando
- [ ] Performance metrics OK
- [ ] Security scan OK
- [ ] Documentation actualizada
- [ ] Rollback plan definido
```

### 6.4 - POST-DEPLOYMENT

```markdown
# POST-DEPLOYMENT CHECKLIST

PRIMERAS HORAS

- [ ] Service accesible por URL
- [ ] Health check endpoint responde
- [ ] Logs escriben correctamente
- [ ] Alertas funcionan
- [ ] No errores críticos

PRIMEROS DÍAS

- [ ] Usuarios pueden acceder
- [ ] Funcionalidades funcionan
- [ ] Performance es aceptable
- [ ] Security vulnerabilities = 0
- [ ] Feedback de usuarios

PRIMERA SEMANA

- [ ] Métricas de uso rastreadas
- [ ] Bugs reportados resueltos
- [ ] Documentación completa
- [ ] Team training completado
- [ ] SLA monitoreo activo
```

---

## 🔄 PARTE 7: CONTINUOUS IMPROVEMENT

### 7.1 - RETROSPECTIVAS

Después de cada proyecto, preguntar:

```markdown
# RETROSPECTIVA

## ¿Qué salió bien?

- [Éxito 1]
- [Éxito 2]
- [Éxito 3]

## ¿Qué salió mal?

- [Problema 1]
- [Problema 2]

## ¿Qué mejorar para próxima vez?

- [Mejora 1]
- [Mejora 2]

## Action items

- [ ] [Acción 1] - Responsable: [Persona]
- [ ] [Acción 2] - Responsable: [Persona]
```

### 7.2 - ITERACIONES RÁPIDAS

Después de deploy a producción:

```markdown
# SPRINT POST-LAUNCH

## Semana 1: Bugs hotfix

- Resolver errores críticos
- Mejorar UX si hay confusion
- Monitor performance

## Semana 2-3: Pequeñas mejoras

- Feedback usuarios
- Optimizaciones
- Documentación

## Semana 4+: Features nuevas

- Basado en datos/feedback
- Priorizar high-impact
```

---

## 🚀 PARTE 8: COMANDO RÁPIDO REFERENCE

### CLI Útil

```bash
# NODE.JS / NPM
npm init -y                    # Crear proyecto
npm install [package]         # Instalar dependencia
npm run dev                    # Desarrollo
npm run build                  # Build producción
npm test                       # Correr tests
npm test -- --coverage        # Con coverage
npm run lint                   # Verificar código

# GIT
git status                     # Ver cambios
git add .                      # Stage cambios
git commit -m "mensaje"        # Commit
git push origin feature/name   # Push a remote
git pull                       # Actualizar local
git branch -d nombre           # Eliminar rama
git log --oneline -n 10        # Ver commits

# DOCKER
docker build -t nombre .       # Build imagen
docker run -p 3001:3001 nombre # Correr container
docker-compose up -d           # Compose up
docker ps                      # Ver containers
docker logs container          # Ver logs

# DATABASE
npm run db:migrate             # Migrations
npm run db:seed                # Seed data
npm run db:reset               # Reset (dev)
npx prisma studio             # UI explorador BD

# DEPLOYMENT
npm run build && npm start     # Build + run
vercel --prod                  # Deploy Vercel
heroku deploy                  # Deploy Heroku
docker push registry/image     # Push image

# TESTING
npm test                       # Todos los tests
npm test -- --watch            # Watch mode
npm test -- --coverage         # Coverage report
npm run test:e2e               # E2E tests
```

---

## 📚 PARTE 9: RECURSOS EXTERNOS

### Documentación

- [Node.js](https://nodejs.org/docs)
- [Express](https://expressjs.com)
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org/docs)
- [PostgreSQL](https://www.postgresql.org/docs)
- [Prisma](https://www.prisma.io/docs)
- [Jest](https://jestjs.io/docs)
- [Playwright](https://playwright.dev)

### Herramientas

- [GitHub](https://github.com) - Versionado
- [Vercel](https://vercel.com) - Deploy frontend
- [Railway](https://railway.app) - Deploy backend
- [Sentry](https://sentry.io) - Error tracking
- [DataDog](https://www.datadoghq.com) - Monitoring
- [Snyk](https://snyk.io) - Security scanning
- [Postman](https://www.postman.com) - API testing

### Learning

- [MDN Web Docs](https://developer.mozilla.org)
- [JavaScript.info](https://javascript.info)
- [System Design Interview](https://www.youtube.com/@SystemDesignInterview)
- [Frontend Masters](https://frontendmasters.com)

---

## 🎯 PARTE 10: QUICK DECISION MATRIX

Cuando no sabes qué elegir:

### Base de datos

| Tipo datos | Opción 1      | Opción 2  |
| ---------- | ------------- | --------- |
| Relacional | PostgreSQL    | MySQL     |
| NoSQL      | MongoDB       | Firebase  |
| Cache      | Redis         | Memcached |
| Search     | Elasticsearch | Algolia   |

**Default**: PostgreSQL

### Hosting Backend

| Criterio           | Opción                     |
| ------------------ | -------------------------- |
| Prototipo rápido   | Railway / Render           |
| Production pequeño | DigitalOcean / Linode      |
| Production escala  | AWS / GCP / Azure          |
| Serverless         | Vercel / Netlify Functions |

**Default**: Railway (desarrollo) → AWS (production)

### Frontend Framework

| Caso           | Framework    |
| -------------- | ------------ |
| Nuevo proyecto | Next.js      |
| SPA puro       | Vite + React |
| Alternativa    | Vue / Svelte |

**Default**: Next.js

### Testing Framework

| Tipo             | Framework  |
| ---------------- | ---------- |
| Unit/Integration | Jest       |
| E2E              | Playwright |
| API              | Supertest  |

**Default**: Jest + Playwright

---

## ✨ TIPS FINALES

1. **Siempre documenta mientras haces**, no después
2. **Tests y código van juntos**, no separados
3. **Deploy frecuente**, no monolítico
4. **Logs son tu mejor amigo** en producción
5. **Performance matters**, optimiza temprano
6. **Security primero**, no después
7. **Backup antes de cambios críticos**
8. **Monitorea siempre**, no solo cuando hay problemas
9. **Comunica cambios**, especialmente en team
10. **Celebra wins**, aprender de fails

---

**¡Éxito en tus proyectos! 🚀**
