import app from "./src/app.js";
import { env } from "./src/config/env.js";
import { testDbConnection, closeDbConnection } from "./src/config/db.js";

const PORT = env.PORT;

const startServer = async () => {
  // Probar la conexión a la base de datos PostgreSQL / PostGIS en Docker
  const isDbConnected = await testDbConnection();
  if (!isDbConnected) {
    console.warn(
      "[Warning] El servidor iniciará, pero no se pudo conectar a la base de datos PostgreSQL.",
    );
  }

  const server = app.listen(PORT, () => {
    console.log(`[Server] Escuchando en http://localhost:${PORT}`);
    console.log(`[Server] Entorno: ${env.NODE_ENV}`);
    console.log(`[Server] Healthcheck: http://localhost:${PORT}/api/health`);
  });

  const gracefulShutdown = async (signal: string) => {
    console.log(
      `\n[Server] Señal ${signal} recibida. Cerrando servidor de forma ordenada...`,
    );
    server.close(async () => {
      console.log("[Server] Servidor HTTP cerrado.");
      await closeDbConnection();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
};

startServer();
