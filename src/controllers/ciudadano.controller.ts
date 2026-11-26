import { Request, Response, NextFunction } from 'express';
import { ciudadanoService } from '../services/ciudadano.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError } from '../utils/error.util.js';
import { env } from '../config/env.js';
import {
  CrearReporteDTO,
  MisReportesQueryDTO,
} from '../types/reporte.types.js';

const extraerCiudadanoId = (req: Request): string => {
  if (req.user?.id) {
    return req.user.id;
  }
  const headerId = req.headers?.['x-user-id'] || req.headers?.['x-dev-user-id'];
  if (typeof headerId === 'string' && headerId.trim()) {
    return headerId.trim();
  }
  if (env.NODE_ENV !== 'production') {
    return 'usr-dev-ciudadano';
  }
  throw new AppError('Usuario no autenticado.', 401, 'UNAUTHORIZED');
};

export const ciudadanoController = {
  async buscarCoincidencia(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const resultado = await ciudadanoService.buscarCoincidencia(req.query as unknown as {
        institucion_destino: string; tipo_emergencia_id: number; latitud: number; longitud: number;
      });
      return sendSuccess(res, resultado, 'Coincidencia consultada.');
    } catch (error) {
      return next(error);
    }
  },
  async obtenerCatalogoEmergencias(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const institucion = req.query.institucion as string | undefined;
      const catalogo = await ciudadanoService.obtenerCatalogoEmergencias(institucion);

      return sendSuccess(
        res,
        catalogo,
        'Catálogo de emergencias obtenido exitosamente.'
      );
    } catch (error) {
      return next(error);
    }
  },

  async crearReporte(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const ciudadanoId = extraerCiudadanoId(req);
      const dto = req.body as CrearReporteDTO;
      const ipOrigen = req.ip;

      const nuevoReporte = await ciudadanoService.crearReporte(
        ciudadanoId,
        dto,
        ipOrigen
      );

      return sendSuccess(
        res,
        nuevoReporte,
        'Reporte de emergencia registrado exitosamente.',
        201
      );
    } catch (error) {
      return next(error);
    }
  },

  async adjuntarEvidencias(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const ciudadanoId = extraerCiudadanoId(req);
      const { ticket } = req.params;
      const files = (req.files as Express.Multer.File[]) || [];
      const ipOrigen = req.ip;

      const adjuntos = await ciudadanoService.adjuntarEvidencias(
        ticket,
        ciudadanoId,
        files,
        ipOrigen
      );

      return sendSuccess(
        res,
        adjuntos,
        'Evidencias multimedia adjuntadas exitosamente.',
        201
      );
    } catch (error) {
      return next(error);
    }
  },

  async listarMisReportes(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const ciudadanoId = extraerCiudadanoId(req);
      const query = req.query as unknown as MisReportesQueryDTO;

      const resultado = await ciudadanoService.listarMisReportes(
        ciudadanoId,
        query
      );

      return sendSuccess(
        res,
        resultado,
        'Listado de reportes obtenido exitosamente.'
      );
    } catch (error) {
      return next(error);
    }
  },

  async obtenerDetalleReporte(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const ciudadanoId = extraerCiudadanoId(req);
      const { ticket } = req.params;

      const detalle = await ciudadanoService.obtenerDetalleReporte(
        ticket,
        ciudadanoId
      );

      return sendSuccess(
        res,
        detalle,
        'Detalle del reporte obtenido exitosamente.'
      );
    } catch (error) {
      return next(error);
    }
  },
};
