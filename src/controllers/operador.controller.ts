import { Request, Response, NextFunction } from 'express';
import { operadorService } from '../services/operador.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError } from '../utils/error.util.js';

export const operadorController = {
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

  /**
   * PATCH /api/operador/reportes/:ticket/estado
   * Actualiza el estado operativo de un reporte desde la consola.
   */
  async actualizarEstado(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { ticket } = req.params;
      const { estado } = req.body;
      const operadorId = req.user?.id;

      if (!operadorId) {
        throw new AppError('Operador no autenticado.', 401, 'UNAUTHORIZED');
      }

      if (!estado) {
        throw new AppError('El estado es obligatorio.', 400, 'BAD_REQUEST');
      }

      const rol = req.user?.rol_id;
      const institucionOperador = rol === 2 ? 'POLICIA' : rol === 3 ? 'BOMBEROS' : undefined;
      const actualizado = await operadorService.actualizarEstado(ticket, estado, operadorId, institucionOperador);

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
