import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default("postgres"),
  DB_PASSWORD: z.string().default("postgres"),
  DB_NAME: z.string().default("proyecto_grado_db"),
  DB_SSL: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .default(false),

  BETTER_AUTH_SECRET: z
    .string()
    .min(16, "BETTER_AUTH_SECRET debe tener al menos 16 caracteres")
    .default("supersecretbetterauthkey_change_in_production_32chars"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),

  UPLOAD_DIR: z.string().default("uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error(
    "Configuración inválida de variables de entorno:",
    _env.error.format(),
  );
  process.exit(1);
}

export const env = _env.data;
export type Env = z.infer<typeof envSchema>;
