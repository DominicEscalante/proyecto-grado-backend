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
import { mediaStorageService } from './media-storage.service.js';
import { esReferenciaGps, obtenerDireccionAproximada } from './direccion.service.js';
import { publishReportEvent } from './report-events.service.js';

export const ciudadanoService = {
  async buscarCoincidencia(params: { institucion_destino: string; tipo_emergencia_id: number; latitud: number; longitud: number }) {
    const candidato = await reporteRepository.buscarCoincidencia({
      institucionDestino: params.institucion_destino,
      tipoEmergenciaId: params.tipo_emergencia_id,
      latitud: params.latitud,
      longitud: params.longitud,
    });
    return candidato ? {
      reporteId: candidato.reporteId,
      fechaReporte: candidato.fechaGeneracionLocal,
      distanciaMetros: Math.round(Number(candidato.distanciaMetros)),
    } : null;
  },
  async obtenerCatalogoEmergencias(institucion?: string): Promise<TipoEmergencia[]> {
    return emergenciaRepository.listarTiposEmergencias(institucion, true);
  },

  async crearReporte(
    ciudadanoId: string,
    dto: CrearReporteDTO,
    ipOrigen?: string
  ): Promise<Reporte & { geojson: string }> {
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

    let estadoIncidente: string | undefined;
    if (dto.incidente_principal_id) {
      const candidato = await reporteRepository.buscarCoincidencia({
        institucionDestino: dto.institucion_destino,
        tipoEmergenciaId: dto.tipo_emergencia_id,
        latitud: dto.latitud,
        longitud: dto.longitud,
        incidentePrincipalId: dto.incidente_principal_id,
      });
      if (!candidato) {
        throw new AppError('El incidente cercano ya no está disponible. Vuelve a comprobar los reportes próximos.', 409, 'INCIDENTE_NO_DISPONIBLE');
      }
      estadoIncidente = candidato.estado;
    }

    const fueraJurisdiccion = !estaDentroDeLaPaz(dto.latitud, dto.longitud);

    const codigoTicket = await generarCodigoTicket();

    const fechaGeneracionLocal = dto.fecha_generacion_local
      ? new Date(dto.fecha_generacion_local)
      : new Date();

    // 6. Persistir en la base de datos con PostGIS SRID 4326
    const requiereDireccion = esReferenciaGps(dto.referencia_direccion);
    const nuevoReporte = await reporteRepository.crearReporte({
      codigoTicket,
      descripcion: dto.descripcion,
      institucionDestino: dto.institucion_destino,
      latitud: dto.latitud,
      longitud: dto.longitud,
      altitud: dto.altitud ?? null,
      referenciaDireccion: dto.referencia_direccion,
      fueraJurisdiccion,
      fechaGeneracionLocal,
      tipoEmergenciaId: dto.tipo_emergencia_id,
      ciudadanoId,
      incidentePrincipalId: dto.incidente_principal_id,
      estadoInicial: estadoIncidente,
    });

    if (requiereDireccion) {
      void obtenerDireccionAproximada(dto.latitud, dto.longitud).then(async (direccion) => {
        if (direccion) await reporteRepository.actualizarDireccion(nuevoReporte.reporteId, direccion);
      }).catch((error) => console.warn('No se pudo resolver la dirección del reporte:', error));
    }

    void publishReportEvent(dto.institucion_destino).catch((error) => console.error('No se pudo notificar el nuevo reporte:', error));

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

    const uploaded: { tipoArchivo: string; urlArchivo: string; storagePath?: string }[] = [];
    try {
      for (const file of files) {
        const stored = await mediaStorageService.upload(file);
        uploaded.push({ tipoArchivo: file.mimetype, urlArchivo: stored.url, storagePath: stored.storagePath });
      }
    } catch (error) {
      await mediaStorageService.remove(uploaded.flatMap((file) => file.storagePath ? [file.storagePath] : []));
      throw error;
    }

    let adjuntosInsertados: AdjuntoMultimedia[];
    try {
      adjuntosInsertados = await reporteRepository.insertarAdjuntos(
        reporte.reporteId,
        uploaded.map(({ tipoArchivo, urlArchivo }) => ({ tipoArchivo, urlArchivo }))
      );
    } catch (error) {
      await mediaStorageService.remove(uploaded.flatMap((file) => file.storagePath ? [file.storagePath] : []));
      throw error;
    }

    await registrarAuditoria({
      accion: 'ADJUNTOS_SUBIDOS',
      modulo: 'CIUDADANO',
      usuarioId: ciudadanoId,
      ipOrigen,
      detalles: {
        codigoTicket,
        cantidadAdjuntos: files.length,
        archivos: uploaded.map((a) => a.urlArchivo),
      },
    });

    void publishReportEvent(reporte.institucionDestino).catch((error) => console.error('No se pudo notificar la evidencia:', error));
    return adjuntosInsertados;
  },

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
