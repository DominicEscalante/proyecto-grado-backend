import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { sendError } from '../utils/response.util.js';
import { AppError } from '../utils/error.util.js';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(
        res,
        'El archivo excede el tamaño máximo permitido.',
        400,
        'FILE_TOO_LARGE'
      );
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return sendError(
        res,
        'Se superó el número máximo de archivos permitidos.',
        400,
        'TOO_MANY_FILES'
      );
    }
    return sendError(res, `Error en la subida de archivos: ${err.message}`, 400, 'UPLOAD_ERROR');
  }

  if (err instanceof ZodError) {
    return sendError(
      res,
      'Error de validación de datos.',
      400,
      'VALIDATION_ERROR',
      err.errors.map((e) => ({
        campo: e.path.join('.'),
        mensaje: e.message,
      }))
    );
  }

  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  if (err instanceof Error) {
    return sendError(res, err.message, 400, 'BAD_REQUEST');
  }

  return sendError(res, 'Ocurrió un error interno en el servidor.', 500, 'INTERNAL_SERVER_ERROR');
};
