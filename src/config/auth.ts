import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { pool } from './db.js';
import { env } from './env.js';

/**
 * Instancia de Better Auth configurada para el sistema de seguridad y autenticación.
 * Conectada al pool de PostgreSQL y mapeada a la tabla `usuarios` y entidades del dominio.
 */
export const auth = betterAuth({
  database: pool,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  plugins: [
    bearer(),
  ],

  user: {
    modelName: 'usuarios',
    fields: {
      emailVerified: 'email_verified',
    },
    additionalFields: {
      ci: {
        type: 'string',
        required: true,
      },
      complemento: {
        type: 'string',
        required: false,
      },
      nombres: {
        type: 'string',
        required: true,
      },
      apellidos: {
        type: 'string',
        required: true,
      },
      telefono: {
        type: 'string',
        required: true,
      },
      institucion: {
        type: 'string',
        required: false,
      },
      rango: {
        type: 'string',
        required: false,
      },
      identidad_verificada: {
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      estado_cuenta: {
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      rol_id: {
        type: 'number',
        required: true,
        defaultValue: 1, // Por defecto Rol 1: CIUDADANO
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días de duración de sesión
    updateAge: 60 * 60 * 24,      // Refresco cada 24 horas
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,             // Cache de cookie por 5 minutos para optimizar lecturas
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },

  advanced: {
    useSecureCookies: env.NODE_ENV === 'production',
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
