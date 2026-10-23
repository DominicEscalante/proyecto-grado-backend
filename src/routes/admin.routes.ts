import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { validateQuery, validateBody } from '../middlewares/validate.middleware.js';
import {
  listarUsuariosQuerySchema,
  crearOperadorSchema,
  editarUsuarioSchema,
  cambiarEstadoUsuarioSchema,
} from '../schemas/usuario.schema.js';

const router = Router();

/**
 * GET /api/admin/usuarios
 * Listado de usuarios con filtros de rol, institucion, estado y busqueda textual (HU-16).
 */
router.get(
  '/usuarios',
  validateQuery(listarUsuariosQuerySchema),
  adminController.listarUsuarios
);

/**
 * GET /api/admin/usuarios/:id
 * Detalle completo de un usuario u operador por identificador (HU-16).
 */
router.get(
  '/usuarios/:id',
  adminController.obtenerUsuarioPorId
);

/**
 * POST /api/admin/operadores
 * Alta de un nuevo operador policial o de bomberos (HU-16).
 */
router.post(
  '/operadores',
  validateBody(crearOperadorSchema),
  adminController.crearOperador
);

/**
 * PATCH /api/admin/usuarios/:id
 * Modificacion de datos de usuario u operador (HU-16).
 */
router.patch(
  '/usuarios/:id',
  validateBody(editarUsuarioSchema),
  adminController.editarUsuario
);

/**
 * PATCH /api/admin/usuarios/:id/estado
 * Baja logica o reactivacion de cuenta de usuario con motivo de auditoria (HU-16).
 */
router.patch(
  '/usuarios/:id/estado',
  validateBody(cambiarEstadoUsuarioSchema),
  adminController.cambiarEstadoUsuario
);

export default router;
