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
} from '../schemas/reporte.schema.js';
import { catalogoEmergenciasQuerySchema } from '../schemas/emergencia.schema.js';

const router = Router();

/**
 * GET /api/ciudadano/emergencias
 * Catalogo de tipos de emergencias clasificados por institucion (Policia / Bomberos).
 */
router.get(
  '/emergencias',
  validateQuery(catalogoEmergenciasQuerySchema),
  ciudadanoController.obtenerCatalogoEmergencias
);

/**
 * POST /api/ciudadano/reportes
 * Registro de un nuevo reporte de emergencia ciudadana.
 * Soporta registro con sincronizacion offline.
 */
router.post(
  '/reportes',
  validateBody(crearReporteSchema),
  ciudadanoController.crearReporte
);

/**
 * POST /api/ciudadano/reportes/:ticket/adjuntos
 * Carga de archivos multimedia (evidencias fotograficas / videos) para un reporte.
 */
router.post(
  '/reportes/:ticket/adjuntos',
  validateParams(ticketParamSchema),
  uploadEvidencias,
  ciudadanoController.adjuntarEvidencias
);

/**
 * GET /api/ciudadano/reportes
 * Historial personal del ciudadano ("Mis Reportes") con paginacion y filtros.
 */
router.get(
  '/reportes',
  validateQuery(misReportesQuerySchema),
  ciudadanoController.listarMisReportes
);

/**
 * GET /api/ciudadano/reportes/:ticket
 * Detalle completo y estado de atencion de un reporte por codigo de ticket.
 */
router.get(
  '/reportes/:ticket',
  validateParams(ticketParamSchema),
  ciudadanoController.obtenerDetalleReporte
);

export default router;
