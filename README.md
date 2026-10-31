# AMPAR — API y servicios de backend

API REST del proyecto académico AMPAR, una plataforma de reporte ciudadano y coordinación de respuestas a emergencias en La Paz, Bolivia. Este servicio administra autenticación, reportes georreferenciados, usuarios, atención institucional y metadatos de evidencias multimedia.

## Contenido

- [Responsabilidades](#responsabilidades)
- [Tecnologías](#tecnologías)
- [Requisitos](#requisitos)
- [Puesta en marcha local](#puesta-en-marcha-local)
- [Configuración](#configuración)
- [Datos de demostración](#datos-de-demostración)
- [API](#api)
- [Almacenamiento multimedia](#almacenamiento-multimedia)
- [Comandos](#comandos)
- [Despliegue](#despliegue)

## Responsabilidades

- Autenticar ciudadanos, operadores y administradores mediante Better Auth.
- Registrar reportes y ubicaciones geográficas en PostgreSQL/PostGIS.
- Exponer catálogos de emergencias, seguimiento de reportes y operaciones administrativas.
- Recibir imágenes y videos y asociar sus URLs al reporte.
- Proveer reportes sintéticos para demostraciones y pruebas de interfaz.

## Tecnologías

- Node.js 20, TypeScript y Express.
- PostgreSQL 16 con PostGIS.
- Drizzle ORM y migraciones versionadas.
- Better Auth para autenticación.
- Supabase Storage opcional para archivos multimedia; almacenamiento local disponible durante desarrollo.
- Resend opcional para enviar códigos de verificación por correo.

## Requisitos

- Node.js 20 o superior y npm.
- Docker Desktop y Docker Compose, o una instancia PostgreSQL compatible con PostGIS.
- Git.

## Puesta en marcha local

Desde la carpeta de este repositorio:

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env`:

   ```bash
   cp .env.example .env
   ```

   En Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Inicia PostgreSQL/PostGIS con Docker Compose:

   ```bash
   docker compose up -d db
   ```

   El puerto local predeterminado es `5432`. Si está ocupado, cambia `DB_PORT` en `.env`; ese valor también configura el puerto publicado por Compose.

4. Aplica las migraciones:

   ```bash
   npm run db:migrate
   ```

5. Para crear los roles, tipos de emergencia y cuentas locales de demostración, ejecuta:

   ```bash
   npm run db:seed
   ```

   La seed inicial modifica cuentas de prueba existentes. Úsala solo en bases locales o de demostración, nunca en una base con datos reales.

6. Inicia la API:

   ```bash
   npm run dev
   ```

Este comando reinicia la API al guardar cualquier archivo TypeScript de `src/`, `server.ts` o `.env`. Si ya tenías `npm run dev` abierto antes de actualizar el proyecto, detén ese proceso y vuelve a ejecutarlo para aplicar la nueva configuración.

La API queda en <http://localhost:3000>. Verifica la conexión a PostgreSQL/PostGIS en <http://localhost:3000/api/health>.

Para ejecutar la API y la base de datos dentro de Compose, usa `docker compose up --build`. Esa configuración usa el volumen local `uploads_data`; consulta [Almacenamiento multimedia](#almacenamiento-multimedia) para conectar Supabase en un entorno de despliegue.

Para desarrollar ambos proyectos con reinicio automático al guardar, coloca los repositorios `proyecto-grado-backend` y `proyecto-grado-frontend` como carpetas hermanas y ejecuta desde este repositorio:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

El frontend queda en <http://localhost:5173> y la API en <http://localhost:3000>. Vite actualiza el navegador al cambiar el frontend y `tsx watch` reinicia la API al cambiar el backend. Sin Docker, ejecuta `npm run dev` en cada repositorio para obtener el mismo comportamiento.

## Configuración

`.env.example` documenta las variables y valores locales predeterminados. Variables principales:

| Variable | Uso | Valor local predeterminado |
| --- | --- | --- |
| `PORT` | Puerto HTTP de la API | `3000` |
| `CORS_ORIGIN` | Origen permitido para el frontend | `http://localhost:5173` |
| `DB_HOST`, `DB_PORT` | Host y puerto de PostgreSQL | `localhost`, `5432` |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Credenciales y nombre de la base | `postgres`, `postgres`, `proyecto_grado_db` |
| `DB_SSL` | Habilita SSL en la conexión PostgreSQL | `false` |
| `BETTER_AUTH_SECRET` | Secreto de sesión/autenticación | Valor de desarrollo en `.env.example` |
| `BETTER_AUTH_URL` | URL pública de la API usada por Better Auth | `http://localhost:3000` |
| `UPLOAD_DIR` | Carpeta local para evidencias | `uploads` |
| `MAX_FILE_SIZE_MB` | Tamaño máximo por archivo | `10` |
| `GEOCODER_URL` | URL base del servicio Photon para obtener una dirección aproximada a partir del GPS | `https://photon.komoot.io` |
| `SUPABASE_URL` | URL del proyecto Supabase | Sin definir |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta del backend (`sb_secret_…` o `service_role`) | Sin definir |
| `SUPABASE_STORAGE_BUCKET` | Bucket de evidencias | `evidencias-reportes` |
| `RESEND_API_KEY` | Envío de códigos OTP por correo | Sin definir; en desarrollo se registra en consola |

Reemplaza los secretos de desarrollo y configura los orígenes correctos antes de desplegar. No subas `.env` ni claves al repositorio.

Al crear un reporte con GPS, el backend consulta Photon una vez para guardar una dirección aproximada. Si el proveedor no responde, conserva el reporte con «Dirección no disponible»; las coordenadas siguen almacenadas para el mapa. Las referencias antiguas se resuelven al abrir el detalle institucional. Para un despliegue con alto tráfico, configura `GEOCODER_URL` con una instancia propia o un proveedor compatible con la API de Photon.

## Datos de demostración

### Usuarios y catálogo

`npm run db:seed` crea o sincroniza roles, tipos de emergencia y cuentas de demostración. La contraseña compartida por esas cuentas es `Pa$$w0rd`; úsala únicamente en un entorno local de prueba.

### Reportes sintéticos diarios

Después de cargar la seed inicial, ejecuta:

```bash
npm run db:seed:reports
```

Inserta 40 reportes sintéticos del día de La Paz: cuatro concentraciones geográficas de siete reportes y doce casos dispersos. Las ubicaciones, instituciones, tipos y estados se generan de forma pseudoaleatoria según la fecha. No se crean ni suben archivos multimedia.

Los tickets usan el prefijo `SIM-YYYYMMDD-`. Volver a ejecutarla el mismo día no duplica reportes; al día siguiente produce otro conjunto. La seed es aditiva y no borra reportes previos. Los ciudadanos y tipos de emergencia deben existir previamente.

## API

Todas las respuestas de la API usan el formato común de éxito o error del backend. Las rutas de ciudadano, operador y administración requieren autenticación y el rol correspondiente.

| Prefijo o ruta | Acceso | Descripción |
| --- | --- | --- |
| `GET /api/health` | Público | Estado de la API, PostgreSQL y PostGIS |
| `/api/auth/*` | Según endpoint | Registro, inicio/cierre de sesión y verificación de identidad |
| `/api/ciudadano/*` | Ciudadano | Catálogo, creación, adjuntos y seguimiento de reportes |
| `/api/operador/*` | Policía, Bomberos o administrador | Consulta y actualización de incidentes |
| `/api/admin/*` | Administrador | Gestión de usuarios y operadores |

Rutas principales de reportes:

- `GET /api/ciudadano/reportes/coincidencias?institucion_destino=POLICIA&tipo_emergencia_id=1&latitud=...&longitud=...` consulta un incidente activo del mismo tipo e institución a menos de 100 m y con reportes de las últimas 2 horas.
- `GET /api/ciudadano/emergencias`
- `POST /api/ciudadano/reportes`
- `POST /api/ciudadano/reportes/:ticket/adjuntos`
- `GET /api/ciudadano/reportes`
- `GET /api/ciudadano/reportes/:ticket`
- `GET /api/operador/reportes`
- `PATCH /api/operador/reportes/:ticket/estado`

El ciudadano puede enviar `incidente_principal_id` al crear un reporte si confirma que corresponde a un incidente cercano. El servidor vuelve a validar la coincidencia y conserva un ticket y evidencias independientes. La respuesta de operador agrupa los tickets confirmados en `reportesVinculados` y `cantidadReportes`; al cambiar el estado de cualquiera de ellos se actualiza todo el grupo.

## Almacenamiento multimedia

Si `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` están definidos, el backend guarda evidencias en el bucket `evidencias-reportes` (o el indicado por `SUPABASE_STORAGE_BUCKET`) y registra sus URLs en PostgreSQL. Si faltan las credenciales, usa `UPLOAD_DIR`.

Para Supabase:

1. Crea el bucket `evidencias-reportes` en Storage y habilítalo como público para que el panel institucional pueda cargar sus URLs.
2. Configura `SUPABASE_URL` y una clave secreta del proyecto en el entorno del backend. La clave nunca debe exponerse al navegador ni guardarse en una variable `VITE_*`.
3. Configura las mismas variables en el proveedor donde se ejecute la API y reinicia el servicio.

Las URLs públicas permiten ver el archivo a quien las conozca. Usa evidencias sintéticas o de demostración en el proyecto académico. El límite de carga configurado actualmente es 10 MB por archivo y se admiten imágenes y videos definidos por el middleware de carga.

## Comandos

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Ejecuta la API en modo desarrollo con recarga |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Inicia la compilación de producción |
| `npm run db:migrate` | Aplica migraciones de Drizzle |
| `npm run db:seed` | Carga roles, catálogo y usuarios de demostración |
| `npm run db:seed:reports` | Carga reportes sintéticos diarios |
| `npm test` | Ejecuta las pruebas automatizadas con Vitest |
| `npm run db:studio` | Abre Drizzle Studio |

## Despliegue

Despliega la API en un servicio Node.js o contenedor que mantenga el proceso activo y permita conexiones salientes a PostgreSQL/PostGIS. Configura las variables de [Configuración](#configuración), establece `NODE_ENV=production`, utiliza un `BETTER_AUTH_SECRET` aleatorio y restringe `CORS_ORIGIN` al dominio del frontend.

Si se usan archivos locales, el directorio `UPLOAD_DIR` debe estar en almacenamiento persistente. En plataformas con disco efímero, configura Supabase Storage. El proveedor de base de datos debe habilitar PostGIS.
