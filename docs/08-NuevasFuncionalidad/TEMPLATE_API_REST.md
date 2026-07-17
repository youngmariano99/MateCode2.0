# 🔌 TEMPLATE OPERATIVO: API REST

---

## 📋 FASE 1: ESPECIFICACIÓN (Días 1-2)

### Objetivo

Documentar completamente todos los endpoints, validaciones, autenticación y respuestas.

### Herramientas

- Documentación: Markdown
- Validación: Claude Opus (razonamiento)

### 1.1 - ESPECIFICACIÓN TÉCNICA

**Archivo: `API_SPEC.md`**

````markdown
# API REST - ESPECIFICACIÓN COMPLETA

## 1. INFORMACIÓN GENERAL

- **Nombre API**: [v1 API]
- **Base URL**: https://api.tudominio.com/v1
- **Autenticación**: JWT Bearer tokens
- **Versionado**: URL versioning (/v1, /v2)
- **Formato respuestas**: JSON
- **Rate limit**: 100 requests/min por usuario
- **Timeout**: 30 segundos

## 2. AUTENTICACIÓN

### Tipos soportados

- [ ] JWT Bearer token
- [ ] API Key
- [ ] OAuth 2.0
- [ ] Basic Auth (solo desarrollo)

### JWT

- **Secreto**: [generado en .env]
- **Algoritmo**: HS256
- **Expiración**: 24 horas
- **Refresh token**: 7 días
- **Payload ejemplo**:

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "rol": "admin",
  "iat": 1234567890,
  "exp": 1234654290
}
```
````

### Headers requeridos

```
Authorization: Bearer [jwt_token]
Content-Type: application/json
X-Request-ID: [uuid único por request] (opcional)
```

## 3. ENDPOINTS

### 3.1 - Autenticación

#### POST /auth/register

**Descripción**: Registra nuevo usuario

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "nombre": "Juan García",
  "empresa": "Mi Empresa"
}
```

**Validaciones**:

- email: válido, único
- password: min 8 chars, 1 mayúscula, 1 número, 1 especial
- nombre: 3-100 caracteres
- empresa: 2-100 caracteres

**Response** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "nombre": "Juan García",
    "rol": "user",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "Usuario registrado exitosamente"
}
```

**Errores**:

- 400: Validación fallida
- 409: Email ya existe
- 500: Error interno

---

#### POST /auth/login

**Descripción**: Genera JWT token

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "refreshToken": "refresh-token-string",
    "expiresIn": 86400,
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "rol": "user"
    }
  }
}
```

**Errores**:

- 401: Credenciales inválidas
- 429: Demasiados intentos

---

#### POST /auth/refresh

**Descripción**: Obtiene nuevo access token

**Request Body**:

```json
{
  "refreshToken": "refresh-token-string"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "expiresIn": 86400
  }
}
```

---

#### POST /auth/logout

**Descripción**: Invalida refresh token

**Headers**: Requiere Authorization

**Response** (204 No Content):

```json
{
  "success": true,
  "message": "Logout exitoso"
}
```

---

### 3.2 - Ejemplo: Módulo CLIENTES

#### GET /clientes

**Descripción**: Lista de clientes con filtros y paginación

**Query Parameters**:

```
?page=1           # Página (default: 1)
&limit=10         # Items por página (default: 10, max: 100)
&search=Juan      # Búsqueda en nombre/email
&estado=activo    # Filtro por estado (activo/inactivo)
&sort=nombre:asc  # Ordenamiento (field:asc|desc)
```

**Headers**: Requiere Authorization

**Response** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "client-uuid",
      "nombre": "Juan García",
      "email": "juan@example.com",
      "telefono": "+34 600 123 456",
      "empresa": "TechCorp",
      "estado": "activo",
      "createdAt": "2024-01-10T10:00:00Z",
      "updatedAt": "2024-01-15T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 145,
    "totalPages": 15
  }
}
```

**Errores**:

- 401: No autenticado
- 403: Permiso denegado

---

#### POST /clientes

**Descripción**: Crea nuevo cliente

**Request Body**:

```json
{
  "nombre": "Juan García",
  "email": "juan@example.com",
  "telefono": "+34 600 123 456",
  "empresa": "TechCorp"
}
```

**Validaciones**:

- nombre: 2-150 caracteres
- email: válido, único
- telefono: válido (opcional)
- empresa: 2-100 caracteres

**Response** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "client-uuid",
    "nombre": "Juan García",
    "email": "juan@example.com",
    "telefono": "+34 600 123 456",
    "empresa": "TechCorp",
    "estado": "activo",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "message": "Cliente creado exitosamente"
}
```

