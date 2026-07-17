# 🏢 TEMPLATE OPERATIVO: SISTEMA DE GESTIÓN (ERP/CRM)

---

## 📋 FASE 1: INICIO & ANÁLISIS (Semanas 1-2)

### Objetivo

Definir arquitectura, módulos, bases de datos y flujos antes de codificar.

### Herramientas a usar

- **Recopilación**: Spreadsheets, Documentos, Entrevistas
- **Análisis**: Claude Opus (razonamiento complejo)
- **Documentación**: Markdown

### 1.1 - RECOPILACIÓN DE REQUISITOS

**Archivo: `PROJECT_SCOPE.md`**

```markdown
# PROJECT SCOPE - SISTEMA DE GESTIÓN

## 1. INFORMACIÓN GENERAL

- **Nombre proyecto**: [Sistema X]
- **Cliente**: [Nombre empresa]
- **Industria**: [SaaS/Retail/Logística/Construcción]
- **Usuarios estimados**: [10-100-1000]
- **Usuarios concurrentes**: [Max usuarios simultáneos]
- **Presupuesto**: [Rango o monto]
- **Timeline**: [Semanas]

## 2. PROBLEMA A RESOLVER

### Situación actual

- ¿Cómo hacen el trabajo ahora?: [Descripción]
- ¿Qué herramientas usan?: [Excel, papel, sistemas viejos]
- ¿Dónde está el dolor?:
  1. [Pain point 1]: Impacto: [descripción]
  2. [Pain point 2]: Impacto: [descripción]
  3. [Pain point 3]: Impacto: [descripción]

### KPIs de éxito

- Métrica 1: [Reducir tiempo X de 2h a 20min]
- Métrica 2: [Reducir errores X]
- Métrica 3: [Aumentar throughput X]

## 3. MÓDULOS REQUERIDOS

### Módulo 1: [Nombre]

**Descripción**: [Qué hace]

**Funcionalidades principales**:

- [ ] Crear [entidad]
- [ ] Editar [entidad]
- [ ] Eliminar [entidad]
- [ ] Ver lista [entidad]
- [ ] Búsqueda avanzada
- [ ] Filtros
- [ ] Exportar a Excel

**Datos que gestiona**:

- Campo 1: [tipo de dato, requerido/opcional]
- Campo 2: [tipo de dato, requerido/opcional]
- Campo 3: [tipo de dato, requerido/opcional]

**Flujos principales**:

- Flujo 1: [Usuario hace X → Sistema Y → Resultado Z]
- Flujo 2: [...]

**Integraciones**:

- [ ] Ninguna
- [ ] API externa
- [ ] Sistema legacy
- [ ] Otro módulo

---

### Módulo 2: [Nombre]

[Idem estructura anterior]

---

## 4. DATOS Y BASE DE DATOS

### ¿Tienes datos actuales?

- [ ] No (start from zero)
- [ ] Sí, en: [Excel, CSV, BD actual]
- [ ] Datos a migrar: [cantidad de registros]

### Base de datos
```

Tabla 1: [Nombre]
├── id (PK)
├── campo_1: [tipo, constraints]
├── campo_2: [tipo, constraints]
├── created_at: timestamp
└── updated_at: timestamp

Tabla 2: [Nombre]
├── id (PK)
├── fk_tabla1_id: [relación]
├── campo_1: [tipo]
└── ...

Relaciones:
├── Tabla1 → Tabla2 (1:N)
├── Tabla2 → Tabla3 (N:M)
└── ...

```

## 5. USUARIOS Y ROLES

### Tipos de usuarios
- **Admin**:
  - Acceso: Total (crear, editar, eliminar, ver reportes)
  - Responsabilidades: Gestión usuarios, config sistema

- **Manager/Gerente**:
  - Acceso: Su territorio (lectura/escritura)
  - Responsabilidades: Supervisión, reportes

- **Operario/Usuario**:
  - Acceso: Solo crear/editar propios registros
  - Responsabilidades: Data entry, operaciones

- **Cliente/Portal**:
  - Acceso: Solo lectura de sus datos
  - Responsabilidades: Consultar estado

### Matriz de permisos
```

       | Crear | Editar | Eliminar | Reportes | Admin |

-------|-------|--------|----------|----------|-------|
Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
Manager| ✓ | ✓ | - | ✓ | - |
User | ✓ | ✓* | - | - | - |
Client | - | - | - | ✓* | - |

- = Solo propios registros / * = Solo acceso lectura

