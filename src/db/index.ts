import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from '../config/db.js';
import * as schema from './schema/index.js';

/**
 * Instancia principal de Drizzle ORM conectada al pool de PostgreSQL.
 * Incluye todo el schema relacional para soportar las consultas con `db.query`.
 */
export const db = drizzle(pool, { schema });

export type Database = typeof db;
export * from './schema/index.js';