**Errores**:

- 400: Validación fallida
- 409: Email ya existe
- 401: No autenticado

---

#### GET /clientes/:id

**Descripción**: Obtiene detalles de un cliente

**Headers**: Requiere Authorization

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "client-uuid",
    "nombre": "Juan García",
    "email": "juan@example.com",
    "telefono": "+34 600 123 456",
    "empresa": "TechCorp",
    "estado": "activo",
    "direccion": "Calle Principal 123",
    "ciudad": "Madrid",
    "pais": "España",
    "notas": "Cliente VIP",
    "createdAt": "2024-01-10T10:00:00Z",
    "updatedAt": "2024-01-15T15:30:00Z",
    "ordenes": 5,
    "montoTotal": 15000
  }
}
```

**Errores**:

- 404: Cliente no encontrado
- 401: No autenticado

---

#### PATCH /clientes/:id

**Descripción**: Actualiza cliente

**Request Body** (solo campos a actualizar):

```json
{
  "nombre": "Juan García Actualizado",
  "telefono": "+34 600 999 888"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "client-uuid",
    "nombre": "Juan García Actualizado",
    "email": "juan@example.com",
    "telefono": "+34 600 999 888",
    "empresa": "TechCorp",
    "estado": "activo",
    "updatedAt": "2024-01-15T16:00:00Z"
  },
  "message": "Cliente actualizado"
}
```

---

#### DELETE /clientes/:id

**Descripción**: Elimina cliente (soft delete)

**Headers**: Requiere Authorization (solo admin)

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Cliente eliminado"
}
```

**Errores**:

- 404: Cliente no encontrado
- 403: Permiso denegado

---

## 4. CÓDIGOS DE ERROR ESTÁNDAR

```
200 OK - Éxito
201 Created - Recurso creado
204 No Content - Éxito sin contenido
400 Bad Request - Validación fallida
401 Unauthorized - No autenticado
403 Forbidden - Permiso denegado
404 Not Found - Recurso no existe
409 Conflict - Recurso duplicado
429 Too Many Requests - Rate limit excedido
500 Internal Server Error - Error del servidor
```

## 5. FORMATO DE RESPUESTA DE ERROR

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validación fallida",
    "details": [
      {
        "field": "email",
        "message": "Email debe ser válido",
        "value": "invalid-email"
      },
      {
        "field": "password",
        "message": "Password debe tener mínimo 8 caracteres",
        "value": "short"
      }
    ]
  }
}
```

## 6. PAGINACIÓN

**Request**:

```
GET /clientes?page=2&limit=20
```

**Response header**:

```
X-Total-Count: 145
X-Page: 2
X-Limit: 20
X-Total-Pages: 8
```

## 7. FILTRADO Y BÚSQUEDA

**Operadores soportados**:

```
?filter[estado]=activo         # Exacto
?filter[edad][$gte]=18         # Mayor o igual
?filter[edad][$lte]=65         # Menor o igual
?filter[nombre][$like]=juan    # Contiene
?search=juan                    # Búsqueda general
```

## 8. ORDENAMIENTO

```
?sort=nombre:asc      # Ascendente
?sort=nombre:desc     # Descendente
?sort=createdAt:desc  # Por fecha
```

## 9. CAMPOS EXCLUIR/INCLUIR

```
?fields=id,nombre,email       # Solo estos campos
?exclude=password,tokens      # Excluir estos
```

## 10. INTEGRACIONES

### Webhooks (si aplica)

```
POST /webhooks/register
Body:
{
  "event": "cliente.created",
  "url": "https://tu-app.com/webhook"
}
```

### Eventos disparados:

- cliente.created
- cliente.updated
- cliente.deleted
- orden.created
- orden.completada

## 11. DOCUMENTACIÓN INTERACTIVA

- OpenAPI/Swagger: https://api.tudominio.com/docs
- Postman collection: [link]
- Ejemplos cURL: ver sección 3

## 12. RATE LIMITING

- Límite: 100 requests/minuto por token
- Ventanas: 1 minuto deslizante
- Headers respuesta:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1705353600
```

