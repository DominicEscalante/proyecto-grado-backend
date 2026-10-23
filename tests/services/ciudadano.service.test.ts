import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ciudadanoService } from '../../src/services/ciudadano.service.js';
import { emergenciaRepository } from '../../src/repositories/emergencia.repository.js';
import { reporteRepository } from '../../src/repositories/reporte.repository.js';
import * as ticketUtil from '../../src/utils/ticket.util.js';
import * as auditService from '../../src/services/audit.service.js';
import { AppError } from '../../src/utils/error.util.js';
import { CrearReporteDTO } from '../../src/types/reporte.types.js';

vi.mock('../../src/repositories/emergencia.repository.js', () => ({
  emergenciaRepository: {
    listarTiposEmergencias: vi.fn(),
    buscarTipoEmergenciaPorId: vi.fn(),
  },
}));

vi.mock('../../src/repositories/reporte.repository.js', () => ({
  reporteRepository: {
    crearReporte: vi.fn(),
    insertarAdjuntos: vi.fn(),
    listarReportesPorCiudadano: vi.fn(),
    buscarReportePorTicket: vi.fn(),
    buscarReportePorId: vi.fn(),
  },
}));

vi.mock('../../src/utils/ticket.util.js', () => ({
  generarCodigoTicket: vi.fn(),
}));

vi.mock('../../src/services/audit.service.js', () => ({
  registrarAuditoria: vi.fn(),
}));

