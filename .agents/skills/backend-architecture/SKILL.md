---
name: backend-architecture
description: Directrices, reglas de diseño y estándares para la arquitectura por capas del backend en TypeScript (Express, Node.js, Better Auth, PostgreSQL/PostGIS, N-Tier Layered Architecture).
---

# Guía y Estándares de Arquitectura Backend (TypeScript)

Esta skill define la arquitectura por capas (N-Tier Layered Architecture) y las directrices obligatorias para todo desarrollo en el backend de este proyecto utilizando **TypeScript** y **Node.js (Express)** con autenticación vía **Better Auth**, persistencia espacial con **PostgreSQL / PostGIS** y contenedorización sobre **Docker**.

---

## 1. Estructura de Directorios

La estructura de carpetas y capas del backend se organiza bajo la siguiente jerarquía:

```
├── init-db/                     # Scripts SQL de inicialización para PostgreSQL / PostGIS en Docker
│   └── 01-init.sql
├── uploads/                     # Almacenamiento local temporal de archivos multimedia
│   └── .gitkeep
├── src/
│   ├── config/                  # Configuraciones globales (DB Pool, Better Auth instance, env vars)
│   ├── middlewares/             # Interceptores HTTP (Better Auth session, Roles RBAC, Multer, Validation, Errors)
│   ├── routes/                  # Definición de rutas y endpoints de la API REST
│   ├── controllers/             # Manejo de Request y Response HTTP
│   ├── services/                # Lógica de negocio pura, cálculo espacial y orquestación
│   ├── repositories/            # Capa de acceso a datos (Consultas SQL nativas y funciones espaciales PostGIS)
│   ├── schemas/                 # Esquemas de validación runtime (Zod / DTO validators)
│   ├── types/                   # Tipos e interfaces de TypeScript (DTOs, Entidades de Dominio, Enums)
│   ├── utils/                   # Utilidades puras reutilizables (formateadores, respuestas API)
│   └── app.ts                   # Configuración del servidor Express, CORS y middlewares globales
├── .agents/
│   └── skills/                  # Skills locales de Antigravity
├── .dockerignore                # Archivos excluidos del build de Docker
├── .env                         # Variables de entorno locales
├── .env.example                 # Plantilla de variables de entorno requeridas
├── .gitignore                   # Archivos y carpetas excluidas de Git
├── docker-compose.yml           # Orquestación de servicios (API backend + DB PostgreSQL/PostGIS)
├── Dockerfile                   # Empaquetado y contenedorización multi-stage
├── GEMINI.md                    # Reglas de proyecto para agentes de IA
├── package.json                 # Configuración de dependencias y scripts ("type": "module")
├── tsconfig.json                # Configuración del compilador TypeScript
└── server.ts                    # Punto de entrada y arranque del servidor (Listen)
```

---

## 2. Convenciones de Nomenclatura de Archivos

Cada archivo debe crearse en su carpeta correspondiente utilizando sufijos explícitos en TypeScript:

- **Rutas**: `src/routes/<recurso>.routes.ts` (ej: `auth.routes.ts`, `reportes.routes.ts`, `index.ts`)
- **Controladores**: `src/controllers/<recurso>.controller.ts` (ej: `reportes.controller.ts`, `analytics.controller.ts`)
- **Servicios**: `src/services/<recurso>.service.ts` (ej: `reportes.service.ts`, `geo.service.ts`, `audit.service.ts`)
- **Repositorios**: `src/repositories/<recurso>.repository.ts` (ej: `usuario.repository.ts`, `reporte.repository.ts`)
- **Middlewares**: `src/middlewares/<nombre>.middleware.ts` (ej: `auth.middleware.ts`, `role.middleware.ts`, `error.middleware.ts`, `validate.middleware.ts`)
- **Esquemas de Validación**: `src/schemas/<recurso>.schema.ts` (ej: `reporte.schema.ts`, `auth.schema.ts`)
- **Tipos / DTOs**: `src/types/<recurso>.types.ts` (ej: `reporte.types.ts`, `auth.types.ts`)
- **Utilidades**: `src/utils/<nombre>.util.ts` (ej: `response.util.ts`, `ticket.util.ts`)
- **Configuración**: `src/config/<nombre>.config.ts` o `src/config/<nombre>.ts` (ej: `db.ts`, `auth.ts`, `env.ts`)

---

## 3. Responsabilidades y Límites de Cada Capa