## 13. VERSIONADO

Las APIs se mantienen en:

- `/v1` - Versión actual
- `/v2` - Nueva versión (cuando haya breaking changes)

Deprecación: 6 meses antes de eliminar versión vieja.

## 14. MONITOREO Y LOGGING

Loguea:

- [timestamp] [request_id] [método] [path] [status] [duracion]
- Ejemplos: GET /api/v1/clientes - 200 - 45ms
- Errores: POST /api/v1/clientes - 400 - Validación fallida

## 15. AMBIENTE

```
Desarrollo: http://localhost:3001/v1
Staging: https://staging-api.tudominio.com/v1
Producción: https://api.tudominio.com/v1
```

````

---

### 1.2 - VALIDAR SPEC CON CLAUDE OPUS

**Prompt:**

```markdown
Eres un API architect senior.

# ESPECIFICACIÓN API
[Pega API_SPEC.md completo]

# VALIDACIÓN

Revisa la especificación y proporciona:

1. **Completitud**: ¿Faltan endpoints? ¿Integraciones?
2. **Consistencia**: ¿Nombres de campos uniformes?
3. **Seguridad**: ¿Autenticación y autorización correcta?
4. **Performance**: ¿Paginación en listas?
5. **Errores**: ¿Cubiertos todos los casos?
6. **Documentación**: ¿Suficientemente clara?

Y sugiere mejoras específicas.
````

---

## 💻 FASE 2: DESARROLLO (Días 3-7)

### Objetivo

Generar código production-ready con tests.

### Herramientas

- Setup: Claude Code (Terminal)
- Generación: Claude Code
- Testing: Jest

### 2.1 - SETUP INICIAL

```bash
mkdir api-rest
cd api-rest

# Inicializa Node.js
npm init -y

# Abre Claude Code
claude-code
```

**Contexto: `CODING_SPEC.md`**

```markdown
# BACKEND CODING SPECIFICATION

## STACK

- Node.js 18+
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT
- Zod (validación)
- Jest (tests)
- Winston (logging)

## ESTRUCTURA
```

src/
├── config/
│ ├── env.ts
│ ├── database.ts
│ └── logger.ts
├── middleware/
│ ├── auth.ts
│ ├── errorHandler.ts
│ ├── validation.ts
│ └── rateLimit.ts
├── models/
│ └── [generado Prisma]
├── controllers/
│ ├── authController.ts
│ └── [entidades]Controller.ts
├── services/
│ ├── authService.ts
│ └── [entidades]Service.ts
├── validators/
│ └── [entidades]Validators.ts
├── routes/
│ ├── auth.routes.ts
│ ├── [entidades].routes.ts
│ └── index.ts
├── types/
│ └── index.ts
├── utils/
│ ├── jwt.ts
│ ├── hash.ts
│ └── response.ts
└── app.ts

tests/
├── unit/
└── integration/

prisma/
└── schema.prisma

.env.example

````

## ENDPOINTS A GENERAR

Basado en API_SPEC.md:
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- CRUD completo para cada entidad

## VALIDACIÓN

Usar Zod exacto como en API_SPEC.md:
- Email válido
- Password: min 8, mayúscula, número, especial
- Campos requeridos según spec

## AUTENTICACIÓN

- JWT + refresh tokens
- Guardar refresh tokens en BD
- Revocar al logout
- Middleware verifyToken en rutas protegidas

## RESPONSE FORMAT

Todos los endpoints responden:
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Array
  }
  message?: string
}
````

## TESTS

- Coverage: 80%+
- Tests unitarios: services, utils
- Tests integración: endpoints
- Fixtures de datos de prueba

## ERRORES

Manejo centralizado:

```typescript
class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number
  ) {
    super(message);
  }
}
```

## LOGGING

Winston con niveles:

- info: requests normales
- error: errores
- warn: warnings
- debug: desarrollo

````

**Prompt a Claude Code:**

```markdown
# GENERAR API REST PRODUCTION-READY

## CONTEXTO
[Pega API_SPEC.md]
[Pega CODING_SPEC.md]

## TAREA: GENERAR CÓDIGO COMPLETO

