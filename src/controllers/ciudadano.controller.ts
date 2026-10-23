import { Request, Response, NextFunction } from 'express';
import { ciudadanoService } from '../services/ciudadano.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError } from '../utils/error.util.js';
import { env } from '../config/env.js';
import {
  CrearReporteDTO,
  MisReportesQueryDTO,
} from '../types/reporte.types.js';

/**
 * Obtiene el identificador del ciudadano autenticado o utiliza el usuario dev en entorno local/Postman.
 */
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

/**
 * Controlador HTTP para el Módulo de Ciudadanos.
 * Gestiona el transporte HTTP, extracción de DTOs y formateo de respuestas ApiResponse.
 */
export const ciudadanoController = {
  /**
   * GET /api/ciudadano/emergencias
   * Retorna el catálogo de tipos de emergencias para el formulario de reporte.
   */
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

  /**
   * POST /api/ciudadano/reportes
   * Crea un nuevo reporte de emergencia ciudadana y asigna ticket correlativo.
   */
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

  /**
   * POST /api/ciudadano/reportes/:ticket/adjuntos
   * Sube y vincula evidencias multimedia (fotos o videos) a un reporte existente.
   */
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

  /**
   * GET /api/ciudadano/reportes
   * Retorna el historial paginado de reportes creados por el ciudadano autenticado.
   */
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

  /**
   * GET /api/ciudadano/reportes/:ticket
   * Retorna el detalle completo de un reporte específico para seguimiento en la PWA.
   */
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
