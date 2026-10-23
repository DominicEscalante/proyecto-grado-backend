import { emergenciaRepository } from '../repositories/emergencia.repository.js';
import {
  reporteRepository,
  ListarMisReportesRepoResult,
} from '../repositories/reporte.repository.js';
import { estaDentroDeLaPaz } from '../utils/geo.util.js';
import { generarCodigoTicket } from '../utils/ticket.util.js';
import { registrarAuditoria } from './audit.service.js';
import { AppError } from '../utils/error.util.js';
import {
  CrearReporteDTO,
  MisReportesQueryDTO,
  ReporteDetalleCiudadano,
  AdjuntoMultimedia,
  Reporte,
} from '../types/reporte.types.js';
import { TipoEmergencia } from '../types/emergencia.types.js';

/**
 * Servicio de Dominio para el Módulo Ciudadano.
 * Maneja la lógica de negocio, validaciones de jurisdicción, generación de tickets
 * y auditoría inmutable de eventos.
 */
export const ciudadanoService = {
  /**
   * Obtiene el catálogo de tipos de emergencias disponibles para la selección ciudadana.
   */
  async obtenerCatalogoEmergencias(institucion?: string): Promise<TipoEmergencia[]> {
    return emergenciaRepository.listarTiposEmergencias(institucion, true);
  },

  /**
   * Procesa la creación de un nuevo reporte de emergencia ciudadana.
   * Valida institución, tipo de emergencia, geocerca municipal y sincronización offline.
   */
  async crearReporte(
    ciudadanoId: string,
    dto: CrearReporteDTO,
    ipOrigen?: string
  ): Promise<Reporte & { geojson: string }> {
    // 1. Validar existencia y vigencia del tipo de emergencia
    const tipoEmergencia = await emergenciaRepository.buscarTipoEmergenciaPorId(
      dto.tipo_emergencia_id
    );

    if (!tipoEmergencia || !tipoEmergencia.activo) {
      throw new AppError(
        'El tipo de emergencia seleccionado no existe o no se encuentra activo.',
        404,
        'TIPO_EMERGENCIA_INVALIDO'
      );
    }

    // 2. Validar compatibilidad entre el tipo de emergencia y la institución de destino
    if (
      tipoEmergencia.institucion !== 'AMBOS' &&
      tipoEmergencia.institucion !== dto.institucion_destino
    ) {
      throw new AppError(
        `El tipo de emergencia '${tipoEmergencia.nombre}' corresponde a la institución '${tipoEmergencia.institucion}', no a '${dto.institucion_destino}'.`,
        400,
        'INSTITUCION_MISMATCH'
      );
    }

    // 3. Evaluar límites jurisdiccionales del Municipio de La Paz
    const fueraJurisdiccion = !estaDentroDeLaPaz(dto.latitud, dto.longitud);

    // 4. Generar código unívoco correlativo de ticket
    const codigoTicket = await generarCodigoTicket();

    // 5. Soporte para fecha de generación offline o tiempo actual
    const fechaGeneracionLocal = dto.fecha_generacion_local
      ? new Date(dto.fecha_generacion_local)
      : new Date();

    // 6. Persistir en la base de datos con PostGIS SRID 4326
    const nuevoReporte = await reporteRepository.crearReporte({
      codigoTicket,
      descripcion: dto.descripcion,
      institucionDestino: dto.institucion_destino,
      latitud: dto.latitud,
      longitud: dto.longitud,
      altitud: dto.altitud || 0,
      referenciaDireccion: dto.referencia_direccion,
      fueraJurisdiccion,
      fechaGeneracionLocal,
      tipoEmergenciaId: dto.tipo_emergencia_id,
      ciudadanoId,
    });

    // 7. Registro de auditoría inmutable
    await registrarAuditoria({
      accion: 'REPORTE_CREADO',
      modulo: 'CIUDADANO',
      usuarioId: ciudadanoId,
      ipOrigen,
      detalles: {
        codigoTicket,
        institucionDestino: dto.institucion_destino,
        tipoEmergenciaId: dto.tipo_emergencia_id,
        tipoEmergenciaNombre: tipoEmergencia.nombre,
        latitud: dto.latitud,
        longitud: dto.longitud,
        fueraJurisdiccion,
        fechaGeneracionLocal,
      },
    });

    return nuevoReporte;
  },

  /**
   * Adjunta evidencias fotográficas o de video a un reporte existente.
   */
  async adjuntarEvidencias(
    codigoTicket: string,
    ciudadanoId: string,
    files: Express.Multer.File[],
    ipOrigen?: string
  ): Promise<AdjuntoMultimedia[]> {
    if (!files || files.length === 0) {
      throw new AppError(
        'Debe proporcionar al menos un archivo multimedia para adjuntar.',
        400,
        'NO_FILES_PROVIDED'
      );
    }

    // Verificar que el reporte pertenezca al ciudadano autenticado
    const reporte = await reporteRepository.buscarReportePorTicket(
      codigoTicket,
      ciudadanoId
    );

    if (!reporte) {
      throw new AppError(
        'Reporte no encontrado o no autorizado para adjuntar evidencias.',
        404,
        'REPORTE_NOT_FOUND'
      );
    }

    const payloadAdjuntos = files.map((file) => ({
      tipoArchivo: file.mimetype,
      urlArchivo: `/uploads/${file.filename}`,
    }));

    const adjuntosInsertados = await reporteRepository.insertarAdjuntos(
      reporte.reporteId,
      payloadAdjuntos
    );

    // Registro de auditoría
    await registrarAuditoria({
      accion: 'ADJUNTOS_SUBIDOS',
      modulo: 'CIUDADANO',
      usuarioId: ciudadanoId,
      ipOrigen,
      detalles: {
        codigoTicket,
        cantidadAdjuntos: files.length,
        archivos: payloadAdjuntos.map((a) => a.urlArchivo),
      },
    });

    return adjuntosInsertados;
  },

  /**
   * Lista los reportes generados por el ciudadano autenticado.
   */
  async listarMisReportes(
    ciudadanoId: string,
    query: MisReportesQueryDTO
  ): Promise<ListarMisReportesRepoResult> {
    return reporteRepository.listarReportesPorCiudadano({
      ciudadanoId,
      estado: query.estado,
      institucion: query.institucion,
      limite: query.limite || 20,
      pagina: query.pagina || 1,
    });
  },

  /**
   * Obtiene la información detallada de un reporte por ticket para el ciudadano.
   */
  async obtenerDetalleReporte(
    codigoTicket: string,
    ciudadanoId: string
  ): Promise<ReporteDetalleCiudadano> {
    const reporte = await reporteRepository.buscarReportePorTicket(
      codigoTicket,
      ciudadanoId
    );

    if (!reporte) {
      throw new AppError(
        'El reporte solicitado no existe o no pertenece a su cuenta.',
        404,
        'REPORTE_NOT_FOUND'
      );
    }

    return reporte;
  },
};
