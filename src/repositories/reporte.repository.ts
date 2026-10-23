import { db } from '../db/index.js';
import { reportes, adjuntosMultimedia, tiposEmergencias } from '../db/schema/index.js';
import { eq, and, desc, asc, count, min, sql } from 'drizzle-orm';
import {
  Reporte,
  AdjuntoMultimedia,
  ReporteItemCiudadano,
  ReporteDetalleCiudadano,
} from '../types/reporte.types.js';

export interface CrearReporteRepoParams {
  codigoTicket: string;
  descripcion: string;
  institucionDestino: string;
  latitud: number;
  longitud: number;
  altitud: number;
  referenciaDireccion: string;
  fueraJurisdiccion: boolean;
  fechaGeneracionLocal: Date;
  tipoEmergenciaId: number;
  ciudadanoId: string;
}

export interface ListarMisReportesRepoParams {
  ciudadanoId: string;
  estado?: string;
  institucion?: string;
  limite: number;
  pagina: number;
}

export interface ListarMisReportesRepoResult {
  items: ReporteItemCiudadano[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

/**
 * Repositorio de datos para Reportes de Emergencias.
 * Implementa consultas enteramente construidas con Drizzle ORM,
 * protegiendo contra inyeccion SQL y tipando los resultados en tiempo de compilacion.
 */
export const reporteRepository = {
  /**
   * Inserta un nuevo reporte utilizando Drizzle ORM con expresion espacial PostGIS parametrizada.
   */
  async crearReporte(params: CrearReporteRepoParams): Promise<Reporte & { geojson: string }> {
    const [nuevoReporte] = await db
      .insert(reportes)
      .values({
        codigoTicket: params.codigoTicket,
        descripcion: params.descripcion,
        institucionDestino: params.institucionDestino,
        latitud: String(params.latitud),
        longitud: String(params.longitud),
        altitud: String(params.altitud),
        geom: sql`ST_SetSRID(ST_MakePoint(${params.longitud}, ${params.latitud}), 4326)`,
        referenciaDireccion: params.referenciaDireccion,
        fueraJurisdiccion: params.fueraJurisdiccion,
        estado: 'PENDIENTE',
        fechaGeneracionLocal: params.fechaGeneracionLocal,
        tipoEmergenciaId: params.tipoEmergenciaId,
        ciudadanoId: params.ciudadanoId,
      })
      .returning({
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
        tipoEmergenciaId: reportes.tipoEmergenciaId,
        ciudadanoId: reportes.ciudadanoId,
        operadorId: reportes.operadorId,
        resultadoAtencion: reportes.resultadoAtencion,
        motivoNoAtencion: reportes.motivoNoAtencion,
        fechaAtencion: reportes.fechaAtencion,
        geom: reportes.geom,
        geojson: sql<string>`ST_AsGeoJSON(${reportes.geom})`,
      });

    return nuevoReporte;
  },

  /**
   * Inserta evidencias multimedia asociadas a un reporte mediante insercion por lotes en Drizzle.
   */
  async insertarAdjuntos(
    reporteId: number,
    adjuntos: { tipoArchivo: string; urlArchivo: string }[]
  ): Promise<AdjuntoMultimedia[]> {
    if (adjuntos.length === 0) {
      return [];
    }

    const resultado = await db
      .insert(adjuntosMultimedia)
      .values(
        adjuntos.map((adj) => ({
          reporteId,
          tipoArchivo: adj.tipoArchivo,
          urlArchivo: adj.urlArchivo,
        }))
      )
      .returning();

    return resultado;
  },

  /**
   * Obtiene la lista resumida de reportes creados por un ciudadano con paginacion y filtros usando Drizzle.
   */
  async listarReportesPorCiudadano(
    params: ListarMisReportesRepoParams
  ): Promise<ListarMisReportesRepoResult> {
    const offset = (params.pagina - 1) * params.limite;
    const conditions = [eq(reportes.ciudadanoId, params.ciudadanoId)];

    if (params.estado && params.estado !== 'TODOS') {
      conditions.push(eq(reportes.estado, params.estado));
    }

    if (params.institucion && params.institucion !== 'TODOS') {
      conditions.push(eq(reportes.institucionDestino, params.institucion));
    }

    const whereClause = and(...conditions);

    // 1. Obtencion de conteo total
    const totalResult = await db
      .select({ total: count() })
      .from(reportes)
      .where(whereClause);

    const total = totalResult[0]?.total ?? 0;

    // 2. Consulta de elementos paginados con innerJoin y leftJoin
    const rows = await db
      .select({
        reporteId: reportes.reporteId,
        codigoTicket: reportes.codigoTicket,
        descripcion: reportes.descripcion,
        institucionDestino: reportes.institucionDestino,
        estado: reportes.estado,
        fechaGeneracionLocal: reportes.fechaGeneracionLocal,
        actualizadoEn: reportes.actualizadoEn,
        tipoEmergenciaId: tiposEmergencias.tipoEmergenciaId,
        tipoEmergenciaNombre: tiposEmergencias.nombre,
        totalAdjuntos: count(adjuntosMultimedia.adjuntoId),
        primerAdjuntoUrl: min(adjuntosMultimedia.urlArchivo),
      })
      .from(reportes)
      .innerJoin(
        tiposEmergencias,
        eq(reportes.tipoEmergenciaId, tiposEmergencias.tipoEmergenciaId)
      )
      .leftJoin(
        adjuntosMultimedia,
        eq(reportes.reporteId, adjuntosMultimedia.reporteId)
      )
      .where(whereClause)
      .groupBy(
        reportes.reporteId,
        tiposEmergencias.tipoEmergenciaId,
        tiposEmergencias.nombre
      )
      .orderBy(desc(reportes.fechaGeneracionLocal))
      .limit(params.limite)
      .offset(offset);

    const items: ReporteItemCiudadano[] = rows.map((row) => ({
      reporteId: row.reporteId,
      codigoTicket: row.codigoTicket,
      descripcion: row.descripcion,
      institucionDestino: row.institucionDestino,
      estado: row.estado,
      fechaGeneracionLocal: row.fechaGeneracionLocal,
      actualizadoEn: row.actualizadoEn,
      tipoEmergencia: {
        tipoEmergenciaId: row.tipoEmergenciaId,
        nombre: row.tipoEmergenciaNombre,
      },
      totalAdjuntos: row.totalAdjuntos,
      primerAdjuntoUrl: row.primerAdjuntoUrl,
    }));

    const totalPaginas = Math.ceil(total / params.limite) || 1;

    return {
      items,
      total,
      pagina: params.pagina,
      limite: params.limite,
      totalPaginas,
    };
  },

  /**
   * Obtiene el detalle completo de un reporte por ticket mediante Drizzle ORM.
   */
  async buscarReportePorTicket(
    codigoTicket: string,
    ciudadanoId?: string
  ): Promise<ReporteDetalleCiudadano | null> {
    const conditions = [eq(reportes.codigoTicket, codigoTicket)];

    if (ciudadanoId) {
      conditions.push(eq(reportes.ciudadanoId, ciudadanoId));
    }

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
        ciudadanoId: reportes.ciudadanoId,
        operadorId: reportes.operadorId,
        resultadoAtencion: reportes.resultadoAtencion,
        motivoNoAtencion: reportes.motivoNoAtencion,
        fechaAtencion: reportes.fechaAtencion,
        geojson: sql<string>`ST_AsGeoJSON(${reportes.geom})`,
        tipoEmergenciaId: tiposEmergencias.tipoEmergenciaId,
        tipoEmergenciaNombre: tiposEmergencias.nombre,
        tipoEmergenciaDescripcion: tiposEmergencias.descripcion,
        tipoEmergenciaInstitucion: tiposEmergencias.institucion,
        tipoEmergenciaActivo: tiposEmergencias.activo,
      })
      .from(reportes)
      .innerJoin(
        tiposEmergencias,
        eq(reportes.tipoEmergenciaId, tiposEmergencias.tipoEmergenciaId)
      )
      .where(and(...conditions))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];

