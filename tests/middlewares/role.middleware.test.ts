import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireRoles, ROLES } from '../../src/middlewares/role.middleware.js';

describe('Role Middleware (RBAC)', () => {
  const createMockContext = (user?: any) => {
    const req = { user } as Request;
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    const next = vi.fn() as NextFunction;
    return { req, res, next };
  };

  it('debe rechazar con HTTP 401 si no hay usuario autenticado en la petición', () => {
    const { req, res, next } = createMockContext(undefined);
    const middleware = requireRoles(ROLES.ADMINISTRADOR);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('debe rechazar con HTTP 403 si el rol del usuario no está en los permitidos', () => {
    const { req, res, next } = createMockContext({
      id: 'usr-1',
      name: 'Ciudadano 1',
      rol_id: ROLES.CIUDADANO,
    });
    // Ruta exclusiva para operadores policiales o administradores
    const middleware = requireRoles(ROLES.OPERADOR_POLICIA, ROLES.ADMINISTRADOR);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('debe permitir el acceso y llamar a next() si el rol del usuario coincide con uno de los permitidos', () => {
    const { req, res, next } = createMockContext({
      id: 'usr-2',
      name: 'Operador Policial',
      rol_id: ROLES.OPERADOR_POLICIA,
    });
    const middleware = requireRoles(ROLES.OPERADOR_POLICIA, ROLES.ADMINISTRADOR);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('debe permitir el acceso si el rol del usuario es de Bomberos cuando está en la lista permitida', () => {
    const { req, res, next } = createMockContext({
      id: 'usr-3',
      name: 'Operador Bomberos',
      rol_id: ROLES.OPERADOR_BOMBEROS,
    });
    const middleware = requireRoles(ROLES.OPERADOR_BOMBEROS);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
