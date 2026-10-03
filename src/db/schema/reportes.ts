import {
  pgTable,
  serial,
  varchar,
  text,
  numeric,
  timestamp,
  integer,
  geometry,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tiposEmergencias } from './emergencias.js';
import { usuarios } from './usuarios.js';

/**
 * Tabla Principal: Reportes de Incidentes y Emergencias Urbanas
 * Soporta registro georreferenciado (PostGIS SRID 4326), seguimiento por ticket
 * y ciclo de vida de atención entre Ciudadano y Operadores (Policía/Bomberos).
 */
export const reportes = pgTable(
  'reportes',
  {
    reporteId: serial('reporte_id').primaryKey(),
    codigoTicket: varchar('codigo_ticket', { length: 20 }).notNull().unique(),
    descripcion: text('descripcion').notNull(),

    // Coordenadas Geoespaciales
    latitud: numeric('latitud', { precision: 10, scale: 7 }).notNull(),
    longitud: numeric('longitud', { precision: 10, scale: 7 }).notNull(),
    altitud: numeric('altitud', { precision: 7, scale: 2 }).notNull().default('0'),
    geom: geometry('geom', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
    referenciaDireccion: text('referencia_direccion').notNull(),

    // Ciclo de vida y Estado
    estado: varchar('estado', { length: 25 }).notNull().default('PENDIENTE'),
    fechaGeneracionLocal: timestamp('fecha_generacion_local').notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en').notNull().defaultNow(),

    // Clasificación de la Emergencia
    tipoEmergenciaId: integer('tipo_emergencia_id')
      .notNull()
      .references(() => tiposEmergencias.tipoEmergenciaId, { onDelete: 'restrict' }),

    // Datos de Cierre y Atención
    resultadoAtencion: varchar('resultado_atencion', { length: 20 }),
    motivoNoAtencion: text('motivo_no_atencion'),
    fechaAtencion: timestamp('fecha_atencion'),

    // Actores Involucrados (Vinculados a usuarios.id de Better Auth)
    ciudadanoId: text('ciudadano_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'restrict' }),
    operadorId: text('operador_id')
      .references(() => usuarios.id, { onDelete: 'set null' }),
  },
  (table) => [
    index('reportes_geom_gist').using('gist', table.geom),
    index('reportes_estado_fecha_idx').on(table.estado, table.fechaGeneracionLocal),
    index('reportes_ciudadano_idx').on(table.ciudadanoId),
    index('reportes_operador_idx').on(table.operadorId),
    index('reportes_tipo_emergencia_idx').on(table.tipoEmergenciaId),
  ]
);

/**
 * Tabla: Adjuntos Multimedia (Evidencias fotográficas / videos del reporte)
 */
export const adjuntosMultimedia = pgTable(
  'adjuntos_multimedia',
  {
    adjuntoId: serial('adjunto_id').primaryKey(),
    tipoArchivo: varchar('tipo_archivo', { length: 50 }).notNull(),
    urlArchivo: text('url_archivo').notNull(),
    fechaCarga: timestamp('fecha_carga').notNull().defaultNow(),
    reporteId: integer('reporte_id')
      .notNull()
      .references(() => reportes.reporteId, { onDelete: 'cascade' }),
  },
  (table) => [
    index('adjuntos_reporte_idx').on(table.reporteId),
  ]
);

// Relaciones Drizzle
export const reportesRelations = relations(reportes, ({ one, many }) => ({
  tipoEmergencia: one(tiposEmergencias, {
    fields: [reportes.tipoEmergenciaId],
    references: [tiposEmergencias.tipoEmergenciaId],
  }),
  ciudadano: one(usuarios, {
    fields: [reportes.ciudadanoId],
    references: [usuarios.id],
    relationName: 'ciudadano_reportes',
  }),
  operador: one(usuarios, {
    fields: [reportes.operadorId],
    references: [usuarios.id],
    relationName: 'operador_reportes',
  }),
  adjuntos: many(adjuntosMultimedia),
}));

export const adjuntosMultimediaRelations = relations(adjuntosMultimedia, ({ one }) => ({
  reporte: one(reportes, {
    fields: [adjuntosMultimedia.reporteId],
    references: [reportes.reporteId],
  }),
}));

export type Reporte = typeof reportes.$inferSelect;
export type NewReporte = typeof reportes.$inferInsert;
export type AdjuntoMultimedia = typeof adjuntosMultimedia.$inferSelect;
export type NewAdjuntoMultimedia = typeof adjuntosMultimedia.$inferInsert;
