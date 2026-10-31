import { Request, Response, NextFunction } from 'express';
import { operadorService } from '../services/operador.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError } from '../utils/error.util.js';

export const operadorController = {
  async obtenerDireccion(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const rol = req.user?.rol_id;
      const institucionOperador = rol === 2 ? 'POLICIA' : rol === 3 ? 'BOMBEROS' : undefined;
      const resultado = await operadorService.obtenerDireccion(req.params.ticket, institucionOperador);
      return sendSuccess(res, resultado, 'Dirección obtenida.');
    } catch (error) {
      return next(error);
    }
  },
  /**
   * GET /api/operador/reportes
   * Retorna los reportes e incidentes para la consola de monitoreo institucional.
   */
  async listarReportes(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { institucion: filtroSolicitado, estado } = req.query as {
        institucion?: string;
        estado?: string;
      };
      const rol = req.user?.rol_id;
      const institucionOperador = rol === 2 ? 'POLICIA' : rol === 3 ? 'BOMBEROS' : undefined;
      const institucion = institucionOperador || filtroSolicitado;

      const resultado = await operadorService.listarReportes(institucion, estado);

      return sendSuccess(
        res,
        resultado,
        'Reportes institucionales obtenidos exitosamente.'
      );
    } catch (error) {
      return next(error);
    }
  },

  async listarHistorial(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const pagina = Number(req.query.pagina ?? 1);
      const orden = req.query.orden ?? 'recientes';
      if (!Number.isInteger(pagina) || pagina < 1 || !['recientes', 'antiguos'].includes(String(orden))) {
        throw new AppError('Parámetros de historial no válidos.', 400, 'INVALID_HISTORY_QUERY');
      }
      const rol = req.user?.rol_id;
      const institucion = rol === 2 ? 'POLICIA' : rol === 3 ? 'BOMBEROS' : undefined;
      const resultado = await operadorService.listarHistorial(institucion, pagina, orden as 'recientes' | 'antiguos');
      return sendSuccess(res, resultado, 'Historial de incidentes obtenido exitosamente.');
    } catch (error) {
      return next(error);
    }
  },

  /**
   * PATCH /api/operador/reportes/:ticket/estado
   * Actualiza el estado operativo de un reporte desde la consola.
   */
  async actualizarEstado(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { ticket } = req.params;
      const { estado, estadoEsperado } = req.body;
      const operadorId = req.user?.id;

      if (!operadorId) {
        throw new AppError('Operador no autenticado.', 401, 'UNAUTHORIZED');
      }

      if (!estado || !estadoEsperado) {
        throw new AppError('El estado nuevo y el estado esperado son obligatorios.', 400, 'BAD_REQUEST');
      }

      const rol = req.user?.rol_id;
      const institucionOperador = rol === 2 ? 'POLICIA' : rol === 3 ? 'BOMBEROS' : undefined;
      const actualizado = await operadorService.actualizarEstado(ticket, estado, estadoEsperado, operadorId, institucionOperador, req.ip);

      return sendSuccess(
        res,
        actualizado,
        `Estado del reporte ${ticket} actualizado a ${estado}.`
      );
    } catch (error) {
      return next(error);
    }
  },
};
