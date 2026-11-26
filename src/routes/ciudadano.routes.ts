import { Router } from 'express';
import { ciudadanoController } from '../controllers/ciudadano.controller.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middlewares/validate.middleware.js';
import { uploadEvidencias } from '../middlewares/upload.middleware.js';
import {
  crearReporteSchema,
  ticketParamSchema,
  misReportesQuerySchema,
  coincidenciasQuerySchema,
} from '../schemas/reporte.schema.js';
import { catalogoEmergenciasQuerySchema } from '../schemas/emergencia.schema.js';

const router = Router();

router.get('/reportes/coincidencias', validateQuery(coincidenciasQuerySchema), ciudadanoController.buscarCoincidencia);

router.get(
  '/emergencias',
  validateQuery(catalogoEmergenciasQuerySchema),
  ciudadanoController.obtenerCatalogoEmergencias
);

router.post(
  '/reportes',
  validateBody(crearReporteSchema),
  ciudadanoController.crearReporte
);

router.post(
  '/reportes/:ticket/adjuntos',
  validateParams(ticketParamSchema),
  uploadEvidencias,
  ciudadanoController.adjuntarEvidencias
);

router.get(
  '/reportes',
  validateQuery(misReportesQuerySchema),
  ciudadanoController.listarMisReportes
);

router.get(
  '/reportes/:ticket',
  validateParams(ticketParamSchema),
  ciudadanoController.obtenerDetalleReporte
);

export default router;
