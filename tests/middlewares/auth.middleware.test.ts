import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../src/middlewares/auth.middleware.js';
import { auth } from '../../src/config/auth.js';

// Mock de Better Auth
vi.mock('../../src/config/auth.js', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

describe('Auth Middleware (requireAuth)', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      headers: {
        authorization: 'Bearer token-de-prueba',
      },
    } as unknown as Request;

    res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    next = vi.fn() as NextFunction;
  });

  it('debe rechazar con HTTP 401 si no existe sesión válida o el token expiró', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null as any);

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('debe rechazar con HTTP 403 si la cuenta del usuario está desactivada (estado_cuenta === false)', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: {
        id: 'usr-bloqueado',
        name: 'Usuario Bloqueado',
        estado_cuenta: false,
      },
      session: {
        id: 'sess-1',
        token: 'token-1',
      },
    } as any);

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'ACCOUNT_DISABLED' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('debe adjuntar req.user y req.session y llamar a next() si la sesión es válida y la cuenta está activa', async () => {
    const mockUser = {
      id: 'usr-activo',
      name: 'Subtte. Carlos',
      estado_cuenta: true,
      rol_id: 2,
    };
    const mockSession = {
      id: 'sess-activa',
      token: 'token-activo',
    };

    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: mockUser,
      session: mockSession,
    } as any);

    await requireAuth(req, res, next);

    expect(req.user).toEqual(mockUser);
    expect(req.session).toEqual(mockSession);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('debe responder con HTTP 500 si ocurre una excepción inesperada durante la validación', async () => {
    vi.mocked(auth.api.getSession).mockRejectedValueOnce(new Error('Fallo de conexión en BD'));

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'AUTH_ERROR' }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