### 1. `src/routes/`
- Registra endpoints HTTP (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`).
- Aplica los middlewares requeridos: validación de esquemas Zod, autenticación de sesión con Better Auth, autorización RBAC y subida de archivos (Multer).
- Asocia cada ruta con su método de controlador correspondiente.
- **Regla**: No debe contener lógica de negocio, validaciones complejas ni consultas a la base de datos.

### 2. `src/controllers/`
- Recibe las peticiones HTTP tipadas (`Request`, `Response`, `NextFunction` de express).
- Extrae parámetros validados (`req.params`, `req.query`, `req.body`, `req.user`, `req.session`).
- Invoca a los métodos del `service` correspondiente pasando tipos fuertemente definidos (DTOs).
- Retorna respuestas JSON estandarizadas usando la interfaz `ApiResponse<T>` y códigos de estado HTTP apropiados (`200`, `201`, `400`, `401`, `403`, `404`, `500`).
- Envía errores no controlados a `next(error)` para que el middleware global los capture.
- **Regla**: Prohibido ejecutar consultas SQL directamente en los controladores. Prohibido manipular la base de datos sin pasar por `services` y `repositories`.

### 3. `src/services/`
- Implementa la lógica de negocio pura, reglas de validación de dominio, cálculos y orquestación.
- Maneja transacciones y flujos complejos:
  - Generación unívoca de códigos correlativos de ticket de incidentes.
  - Validación de coordenadas dentro de los límites del municipio de La Paz.
  - Orquestación del servicio de auditoría inmutable (`audit.service.ts`) para registrar cambios de estado y acciones críticas.
  - Procesamiento asíncrono o vinculación de evidencias multimedia.
- Invoca los métodos de los repositorios (`repositories`) para persistencia o consulta.
- Lanza excepciones o errores descriptivos de dominio cuando una regla de negocio no se cumple.
- **Regla**: No debe tener acceso a objetos HTTP (`req`, `res`, `next`). Debe ser completamente agnóstico al protocolo de transporte.

### 4. `src/repositories/`
- Capa de acceso a datos (DAL).
- Ejecuta consultas SQL nativas contra PostgreSQL / PostGIS utilizando pools de conexión (`pg.Pool`) y consultas parametrizadas (`$1`, `$2`, etc.) para prevenir inyecciones SQL.
- **Estándar PostGIS obligatorio**:
  - **Inserción y Actualización de Geometrías**: Siempre construir el punto espacial con funciones nativas SRID 4326:
    ```sql
    ST_SetSRID(ST_MakePoint($longitud, $latitud), 4326)
    ```
  - **Lectura de Coordenadas**: Extraer explícitamente las coordenadas numéricas o formato estándar:
    ```sql
    ST_X(geom) AS longitud, ST_Y(geom) AS latitud, ST_AsGeoJSON(geom) AS geojson
    ```
  - **Consultas Espaciales y Analítica**: Utilizar indexación GiST (`ST_DWithin`, `ST_ClusterKMeans`, `ST_Distance`) para optimizar proximidad y mapas de calor.
- Devuelve interfaces y tipos tipados de TypeScript correspondientes a las entidades de dominio.
- **Regla**: No debe contener lógica de negocio ni manipulación de respuestas HTTP.

### 5. `src/middlewares/`
- Intercepta el ciclo de vida de la petición antes de llegar al controlador:
  - `auth.middleware.ts`: Valida la sesión activa utilizando la instancia de Better Auth (`auth.api.getSession({ headers })`) y adjunta el usuario y sesión a `req.user` y `req.session`.
  - `role.middleware.ts`: Verifica permisos y roles (RBAC) basándose en `req.user.rol_id` (ej. `CIUDADANO`, `OPERADOR_POLICIA`, `OPERADOR_BOMBEROS`, `ADMIN`).
  - `validate.middleware.ts`: Middleware de orden superior que recibe un esquema de Zod y valida `req.body`, `req.query` o `req.params`. Si falla, retorna HTTP 400 con los detalles del error estructurados.
  - `upload.middleware.ts`: Configura Multer para carga de archivos, validando tamaño máximo y tipos MIME (`image/jpeg`, `image/png`, `video/mp4`).
  - `error.middleware.ts`: Captura cualquier excepción no controlada y genera una respuesta homogénea de error HTTP con formato estándar `ApiResponse`.

### 6. `src/config/`
- `env.ts`: Centraliza y valida variables de entorno mediante un esquema Zod o comprobación estricta de `process.env`.
- `db.ts`: Inicializa y exporta el pool de conexiones `pg.Pool` para PostgreSQL / PostGIS con gestión de errores y cierre limpio (*graceful shutdown*).
- `auth.ts`: Configura e inicializa la instancia de Better Auth, conectada al pool de PostgreSQL para gestionar las tablas `account`, `session`, `passkey` y `verification`, habilitando el plugin WebAuthn / Passkeys.

### 7. `src/types/` y `src/schemas/`
- `src/schemas/`: Define esquemas de validación runtime con Zod (ej. `createReportSchema`, `updateReportStatusSchema`).
- `src/types/`: Infiere y centraliza tipos derivados de Zod (`z.infer<typeof ...>`), interfaces de entidades de la base de datos y extensiones del namespace de Express (`Express.Request` con `user` y `session`).

### 8. `src/utils/`
- Funciones puras y reutilizables en cualquier capa.
- `response.util.ts`: Formateador unificado de respuestas JSON tipadas:
  ```typescript
  export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
      message: string;
      code?: string;
      details?: unknown;
    };
  }
  ```

---

## 4. Infraestructura de Contenedores (Docker & PostGIS)

1. **PostgreSQL con PostGIS**:
   - Imagen Docker: `postgis/postgis:16-3.4`.
   - Inicialización automática en `init-db/01-init.sql`:
     - Habilita extensiones espaciales y utilitarias:
       ```sql
       CREATE EXTENSION IF NOT EXISTS postgis;
       CREATE EXTENSION IF NOT EXISTS postgis_topology;
       CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
       ```
     - Crea las tablas normalizadas con claves foráneas, índices GiST en columnas `geom` y tablas requeridas por Better Auth.
2. **Levantamiento con Docker Compose**:
   - Comando: `docker compose up --build -d`.
   - El servicio backend cuenta con `depends_on` con condición `condition: service_healthy` respecto a la base de datos antes de iniciar.
