import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { sendSuccess, sendError } from './utils/response.util.js';
import authRoutes from './routes/auth.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Application = express();

// Global Middlewares
app.use(
  cors({
    origin: env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Authentication Routes (Better Auth)
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const dbRes = await pool.query(`
      SELECT 
        NOW() AS current_time, 
        current_database() AS database_name,
        postgis_version() AS postgis_version
    `);
    const row = dbRes.rows[0];

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

export default app;