### Paso 1: Setup
- package.json
- tsconfig.json
- .env.example
- src/config/*.ts

### Paso 2: Core
- src/app.ts (Express setup)
- src/middleware/*.ts
- src/types/index.ts
- src/utils/*.ts

### Paso 3: Autenticación
- JWT generation/verification
- Password hashing
- Auth service y controller
- Auth routes y validators

### Paso 4: Entidades CRUD
Para cada entidad en spec:
- Service (create, findAll, findById, update, delete)
- Controller
- Routes
- Validators (Zod)
- Prisma schema

### Paso 5: Testing
- Jest config
- Tests unitarios
- Tests integración
- 80%+ coverage

## ESTÁNDARES OBLIGATORIOS

✓ TypeScript strict
✓ Error handling centralizado
✓ Logging estructura
✓ Validación en todos los endpoints
✓ Formato respuesta consistente
✓ Tests verdes
✓ No secrets en código
✓ Comments en funciones complejas

Genera todo ahora.
````

---

### 2.2 - GENERAR DOCUMENTACIÓN AUTOMATIZADA

**Con Claude Code:**

````markdown
# GENERAR DOCUMENTACIÓN

## Tarea: Crear OpenAPI/Swagger

Genera:

1. swagger.json (OpenAPI 3.0 schema)
2. swagger.yaml (alternativa)
3. README.md con:
   - Setup instructions
   - Ejemplo de cada endpoint con cURL
   - Ambiente variables requeridas

## Documentación debe incluir:

Para cada endpoint:

- Método + Path
- Descripción
- Query/Body parameters
- Response ejemplos
- Errores posibles
- Código cURL

Ejemplo:

```bash
# Crear cliente
curl -X POST https://api.tudominio.com/v1/clientes \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "email": "juan@example.com",
    "empresa": "TechCorp"
  }'
```
````

Genera swagger.json automaticamente desde el código.

````

---

## ✅ FASE 3: TESTING (Días 8-9)

### Objetivo
Validar todos los endpoints, validaciones y errores.

### 3.1 - TESTING CHECKLIST

```markdown
# API TESTING CHECKLIST

## Endpoints Happy Path
- [ ] POST /auth/register → 201 Created
- [ ] POST /auth/login → 200 OK con token
- [ ] POST /auth/refresh → 200 OK nuevo token
- [ ] POST /auth/logout → 204 No Content
- [ ] GET /entidades → 200 OK lista
- [ ] POST /entidades → 201 Created
- [ ] GET /entidades/:id → 200 OK
- [ ] PATCH /entidades/:id → 200 OK
- [ ] DELETE /entidades/:id → 200 OK

## Validaciones
- [ ] Email inválido → 400
- [ ] Password débil → 400
- [ ] Campo requerido faltante → 400
- [ ] Formato número incorrecto → 400

## Autenticación
- [ ] Sin token → 401
- [ ] Token expirado → 401
- [ ] Token inválido → 401
- [ ] Refresh token expirado → 401

## Autorización
- [ ] User no puede editar de otro → 403
- [ ] User no puede eliminar → 403
- [ ] Admin puede todo → 200

## Paginación
- [ ] Limit por defecto: 10
- [ ] Limit máximo: 100
- [ ] Page 1 retorna primeros 10
- [ ] Página fuera de rango → array vacío

## Búsqueda
- [ ] ?search=juan → filtra por nombre
- [ ] ?estado=activo → filtra por estado
- [ ] Combinaciones múltiples funcionan

## Ordenamiento
- [ ] ?sort=nombre:asc → ascendente
- [ ] ?sort=nombre:desc → descendente
- [ ] ?sort=createdAt:asc → por fecha

## Rate Limiting
- [ ] 100 requests/min → OK
- [ ] 101 requests/min → 429
- [ ] X-RateLimit-* headers presentes

## Errores
- [ ] 404: recurso no existe
- [ ] 409: email duplicado
- [ ] 500: error servidor no revela detalles

## Performance
- [ ] GET /entidades (10 items): < 100ms
- [ ] POST /entidades: < 200ms
- [ ] Listado grande (1000 items): < 500ms

## Seguridad
- [ ] Password no retorna en respuestas
- [ ] SQL injection no funciona
- [ ] XSS no funciona
- [ ] CORS correctamente configurado
````

---

### 3.2 - LOAD TESTING (Opcional)

```bash
# Instalar k6
brew install k6

# Crear test
cat > load-test.js << 'EOF'
import http from 'k6/http'
import { check } from 'k6'

export let options = {
  vus: 10,      // 10 usuarios virtuales
  duration: '30s'
}

export default function() {
  let res = http.get('http://localhost:3001/v1/clientes')
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  })
}
EOF

# Ejecutar
k6 run load-test.js
```

---

## 🚀 FASE 4: DEPLOYMENT (Día 10)

### 4.1 - DOCKER

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app

# Dependencias
COPY package*.json ./
RUN npm ci --only=production

# Código
COPY . .

# Build TypeScript
RUN npm run build

# Ejecutar
EXPOSE 3001
CMD ["node", "dist/app.js"]
```

### 4.2 - DOCKER COMPOSE (Desarrollo)

```yaml
version: "3.8"
services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/api
      JWT_SECRET: dev-secret
      NODE_ENV: development
    depends_on:
      - db
    volumes:
      - .:/app

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: api
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 4.3 - ENV PRODUCTION

```env
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://[user]:[pass]@[host]:5432/[dbname]
JWT_SECRET=[generado-aleatorio-seguro]
JWT_REFRESH_SECRET=[generado-aleatorio-seguro]
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d
PORT=3001
SENDGRID_API_KEY=[key]
LOG_LEVEL=info
RATE_LIMIT=100
CORS_ORIGIN=https://tu-app.com
```

### 4.4 - DEPLOY CHECKLIST

```markdown
# PRE-DEPLOY CHECKLIST

## Código

- [ ] npm run build sin errores
- [ ] npm run test - cobertura 80%+
- [ ] npm run lint - sin warnings
- [ ] No console.logs en prod
- [ ] Todas las variables ENV configuradas

## Base de datos

- [ ] Migrations aplicadas
- [ ] Backup automático configurado
- [ ] Índices en place
- [ ] Connection pooling OK

## Seguridad

- [ ] Secrets en .env (no en código)
- [ ] HTTPS/SSL activo
- [ ] CORS whitelist configurado
- [ ] Rate limiting activo
- [ ] Audit logging

## Infraestructura

- [ ] Servidor (AWS/GCP/Heroku)
- [ ] Dominio DNS apuntando
- [ ] Load balancer (si aplica)
- [ ] Monitoreo (Sentry/DataDog)

## Testing Final

- [ ] Smoke tests en prod
- [ ] Endpoints responden
- [ ] BD conecta
- [ ] Email funciona
```

---

## 📋 CHECKLIST FINAL API REST

```markdown
# API REST - CHECKLIST FINAL

## ESPECIFICACIÓN ✓

- [ ] API_SPEC.md completado
- [ ] Todos los endpoints documentados
- [ ] Validaciones definidas
- [ ] Códigos de error claros
- [ ] Formato respuesta consistente

## CÓDIGO ✓

- [ ] Estructura carpetas limpia
- [ ] TypeScript strict
- [ ] Error handling centralizado
- [ ] Logging estructurado
- [ ] Código comentado

## TESTING ✓

- [ ] Coverage 80%+
- [ ] Tests unitarios verdes
- [ ] Tests integración verdes
- [ ] Happy path probado
- [ ] Errores validados

## DOCUMENTACIÓN ✓

- [ ] README.md completo
- [ ] OpenAPI/Swagger generado
- [ ] Ejemplos cURL para cada endpoint
- [ ] Instrucciones setup
- [ ] Variables ENV documentadas

## SEGURIDAD ✓

- [ ] Autenticación JWT funcionando
- [ ] Rate limiting active
- [ ] Validaciones en inputs
- [ ] Passwords encriptados
- [ ] SQL injection prevención

## PERFORMANCE ✓

- [ ] Respuestas < 200ms
- [ ] Paginación en listas
- [ ] Índices BD creados
- [ ] Caching si necesario
- [ ] Load testing pasado

## DEPLOYMENT ✓

- [ ] Docker image buildea
- [ ] ENV variables configuradas
- [ ] DB migrations ready
- [ ] Servidor live
- [ ] Monitoreo activo

## POST-LAUNCH ✓

- [ ] Logs monitoreando
- [ ] Errores alertando
- [ ] Performance monitoreando
- [ ] Usuarios pueden acceder
- [ ] Documentación pública
```

---

**Reutiliza este template para cada API. Cambia solo los endpoints según tu especificación.**
