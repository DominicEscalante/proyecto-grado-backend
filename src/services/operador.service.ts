import { db } from '../db/index.js';
import { reportes, tiposEmergencias, usuarios, adjuntosMultimedia, registrosAuditoria } from '../db/schema/index.js';
import { eq, and, asc, desc, inArray, or, isNull, count, sql } from 'drizzle-orm';
import { AppError } from '../utils/error.util.js';
import { env } from '../config/env.js';
import { esReferenciaGps, obtenerDireccionAproximada } from './direccion.service.js';
import { publishReportEvent } from './report-events.service.js';

export const operadorService = {
  async obtenerDireccion(codigoTicket: string, institucionOperador?: string) {
    const [reporte] = await db.select({
      referenciaDireccion: reportes.referenciaDireccion,
      latitud: reportes.latitud,
      longitud: reportes.longitud,
      institucionDestino: reportes.institucionDestino,
    }).from(reportes).where(eq(reportes.codigoTicket, codigoTicket)).limit(1);
    if (!reporte) throw new AppError('Reporte no encontrado.', 404, 'NOT_FOUND');
    if (institucionOperador && reporte.institucionDestino !== institucionOperador) {
      throw new AppError('No puedes consultar este reporte.', 403, 'FORBIDDEN');
    }
    if (!esReferenciaGps(reporte.referenciaDireccion) && reporte.referenciaDireccion !== 'Dirección no disponible') {
      return { direccion: reporte.referenciaDireccion };
    }
    const direccion = await obtenerDireccionAproximada(Number(reporte.latitud), Number(reporte.longitud));
    if (direccion) await db.update(reportes).set({ referenciaDireccion: direccion }).where(eq(reportes.codigoTicket, codigoTicket));
    return { direccion: direccion || 'Dirección no disponible' };
  },
  /**
   * Obtiene todos los incidentes reportados para la consola institucional,
   * con datos completos de ciudadano, emergencia y adjuntos multimedia.
   */
  async listarReportes(institucion?: string, estado?: string, principalIds?: number[]) {
    const conditions = [];

    if (institucion && institucion !== 'TODAS' && (institucion === 'POLICIA' || institucion === 'BOMBEROS')) {
      conditions.push(eq(reportes.institucionDestino, institucion));
    }

    if (estado && estado !== 'TODOS') {
      conditions.push(eq(reportes.estado, estado));
    }

    if (principalIds) {
      if (!principalIds.length) return [];
      conditions.push(or(inArray(reportes.reporteId, principalIds), inArray(reportes.incidentePrincipalId, principalIds))!);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        reporteId: reportes.reporteId,
        incidentePrincipalId: reportes.incidentePrincipalId,
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
    const operadorIds = rows.flatMap((r) => r.operadorId ? [r.operadorId] : []);
    const operadores = operadorIds.length ? await db.select({ id: usuarios.id, nombre: usuarios.name }).from(usuarios).where(inArray(usuarios.id, operadorIds)) : [];
    const nombresOperadores = new Map(operadores.map((operador) => [operador.id, operador.nombre]));

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

    const items = rows.map((r) => {
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
        incidentePrincipalId: r.incidentePrincipalId,
        codigoTicket: r.codigoTicket,
        titulo: r.tipoEmergenciaNombre || 'Incidente Reportado',
        tipoEmergencia: (r.tipoEmergenciaNombre || 'EMERGENCIA').toUpperCase(),
        institucion: r.institucionDestino,
        estado: r.estado,
        prioridad: 'ALTA',
        fechaReporte: r.fechaGeneracionLocal.toISOString(),
        fechaCierre: r.fechaAtencion?.toISOString() ?? r.actualizadoEn.toISOString(),
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
          hora: new Date(r.actualizadoEn).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' }),
          responsable: r.operadorId ? nombresOperadores.get(r.operadorId) || 'Operador institucional' : 'Sin asignar',
        },
      };
    });
    const grupos = new Map<number, typeof items>();
    items.forEach((item) => {
      const clave = item.incidentePrincipalId ?? item.id;
      const grupo = grupos.get(clave) ?? [];
      grupo.push(item);
      grupos.set(clave, grupo);
    });
    return Array.from(grupos.values()).map((grupo) => {
      const principal = grupo.find((item) => item.incidentePrincipalId === null) ?? grupo[grupo.length - 1];
      return {
        ...principal,
        reportesVinculados: grupo.sort((a, b) => new Date(a.fechaReporte).getTime() - new Date(b.fechaReporte).getTime()),
        cantidadReportes: grupo.length,
      };
    }).sort((a, b) => new Date(b.fechaReporte).getTime() - new Date(a.fechaReporte).getTime());
  },

  async listarHistorial(institucion: string | undefined, pagina: number, orden: 'recientes' | 'antiguos') {
    const conditions = [isNull(reportes.incidentePrincipalId), inArray(reportes.estado, ['ATENDIDO', 'FALSA_ALARMA'])];
    if (institucion === 'POLICIA' || institucion === 'BOMBEROS') {
      conditions.push(eq(reportes.institucionDestino, institucion));
    }
    const where = and(...conditions);
    const [{ total }] = await db.select({ total: count() }).from(reportes).where(where);
    const fechaCierre = sql<Date>`coalesce(${reportes.fechaAtencion}, ${reportes.actualizadoEn})`;
    const ids = await db.select({ id: reportes.reporteId }).from(reportes).where(where)
      .orderBy(orden === 'antiguos' ? asc(fechaCierre) : desc(fechaCierre), desc(reportes.reporteId))
      .limit(20).offset((pagina - 1) * 20);
    const incidentes = await this.listarReportes(institucion, undefined, ids.map((row) => row.id));
    const position = new Map(ids.map((row, index) => [row.id, index]));
    return {
      items: incidentes.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0)),
      total, pagina, limite: 20, totalPaginas: Math.ceil(total / 20),
    };
  },

  /**
   * Actualiza el estado operativo de un reporte desde la consola institucional.
   */
  async actualizarEstado(codigoTicket: string, nuevoEstado: string, estadoEsperado: string, operadorId: string, institucionOperador?: string, ipOrigen = '127.0.0.1') {
    if (!['PENDIENTE', 'EN_CURSO', 'ATENDIDO', 'FALSA_ALARMA'].includes(nuevoEstado) ||
        !['PENDIENTE', 'EN_CURSO', 'ATENDIDO', 'FALSA_ALARMA'].includes(estadoEsperado)) {
      throw new AppError('Estado de reporte no válido.', 400, 'INVALID_STATUS');
    }

    const resultado = await db.transaction(async (tx) => {
      const [reporte] = await tx.select({
        reporteId: reportes.reporteId,
        incidentePrincipalId: reportes.incidentePrincipalId,
      }).from(reportes).where(eq(reportes.codigoTicket, codigoTicket)).limit(1);
      if (!reporte) throw new AppError('Reporte no encontrado.', 404, 'NOT_FOUND');

      const principalId = reporte.incidentePrincipalId ?? reporte.reporteId;
      const [principal] = await tx.select().from(reportes)
        .where(eq(reportes.reporteId, principalId)).for('update');
      if (!principal) throw new AppError('Incidente no encontrado.', 404, 'NOT_FOUND');
      if (institucionOperador && principal.institucionDestino !== institucionOperador) {
        throw new AppError('No puedes actualizar reportes asignados a otra institución.', 403, 'FORBIDDEN');
      }
      if (principal.estado !== estadoEsperado || principal.estado === nuevoEstado) {
        throw new AppError('El incidente fue actualizado por otro operador. Revisa su estado actual.', 409, 'STATE_CONFLICT');
      }

      const ahora = new Date();
      const datosActualizacion = {
        estado: nuevoEstado,
        operadorId,
        actualizadoEn: ahora,
        fechaAtencion: nuevoEstado === 'ATENDIDO' || nuevoEstado === 'FALSA_ALARMA' ? ahora : null,
        resultadoAtencion: nuevoEstado === 'ATENDIDO' ? 'ATENDIDO' : nuevoEstado === 'FALSA_ALARMA' ? 'NO_ATENDIDO' : null,
        motivoNoAtencion: nuevoEstado === 'FALSA_ALARMA' ? 'Falsa alarma reportada por el operador institucional.' : null,
      };
      const changed = await tx.update(reportes).set(datosActualizacion)
        .where(or(eq(reportes.reporteId, principalId), eq(reportes.incidentePrincipalId, principalId))).returning();
      await tx.insert(registrosAuditoria).values({
        accion: 'CAMBIO_ESTADO_REPORTE', modulo: 'OPERADOR', usuarioId: operadorId, ipOrigen,
        detalles: { codigoTicket, incidentePrincipalId: principalId, estadoAnterior: principal.estado, nuevoEstado, reportesAfectados: changed.map((item) => item.codigoTicket) },
      });
      return { actualizado: changed[0], institucion: principal.institucionDestino };
    });

    void publishReportEvent(resultado.institucion).catch((error) => console.error('No se pudo notificar el cambio de estado:', error));
    return resultado.actualizado;
  },
};
