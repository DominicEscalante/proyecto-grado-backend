import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../config/auth.js';
import { sendError } from '../utils/response.util.js';

/**
 * Middleware para exigir sesión activa mediante Better Auth.
 * Inyecta `req.user` y `req.session` para los siguientes controladores.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
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
