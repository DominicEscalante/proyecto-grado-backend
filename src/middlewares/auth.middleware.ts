import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../config/auth.js';
import { sendError } from '../utils/response.util.js';

const requireActiveSession = (allowPendingPassword: boolean) => async (
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

    if (sessionData.user.cambio_password_pendiente && !allowPendingPassword) {
      return sendError(res, 'Cambia tu contraseña temporal primero.', 403, 'PASSWORD_CHANGE_REQUIRED');
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

export const requireAuth = requireActiveSession(false);
export const requirePasswordSetupSession = requireActiveSession(true);

export const requireVerifiedSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const current = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
      query: { disableCookieCache: true },
    });
    if (!current?.user) {
      sendError(res, 'Se requiere una sesión activa.', 401, 'UNAUTHORIZED');
      return;
    }
    if (!current.user.estado_cuenta) {
      sendError(res, 'Cuenta inactiva o suspendida.', 403, 'ACCOUNT_DISABLED');
      return;
    }
    req.user = current.user;
    req.session = current.session;
    next();
  } catch (error) {
    next(error);
  }
};
