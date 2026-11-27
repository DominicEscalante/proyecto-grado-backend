import { rateLimit } from 'express-rate-limit';
import { Router } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../config/auth.js';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth, requirePasswordSetupSession } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import {
  registroCiudadanoSchema,
  confirmarRegistroSchema,
  loginSchema,
  verificarIdentidadSchema,
} from '../schemas/auth.schema.js';
import { z } from 'zod';
import { nuevaPasswordSchema } from '../schemas/password.schema.js';
import { changeInitialPassword } from '../services/initial-password.service.js';
import { sendSuccess } from '../utils/response.util.js';

const router = Router();
const intentosAuth = rateLimit({
  windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { success: false, error: { message: 'Demasiados intentos. Inténtalo en 15 minutos.', code: 'RATE_LIMIT' } },
});

/**
 * POST /api/auth/registro
 * Registro de nuevo ciudadano con validacion de carnet, telefono y datos personales (HU-01).
 */
router.post(
  '/registro',
  intentosAuth,
  validateBody(registroCiudadanoSchema),
  authController.registroCiudadano
);

router.post(
  '/registro/confirmar',
  intentosAuth,
  validateBody(confirmarRegistroSchema),
  authController.confirmarRegistro
);

/**
 * POST /api/auth/login
 * Inicio de sesion mediante correo electronico o numero de celular (HU-02).
 */
router.post(
  '/login',
  intentosAuth,
  validateBody(loginSchema),
  authController.login
);

/**
 * POST /api/auth/solicitar-verificacion
 * Emision de codigo OTP para verificacion de identidad (HU-03).
 */
router.post(
  '/solicitar-verificacion',
  intentosAuth,
  requireAuth,
  authController.solicitarVerificacionIdentidad
);

/**
 * POST /api/auth/verificar-identidad
 * Validacion de codigo OTP y activacion de identidad verificada (HU-03).
 */
router.post(
  '/verificar-identidad',
  intentosAuth,
  requireAuth,
  validateBody(verificarIdentidadSchema),
  authController.confirmarVerificacionIdentidad
);

router.post('/password-inicial', intentosAuth, requirePasswordSetupSession, validateBody(z.object({
  actual: z.string().min(1).max(128),
  nueva: nuevaPasswordSchema,
}).refine(({ actual, nueva }) => actual !== nueva, {
  path: ['nueva'], message: 'Elige una contraseña diferente a la temporal.',
})), async (req, res, next) => {
  try {
    await changeInitialPassword(req.user!.id, req.body.actual, req.body.nueva);
    return sendSuccess(res, null, 'Contraseña actualizada. Inicia sesión de nuevo.');
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requirePasswordSetupSession, (req, res) => {
  return sendSuccess(res, {
    user: req.user,
    session: req.session,
  });
});

router.all('/*', toNodeHandler(auth));

export default router;
