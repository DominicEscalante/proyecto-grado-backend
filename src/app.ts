import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import { sendSuccess, sendError } from './utils/response.util.js';
import authRoutes from './routes/auth.routes.js';
import ciudadanoRoutes from './routes/ciudadano.routes.js';
import adminRoutes from './routes/admin.routes.js';
import operadorRoutes from './routes/operador.routes.js';
import { requireAuth } from './middlewares/auth.middleware.js';
import { requireRoles, ROLES } from './middlewares/role.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './config/auth.js';


const app: Application = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'same-origin');
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || origin === env.CORS_ORIGIN) {
        return callback(null, true);
      }
      return callback(null, env.CORS_ORIGIN);
    },
    credentials: true,
  })
);

app.all('/api/auth/passkey/*', toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

app.use('/api/auth', authRoutes);

app.use(
  '/api/ciudadano',
  requireAuth,
  requireRoles(ROLES.CIUDADANO),
  ciudadanoRoutes
);

app.use(
  '/api/admin',
  requireAuth,
  requireRoles(ROLES.ADMINISTRADOR),
  adminRoutes
);

app.use(
  '/api/operador',
  requireAuth,
  requireRoles(ROLES.OPERADOR_POLICIA, ROLES.OPERADOR_BOMBEROS, ROLES.ADMINISTRADOR),
  operadorRoutes
);


app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const dbRes = await db.execute(
      sql`SELECT NOW() AS current_time, current_database() AS database_name, postgis_version() AS postgis_version`
    );
    const row = dbRes.rows[0] as Record<string, unknown>;

    return sendSuccess(
      res,
      {
        status: 'online',
        environment: env.NODE_ENV,
        database: {
          connected: true,
          name: row.database_name,
          postgis: row.postgis_version,
          serverTime: row.current_time,
        },
        timestamp: new Date().toISOString(),
      },
      'Servicio y base de datos PostgreSQL/PostGIS operativos'
    );
  } catch (error: any) {
    return sendError(
      res,
      'Fallo en la conexión con la base de datos PostgreSQL',
      503,
      'DATABASE_UNAVAILABLE',
      {
        message: error.message,
      }
    );
  }
});

app.use(errorHandler);

export default app;

