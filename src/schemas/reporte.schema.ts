import { z } from 'zod';
import { institucionDestinoEnum } from './emergencia.schema.js';

export const estadoReporteEnum = z.enum(
  ['PENDIENTE', 'ASIGNADO', 'DESPACHADO', 'ATENDIDO', 'RECHAZADO'],
  {
    errorMap: () => ({ message: 'Estado de reporte no válido.' }),
  }
);

/**
 * Esquema de validación para la creación de un nuevo reporte ciudadano.
 * Soporta sincronización offline mediante `fecha_generacion_local`.
 */
export const crearReporteSchema = z.object({
  institucion_destino: institucionDestinoEnum,
  tipo_emergencia_id: z.coerce
    .number({ invalid_type_error: 'El tipo de emergencia debe ser un número entero.' })
    .int()
    .positive('Debe seleccionar un tipo de emergencia válido.'),
  descripcion: z
    .string({ required_error: 'La descripción o notas adicionales son obligatorias.' })
    .trim()
    .min(5, 'La descripción debe tener al menos 5 caracteres.')
    .max(2000, 'La descripción no puede exceder los 2000 caracteres.'),
  latitud: z.coerce
    .number({ invalid_type_error: 'La latitud GPS es requerida y debe ser numérica.' })
    .min(-90, 'Latitud mínima inválida (-90).')
    .max(90, 'Latitud máxima inválida (90).'),
  longitud: z.coerce
    .number({ invalid_type_error: 'La longitud GPS es requerida y debe ser numérica.' })
    .min(-180, 'Longitud mínima inválida (-180).')
    .max(180, 'Longitud máxima inválida (180).'),
  altitud: z.coerce.number().optional().default(0),
  referencia_direccion: z
    .string({ required_error: 'La referencia de la dirección o calles es obligatoria.' })
    .trim()
    .min(3, 'La referencia de la dirección debe tener al menos 3 caracteres.')
    .max(500, 'La referencia de dirección no puede exceder los 500 caracteres.'),
  fecha_generacion_local: z.coerce
    .date()
    .optional()
    .default(() => new Date()),
});

/**
 * Esquema de parámetros para adjuntar evidencias multimedia a un reporte.
 */
export const ticketParamSchema = z.object({
  ticket: z
    .string({ required_error: 'El código de ticket es obligatorio.' })
    .regex(/^TKT-\d{4}-\d{6}$/, 'Formato de ticket inválido (ej. TKT-2026-000001).'),
});

/**
 * Esquema para filtrar los reportes en el historial del ciudadano.
 */
export const misReportesQuerySchema = z.object({
  estado: z
    .enum(['PENDIENTE', 'ASIGNADO', 'DESPACHADO', 'ATENDIDO', 'RECHAZADO', 'TODOS'])
    .optional()
    .default('TODOS'),
  institucion: z.enum(['POLICIA', 'BOMBEROS', 'TODOS']).optional().default('TODOS'),
  limite: z.coerce.number().int().min(1).max(50).optional().default(20),
  pagina: z.coerce.number().int().min(1).optional().default(1),
});

export type CrearReporteDTO = z.infer<typeof crearReporteSchema>;
export type TicketParamDTO = z.infer<typeof ticketParamSchema>;
export type MisReportesQueryDTO = z.infer<typeof misReportesQuerySchema>;
export type EstadoReporte = z.infer<typeof estadoReporteEnum>;