```

## 6. INTEGRACIONES

### Email
- [ ] SMTP propio
- [ ] SendGrid
- [ ] Mailgun
- **Casos de uso**: [Confirmaciones, reportes, notificaciones]

### Pagos (si aplica)
- [ ] Stripe
- [ ] MercadoPago
- [ ] PayPal
- **Caso uso**: [Descripción]

### Cloud Storage
- [ ] AWS S3
- [ ] Google Drive
- [ ] Azure Blob
- **Caso uso**: [Documentos, facturas, archivos]

### CRM externo
- [ ] HubSpot
- [ ] Pipedrive
- [ ] Salesforce
- **Sincronización**: [Qué datos]

### Análisis
- [ ] Google Analytics
- [ ] Mixpanel
- [ ] Custom analytics

### Otros
- [ ] [Sistema X]
- [ ] [API Y]

## 7. RESTRICCIONES TÉCNICAS

### Stack preferido
- Backend: [ ] Node.js / [ ] Python / [ ] C# / [ ] Java
- Frontend: [ ] React / [ ] Vue / [ ] Angular
- BD: [ ] PostgreSQL / [ ] MySQL / [ ] MongoDB / [ ] Firebase

### Hosting
- [ ] AWS (región: [us-east-1])
- [ ] GCP
- [ ] Azure
- [ ] Vercel + serverless
- [ ] Propio servidor
- **Budget hosting**: [$/mes]

### Performance
- **Usuarios concurrentes**: [N]
- **Uptime requerido**: [99.5% / 99.9% / 99.99%]
- **Respuesta API máx**: [200ms / 500ms]
- **Tiempo carga página**: [<2s / <3s]

### Seguridad
- [ ] GDPR compliance
- [ ] SOC2
- [ ] ISO 27001
- **Encriptación**: [Datos en tránsito, en reposo]
- **2FA**: [Requerido sí/no]
- **Backup**: [Frecuencia, redundancia]

## 8. REFERENCES & INSPIRACIÓN

### Sistemas similares que existen
- Link 1: [URL - qué te gusta]
- Link 2: [URL - qué no te gusta]

### Estilo UI deseado
- [ ] Corporativo (formal)
- [ ] Moderno (limpio, minimalista)
- [ ] Dashboard (muchos gráficos)
- [ ] Admin panel (utilitario)

## 9. CONTENIDO Y NOMENCLATURA

### Nombres de entidades (CRÍTICO)
- ¿Se llama "Cliente" o "Account"?
- ¿Se llama "Orden" o "Pedido"?
- ¿Se llama "Factura" o "Invoice"?
- [Define todas las entidades principales]

### Contenido requerido
- [ ] Textos en inglés
- [ ] Textos en español
- [ ] Documentación
- [ ] Help/FAQs

## 10. TIMELINE Y FASES

### Fase 1 (Semana 1-2): MVP básico
- [ ] Módulos: [listar]
- [ ] Entrega: [Qué funciona]

### Fase 2 (Semana 3-4): Reportes + Integraciones
- [ ] Funcionalidades: [listar]

### Fase 3 (Semana 5+): Polish + Deploy
- [ ] Funcionalidades: [listar]

---

## FIRMA

- **Preparado por**: [Nombre]
- **Aprobado por**: [Stakeholder]
- **Fecha**: [DD/MM/YYYY]
- **Versión**: 1.0
```

---

### 1.2 - ANÁLISIS TÉCNICO CON CLAUDE OPUS

**Herramienta:** Claude.ai (Opus 4.6 - mejor razonamiento)

**Contexto a pasar:**

```markdown
# ANÁLISIS ARQUITECTURA SISTEMA

## CONTEXTO COMPLETO

[Pega PROJECT_SCOPE.md completo]

## TAREA: DISEÑA LA ARQUITECTURA COMPLETA

Eres un arquitecto de sistemas senior con 15 años en enterprise software.

Basándote en los requisitos, genera:

### 1. DECISIONES TÉCNICAS JUSTIFICADAS

Para cada decisión (BD, API, autenticación, escalabilidad):

- **Opción A**: [Pros/contras]
- **Opción B**: [Pros/contras]
- **ELEGIDA**: [Justificación]

Decisiones a analizar:

1. ¿SQL o NoSQL?
2. ¿REST o GraphQL?
3. ¿Monolítico o microservicios?
4. ¿Autenticación (JWT/OAuth/Session)?
5. ¿Caching (Redis)?
6. ¿Message queue (RabbitMQ/Kafka)?
7. ¿Docker/Kubernetes?

### 2. DIAGRAMA DE ARQUITECTURA

Genera en formato Mermaid:
```

graph TB
Client[Cliente/Browser]
API[API Gateway/Load Balancer]
Backend[Backend Node.js]
DB[(PostgreSQL)]
Cache[Redis Cache]
Storage[S3 Storage]
Queue[Message Queue]
Email[Email Service]

    Client -->|HTTPS| API
    API -->|Requests| Backend
    Backend -->|Queries| DB
    Backend -->|Cache| Cache
    Backend -->|File upload| Storage
    Backend -->|Async jobs| Queue
    Queue -->|Send email| Email

```

### 3. SCHEMA DE BASE DE DATOS

Para cada tabla principal:
```

TABLE: usuarios
├── id: UUID (PK)
├── email: VARCHAR (UNIQUE)
├── password_hash: VARCHAR
├── nombre: VARCHAR
├── rol: ENUM (admin, manager, user, client)
├── estado: ENUM (activo, inactivo, pendiente)
├── empresa_id: UUID (FK)
├── created_at: TIMESTAMP
├── updated_at: TIMESTAMP
└── deleted_at: TIMESTAMP (soft delete)

TABLE: [Entidad principal]
├── ...

```

Genera schema para:
- Usuarios
- [Entidad principal 1]
- [Entidad principal 2]
- [Entidad principal N]

Con relaciones, índices, constraints claros.

### 4. ESTRUCTURA DE CARPETAS

Backend:
```

backend/
├── src/
│ ├── config/
│ ├── models/
│ ├── controllers/
│ ├── services/
│ ├── routes/
│ ├── middleware/
│ ├── utils/
│ ├── constants/
│ └── app.ts
├── tests/
├── migrations/
├── .env.example
├── docker-compose.yml
└── package.json

```

Frontend:
```

frontend/
├── src/
│ ├── pages/
│ ├── components/
│ ├── hooks/
│ ├── services/
│ ├── store/
│ ├── types/
│ └── styles/
├── public/
└── tests/

