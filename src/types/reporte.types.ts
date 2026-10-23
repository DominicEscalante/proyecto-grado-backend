import { Reporte, NewReporte, AdjuntoMultimedia, NewAdjuntoMultimedia } from '../db/schema/reportes.js';
import { TipoEmergencia } from '../db/schema/emergencias.js';
import {
  CrearReporteDTO,
  TicketParamDTO,
  MisReportesQueryDTO,
  EstadoReporte,
} from '../schemas/reporte.schema.js';

export type { Reporte, NewReporte, AdjuntoMultimedia, NewAdjuntoMultimedia };
export type { CrearReporteDTO, TicketParamDTO, MisReportesQueryDTO, EstadoReporte };

/**
 * Resumen de reporte para la lista del ciudadano (Mis Reportes)
 */
export interface ReporteItemCiudadano {
  reporteId: number;
  codigoTicket: string;
  descripcion: string;
  institucionDestino: string;
  estado: string;
  fechaGeneracionLocal: Date;
  actualizadoEn: Date;
  tipoEmergencia: {
    tipoEmergenciaId: number;
    nombre: string;
  };
  totalAdjuntos: number;
  primerAdjuntoUrl: string | null;
}

/**
 * Detalle completo de un reporte para seguimiento en la PWA
 */
export interface ReporteDetalleCiudadano {
  reporteId: number;
  codigoTicket: string;
  descripcion: string;
  institucionDestino: string;
  latitud: string;
  longitud: string;
  altitud: string;
  referenciaDireccion: string;
  fueraJurisdiccion: boolean;
  estado: string;
  fechaGeneracionLocal: Date;
  actualizadoEn: Date;
  tipoEmergencia: TipoEmergencia;
  adjuntos: AdjuntoMultimedia[];
  resultadoAtencion?: string | null;
  motivoNoAtencion?: string | null;
  fechaAtencion?: Date | null;
  geojson?: string | null;
}

