import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'proyecto_grado_db',
    ssl: process.env.DB_SSL === 'true',
  },
  verbose: true,
  strict: true,
});
