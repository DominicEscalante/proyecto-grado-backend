import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service.js';
import { sendSuccess } from '../utils/response.util.js';
import {
  ListarUsuariosQueryDTO,
  CrearOperadorDTO,
  EditarUsuarioDTO,
} from '../types/usuario.types.js';
import { CambiarEstadoUsuarioDTO } from '../schemas/usuario.schema.js';
import { AppError } from '../utils/error.util.js';

/**
 * Controlador HTTP para el Panel de Administracion y Gestion de Usuarios (HU-16).
 * Gestiona el transporte HTTP, extraccion de DTOs y formateo de respuestas ApiResponse.
 */
export const adminController = {
  /**
   * GET /api/admin/usuarios
   * Retorna el listado paginado de usuarios (ciudadanos y operadores) con filtros avanzados.
   */
  async listarUsuarios(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const query = req.query as unknown as ListarUsuariosQueryDTO;
      const resultado = await adminService.listarUsuarios(query);

      return sendSuccess(
        res,
        resultado,
        'Listado de usuarios obtenido exitosamente.'
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * GET /api/admin/usuarios/:id
   * Retorna el detalle completo de un usuario por su identificador.
   */
  async obtenerUsuarioPorId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const { id } = req.params;
      const usuario = await adminService.obtenerUsuarioPorId(id);

      return sendSuccess(
        res,
        usuario,
        'Detalle del usuario obtenido exitosamente.'
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * POST /api/admin/operadores
   * Registra un nuevo operador institucional de Policia o Bomberos (HU-16).
   */
  async crearOperador(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Usuario administrador no autenticado.', 401, 'UNAUTHORIZED');
      }

      const dto = req.body as CrearOperadorDTO;
      const nuevoOperador = await adminService.crearOperador(adminId, dto, req.ip);

      return sendSuccess(
        res,
        nuevoOperador,
        'Operador registrado exitosamente en el sistema.',
        201
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * PATCH /api/admin/usuarios/:id
   * Modifica atributos de un usuario u operador (HU-16).
   */
  async editarUsuario(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Usuario administrador no autenticado.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const dto = req.body as EditarUsuarioDTO;
      const usuarioActualizado = await adminService.editarUsuario(adminId, id, dto, req.ip);

      return sendSuccess(
        res,
        usuarioActualizado,
        'Informacion del usuario actualizada exitosamente.'
      );
    } catch (error) {
      return next(error);
    }
  },

  /**
   * PATCH /api/admin/usuarios/:id/estado
   * Aplica baja logica o reactivacion de un usuario (HU-16).
   */
  async cambiarEstadoUsuario(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Usuario administrador no autenticado.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const { estado_cuenta, motivo } = req.body as CambiarEstadoUsuarioDTO;
      const usuarioActualizado = await adminService.cambiarEstadoUsuario(
        adminId,
        id,
        estado_cuenta,
        motivo,
        req.ip
      );

      const mensaje = estado_cuenta
        ? 'Cuenta de usuario reactivada exitosamente.'
        : 'Cuenta de usuario desactivada exitosamente.';

      return sendSuccess(res, usuarioActualizado, mensaje);
    } catch (error) {
      return next(error);
    }
  },

  /**
   * PATCH /api/admin/usuarios/:id/password
   * Restablece la contraseña de acceso de un usuario (HU-16).
   */
  async restablecerPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('Usuario administrador no autenticado.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const { password } = req.body;
      const resultado = await adminService.restablecerPassword(
        adminId,
        id,
        password,
        req.ip
      );

      return sendSuccess(res, resultado, 'Contraseña restablecida exitosamente.');
    } catch (error) {
      return next(error);
    }
  },
};
