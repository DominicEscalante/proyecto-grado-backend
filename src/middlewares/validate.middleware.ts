import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/response.util.js';

type RequestLocation = 'body' | 'query' | 'params';

/**
 * Middleware de orden superior para validar entradas HTTP contra esquemas de Zod.
 */
export const validate = (schema: AnyZodObject, location: RequestLocation = 'body') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const validated = await schema.parseAsync(req[location]);
      req[location] = validated;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(
          res,
          'Datos de entrada inválidos.',
          400,
          'VALIDATION_ERROR',
          error.errors.map((err) => ({
            campo: err.path.join('.'),
            mensaje: err.message,
          }))
        );
      }
      return sendError(res, 'Error inesperado al validar la solicitud.', 500, 'INTERNAL_VALIDATION_ERROR');
    }
  };
};

export const validateBody = (schema: AnyZodObject) => validate(schema, 'body');
export const validateQuery = (schema: AnyZodObject) => validate(schema, 'query');
export const validateParams = (schema: AnyZodObject) => validate(schema, 'params');
