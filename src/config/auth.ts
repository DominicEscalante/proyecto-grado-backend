import { verifyPassword } from 'better-auth/crypto';
import { authorizeBackup } from '../services/backup-authorization.js';
import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { deleteSessionCookie } from 'better-auth/cookies';
import { passkey } from '@better-auth/passkey';
import { pool } from './db.js';
import { env } from './env.js';
import { registrarAuditoria } from '../services/audit.service.js';

const frontendUrl = new URL(env.CORS_ORIGIN);
const passkeySignInPath = '/passkey/verify-authentication';

export const auth = betterAuth({
  database: pool,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [frontendUrl.origin],
  disabledPaths: ['/sign-up/email', '/sign-in/email', '/update-user'],

  plugins: [
    bearer(),
    passkey({
      rpID: frontendUrl.hostname,
      rpName: 'AMPAR',
      origin: frontendUrl.origin,
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      registration: {
        afterVerification: async ({ ctx, user }) => {
          const result = await pool.query<{ rol_id: number; cambio_password_pendiente: boolean; password: string | null; enrolled: boolean }>(
            `SELECT u.rol_id, u.cambio_password_pendiente, a.password,
                    EXISTS (SELECT 1 FROM passkey p WHERE p."userId" = u.id) AS enrolled
             FROM usuarios u LEFT JOIN account a ON a."userId" = u.id AND a."providerId" = 'credential'
             WHERE u.id = $1`, [user.id]
          );
          const account = result.rows[0];
          if (account?.cambio_password_pendiente) {
            throw new APIError('FORBIDDEN', { message: 'Cambia tu contraseña temporal primero.' });
          }
          if (account?.rol_id !== 4) return;
          const password = ctx.headers?.get('x-ampar-enrollment-password');
          if (account.enrolled || !password || !account.password ||
              !await verifyPassword({ hash: account.password, password })) {
            throw new APIError('FORBIDDEN', { message: 'No se pudo autorizar el registro de la clave de acceso.' });
          }
        },
      },
      authentication: {
        afterVerification: async ({ verification }) => {
          if (!verification.authenticationInfo.userVerified) {
            throw new APIError('UNAUTHORIZED', { message: 'Confirma tu identidad en el dispositivo.' });
          }
        },
      },
    }),
  ],

  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: { ...user, cambio_password_pendiente: user.rol_id === 2 || user.rol_id === 3 },
        }),
      },
    },
    session: {
      create: {
        before: async (session, context) => {
          if (context?.path !== passkeySignInPath) return;
          const result = await pool.query<{ estado_cuenta: boolean }>(
            'SELECT estado_cuenta FROM usuarios WHERE id = $1',
            [session.userId]
          );
          if (!result.rows[0]?.estado_cuenta) {
            throw new APIError('FORBIDDEN', { message: 'La cuenta está inactiva.' });
          }
        },
      },
    },
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== passkeySignInPath || !ctx.context.newSession) return;
      const { user, session } = ctx.context.newSession;
      try {
        await registrarAuditoria({
          accion: 'INICIO_SESION',
          modulo: 'AUTH',
          usuarioId: user.id,
          ipOrigen: session.ipAddress ?? undefined,
          sessionToken: session.token,
          detalles: { metodo: 'PASSKEY' },
        });
        if (ctx.headers?.get('x-ampar-backup') === '1') authorizeBackup(session.token, user.id);
      } catch {
        deleteSessionCookie(ctx);
        throw new APIError('SERVICE_UNAVAILABLE', { message: 'No se pudo completar el inicio de sesión.' });
      }
    }),
  },

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
      cambio_password_pendiente: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
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
      enabled: false,
      maxAge: 5 * 60,             // Cache de cookie por 5 minutos para optimizar lecturas
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 15,
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
