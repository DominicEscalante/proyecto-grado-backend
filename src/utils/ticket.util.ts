import { db } from '../db/index.js';
import { reportes } from '../db/schema/index.js';
import { like, desc } from 'drizzle-orm';

/**
 * Genera un codigo correlativo univoco de ticket para un nuevo reporte.
 * Formato: TKT-YYYY-NNNNNN (ej. TKT-2026-000001)
 * Utiliza Drizzle ORM con ordenamiento descendente y limite.
 */
export const generarCodigoTicket = async (): Promise<string> => {
  const anioActual = new Date().getFullYear();
  const prefijo = `TKT-${anioActual}-%`;

  const rows = await db
    .select({ codigoTicket: reportes.codigoTicket })
    .from(reportes)
    .where(like(reportes.codigoTicket, prefijo))
    .orderBy(desc(reportes.reporteId))
    .limit(1);

  let nuevoSecuencial = 1;

  if (rows.length > 0) {
    const ultimoCodigo = rows[0].codigoTicket;
    const partes = ultimoCodigo.split('-');
    if (partes.length === 3) {
      const secuencialPrevio = parseInt(partes[2], 10);
      if (!isNaN(secuencialPrevio)) {
        nuevoSecuencial = secuencialPrevio + 1;
      }
    }
  }

  const correlativoFormateado = String(nuevoSecuencial).padStart(6, '0');
  return `TKT-${anioActual}-${correlativoFormateado}`;
};
