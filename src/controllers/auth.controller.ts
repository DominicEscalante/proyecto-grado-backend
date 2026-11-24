import { Request, Response, NextFunction } from 'express';
import { registroOtpService } from '../services/registro-otp.service.js';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { ConfirmarRegistroDTO, LoginDTO, VerificarIdentidadDTO } from '../schemas/auth.schema.js';
import { AppError } from '../utils/error.util.js';

/**
 * Controlador HTTP para Autenticacion y Validacion de Identidad (HU-01, HU-02, HU-03).
 */
export const authController = {
  /**
   * POST /api/auth/registro
   * Envía el código para iniciar un registro ciudadano (HU-01).
   */
  async registroCiudadano(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const resultado = await registroOtpService.solicitar(req.body);
      return sendSuccess(res, resultado, 'Código de registro emitido.');
    } catch (error) {
      return next(error);
    }
  },

  async confirmarRegistro(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const resultado = await registroOtpService.confirmar(req.body as ConfirmarRegistroDTO, req.ip);

      return sendSuccess(
        res,
        resultado,
        'Usuario ciudadano registrado exitosamente.',
        201
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * POST /api/auth/login
   * Inicio de sesion mediante correo o numero de celular (HU-02).
   */
  async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const dto = req.body as LoginDTO;
      const resultado = await authService.login(dto, req.ip);

      return sendSuccess(
        res,
        resultado,
        'Inicio de sesion exitoso.',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * POST /api/auth/solicitar-verificacion
   * Genera un codigo OTP de 6 digitos para verificacion de identidad del ciudadano (HU-03).
   */
  async solicitarVerificacionIdentidad(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      if (!req.user?.id) {
        throw new AppError('Usuario no autenticado.', 401, 'UNAUTHORIZED');
      }

      const resultado = await authService.solicitarVerificacionIdentidad(req.user.id, req.ip);

      return sendSuccess(
        res,
        resultado,
        'Codigo de verificacion de identidad emitido exitosamente.',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * POST /api/auth/verificar-identidad
   * Valida el codigo OTP y establece identidad_verificada en true (HU-03).
   */
  async confirmarVerificacionIdentidad(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      if (!req.user?.id) {
        throw new AppError('Usuario no autenticado.', 401, 'UNAUTHORIZED');
      }

      const dto = req.body as VerificarIdentidadDTO;
      const resultado = await authService.confirmarVerificacionIdentidad(
        req.user.id,
        dto.codigo,
        req.ip
      );

      return sendSuccess(
        res,
        resultado,
        'Identidad verificada exitosamente.',
        200
      );
    } catch (error) {
      return next(error);
    }
  },
};
