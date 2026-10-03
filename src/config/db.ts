import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err: Error) => {
  console.error(
    "[Database Pool Error]: Ocurrió un error inesperado en un cliente inactivo:",
    err,
  );
});

/**
 * Verifica la conectividad con la base de datos PostgreSQL y la extensión PostGIS.
 */
export const testDbConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT 
          NOW() AS current_time, 
          current_database() AS database_name,
          postgis_version() AS postgis_version
      `);
      const row = res.rows[0];
      console.log(
        "[Database] Conexión establecida exitosamente con PostgreSQL y PostGIS:",
      );
      console.log(
        `   - Base de datos: ${row.database_name} (${env.DB_HOST}:${env.DB_PORT})`,
      );
      console.log(`   - Versión PostGIS: ${row.postgis_version}`);
      console.log(`   - Hora en BD (UTC): ${row.current_time}`);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(
      "[Database] Fallo en la conexión a PostgreSQL / PostGIS:",
      error,
    );
    return false;
  }
};

/**
 * Cierra ordenadamente el pool de conexiones (Graceful Shutdown).
 */
export const closeDbConnection = async (): Promise<void> => {
  try {
    await pool.end();
    console.log(
      "[Database] Pool de conexiones a PostgreSQL cerrado correctamente.",
    );
  } catch (error) {
    console.error("[Database] Error cerrando el pool de conexiones:", error);
  }
};
