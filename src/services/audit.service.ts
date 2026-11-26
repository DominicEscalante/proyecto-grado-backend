import { db } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { registrosAuditoria, session } from '../db/schema/index.js';
import { AppError } from '../utils/error.util.js';

export interface RegistrarAuditoriaParams {
  accion: string;
  modulo: string;
  ipOrigen?: string;
  detalles: Record<string, unknown>;
  usuarioId: string;
  sessionToken?: string;
}

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
    console.error('[Audit Service Error]: Fallo al registrar auditoría:', error);
    if (params.sessionToken) {
      try {
        await db.delete(session).where(eq(session.token, params.sessionToken));
      } catch {
        console.error('[Audit Service Error]: No se pudo revocar la sesión recién creada.');
      }
      throw new AppError('No se pudo completar el inicio de sesión.', 503, 'LOGIN_AUDIT_FAILED');
    }
  }
};
