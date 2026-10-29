import { db } from '../db/index.js';
import { reportes, tiposEmergencias, usuarios, adjuntosMultimedia } from '../db/schema/index.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { AppError } from '../utils/error.util.js';
import { env } from '../config/env.js';

export const operadorService = {
  /**
   * Obtiene todos los incidentes reportados para la consola institucional,
   * con datos completos de ciudadano, emergencia y adjuntos multimedia.
   */
  async listarReportes(institucion?: string, estado?: string) {
    const conditions = [];

    if (institucion && institucion !== 'TODAS' && (institucion === 'POLICIA' || institucion === 'BOMBEROS')) {
      conditions.push(eq(reportes.institucionDestino, institucion));
    }

    if (estado && estado !== 'TODOS') {
      conditions.push(eq(reportes.estado, estado));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        reporteId: reportes.reporteId,
        codigoTicket: reportes.codigoTicket,
        descripcion: reportes.descripcion,
        institucionDestino: reportes.institucionDestino,
        latitud: reportes.latitud,
        longitud: reportes.longitud,
        altitud: reportes.altitud,
        referenciaDireccion: reportes.referenciaDireccion,
        fueraJurisdiccion: reportes.fueraJurisdiccion,
        estado: reportes.estado,
        fechaGeneracionLocal: reportes.fechaGeneracionLocal,
        actualizadoEn: reportes.actualizadoEn,
        resultadoAtencion: reportes.resultadoAtencion,
        motivoNoAtencion: reportes.motivoNoAtencion,
        fechaAtencion: reportes.fechaAtencion,
        tipoEmergenciaId: tiposEmergencias.tipoEmergenciaId,
        tipoEmergenciaNombre: tiposEmergencias.nombre,
        tipoEmergenciaDescripcion: tiposEmergencias.descripcion,
        ciudadanoId: usuarios.id,
        ciudadanoNombre: usuarios.name,
        ciudadanoNombres: usuarios.nombres,
        ciudadanoApellidos: usuarios.apellidos,
        ciudadanoTelefono: usuarios.telefono,
        ciudadanoCi: usuarios.ci,
        ciudadanoEmail: usuarios.email,
        operadorId: reportes.operadorId,
      })
      .from(reportes)
      .innerJoin(
        tiposEmergencias,
        eq(reportes.tipoEmergenciaId, tiposEmergencias.tipoEmergenciaId)
      )
      .innerJoin(usuarios, eq(reportes.ciudadanoId, usuarios.id))
      .where(whereClause)
      .orderBy(desc(reportes.fechaGeneracionLocal));

    const reporteIds = rows.map((r) => r.reporteId);

    // Adjuntos multimedia asociados
    const adjuntosMap = new Map<number, { id: number; url: string; tipo: string }[]>();
    if (reporteIds.length > 0) {
      const adjuntos = await db
        .select()
        .from(adjuntosMultimedia)
        .where(inArray(adjuntosMultimedia.reporteId, reporteIds));

      adjuntos.forEach((adj) => {
        const lista = adjuntosMap.get(adj.reporteId) || [];
        lista.push({
          id: adj.adjuntoId,
          url: adj.urlArchivo,
          tipo: adj.tipoArchivo,
        });
        adjuntosMap.set(adj.reporteId, lista);
      });
    }

    return rows.map((r) => {
      const dateObj = new Date(r.fechaGeneracionLocal);
      const horaStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(
        dateObj.getMinutes()
      ).padStart(2, '0')}`;

      const nombreCompleto =
        r.ciudadanoNombre ||
        `${r.ciudadanoNombres || ''} ${r.ciudadanoApellidos || ''}`.trim() ||
        'Ciudadano Registrado';

      return {
        id: r.reporteId,
        codigoTicket: r.codigoTicket,
        titulo: r.tipoEmergenciaNombre || 'Incidente Reportado',
        tipoEmergencia: (r.tipoEmergenciaNombre || 'EMERGENCIA').toUpperCase(),
        institucion: r.institucionDestino,
        estado: r.estado,
        prioridad: 'ALTA',
        fechaReporte: r.fechaGeneracionLocal.toISOString(),
        horaFormateada: horaStr,
        ciudadano: {
          nombre: nombreCompleto,
          telefono: r.ciudadanoTelefono || '+591 700 00000',
          ci: r.ciudadanoCi || 'Sin CI',
        },
        coordenadas: {
          latitud: Number(r.latitud),
          longitud: Number(r.longitud),
          altitud: Number(r.altitud) || 3640,
          referencia: r.referenciaDireccion || 'La Paz, Bolivia',
        },
        adjuntos: (adjuntosMap.get(r.reporteId) || []).map((adj) => {
          const extension = adj.url.split('?')[0].split('.').pop()?.toLowerCase() || '';
          const esVideo = adj.tipo.startsWith('video/');
          const url = /^https?:\/\//i.test(adj.url)
            ? adj.url
            : `${env.BETTER_AUTH_URL.replace(/\/$/, '')}${adj.url.startsWith('/') ? '' : '/'}${adj.url}`;

          return {
            id: adj.id,
            url,
            tipo: esVideo ? 'video' : 'image',
            formato: extension ? extension.toUpperCase() : adj.tipo.split('/')[1]?.toUpperCase() || 'ARCHIVO',
            nombre: `evidencia_${adj.id}.${extension || (esVideo ? 'mp4' : 'jpg')}`,
          };
        }),
        descripcion: r.descripcion,
        ultimaActualizacion: {
          hora: horaStr,
          responsable: 'Central Operativa',
        },
      };
    });
  },

  /**
   * Actualiza el estado operativo de un reporte desde la consola institucional.
   */
  async actualizarEstado(codigoTicket: string, nuevoEstado: string, operadorId: string, institucionOperador?: string) {
    const reporteExistente = await db
      .select()
      .from(reportes)
      .where(eq(reportes.codigoTicket, codigoTicket))
      .limit(1);

    if (reporteExistente.length === 0) {
      throw new AppError('Reporte no encontrado.', 404, 'NOT_FOUND');
    }
    if (institucionOperador && reporteExistente[0].institucionDestino !== institucionOperador) {
      throw new AppError('No puedes actualizar reportes asignados a otra institución.', 403, 'FORBIDDEN');
    }

    const ahora = new Date();
    const datosActualizacion: Record<string, unknown> = {
      estado: nuevoEstado,
      operadorId,
      actualizadoEn: ahora,
    };

    if (nuevoEstado === 'ATENDIDO') {
      datosActualizacion.fechaAtencion = ahora;
      datosActualizacion.resultadoAtencion = 'ATENDIDO';
    } else if (nuevoEstado === 'FALSA_ALARMA') {
      datosActualizacion.fechaAtencion = ahora;
      datosActualizacion.resultadoAtencion = 'NO_ATENDIDO';
      datosActualizacion.motivoNoAtencion = 'Falsa alarma reportada por el operador institucional.';
    } else if (nuevoEstado === 'PENDIENTE') {
      datosActualizacion.fechaAtencion = null;
      datosActualizacion.resultadoAtencion = null;
      datosActualizacion.motivoNoAtencion = null;
    }

    const [actualizado] = await db
      .update(reportes)
      .set(datosActualizacion)
      .where(eq(reportes.codigoTicket, codigoTicket))
      .returning();

    return actualizado;
  },
};
