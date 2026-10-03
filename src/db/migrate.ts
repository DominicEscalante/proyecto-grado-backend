import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index.js";
import { pool } from "../config/db.js";

/**
 * Script para ejecutar las migraciones versionadas de Drizzle ORM sobre PostgreSQL / PostGIS
 */
const run = async () => {
  try {
    console.log("Ejecutando migraciones de Drizzle en PostgreSQL/PostGIS...");
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("Migraciones aplicadas exitosamente a la base de datos.");
  } catch (error) {
    console.error("Error ejecutando las migraciones:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();
