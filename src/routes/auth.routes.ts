import { Router } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../config/auth.js';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import {
  registroCiudadanoSchema,
  confirmarRegistroSchema,
  loginSchema,
  verificarIdentidadSchema,
} from '../schemas/auth.schema.js';
import { sendSuccess } from '../utils/response.util.js';

const router = Router();

/**
 * POST /api/auth/registro
 * Registro de nuevo ciudadano con validacion de carnet, telefono y datos personales (HU-01).
 */
router.post(
  '/registro',
  validateBody(registroCiudadanoSchema),
  authController.registroCiudadano
);

router.post(
  '/registro/confirmar',
  validateBody(confirmarRegistroSchema),
  authController.confirmarRegistro
);

/**
 * POST /api/auth/login
 * Inicio de sesion mediante correo electronico o numero de celular (HU-02).
 */
router.post(
  '/login',
  validateBody(loginSchema),
  authController.login
);

/**
 * POST /api/auth/solicitar-verificacion
 * Emision de codigo OTP para verificacion de identidad (HU-03).
 */
router.post(
  '/solicitar-verificacion',
  requireAuth,
  authController.solicitarVerificacionIdentidad
);

/**
 * POST /api/auth/verificar-identidad
 * Validacion de codigo OTP y activacion de identidad verificada (HU-03).
 */
router.post(
  '/verificar-identidad',
  requireAuth,
  validateBody(verificarIdentidadSchema),
  authController.confirmarVerificacionIdentidad
);

/**
 * GET /api/auth/me
 * Retorna los datos del usuario y la sesion activa.
 */
router.get('/me', requireAuth, (req, res) => {
  return sendSuccess(res, {
    user: req.user,
    session: req.session,
  });
});

/**
 * El alta y acceso con contraseña pasan por /registro y /login.
 * Better Auth mantiene las rutas de sesión y cierre de sesión.
 */
router.all('/*', toNodeHandler(auth));

export default router;