```

### 5. FLUJOS PRINCIPALES (Pseudocódigo)

Flujo 1: [Usuario crea X]
```

1. Frontend valida datos
2. POST /api/x con datos
3. Backend valida (Zod/Joi)
4. Guarda en BD
5. Entra a queue para procesamiento
6. Responde con ID generado
7. Frontend muestra éxito

```

Flujo 2: [Usuario consulta listado]
```

1. Frontend pide GET /api/x?filter=y&sort=z
2. Backend consulta BD con paginación
3. Aplica permisos (user solo ve suyo)
4. Responde con datos + total count
5. Frontend pagina resultados

```

### 6. CONSIDERACIONES DE SEGURIDAD

- Autenticación: [JWT con refresh tokens]
- CORS: [Configuración específica]
- Rate limiting: [100 req/min por usuario]
- SQL injection: [ORM (Prisma/TypeORM)]
- XSS prevention: [Sanitización inputs]
- CSRF: [Tokens CSRF]
- Encriptación: [Datos sensibles encriptados]
- Audit logs: [Quién hizo qué, cuándo]

### 7. PLAN DE FASES TÉCNICAS

**Fase 1 (Sprint 1-2): MVP Core**
- [ ] Setup inicial (BD, API básica)
- [ ] Autenticación
- [ ] 1-2 módulos principales
- [ ] UI básica

**Fase 2 (Sprint 3-4): Expansión**
- [ ] Módulos adicionales
- [ ] Reportes
- [ ] Integraciones externas

**Fase 3 (Sprint 5+): Polish**
- [ ] Optimizaciones
- [ ] Testing
- [ ] Deploy

### 8. RIESGOS Y MITIGACIONES

Riesgo 1: [Descripción]
- Impacto: Alto/Medio/Bajo
- Mitigación: [Estrategia]

Riesgo 2: [...]

### 9. ESTIMACIONES

- Setup inicial: [horas]
- Autenticación + BD: [horas]
- Módulo 1: [horas]
- Módulo 2: [horas]
- API endpoints: [horas]
- Tests: [horas]
- Frontend Módulo 1: [horas]
- Frontend Módulo 2: [horas]
- Integraciones: [horas]
- Deploy: [horas]

**TOTAL ESTIMADO**: [semanas]

Se muy específico, no genérico. Usa números concretos.
```

**QUÉ ESPERAR:**

- Documento de 5-10 páginas con análisis completo
- Diagrama Mermaid ejecutable
- Schema BD con relaciones claras
- Justificación de cada decisión técnica

**VALIDAR CON STAKEHOLDERS:**

- ¿Arquitectura aprobada?
- ¿Timeline realista?
- ¿Riesgos identificados?

---

### 1.3 - VALIDACIÓN Y APROBACIÓN

**Checklist:**

- [ ] PROJECT_SCOPE completado 100%
- [ ] Arquitectura documentada
- [ ] Schema de BD validado
- [ ] Timeline acordado
- [ ] Presupuesto confirmado
- [ ] Stakeholders aprobaron
- [ ] Requisitos priorizados (MoSCoW)

---

## 🎨 FASE 2: DISEÑO UI/UX (Semana 3)

### Objetivo

Crear wireframes y diseño visual de cada pantalla antes de codificar.

### Herramientas a usar

| Tarea      | Herramienta                      | Entrega                |
| ---------- | -------------------------------- | ---------------------- |
| Wireframes | Claude Design + Figma (opcional) | PNG/PDF                |
| Prototipo  | Artifacts (React)                | Componentes navegables |
| Validación | Manual                           | Feedback               |

### 2.1 - WIREFRAMES CON CLAUDE DESIGN

**Contexto a pasar:**

```markdown
# WIREFRAMES SISTEMA DE GESTIÓN

## CONTEXTO

[Pega PROJECT_SCOPE.md]
[Pega análisis arquitectura]

## PANTALLAS A DISEÑAR

### Pantalla 1: Login

- Username/Email input
- Password input
- Remember me checkbox
- Forgot password link
- Login button
- Error states

### Pantalla 2: Dashboard

- Header con usuario + logout
- Sidebar navegación
- Main content area con:
  - Cards KPI (3-4 números importantes)
  - Tabla de últimos registros
  - Gráfico de actividad
  - Quick actions

### Pantalla 3: Lista [Entidad]

- Tabla con columnas:
  - [Campo 1]
  - [Campo 2]
  - [Campo 3]
  - Acciones (Editar, Eliminar, Ver)
- Busqueda en tiempo real
- Filtros avanzados
- Paginación
- Botón "Crear nuevo"

### Pantalla 4: Crear/Editar [Entidad]

- Formulario con campos:
  - [Campo 1]: [tipo de input]
  - [Campo 2]: [tipo de input]
  - [Campo 3]: [tipo de input]
- Validación en tiempo real
- Botones: Guardar, Cancelar
- Mensajes de error
- Loading state

### Pantalla 5: Detalle [Entidad]

- Vista completa de registro
- Datos principales
- Historial de cambios
- Acciones relacionadas
- Botón editar

### Pantalla 6: Reportes

- Filtros: Fecha inicio/fin, categoría, etc
- Tablas con datos
- Gráficos (línea, barras, pie)
- Botón exportar Excel/PDF

## ESTILO VISUAL

- Color primario: [hex]
- Color secundario: [hex]
- Tipografía: [fuentes]
- Tema: [oscuro/claro]
- Tonalidad: [corporativo/moderno]

## REQUISITOS

- Desktop-first approach
- Responsive (funciona en tablet)
- Dark mode soportado
- Mobile (pantalla completa en mobile)

Genera wireframes para cada pantalla, mostrando:

- Layout de componentes
- Espaciado
- Tipografía
- Colores
- Estados (normal, hover, activo, error)
```

