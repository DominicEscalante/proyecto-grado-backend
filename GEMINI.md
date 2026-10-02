# Reglas y Estándares de Desarrollo para el Backend

Este proyecto sigue una arquitectura estricta por capas (**N-Tier Layered Architecture**) en **TypeScript** sobre Node.js / Express con autenticación mediante **Better Auth**, persistencia espacial en **PostgreSQL con PostGIS**, y orquestación con **Docker y Docker Compose**.

## 1. Arquitectura y Separación de Responsabilidades

Todo nuevo desarrollo o modificación de código debe respetar los límites de cada capa:

1. **`src/routes/` (`*.routes.ts`)**: Únicamente define endpoints HTTP, aplica middlewares (validación con esquemas Zod, auth de sesión con Better Auth, roles RBAC) y conecta con el controlador. Sin lógica de negocio ni consultas a BD.
2. **`src/controllers/` (`*.controller.ts`)**: Maneja la interacción HTTP (`req`, `res`, `next`), extrae y tipa los inputs validados (`req.params`, `req.query`, `req.body`, `req.user`, `req.session`), llama al servicio correspondiente y devuelve respuestas JSON uniformes (`ApiResponse<T>`).
3. **`src/services/` (`*.service.ts`)**: Contiene la lógica de negocio pura, reglas de validación de dominio, cálculos geoespaciales (límite municipal de La Paz), generación correlativa de tickets, orquestación de auditoría inmutable (`audit.service.ts`) y procesamiento multimedia. No accede a objetos de transporte (`req`, `res`). Invoca métodos de `repositories`.
4. **`src/repositories/` (`*.repository.ts`)**: Acceso directo a datos mediante consultas SQL parametrizadas a PostgreSQL/PostGIS.
   - **Inserción/Actualización geom**: `ST_SetSRID(ST_MakePoint($longitud, $latitud), 4326)`.
   - **Lectura geom**: `ST_X(geom) AS longitud, ST_Y(geom) AS latitud, ST_AsGeoJSON(geom) AS geojson`.
   - **Analítica y Proximidad**: Índices GiST (`ST_DWithin`, `ST_ClusterKMeans`, `ST_Distance`).
5. **`src/middlewares/` (`*.middleware.ts`)**:
   - `auth.middleware.ts`: Sesión activa vía Better Auth (`auth.api.getSession({ headers })`) inyectando `req.user` y `req.session`.
   - `role.middleware.ts`: Control de roles RBAC basado en `req.user.rol_id` (CIUDADANO, OPERADOR_POLICIA, OPERADOR_BOMBEROS, ADMIN).
   - `validate.middleware.ts`: Validación de esquemas Zod en `req.body`, `req.query`, `req.params`.
   - `upload.middleware.ts`: Subida y validación con Multer.
   - `error.middleware.ts`: Manejador global de excepciones con respuesta estándar `ApiResponse`.
6. **`src/schemas/` (`*.schema.ts`)**: Esquemas de validación runtime en Zod (ej. `reporte.schema.ts`, `auth.schema.ts`).
7. **`src/types/` (`*.types.ts` / `*.d.ts`)**: DTOs, tipos inferidos de Zod (`z.infer`), interfaces de entidades y extensiones de Express (`Express.Request`).
8. **`src/utils/` (`*.util.ts`)**: Funciones auxiliares puras y formateador de respuesta `response.util.ts`.
9. **`src/config/` (`*.ts`)**: Pool de conexiones (`pg.Pool`), instancia de Better Auth (`auth.ts`), variables de entorno tipadas (`env.ts`).

## 2. Convenciones de Código y TypeScript

- **TypeScript Estricto**: Tipar explícitamente parámetros, DTOs y retornos. Evitar el tipo `any`.
- **Módulos ESM**: Usar `import` / `export` de ECMAScript Modules.
- **Consultas Seguras**: Todas las consultas SQL en repositorios deben ser parametrizadas (`$1`, `$2`) para prevenir inyecciones SQL.
- **Manejo de Errores**: Propagar errores desde los servicios/repositorios y capturarlos en controladores o el middleware centralizado de errores.

## 3. Infraestructura y Docker

- **Contenedorización**: `Dockerfile` multi-stage y `docker-compose.yml`.
- **Base de Datos**: PostgreSQL con PostGIS (`postgis/postgis:16-3.4`).
- **Inicialización de BD**: Scripts en `init-db/01-init.sql` (extensiones `postgis`, `postgis_topology`, `uuid-ossp`, tablas de Better Auth e índices GiST).

Consulta la skill `.agents/skills/backend-architecture/SKILL.md` para ver la guía completa de patrones y ejemplos.
