import { Router } from 'express';
import { operadorController } from '../controllers/operador.controller.js';

const router = Router();

/**
 * GET /api/operador/reportes
 * Listado de reportes para los operadores de monitoreo policial y bomberil.
 */
router.get('/reportes', operadorController.listarReportes);

/**
 * PATCH /api/operador/reportes/:ticket/estado
 * Actualiza el estado del reporte.
 */
router.patch('/reportes/:ticket/estado', operadorController.actualizarEstado);

export default router;
