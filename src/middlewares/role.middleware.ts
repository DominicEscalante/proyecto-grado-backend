import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.util.js';

export const ROLES = {
  CIUDADANO: 1,
  OPERADOR_POLICIA: 2,
  OPERADOR_BOMBEROS: 3,
  ADMINISTRADOR: 4,
} as const;

export type RolId = (typeof ROLES)[keyof typeof ROLES];

/**
 * Middleware para autorización basada en roles (RBAC).
 * Verifica si el rol del usuario autenticado coincide con los permitidos.
 */
export const requireRoles = (...allowedRoles: RolId[]) => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return sendError(res, 'No autenticado.', 401, 'UNAUTHORIZED');
    }

    const userRoleId = req.user.rol_id;

    if (!allowedRoles.includes(userRoleId as RolId)) {
      return sendError(
        res,
        'Acceso denegado. No cuenta con los permisos necesarios para este recurso.',
        403,
        'FORBIDDEN'
      );
    }

    return next();
  };
};
