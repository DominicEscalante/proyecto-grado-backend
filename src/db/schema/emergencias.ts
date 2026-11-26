import { pgTable, serial, varchar, text, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { reportes } from './reportes.js';

export const tiposEmergencias = pgTable('tipos_emergencias', {
  tipoEmergenciaId: serial('tipo_emergencia_id').primaryKey(),
  nombre: varchar('nombre', { length: 80 }).notNull().unique(),
  descripcion: text('descripcion'),
  institucion: varchar('institucion', { length: 20 }).notNull().default('POLICIA'),
  activo: boolean('activo').notNull().default(true),
});

export const tiposEmergenciasRelations = relations(tiposEmergencias, ({ many }) => ({
  reportes: many(reportes),
}));

export type TipoEmergencia = typeof tiposEmergencias.$inferSelect;
export type NewTipoEmergencia = typeof tiposEmergencias.$inferInsert;
