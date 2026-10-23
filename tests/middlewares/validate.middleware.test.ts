import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../src/middlewares/validate.middleware.js';
import {
  crearReporteSchema,
  ticketParamSchema,
  misReportesQuerySchema,
} from '../../src/schemas/reporte.schema.js';

describe('Validate Middleware - Zod Validation', () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  describe('validateBody con crearReporteSchema', () => {
    it('debe avanzar con next() cuando el payload es valido', async () => {
      const middleware = validateBody(crearReporteSchema);
      const req = {
        body: {
          institucion_destino: 'POLICIA',
          tipo_emergencia_id: 1,
          descripcion: 'Accidente de transito en cruce concurrido con vehiculos involucrados.',
          latitud: -16.4957,
          longitud: -68.1335,
          referencia_direccion: 'Av. 16 de Julio frente a correos',
        },
      } as Request;
      const res = mockResponse();
      const next: NextFunction = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('debe retornar 400 cuando faltan campos requeridos o son invalidos', async () => {
      const middleware = validateBody(crearReporteSchema);
      const req = {
        body: {
          institucion_destino: 'HOSPITAL', // Invalido: solo POLICIA o BOMBEROS
          descripcion: 'ab', // Invalido: menor a 5 caracteres
        },
      } as Request;
      const res = mockResponse();
      const next: NextFunction = vi.fn();

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });
  });

  describe('validateParams con ticketParamSchema', () => {
    it('debe aceptar codigos de ticket validos con formato TKT-YYYY-NNNNNN', async () => {
      const middleware = validateParams(ticketParamSchema);
      const req = {
        params: { ticket: 'TKT-2026-000001' },
      } as unknown as Request;
      const res = mockResponse();
      const next: NextFunction = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('debe rechazar codigos de ticket con formato no conforme', async () => {
      const middleware = validateParams(ticketParamSchema);
      const req = {
        params: { ticket: 'TKT-INVALIDO-99' },
      } as unknown as Request;
      const res = mockResponse();
      const next: NextFunction = vi.fn();

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateQuery con misReportesQuerySchema', () => {
    it('debe aplicar valores por defecto cuando no se envian parametros en query', async () => {
      const middleware = validateQuery(misReportesQuerySchema);
      const req = {
        query: {},
      } as unknown as Request;
      const res = mockResponse();
      const next: NextFunction = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.query).toMatchObject({
        estado: 'TODOS',
        institucion: 'TODOS',
        limite: 20,
        pagina: 1,
      });
    });
  });

  describe('validateQuery con listarUsuariosQuerySchema', () => {
    it('debe validar y aplicar defaults para consulta de usuarios en panel admin', async () => {
      const { listarUsuariosQuerySchema } = await import('../../src/schemas/usuario.schema.js');
      const middleware = validateQuery(listarUsuariosQuerySchema);
      const req = {
        query: {
          busqueda: 'Carlos',
          rol_id: '2',
        },
      } as unknown as Request;
      const res = mockResponse();
      const next: NextFunction = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.query).toMatchObject({
        busqueda: 'Carlos',
        rol_id: 2,
        institucion: 'TODOS',
        estado_cuenta: 'TODOS',
        limite: 20,
        pagina: 1,
      });
    });
  });
});