    // Consultar adjuntos asociados usando Drizzle
    const adjuntos = await db
      .select()
      .from(adjuntosMultimedia)
      .where(eq(adjuntosMultimedia.reporteId, row.reporteId))
      .orderBy(asc(adjuntosMultimedia.fechaCarga));

    const detalle: ReporteDetalleCiudadano = {
      reporteId: row.reporteId,
      codigoTicket: row.codigoTicket,
      descripcion: row.descripcion,
      institucionDestino: row.institucionDestino,
      latitud: row.latitud,
      longitud: row.longitud,
      altitud: row.altitud,
      referenciaDireccion: row.referenciaDireccion,
      fueraJurisdiccion: row.fueraJurisdiccion,
      estado: row.estado,
      fechaGeneracionLocal: row.fechaGeneracionLocal,
      actualizadoEn: row.actualizadoEn,
      resultadoAtencion: row.resultadoAtencion,
      motivoNoAtencion: row.motivoNoAtencion,
      fechaAtencion: row.fechaAtencion,
      geojson: row.geojson,
      tipoEmergencia: {
        tipoEmergenciaId: row.tipoEmergenciaId,
        nombre: row.tipoEmergenciaNombre,
        descripcion: row.tipoEmergenciaDescripcion,
        institucion: row.tipoEmergenciaInstitucion,
        activo: row.tipoEmergenciaActivo,
      },
      adjuntos,
    };

    return detalle;
  },

  /**
   * Busca un reporte por su identificador numerico interno mediante Drizzle.
   */
  async buscarReportePorId(reporteId: number): Promise<Reporte | null> {
    const rows = await db
      .select()
      .from(reportes)
      .where(eq(reportes.reporteId, reporteId))
      .limit(1);

    return rows[0] || null;
  },
};
