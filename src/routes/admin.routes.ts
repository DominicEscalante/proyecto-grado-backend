import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { registrosAuditoria, usuarios } from '../db/schema/index.js';
import { withDatabaseBackup } from '../services/backup.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { AppError } from '../utils/error.util.js';
import { requireVerifiedSession } from '../middlewares/auth.middleware.js';
import { requireRoles, ROLES } from '../middlewares/role.middleware.js';
import { adminController } from '../controllers/admin.controller.js';
import { validateQuery, validateBody } from '../middlewares/validate.middleware.js';
import {
  listarUsuariosQuerySchema,
  crearOperadorSchema,
  editarUsuarioSchema,
  cambiarEstadoUsuarioSchema,
  restablecerPasswordSchema,
} from '../schemas/usuario.schema.js';

const router = Router();

const requireAdministratorSession = [requireVerifiedSession, requireRoles(ROLES.ADMINISTRADOR)];

router.get('/auditoria', ...requireAdministratorSession, async (req, res, next) => {
  try {
    const page = Number(req.query.pagina ?? 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100_000) {
      throw new AppError('Página no válida.', 400, 'INVALID_AUDIT_PAGE');
    }
    const rows = await db.select({
      id: registrosAuditoria.registroAuditId,
      fecha: registrosAuditoria.fechaHora,
      usuario: usuarios.name,
      usuarioId: registrosAuditoria.usuarioId,
      ip: registrosAuditoria.ipOrigen,
      accion: registrosAuditoria.accion,
      modulo: registrosAuditoria.modulo,
    }).from(registrosAuditoria)
      .innerJoin(usuarios, eq(registrosAuditoria.usuarioId, usuarios.id))
      .orderBy(desc(registrosAuditoria.fechaHora), desc(registrosAuditoria.registroAuditId))
      .limit(21).offset((page - 1) * 20);
    res.set('Cache-Control', 'no-store');
    return sendSuccess(res, { items: rows.slice(0, 20), haySiguiente: rows.length > 20 }, 'Bitácora de auditoría.');
  } catch (error) {
    next(error);
  }
});

router.post('/respaldos', ...requireAdministratorSession, async (_req, res, next) => {
  try {
    await withDatabaseBackup((file, filename) => new Promise<void>((resolve, reject) => {
      if (res.destroyed) {
        resolve();
        return;
      }
      res.set('Cache-Control', 'no-store');
      res.download(file, filename, (error) => {
        if (error && !res.headersSent && !res.destroyed) reject(error);
        else resolve();
      });
    }));
  } catch (error) {
    next(error);
  }
});

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

/**
 * PATCH /api/admin/usuarios/:id/password
 * Restablecimiento administrativo de credenciales de usuario (HU-16).
 */
router.patch(
  '/usuarios/:id/password',
  validateBody(restablecerPasswordSchema),
  adminController.restablecerPassword
);

export default router;
