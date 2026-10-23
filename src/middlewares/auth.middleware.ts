import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../config/auth.js';
import { sendError } from '../utils/response.util.js';
import { env } from '../config/env.js';

/**
 * Middleware para exigir sesion activa mediante Better Auth.
 * Inyecta `req.user` y `req.session` para los siguientes controladores.
 * En modo desarrollo permite encabezados de depuracion (x-dev-user-id / x-user-id) para Postman.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Soporte para pruebas en desarrollo o Postman sin necesidad de generar token de sesion
    const devUserId = (req.headers['x-dev-user-id'] || req.headers['x-user-id']) as string | undefined;
    if (env.NODE_ENV !== 'production' && devUserId) {
      req.user = {
        id: devUserId,
        name: 'Usuario Dev Postman',
        email: 'ciudadano@test.com',
        ci: '1234567',
        nombres: 'Juan',
        apellidos: 'Perez',
        telefono: '70011223',
        identidad_verificada: true,
        rol_id: Number(req.headers['x-dev-rol-id'] || 1),
        estado_cuenta: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return next();
    }

    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!sessionData || !sessionData.user) {
      return sendError(res, 'No autorizado. Se requiere sesión activa.', 401, 'UNAUTHORIZED');
    }

    if (!sessionData.user.estado_cuenta) {
      return sendError(res, 'Cuenta inactiva o suspendida. Contacte al administrador.', 403, 'ACCOUNT_DISABLED');
    }

    req.user = sessionData.user;
    req.session = sessionData.session;

    return next();
  } catch (error: any) {
    return sendError(res, 'Error verificando la sesión de autenticación.', 500, 'AUTH_ERROR', {
      details: error.message,
    });
  }
};