**Prompt exacto:**

```markdown
Eres un UX/UI designer senior especializado en sistemas administrativos.

# CONTEXTO

[Pega WIREFRAMES SISTEMA DE GESTIÓN]

# TAREA: DISEÑA WIREFRAMES Y MOCKUPS

Genera mockups profesionales (PNG/PDF) para:

1. **Login Screen**
   - Formulario centrado
   - Error states visibles
   - Password strength indicator

2. **Dashboard**
   - Header: Logo + User menu + Logout
   - Sidebar: Nav items (Clientes, Órdenes, Reportes, etc)
   - Main: KPI cards + Recent items table + Chart

3. **Lista de [Entidad]**
   - Search bar
   - Advanced filters (mostrar/ocultar)
   - Table con sorting
   - Pagination
   - Botón "New [Entity]"
   - Acciones por row (Edit, Delete, View)

4. **Crear/Editar [Entidad]**
   - Form con validación visual
   - Required field indicator (*)
   - Error messages inline
   - Submit button (disabled si inválido)
   - Cancel button

5. **Detalle [Entidad]**
   - Header con título
   - Datos principales
   - Activity log
   - Related items
   - Actions (Edit, Delete)

6. **Reportes**
   - Filter panel (fecha, categoría)
   - Data table con scroll horizontal
   - Charts (Line, Bar, Pie)
   - Export button (Excel, PDF)

## ESTILO

- Usa colores: [Pega colores]
- Tipografía: Headings [font], Body [font]
- Componentes reutilizables identificados
- Accesibilidad: Contraste 4.5:1
- Spacing: Grid 8px

Genera mockups ahora mostrando desktop + mobile views.
```

---

### 2.2 - PROTOTIPO INTERACTIVO

**Herramienta:** Claude.ai → Artifacts (React)

```markdown
# PROTOTIPO INTERACTIVO SISTEMA

Crea un React component que sea un prototipo navegable:

## Estructura
```

<Dashboard>
  <Sidebar>
    - Navigation items (links)
    - Collapse/expand
  <Header>
    - Logo
    - User menu (dropdown)
    - Logout
  <Main>
    - KPI Cards
    - Recent items table
    - Chart

  <ModalCreateEntity>
    - Form fields
    - Validación
    - Submit/Cancel
```

## Comportamiento

- Clickear nav items cambia vista
- Sidebar toggle funciona
- Form validación en tiempo real
- Modal abre/cierra
- Tabla tiene data mock

Usa Tailwind + shadcn/ui.

````

---

## 💻 FASE 3: DESARROLLO BACKEND (Semanas 4-6)

### Objetivo
Generar APIs production-ready con validación, autenticación y tests.

### Herramientas a usar
| Tarea | Herramienta | Entrega |
|-------|-------------|---------|
| Setup | Claude Code | Estructura proyecto |
| APIs | Claude Code | Endpoints autenticados |
| BD | Claude Code | Migrations + Models |
| Tests | Claude Code | Jest/Vitest tests |

### 3.1 - SETUP INICIAL BACKEND

**Terminal:**

```bash
mkdir sistema-gestion-backend
cd sistema-gestion-backend

# Crea proyecto Node.js
npm init -y

# Abre Claude Code
claude-code
````

**Contexto: `BACKEND_SPEC.md`**

```markdown
# BACKEND SPECIFICATION

## PROYECTO

[Nombre]

## STACK

- Node.js 18+
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT + refresh tokens
- Zod (validación)
- Jest (tests)
- Winston (logging)

## ESTRUCTURA CARPETAS
```

src/
├── config/
│ ├── env.ts (variables entorno)
│ ├── database.ts (Prisma)
│ └── logger.ts (Winston)
├── middleware/
│ ├── auth.ts (verifyToken)
│ ├── errorHandler.ts
│ ├── validation.ts
│ └── cors.ts
├── models/
│ └── [generado por Prisma]
├── controllers/
│ ├── authController.ts
│ ├── usuariosController.ts
│ ├── [entidades]Controller.ts
├── services/
│ ├── authService.ts
│ ├── usuariosService.ts
│ ├── [entidades]Service.ts
├── routes/
│ ├── auth.routes.ts
│ ├── usuarios.routes.ts
│ ├── [entidades].routes.ts
├── validators/
│ ├── authValidators.ts
│ ├── usuariosValidators.ts
├── types/
│ └── index.ts (TypeScript interfaces)
├── utils/
│ ├── hash.ts (password hashing)
│ └── jwt.ts (token generation)
└── app.ts (Express app setup)

tests/
├── unit/
├── integration/
└── fixtures/

migrations/ (Prisma)

````

## ENDPOINTS A GENERAR

### Auth
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout

### Usuarios
- GET /api/v1/usuarios (con paginación)
- POST /api/v1/usuarios
- GET /api/v1/usuarios/:id
- PATCH /api/v1/usuarios/:id
- DELETE /api/v1/usuarios/:id

### [Entidad Principal 1]
- GET /api/v1/[entidad] (filtrado, paginado)
- POST /api/v1/[entidad]
- GET /api/v1/[entidad]/:id
- PATCH /api/v1/[entidad]/:id
- DELETE /api/v1/[entidad]/:id

