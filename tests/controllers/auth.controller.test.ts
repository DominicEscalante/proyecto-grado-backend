import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authController } from '../../src/controllers/auth.controller.js';
import { authService } from '../../src/services/auth.service.js';

vi.mock('../../src/services/auth.service.js', () => ({
  authService: {
    registroCiudadano: vi.fn(),
    login: vi.fn(),
    solicitarVerificacionIdentidad: vi.fn(),
    confirmarVerificacionIdentidad: vi.fn(),
  },
}));

describe('Auth Controller - HU-01, HU-02, HU-03', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    req = {
      body: {},
      ip: '127.0.0.1',
    };
  });

  describe('registroCiudadano (HU-01)', () => {
    it('debe responder 201 con los datos del usuario registrado', async () => {
      req.body = {
        email: 'nuevo@test.com',
        password: 'Password123',
        ci: '12345678',
        nombres: 'Roberto',
        apellidos: 'Gomez',
        telefono: '71234567',
      };

      const mockResultado = {
        user: { id: 'usr-1', email: 'nuevo@test.com' },
        token: 'token-abc',
      };
      vi.mocked(authService.registroCiudadano).mockResolvedValueOnce(mockResultado as any);

      await authController.registroCiudadano(req as Request, res as Response, next);

      expect(authService.registroCiudadano).toHaveBeenCalledWith(req.body, '127.0.0.1');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResultado,
        })
      );
    });

    it('debe propagar errores a next() si el servicio falla', async () => {
      const error = new Error('Email duplicado');
      vi.mocked(authService.registroCiudadano).mockRejectedValueOnce(error);

      await authController.registroCiudadano(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('login (HU-02)', () => {
    it('debe responder 200 con sesion y usuario autenticado', async () => {
      req.body = {
        identificador: '70011223',
        password: 'Password123',
      };

      const mockResultado = {
        user: { id: 'usr-1', email: 'usuario@test.com' },
        session: { id: 'sess-1' },
      };
      vi.mocked(authService.login).mockResolvedValueOnce(mockResultado as any);

      await authController.login(req as Request, res as Response, next);

      expect(authService.login).toHaveBeenCalledWith(req.body, '127.0.0.1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResultado,
        })
      );
    });

    it('debe propagar error a next() si el servicio lanza excepcion', async () => {
      req.body = {
        identificador: 'usuario@test.com',
        password: 'bad-password',
      };
      const error = new Error('Credenciales invalidas');
      vi.mocked(authService.login).mockRejectedValueOnce(error);

      await authController.login(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('solicitarVerificacionIdentidad (HU-03)', () => {
    it('debe emitir codigo y responder 200 cuando el usuario esta autenticado', async () => {
      req.user = { id: 'usr-ciud' } as any;

      const mockResultado = {
        mensaje: 'Codigo de verificacion emitido exitosamente.',
        expiraEn: new Date(),
        codigoSimulado: '123456',
      };
      vi.mocked(authService.solicitarVerificacionIdentidad).mockResolvedValueOnce(mockResultado);

      await authController.solicitarVerificacionIdentidad(req as Request, res as Response, next);

      expect(authService.solicitarVerificacionIdentidad).toHaveBeenCalledWith('usr-ciud', '127.0.0.1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResultado,
        })
      );
    });

    it('debe retornar 401 si req.user no existe', async () => {
      req.user = undefined;

      await authController.solicitarVerificacionIdentidad(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'UNAUTHORIZED',
        })
      );
    });
  });

  describe('confirmarVerificacionIdentidad (HU-03)', () => {
    it('debe confirmar identidad y responder 200', async () => {
      req.user = { id: 'usr-ciud' } as any;
      req.body = { codigo: '654321' };

      const mockUsuario = { id: 'usr-ciud', identidadVerificada: true };
      vi.mocked(authService.confirmarVerificacionIdentidad).mockResolvedValueOnce(mockUsuario as any);

      await authController.confirmarVerificacionIdentidad(req as Request, res as Response, next);

      expect(authService.confirmarVerificacionIdentidad).toHaveBeenCalledWith(
        'usr-ciud',
        '654321',
        '127.0.0.1'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockUsuario,
        })
      );
    });

    it('debe retornar 401 si req.user no existe al confirmar verificacion', async () => {
      req.user = undefined;
      req.body = { codigo: '654321' };

      await authController.confirmarVerificacionIdentidad(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'UNAUTHORIZED',
        })
      );
    });

    it('debe propagar errores a next() si el servicio falla en confirmar verificacion', async () => {
      req.user = { id: 'usr-ciud' } as any;
      req.body = { codigo: '654321' };
      const error = new Error('Codigo invalido');
      vi.mocked(authService.confirmarVerificacionIdentidad).mockRejectedValueOnce(error);

      await authController.confirmarVerificacionIdentidad(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