describe('Ciudadano Service - Logica de Negocio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('obtenerCatalogoEmergencias', () => {
    it('debe retornar la lista de emergencias activas delegando al repositorio', async () => {
      const mockLista = [
        {
          tipoEmergenciaId: 1,
          nombre: 'Accidente de Transito',
          descripcion: 'Colisiones',
          institucion: 'POLICIA',
          activo: true,
        },
      ];
      vi.mocked(emergenciaRepository.listarTiposEmergencias).mockResolvedValueOnce(mockLista);

      const resultado = await ciudadanoService.obtenerCatalogoEmergencias('POLICIA');

      expect(emergenciaRepository.listarTiposEmergencias).toHaveBeenCalledWith('POLICIA', true);
      expect(resultado).toEqual(mockLista);
    });
  });

  describe('crearReporte', () => {
    const validDto: CrearReporteDTO = {
      institucion_destino: 'POLICIA',
      tipo_emergencia_id: 1,
      descripcion: 'Vehiculo colisiono contra poste de luz.',
      latitud: -16.4957,
      longitud: -68.1335,
      referencia_direccion: 'Calle Comercio esq. Socabaya',
      fecha_generacion_local: new Date('2026-10-10T12:00:00Z'),
    };

    it('debe lanzar error 404 si el tipo de emergencia no existe o esta inactivo', async () => {
      vi.mocked(emergenciaRepository.buscarTipoEmergenciaPorId).mockResolvedValueOnce(null);

      await expect(
        ciudadanoService.crearReporte('user-123', validDto)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'TIPO_EMERGENCIA_INVALIDO',
      });
    });

    it('debe lanzar error 400 si la institucion del tipo de emergencia no coincide con el destino', async () => {
      vi.mocked(emergenciaRepository.buscarTipoEmergenciaPorId).mockResolvedValueOnce({
        tipoEmergenciaId: 1,
        nombre: 'Incendio Estructural',
        descripcion: 'Fuego activo',
        institucion: 'BOMBEROS', // No coincide con institucion_destino: 'POLICIA'
        activo: true,
      });

      await expect(
        ciudadanoService.crearReporte('user-123', validDto)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INSTITUCION_MISMATCH',
      });
    });

    it('debe crear el reporte correctamente cuando el tipo corresponde a AMBOS', async () => {
      vi.mocked(emergenciaRepository.buscarTipoEmergenciaPorId).mockResolvedValueOnce({
        tipoEmergenciaId: 1,
        nombre: 'Derrumbe en via publica',
        descripcion: 'Riesgo mixto',
        institucion: 'AMBOS',
        activo: true,
      });

      vi.mocked(ticketUtil.generarCodigoTicket).mockResolvedValueOnce('TKT-2026-000100');
      vi.mocked(reporteRepository.crearReporte).mockResolvedValueOnce({
        reporteId: 10,
        codigoTicket: 'TKT-2026-000100',
        descripcion: validDto.descripcion,
        institucionDestino: 'POLICIA',
        latitud: '-16.4957',
        longitud: '-68.1335',
        altitud: '0',
        referenciaDireccion: validDto.referencia_direccion,
        fueraJurisdiccion: false,
        estado: 'PENDIENTE',
        fechaGeneracionLocal: validDto.fecha_generacion_local!,
        actualizadoEn: new Date(),
        tipoEmergenciaId: 1,
        ciudadanoId: 'user-123',
        operadorId: null,
        resultadoAtencion: null,
        motivoNoAtencion: null,
        fechaAtencion: null,
        geojson: '{"type":"Point","coordinates":[-68.1335,-16.4957]}',
      });

      const reporte = await ciudadanoService.crearReporte('user-123', validDto);

      expect(reporte.codigoTicket).toBe('TKT-2026-000100');
      expect(reporte.fueraJurisdiccion).toBe(false);
      expect(auditService.registrarAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'REPORTE_CREADO',
          modulo: 'CIUDADANO',
          usuarioId: 'user-123',
        })
      );
    });

    it('debe marcar fueraJurisdiccion en true si las coordenadas estan fuera de La Paz', async () => {
      vi.mocked(emergenciaRepository.buscarTipoEmergenciaPorId).mockResolvedValueOnce({
        tipoEmergenciaId: 1,
        nombre: 'Accidente de Transito',
        descripcion: 'Colisiones',
        institucion: 'POLICIA',
        activo: true,
      });

      vi.mocked(ticketUtil.generarCodigoTicket).mockResolvedValueOnce('TKT-2026-000101');

      const dtoFuera = {
        ...validDto,
        latitud: -17.7833, // Santa Cruz
        longitud: -63.1821,
      };

      vi.mocked(reporteRepository.crearReporte).mockImplementationOnce(async (params) => {
        return {
          ...params,
          reporteId: 11,
          actualizadoEn: new Date(),
          operadorId: null,
          resultadoAtencion: null,
          motivoNoAtencion: null,
          fechaAtencion: null,
          latitud: String(params.latitud),
          longitud: String(params.longitud),
          altitud: String(params.altitud),
          estado: 'PENDIENTE',
          geojson: '{}',
        };
      });

      const reporte = await ciudadanoService.crearReporte('user-123', dtoFuera);

      expect(reporteRepository.crearReporte).toHaveBeenCalledWith(
        expect.objectContaining({
          fueraJurisdiccion: true,
        })
      );
      expect(reporte.fueraJurisdiccion).toBe(true);
    });
  });

  describe('adjuntarEvidencias', () => {
    it('debe lanzar error 400 si no se envian archivos', async () => {
      await expect(
        ciudadanoService.adjuntarEvidencias('TKT-2026-000001', 'user-123', [])
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'NO_FILES_PROVIDED',
      });
    });

    it('debe lanzar error 404 si el reporte no existe o no pertenece al usuario', async () => {
      vi.mocked(reporteRepository.buscarReportePorTicket).mockResolvedValueOnce(null);

      const fakeFile = {
        mimetype: 'image/jpeg',
        filename: 'foto-1.jpg',
      } as Express.Multer.File;

      await expect(
        ciudadanoService.adjuntarEvidencias('TKT-2026-000001', 'user-123', [fakeFile])
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'REPORTE_NOT_FOUND',
      });
    });

    it('debe adjuntar evidencias correctamente y registrar auditoria', async () => {
      vi.mocked(reporteRepository.buscarReportePorTicket).mockResolvedValueOnce({
        reporteId: 5,
        codigoTicket: 'TKT-2026-000001',
        descripcion: 'Robo',
        institucionDestino: 'POLICIA',
        latitud: '-16.5',
        longitud: '-68.1',
        altitud: '0',
        referenciaDireccion: 'Calle 1',
        fueraJurisdiccion: false,
        estado: 'PENDIENTE',
        fechaGeneracionLocal: new Date(),
        actualizadoEn: new Date(),
        tipoEmergencia: {
          tipoEmergenciaId: 1,
          nombre: 'Robo',
          descripcion: null,
          institucion: 'POLICIA',
          activo: true,
        },
        adjuntos: [],
      });

      const mockAdjuntosInsertados = [
        {
          adjuntoId: 101,
          tipoArchivo: 'image/jpeg',
          urlArchivo: '/uploads/foto-1.jpg',
          fechaCarga: new Date(),
          reporteId: 5,
        },
      ];
      vi.mocked(reporteRepository.insertarAdjuntos).mockResolvedValueOnce(mockAdjuntosInsertados);

      const fakeFile = {
        mimetype: 'image/jpeg',
        filename: 'foto-1.jpg',
      } as Express.Multer.File;

      const resultado = await ciudadanoService.adjuntarEvidencias(
        'TKT-2026-000001',
        'user-123',
        [fakeFile]
      );

      expect(resultado).toEqual(mockAdjuntosInsertados);
      expect(reporteRepository.insertarAdjuntos).toHaveBeenCalledWith(5, [
        { tipoArchivo: 'image/jpeg', urlArchivo: '/uploads/foto-1.jpg' },
      ]);
      expect(auditService.registrarAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'ADJUNTOS_SUBIDOS',
          usuarioId: 'user-123',
        })
      );
    });
  });

  describe('obtenerDetalleReporte', () => {
    it('debe lanzar error 404 si el reporte no existe para ese ciudadano', async () => {
      vi.mocked(reporteRepository.buscarReportePorTicket).mockResolvedValueOnce(null);

      await expect(
        ciudadanoService.obtenerDetalleReporte('TKT-2026-000999', 'user-123')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'REPORTE_NOT_FOUND',
      });
    });

    it('debe retornar el detalle si existe y le pertenece', async () => {
      const mockDetalle = {
        reporteId: 1,
        codigoTicket: 'TKT-2026-000001',
        descripcion: 'Incendio',
        institucionDestino: 'BOMBEROS',
        latitud: '-16.5',
        longitud: '-68.1',
        altitud: '0',
        referenciaDireccion: 'Av. Busch',
        fueraJurisdiccion: false,
        estado: 'PENDIENTE',
        fechaGeneracionLocal: new Date(),
        actualizadoEn: new Date(),
        tipoEmergencia: {
          tipoEmergenciaId: 2,
          nombre: 'Incendio Estructural',
          descripcion: null,
          institucion: 'BOMBEROS',
          activo: true,
        },
        adjuntos: [],
      };
      vi.mocked(reporteRepository.buscarReportePorTicket).mockResolvedValueOnce(mockDetalle);

      const resultado = await ciudadanoService.obtenerDetalleReporte('TKT-2026-000001', 'user-123');

      expect(resultado).toEqual(mockDetalle);
    });
  });
});