### [Entidad Principal 2]
[Idem]

### Reportes
- GET /api/v1/reportes/dashboard
- GET /api/v1/reportes/[tipo]?desde=X&hasta=Y
- GET /api/v1/reportes/[tipo]/export?format=excel

## RESPUESTA ESTÁNDAR API

Success:
```json
{
  "success": true,
  "data": { },
  "message": "Operación exitosa"
}
````

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Error descriptivo",
    "details": []
  }
}
```

## VALIDACIONES

Usar Zod para:

- Email válido
- Password: min 8 caracteres, 1 mayúscula, 1 número
- Campos requeridos
- Tipos de datos
- Ranges (edad 18-120)

## AUTENTICACIÓN

- JWT con expiración: 24h
- Refresh token: 7 días
- Guardar refresh tokens en BD
- Revocar al logout

## BASES DE DATOS - SCHEMA

```
users:
- id (UUID)
- email (unique)
- password_hash
- nombre
- rol (enum)
- estado
- empresa_id (FK)
- created_at
- updated_at
- deleted_at

[Entidad 1]:
- id (UUID)
- ... [campos específicos]
- user_id (FK, quien creó)
- created_at
- updated_at

[Entidad 2]:
- ...
```

## AUTORIZACION (PERMISOS)

Admin: acceso todo
Manager: acceso a su territorio
User: crear y editar propios registros
Client: solo lectura

Implementar:

- Middleware que verifica rol
- Service que filtra según permisos
- Audit log de cambios

## INTEGRACIONES

[Listar APIs externas a integrar]

## TESTING

Coverage mínimo: 80%

Tests para:

- Auth (login, registro, refresh)
- CRUD de cada entidad
- Validaciones
- Permisos
- Error handling

## MONITOREO

Logging de:

- Requests (GET /path - 200 - 45ms)
- Errors (ERROR: descripción)
- Security (Login attempts, unauthorized access)

## DEPLOYMENT

- Dockerfile incluido
- docker-compose para desarrollo
- migrations automáticas en startup
- Health check endpoint: GET /health

````

**Prompt a Claude Code:**

```markdown
# GENERAR BACKEND PRODUCTION-READY

## CONTEXTO COMPLETO
[Pega BACKEND_SPEC.md]
[Pega arquitectura del Paso 1.2]

## TAREA 1: SETUP INICIAL

Genera:
1. package.json con dependencias
2. tsconfig.json (strict)
3. .env.example
4. src/app.ts (Express setup)
5. src/config/env.ts (cargar variables)
6. src/config/database.ts (Prisma)
7. src/config/logger.ts (Winston)

## TAREA 2: AUTENTICACIÓN

Genera:
1. src/types/index.ts (User interface)
2. src/utils/jwt.ts (sign, verify, refresh tokens)
3. src/utils/hash.ts (password hashing con bcrypt)
4. src/validators/authValidators.ts (Zod schemas)
5. src/services/authService.ts
   - register(email, password, nombre)
   - login(email, password)
   - refreshToken(token)
   - logout(userId)
6. src/controllers/authController.ts
7. src/middleware/auth.ts (verifyToken middleware)
8. src/routes/auth.routes.ts
   - POST /api/v1/auth/register
   - POST /api/v1/auth/login
   - POST /api/v1/auth/refresh
   - POST /api/v1/auth/logout

## TAREA 3: USUARIOS CRUD

Genera:
1. Prisma schema
   - users table
   - roles enum
   - relaciones
2. src/services/usuariosService.ts
3. src/controllers/usuariosController.ts
4. src/validators/usuariosValidators.ts
5. src/routes/usuarios.routes.ts
   - GET /api/v1/usuarios (paginated, filtered, solo del user)
   - POST /api/v1/usuarios (admin only)
   - GET /api/v1/usuarios/:id
   - PATCH /api/v1/usuarios/:id
   - DELETE /api/v1/usuarios/:id

## TAREA 4: [ENTIDAD PRINCIPAL 1]

Genera CRUD similar:
1. Prisma schema table + relaciones
2. Service (create, findAll, findById, update, delete)
3. Controller
4. Validators
5. Routes

[Repetir para cada módulo principal]

## TAREA 5: TESTS

Genera tests con Jest:
1. tests/unit/auth.test.ts
2. tests/integration/auth.integration.test.ts
3. tests/unit/services.test.ts

Coverage: 80%+

## ESTÁNDARES OBLIGATORIOS

✓ TypeScript strict mode
✓ Error handling centralizado
✓ Logging estructurado
✓ Validación en todos los endpoints
✓ Permisos checkeados
✓ No passwords en logs
✓ Transacciones en operaciones críticas
✓ Comments en funciones complejas
✓ Tests verdes

## ARCHIVOS FINALES ESPERADOS

- package.json
- tsconfig.json
- .env.example
- prisma/schema.prisma
- src/app.ts
- src/config/*.ts
- src/middleware/*.ts
- src/types/index.ts
- src/utils/*.ts
- src/services/*.ts
- src/controllers/*.ts
- src/validators/*.ts
- src/routes/*.ts
- tests/*.test.ts

Genera todo. Production-ready.
````

**QUÉ ESPERAR:**

- ✅ APIs totalmente funcionales
- ✅ BD schema listo para migrations
- ✅ Tests pasando
- ✅ Documentación automática

---

### 3.2 - COMANDOS IMPORTANTES

```bash
# Desarrollar
npm run dev

