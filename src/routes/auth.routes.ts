import { Router } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../config/auth.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { sendSuccess } from '../utils/response.util.js';

const router = Router();

/**
 * GET /api/auth/me
 * Retorna los datos del usuario y la sesión activa.
 */
router.get('/me', requireAuth, (req, res) => {
  return sendSuccess(res, {
    user: req.user,
    session: req.session,
  });
});

/**
 * Conecta todas las rutas de Better Auth:
 * - POST /api/auth/sign-up/email
 * - POST /api/auth/sign-in/email
 * - POST /api/auth/sign-out
 * - GET  /api/auth/get-session
 */
router.all('/*', toNodeHandler(auth));

export default router;
