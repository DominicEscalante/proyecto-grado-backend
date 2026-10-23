import { pgTable, serial, varchar, text, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { reportes } from './reportes.js';

/**
 * Tabla de Tipos de Emergencias (Catálogo Policial y de Bomberos)
 * Ej: 'Accidente de Tránsito' (POLICIA), 'Incendio Estructural' (BOMBEROS)
 */
export const tiposEmergencias = pgTable('tipos_emergencias', {
  tipoEmergenciaId: serial('tipo_emergencia_id').primaryKey(),
  nombre: varchar('nombre', { length: 80 }).notNull().unique(),
  descripcion: text('descripcion'),
  // Institución a la que pertenece el tipo de emergencia: 'POLICIA', 'BOMBEROS', 'AMBOS'
  institucion: varchar('institucion', { length: 20 }).notNull().default('POLICIA'),
  activo: boolean('activo').notNull().default(true),
});

// Relaciones Drizzle
export const tiposEmergenciasRelations = relations(tiposEmergencias, ({ many }) => ({
  reportes: many(reportes),
}));

export type TipoEmergencia = typeof tiposEmergencias.$inferSelect;
export type NewTipoEmergencia = typeof tiposEmergencias.$inferInsert;