# Generar Prisma client
npx prisma generate

# Crear migration
npx prisma migrate dev --name nombre_descriptivo

# Reset BD (desarrollo solamente)
npx prisma migrate reset

# Tests
npm test

# Build
npm run build

# Lint
npm run lint
```

---

## 💻 FASE 4: DESARROLLO FRONTEND (Semanas 7-9)

### Objetivo

Generar UI components reutilizables y páginas conectadas a APIs.

### Herramientas a usar

| Tarea       | Herramienta | Entrega             |
| ----------- | ----------- | ------------------- |
| Setup       | Claude Code | Proyecto Next.js    |
| Componentes | Claude Code | React components    |
| Pages       | Claude Code | Páginas funcionales |
| Estado      | Claude Code | Zustand store       |

### 4.1 - SETUP FRONTEND

```bash
npx create-next-app@latest sistema-frontend \
  --typescript \
  --tailwind \
  --app

cd sistema-frontend
claude-code
```

**Contexto: `FRONTEND_SPEC.md`**

```markdown
# FRONTEND SPECIFICATION

## STACK

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand (state management)
- React Query (data fetching)
- React Hook Form + Zod (forms)

## ESTRUCTURA
```

app/
├── (auth)/
│ ├── login/page.tsx
│ └── register/page.tsx
├── (app)/
│ ├── layout.tsx (sidebar, header)
│ ├── dashboard/page.tsx
│ ├── [entidad]/
│ │ ├── page.tsx (lista)
│ │ ├── new/page.tsx (crear)
│ │ └── [id]/page.tsx (detalle/editar)
│ └── reportes/page.tsx
├── api/
│ └── auth/[...nextauth]/route.ts (si usas NextAuth)
└── layout.tsx (root)

components/
├── layouts/
│ ├── Sidebar.tsx
│ ├── Header.tsx
│ └── AdminLayout.tsx
├── forms/
│ ├── LoginForm.tsx
│ ├── [Entidad]Form.tsx
├── tables/
│ ├── DataTable.tsx
│ ├── [Entidad]Table.tsx
├── ui/
│ ├── Button.tsx
│ ├── Input.tsx
│ └── [shadcn components]
└── shared/
├── LoadingSpinner.tsx
└── ErrorAlert.tsx

hooks/
├── useAuth.ts
├── use[Entidad].ts
└── useUser.ts

lib/
├── api.ts (cliente HTTP)
├── validators.ts (Zod schemas)
└── constants.ts

store/
├── authStore.ts (Zustand)
└── [Entidad]Store.ts

types/
├── index.ts
└── api.ts

````

## PÁGINAS A GENERAR

1. Login (/login)
2. Dashboard (/dashboard)
3. Lista [Entidad] (/[entidad])
4. Crear [Entidad] (/[entidad]/new)
5. Editar [Entidad] (/[entidad]/[id])
6. Detalle [Entidad] (/[entidad]/[id]/view)
7. Reportes (/reportes)

## COMPONENTES REUTILIZABLES

- DataTable (sorting, filtering, pagination)
- Form (con validación)
- Modal (crear, editar)
- Card (datos)
- Button (estados)
- Alert (mensajes)
- Spinner (loading)
- Menu (usuario)

## ESTADO (Zustand)

```typescript
authStore:
- user
- token
- isLoggedIn
- login()
- logout()
- setUser()

[Entidad]Store:
- items
- loading
- error
- fetchItems()
- createItem()
- updateItem()
- deleteItem()
````

## API CLIENT

```typescript
// lib/api.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Interceptores:
// - Agregar token a requests
// - Refresh token si expira
// - Error handling global
```

## FORMULARIOS

Usar React Hook Form + Zod:

```typescript
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm({
  resolver: zodResolver(schema),
  defaultValues: initialData,
});
```

## AUTENTICACIÓN

- Login: email + password
- Guardar token en localStorage (o httpOnly cookie)
- Redirect a /dashboard si loggeado
- Redirect a /login si no loggeado (ProtectedRoute)

````

**Prompt a Claude Code:**

