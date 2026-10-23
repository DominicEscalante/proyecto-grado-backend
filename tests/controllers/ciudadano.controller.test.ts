import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ciudadanoController } from '../../src/controllers/ciudadano.controller.js';
import { ciudadanoService } from '../../src/services/ciudadano.service.js';

vi.mock('../../src/services/ciudadano.service.js', () => ({
  ciudadanoService: {
    obtenerCatalogoEmergencias: vi.fn(),
    crearReporte: vi.fn(),
    adjuntarEvidencias: vi.fn(),
    listarMisReportes: vi.fn(),
    obtenerDetalleReporte: vi.fn(),
  },
}));

describe('Ciudadano Controller - Capa HTTP', () => {
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
      user: {
        id: 'usr-ciudadano-1',
        name: 'Juan Perez',
        email: 'juan@ejemplo.com',
        rol_id: 1,
        estado_cuenta: true,
      } as any,
      query: {},
      params: {},
      body: {},
      ip: '192.168.1.100',
    };
  });

  describe('obtenerCatalogoEmergencias', () => {
    it('debe responder 200 con el catalogo de emergencias', async () => {
      req.query = { institucion: 'POLICIA' };
      const mockCatalogo = [{ tipoEmergenciaId: 1, nombre: 'Robo' } as any];
      vi.mocked(ciudadanoService.obtenerCatalogoEmergencias).mockResolvedValueOnce(mockCatalogo);

      await ciudadanoController.obtenerCatalogoEmergencias(req as Request, res as Response, next);

      expect(ciudadanoService.obtenerCatalogoEmergencias).toHaveBeenCalledWith('POLICIA');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockCatalogo,
        })
      );
    });

    it('debe delegar el error a next() si el servicio falla', async () => {
      const error = new Error('Fallo de BD');
      vi.mocked(ciudadanoService.obtenerCatalogoEmergencias).mockRejectedValueOnce(error);

      await ciudadanoController.obtenerCatalogoEmergencias(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('crearReporte', () => {
    it('debe responder 201 cuando el reporte es creado satisfactoriamente', async () => {
      req.body = {
        institucion_destino: 'POLICIA',
        tipo_emergencia_id: 1,
        descripcion: 'Colision vehicular',
        latitud: -16.5,
        longitud: -68.1,
        referencia_direccion: 'Calle 10',
      };

      const mockNuevoReporte = {
        codigoTicket: 'TKT-2026-000001',
        reporteId: 10,
      } as any;
      vi.mocked(ciudadanoService.crearReporte).mockResolvedValueOnce(mockNuevoReporte);

      await ciudadanoController.crearReporte(req as Request, res as Response, next);

      expect(ciudadanoService.crearReporte).toHaveBeenCalledWith(
        'usr-ciudadano-1',
        req.body,
        '192.168.1.100'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockNuevoReporte,
        })
      );
    });

    it('debe delegar a next() si el servicio lanza excepcion', async () => {
      const error = new Error('Validacion fallida');
      vi.mocked(ciudadanoService.crearReporte).mockRejectedValueOnce(error);

      await ciudadanoController.crearReporte(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('debe utilizar usr-dev-ciudadano si req.user no esta presente en entorno de desarrollo', async () => {
      req.user = undefined;
      req.body = {
        institucion_destino: 'POLICIA',
        tipo_emergencia_id: 1,
        descripcion: 'Colision vehicular sin sesion activa',
        latitud: -16.5,
        longitud: -68.1,
        referencia_direccion: 'Calle 10',
      };

      const mockNuevoReporte = {
        codigoTicket: 'TKT-2026-000002',
        reporteId: 11,
      } as any;
      vi.mocked(ciudadanoService.crearReporte).mockResolvedValueOnce(mockNuevoReporte);

      await ciudadanoController.crearReporte(req as Request, res as Response, next);

      expect(ciudadanoService.crearReporte).toHaveBeenCalledWith(
        'usr-dev-ciudadano',
        req.body,
        '192.168.1.100'
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('adjuntarEvidencias', () => {
    it('debe responder 201 con las evidencias adjuntadas', async () => {
      req.params = { ticket: 'TKT-2026-000001' };
      req.files = [
        {
          filename: 'foto1.jpg',
          mimetype: 'image/jpeg',
        } as Express.Multer.File,
      ];

      const mockAdjuntos = [{ adjuntoId: 1, urlArchivo: '/uploads/foto1.jpg' } as any];
      vi.mocked(ciudadanoService.adjuntarEvidencias).mockResolvedValueOnce(mockAdjuntos);

      await ciudadanoController.adjuntarEvidencias(req as Request, res as Response, next);

      expect(ciudadanoService.adjuntarEvidencias).toHaveBeenCalledWith(
        'TKT-2026-000001',
        'usr-ciudadano-1',
        req.files,
        '192.168.1.100'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockAdjuntos,
        })
      );
    });
  });

  describe('listarMisReportes', () => {
    it('debe responder 200 con la lista de reportes del ciudadano', async () => {
      req.query = { limite: '10', pagina: '1' };
      const mockResultado = {
        items: [],
        total: 0,
        pagina: 1,
        limite: 10,
        totalPaginas: 1,
      };
      vi.mocked(ciudadanoService.listarMisReportes).mockResolvedValueOnce(mockResultado);

      await ciudadanoController.listarMisReportes(req as Request, res as Response, next);

      expect(ciudadanoService.listarMisReportes).toHaveBeenCalledWith('usr-ciudadano-1', req.query);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResultado,
        })
      );
    });
  });

  describe('obtenerDetalleReporte', () => {
    it('debe responder 200 con el detalle del reporte', async () => {
      req.params = { ticket: 'TKT-2026-000001' };
      const mockDetalle = {
        codigoTicket: 'TKT-2026-000001',
        descripcion: 'Detalle',
      } as any;
      vi.mocked(ciudadanoService.obtenerDetalleReporte).mockResolvedValueOnce(mockDetalle);

      await ciudadanoController.obtenerDetalleReporte(req as Request, res as Response, next);

      expect(ciudadanoService.obtenerDetalleReporte).toHaveBeenCalledWith(
        'TKT-2026-000001',
        'usr-ciudadano-1'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockDetalle,
        })
      );
    });
  });
});
