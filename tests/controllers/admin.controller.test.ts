import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { adminController } from '../../src/controllers/admin.controller.js';
import { adminService } from '../../src/services/admin.service.js';

vi.mock('../../src/services/admin.service.js', () => ({
  adminService: {
    listarUsuarios: vi.fn(),
    obtenerUsuarioPorId: vi.fn(),
    crearOperador: vi.fn(),
    editarUsuario: vi.fn(),
    cambiarEstadoUsuario: vi.fn(),
  },
}));

describe('Admin Controller - Capa HTTP (HU-16)', () => {
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
      query: {},
      params: {},
      body: {},
      ip: '127.0.0.1',
      user: { id: 'admin-1', rol_id: 4 } as any,
    };
  });

  describe('listarUsuarios', () => {
    it('debe responder 200 con la lista de usuarios y metadatos de paginacion', async () => {
      req.query = { rol_id: '1', limite: '20', pagina: '1' };

      const mockResultado = {
        items: [
          {
            id: 'usr-dev-ciudadano',
            name: 'Juan Perez',
            email: 'ciudadano@test.com',
          } as any,
        ],
        total: 1,
        pagina: 1,
        limite: 20,
        totalPaginas: 1,
      };

      vi.mocked(adminService.listarUsuarios).mockResolvedValueOnce(mockResultado);

      await adminController.listarUsuarios(req as Request, res as Response, next);

      expect(adminService.listarUsuarios).toHaveBeenCalledWith(req.query);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResultado,
        })
      );
    });

    it('debe delegar a next() si el servicio lanza error', async () => {
      const error = new Error('Fallo en base de datos');
      vi.mocked(adminService.listarUsuarios).mockRejectedValueOnce(error);

      await adminController.listarUsuarios(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('obtenerUsuarioPorId', () => {
    it('debe responder 200 con el detalle del usuario', async () => {
      req.params = { id: 'usr-dev-ciudadano' };
      const mockUsuario = {
        id: 'usr-dev-ciudadano',
        name: 'Juan Perez',
      } as any;

      vi.mocked(adminService.obtenerUsuarioPorId).mockResolvedValueOnce(mockUsuario);

      await adminController.obtenerUsuarioPorId(req as Request, res as Response, next);

      expect(adminService.obtenerUsuarioPorId).toHaveBeenCalledWith('usr-dev-ciudadano');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockUsuario,
        })
      );
    });
  });

  describe('crearOperador', () => {
    it('debe responder 201 al registrar exitosamente un nuevo operador', async () => {
      req.body = {
        email: 'policia@test.com',
        ci: '7788990',
        nombres: 'Marco',
        apellidos: 'Ruiz',
        telefono: '76543210',
        institucion: 'POLICIA',
        rango: 'Sargento',
        rol_id: 2,
      };

      const mockOperador = { id: 'usr-op-1', ...req.body };
      vi.mocked(adminService.crearOperador).mockResolvedValueOnce(mockOperador as any);

      await adminController.crearOperador(req as Request, res as Response, next);

      expect(adminService.crearOperador).toHaveBeenCalledWith('admin-1', req.body, '127.0.0.1');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockOperador,
        })
      );
    });

    it('debe retornar 401 si el administrador no esta autenticado al crear operador', async () => {
      req.user = undefined;
      await adminController.crearOperador(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'UNAUTHORIZED',
        })
      );
    });
  });

  describe('editarUsuario', () => {
    it('debe responder 200 al actualizar un usuario', async () => {
      req.params = { id: 'usr-op-1' };
      req.body = { rango: 'Subteniente' };

      const mockActualizado = { id: 'usr-op-1', rango: 'Subteniente' };
      vi.mocked(adminService.editarUsuario).mockResolvedValueOnce(mockActualizado as any);

      await adminController.editarUsuario(req as Request, res as Response, next);

      expect(adminService.editarUsuario).toHaveBeenCalledWith('admin-1', 'usr-op-1', req.body, '127.0.0.1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockActualizado,
        })
      );
    });

    it('debe retornar 401 si el administrador no esta autenticado al editar usuario', async () => {
      req.user = undefined;
      await adminController.editarUsuario(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'UNAUTHORIZED',
        })
      );
    });
  });

  describe('cambiarEstadoUsuario', () => {
    it('debe responder 200 con mensaje de desactivacion al suspender la cuenta', async () => {
      req.params = { id: 'usr-op-1' };
      req.body = { estado_cuenta: false, motivo: 'Reporte falso reiterado' };

      const mockActualizado = { id: 'usr-op-1', estadoCuenta: false };
      vi.mocked(adminService.cambiarEstadoUsuario).mockResolvedValueOnce(mockActualizado as any);

      await adminController.cambiarEstadoUsuario(req as Request, res as Response, next);

      expect(adminService.cambiarEstadoUsuario).toHaveBeenCalledWith(
        'admin-1',
        'usr-op-1',
        false,
        'Reporte falso reiterado',
        '127.0.0.1'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Cuenta de usuario desactivada exitosamente.',
          data: mockActualizado,
        })
      );
    });

    it('debe responder 200 con mensaje de reactivacion al habilitar la cuenta', async () => {
      req.params = { id: 'usr-op-1' };
      req.body = { estado_cuenta: true, motivo: 'Reactivacion aprobada' };

      const mockActualizado = { id: 'usr-op-1', estadoCuenta: true };
      vi.mocked(adminService.cambiarEstadoUsuario).mockResolvedValueOnce(mockActualizado as any);

      await adminController.cambiarEstadoUsuario(req as Request, res as Response, next);

      expect(adminService.cambiarEstadoUsuario).toHaveBeenCalledWith(
        'admin-1',
        'usr-op-1',
        true,
        'Reactivacion aprobada',
        '127.0.0.1'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Cuenta de usuario reactivada exitosamente.',
          data: mockActualizado,
        })
      );
    });

    it('debe retornar 401 si el administrador no esta autenticado al cambiar estado', async () => {
      req.user = undefined;
      await adminController.cambiarEstadoUsuario(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'UNAUTHORIZED',
        })
      );
    });
  });
});