```markdown
# GENERAR FRONTEND NEXT.JS

## CONTEXTO
[Pega FRONTEND_SPEC.md]
[Pega BACKEND_SPEC.md]

## TAREA 1: SETUP INICIAL

Genera:
1. package.json con dependencias
2. tsconfig.json (strict)
3. next.config.js
4. tailwind.config.js
5. .env.example
6. lib/api.ts (axios client con interceptores)
7. lib/validators.ts (Zod schemas para forms)
8. types/index.ts

## TAREA 2: AUTENTICACIÓN

Genera:
1. store/authStore.ts (Zustand con user, token, login, logout)
2. hooks/useAuth.ts
3. middleware para rutas protegidas
4. components/ProtectedRoute.tsx
5. app/(auth)/login/page.tsx
   - Form: email, password
   - Validación
   - Error handling
   - Redirige a /dashboard
6. app/(auth)/register/page.tsx (similar)
7. Componente ProtectedLayout para rutas privadas

## TAREA 3: LAYOUT Y NAVEGACIÓN

Genera:
1. components/layouts/Sidebar.tsx
   - Logo
   - Nav items (Dashboard, Entidades, Reportes)
   - User menu (cambiar contraseña, logout)
   - Collapse/expand
2. components/layouts/Header.tsx
   - Breadcrumb
   - Search
   - User profile
3. app/(app)/layout.tsx
   - Combina Sidebar + Header
   - Main content area

## TAREA 4: DASHBOARD

Genera:
1. app/(app)/dashboard/page.tsx
   - KPI Cards (fetch de /api/reportes/dashboard)
   - Table reciente con items
   - Chart (línea o barras)
   - Loading states

## TAREA 5: CRUD [ENTIDAD PRINCIPAL]

Genera para cada módulo:
1. store/[entidad]Store.ts (Zustand)
2. hooks/use[Entidad].ts
3. components/tables/[Entidad]Table.tsx
   - DataTable reutilizable
   - Columnas dinámicas
   - Sorting
   - Filtering
   - Pagination
   - Acciones (editar, eliminar)
4. components/forms/[Entidad]Form.tsx
   - React Hook Form
   - Zod validation
   - Todos los campos
   - Submit button con loading
5. app/(app)/[entidad]/page.tsx (lista)
   - Llama hook use[Entidad]
   - Muestra tabla
   - Botón "New"
6. app/(app)/[entidad]/new/page.tsx (crear)
   - Form vacío
   - POST al endpoint
   - Redirige a lista
7. app/(app)/[entidad]/[id]/page.tsx (editar)
   - Form con datos precargados
   - PATCH al endpoint
   - Validación

## TAREA 6: REPORTES

Genera:
1. app/(app)/reportes/page.tsx
   - Filtros (fecha inicio/fin, categoría)
   - Tabla con datos
   - Gráfico
   - Botón "Export Excel"

## ESTÁNDARES

✓ TypeScript strict
✓ React components funcionales
✓ Props interfaces
✓ Error boundaries
✓ Loading states
✓ Error states
✓ Accessible (a11y)
✓ Responsive
✓ No console.logs
✓ Comments donde sea complejo

## DEPENDENCIAS CLAVE

```json
{
  "next": "^14",
  "react": "^18",
  "typescript": "^5",
  "tailwindcss": "latest",
  "@shadcn/ui": "latest",
  "zustand": "latest",
  "react-query": "latest",
  "react-hook-form": "latest",
  "zod": "latest",
  "axios": "latest"
}
````

Genera todo. Production-ready.

````

---

## ✅ FASE 5: TESTING (Semana 10)

### Objetivo
Validar funcionalidad, rendimiento, seguridad antes de deploy.

### Herramientas a usar
| Tarea | Herramienta | Validación |
|-------|-------------|-----------|
| Tests unitarios | Jest + Vitest | Cobertura 80% |
| Tests integración | Supertest | API endpoints |
| E2E | Playwright/Cypress | Flujos completos |
| Performance | Lighthouse | Score 90+ |
| Seguridad | OWASP | Vulnerabilidades |

### 5.1 - TESTING BACKEND

**Checklist:**

```markdown
# BACKEND TESTING

## Tests Unitarios (20+ tests)
- [ ] Auth service (register, login, refresh)
- [ ] Password hashing
- [ ] JWT generation
- [ ] Validadores Zod
- [ ] Services CRUD

## Tests Integración (15+ tests)
- [ ] POST /auth/register
- [ ] POST /auth/login
- [ ] POST /auth/refresh
- [ ] GET /[entidad] (con permisos)
- [ ] POST /[entidad] (crear)
- [ ] PATCH /[entidad]/:id
- [ ] DELETE /[entidad]/:id

## Coverage
- [ ] Mínimo 80%
- [ ] Comando: npm test -- --coverage

## Seguridad
- [ ] SQL injection (test con caracteres especiales)
- [ ] XSS (test con scripts en inputs)
- [ ] CSRF tokens presentes
- [ ] Rate limiting funciona
- [ ] Password no en logs

## Performance
- [ ] Query time < 200ms
- [ ] Endpoint lista paginado
- [ ] Índices BD correctos
````

**Comando:**

```bash
npm test

# O con coverage
npm test -- --coverage
```

---

### 5.2 - TESTING FRONTEND

**Checklist:**

```markdown
# FRONTEND TESTING

## Tests Componentes (10+ tests)

- [ ] Button renders y clickea
- [ ] Form valida
- [ ] Table filtra y pagina
- [ ] Modal abre/cierra
- [ ] Auth guard redirige

## Tests Hooks

- [ ] useAuth funciona
- [ ] use[Entidad] fetches datos

## Tests Pages

- [ ] /login renderiza
- [ ] /dashboard requiere auth
- [ ] /[entidad] lista items
- [ ] /[entidad]/new crea item

## E2E Tests (Playwright)

- [ ] Login completo
- [ ] Crear item
- [ ] Editar item
- [ ] Eliminar item
- [ ] Logout

## Performance (Lighthouse)

- [ ] Score: 90+
- [ ] LCP: <2.5s
- [ ] FID: <100ms
- [ ] CLS: <0.1
```

---

### 5.3 - TESTING FLUJOS CRÍTICOS

**Manual testing de escenarios reales:**

```markdown
# FLUJOS CRÍTICOS A VALIDAR

## Flujo 1: Usuario registra + crea item

1. [ ] Navega a /register
2. [ ] Completa formulario
3. [ ] Recibe email confirmación
4. [ ] Clickea link email
5. [ ] Redirige a login
6. [ ] Entra con credenciales
7. [ ] Dashboard muestra datos
8. [ ] Navega a [entidad]
9. [ ] Clickea "Crear nuevo"
10. [ ] Completa formulario
11. [ ] Guarda
12. [ ] Ve item en lista
13. [ ] Edita item
14. [ ] Guarda cambios
15. [ ] Logout funciona

