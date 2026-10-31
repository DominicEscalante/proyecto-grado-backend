import { Router } from 'express';
import { operadorController } from '../controllers/operador.controller.js';
import { subscribeToReports } from '../services/report-events.service.js';

const router = Router();

/**
 * GET /api/operador/reportes
 * Listado de reportes para los operadores de monitoreo policial y bomberil.
 */
router.get('/reportes', operadorController.listarReportes);
router.get('/reportes/historial', operadorController.listarHistorial);
router.get('/reportes/eventos', (req, res) => {
  const institution = req.user?.rol_id === 2 ? 'POLICIA' : req.user?.rol_id === 3 ? 'BOMBEROS' : 'TODAS';
  subscribeToReports(res, institution);
});
router.get('/reportes/:ticket/direccion', operadorController.obtenerDireccion);

/**
 * PATCH /api/operador/reportes/:ticket/estado
 * Actualiza el estado del reporte.
 */
router.patch('/reportes/:ticket/estado', operadorController.actualizarEstado);

export default router;
