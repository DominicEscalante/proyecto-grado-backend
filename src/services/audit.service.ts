import { db } from '../db/index.js';
import { registrosAuditoria } from '../db/schema/index.js';

export interface RegistrarAuditoriaParams {
  accion: string;
  modulo: string;
  ipOrigen?: string;
  detalles: Record<string, unknown>;
  usuarioId: string;
}

/**
 * Servicio para el registro inmutable de auditoría y trazabilidad.
 */
export const registrarAuditoria = async (params: RegistrarAuditoriaParams): Promise<void> => {
  try {
    await db.insert(registrosAuditoria).values({
      accion: params.accion,
      modulo: params.modulo,
      ipOrigen: params.ipOrigen || '127.0.0.1',
      detalles: params.detalles,
      usuarioId: params.usuarioId,
    });
  } catch (error) {
    // Si la auditoría falla, registramos en consola para no interrumpir el flujo principal
    console.error('[Audit Service Error]: Fallo al registrar auditoría:', error);
  }
};