## Flujo 2: Manager genera reporte

1. [ ] Login como manager
2. [ ] Navega a reportes
3. [ ] Configura filtros
4. [ ] Ve tabla con datos
5. [ ] Exporta a Excel
6. [ ] Archivo descarga correctamente
```

---

## 🚀 FASE 6: DEPLOYMENT (Semana 11)

### Objetivo

Publicar sistema en producción con monitoreo.

### Herramientas a usar

| Componente | Herramienta                  | Configuración |
| ---------- | ---------------------------- | ------------- |
| Backend    | AWS / Heroku / Digital Ocean | Docker        |
| Frontend   | Vercel / Netlify             | Automático    |
| Base datos | AWS RDS / PostgreSQL managed | Backups       |
| Dominio    | Tu registrador               | DNS           |
| Email      | SendGrid / AWS SES           | SMTP          |
| Monitoreo  | Sentry + DataDog             | Logging       |

### 6.1 - PRE-DEPLOY CHECKLIST

```markdown
# PRE-DEPLOYMENT CHECKLIST

## Backend

- [ ] No console.logs
- [ ] No errores TypeScript
- [ ] Tests pasando (cobertura 80%)
- [ ] Linter pasando
- [ ] .env variables configuradas
- [ ] BD migrations ready
- [ ] Health check endpoint funciona
- [ ] Docker working

## Frontend

- [ ] Build sin errores (npm run build)
- [ ] .env.production configurado
- [ ] API URL correcta
- [ ] Lighthouse 90+
- [ ] Tests E2E pasando
- [ ] Sitemap generado
- [ ] robots.txt configurado

## Infraestructura

- [ ] Dominio DNS configurado
- [ ] SSL certificate ready
- [ ] Email SMTP configurado
- [ ] Storage (S3) configurado
- [ ] Backups automáticos configurados
- [ ] CDN configurado (opcional)

## Seguridad

- [ ] Rate limiting activo
- [ ] CORS correctamente configurado
- [ ] Secrets en variables de entorno
- [ ] API keys no en código
- [ ] Audit logging activo
```

### 6.2 - DEPLOY BACKEND

**Option A: Docker + AWS ECS / Heroku**

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

**Comandos:**

```bash
# Build y push a Docker
docker build -t sistema-backend .
docker push [tu-registro]/sistema-backend

# Deploy a Heroku
heroku container:push web
heroku container:release web
```

### 6.3 - DEPLOY FRONTEND

**Vercel (recomendado):**

```bash
npm install -g vercel

# Deploy
vercel --prod

# O via GitHub (automático)
```

### 6.4 - CONFIGURAR DOMINIO

```
DNS Records:
- A: tu-backend.com → [IP del servidor]
- A: tu-sistema.com → [IP Vercel]
- MX: [Email SMTP]
- TXT: [DKIM, SPF para email]
```

### 6.5 - MONITOREO POST-DEPLOY

**Configurar alertas:**

```markdown
# MONITOREO

## Sentry (error tracking)

- [ ] Proyecto creado
- [ ] SDK integrado backend
- [ ] SDK integrado frontend
- [ ] Alertas configuradas

## DataDog (métricas)

- [ ] API response time
- [ ] Error rate
- [ ] DB query performance
- [ ] CPU/Memory usage

## UptimeRobot (uptime)

- [ ] Monitorea https://tu-sistema.com
- [ ] Alerta si cae
- [ ] SLA tracking
```

---

## 📊 TIMELINE ESTIMADO

| Fase       | Duración       | Entrega               |
| ---------- | -------------- | --------------------- |
| Análisis   | 2 sem          | Arquitectura aprobada |
| Diseño     | 1 sem          | Wireframes + mockups  |
| Backend    | 3 sem          | APIs + Tests          |
| Frontend   | 3 sem          | UI + Funcionalidad    |
| Testing    | 1 sem          | Validación 100%       |
| Deployment | 1 sem          | Sistema live          |
| **TOTAL**  | **11 semanas** | **MVP Production**    |

---

## 🎯 CHECKLIST FINAL SISTEMA DE GESTIÓN

```markdown
# SISTEMA DE GESTIÓN - CHECKLIST FINAL

## ANÁLISIS ✓

- [ ] PROJECT_SCOPE completado
- [ ] Arquitectura documentada
- [ ] Schema BD aprobado
- [ ] Stakeholders firmaron

## DISEÑO ✓

- [ ] Wireframes validados
- [ ] UI mockups aprobados
- [ ] Prototipo navegable

## DESARROLLO ✓

- [ ] Backend APIs terminadas
- [ ] Frontend páginas completadas
- [ ] Integraciones funcionales
- [ ] Código limpio (linter pasando)

## TESTING ✓

- [ ] Tests cobertura 80%+
- [ ] E2E tests verdes
- [ ] Flujos críticos validados
- [ ] Lighthouse 90+
- [ ] OWASP seguridad ok

## DEPLOYMENT ✓

- [ ] Ambiente producción live
- [ ] Dominio DNS configurado
- [ ] SSL activo
- [ ] Backups configurados
- [ ] Monitoreo activo

## POST-LAUNCH ✓

- [ ] Documentación entregada
- [ ] Training usuarios completado
- [ ] SLA monitoreo activo
- [ ] Plan de mejoras definido
```

---

**Este template es reutilizable para cualquier sistema de gestión. Solo reemplaza los nombres de entidades y módulos según tu caso.**
