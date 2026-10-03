import { describe, it, expect, vi } from 'vitest';
import { Response } from 'express';
import { sendSuccess, sendError } from '../../src/utils/response.util.js';

describe('Response Util (ApiResponse)', () => {
  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  describe('sendSuccess', () => {
    it('debe estructurar una respuesta exitosa por defecto con HTTP 200', () => {
      const res = mockResponse();
      const data = { id: 1, ticket: 'TKT-001' };

      sendSuccess(res, data, 'Operación exitosa');

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        message: 'Operación exitosa',
      });
    });

    it('debe permitir códigos de estado personalizados como 201 Created', () => {
      const res = mockResponse();
      sendSuccess(res, { creado: true }, 'Reporte creado', 201);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { creado: true },
        message: 'Reporte creado',
      });
    });

    it('debe omitir el campo data si no se provee', () => {
      const res = mockResponse();
      sendSuccess(res, undefined, 'Acción sin contenido');

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Acción sin contenido',
      });
    });
  });

  describe('sendError', () => {
    it('debe estructurar un error por defecto con HTTP 500', () => {
      const res = mockResponse();
      sendError(res, 'Error inesperado del servidor');

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Error inesperado del servidor',
        },
      });
    });

    it('debe incluir código de error y detalles estructurados si se proveen', () => {
      const res = mockResponse();
      sendError(
        res,
        'Credenciales inválidas',
        401,
        'INVALID_CREDENTIALS',
        { attemptsLeft: 2 }
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS',
          details: { attemptsLeft: 2 },
        },
      });
    });
  });
});
