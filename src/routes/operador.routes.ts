import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.middleware.js';
import { estadoReporteEnum } from '../schemas/reporte.schema.js';
import { Router } from 'express';
import { operadorController } from '../controllers/operador.controller.js';
import { subscribeToReports } from '../services/report-events.service.js';

const router = Router();
const ticket = validateParams(z.object({ ticket: z.string().min(1).max(20).regex(/^[A-Za-z0-9-]+$/) }));

router.get('/reportes', validateQuery(z.object({ institucion: z.enum(['POLICIA', 'BOMBEROS']).optional(), estado: estadoReporteEnum.optional() })), operadorController.listarReportes);
router.get('/reportes/historial', operadorController.listarHistorial);
router.get('/reportes/eventos', (req, res) => {
  const institution = req.user?.rol_id === 2 ? 'POLICIA' : req.user?.rol_id === 3 ? 'BOMBEROS' : 'TODAS';
  subscribeToReports(res, institution);
});
router.get('/reportes/:ticket/direccion', ticket, operadorController.obtenerDireccion);

router.patch('/reportes/:ticket/estado', ticket, validateBody(z.object({ estado: estadoReporteEnum, estadoEsperado: estadoReporteEnum }).strict()), operadorController.actualizarEstado);

export default router;
