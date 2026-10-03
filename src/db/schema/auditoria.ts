import { pgTable, serial, varchar, jsonb, timestamp, text, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usuarios } from './usuarios.js';

/**
 * Tabla: Registros de Auditoría Inmutable
 * Almacena trazabilidad completa de acciones críticas (autenticación, cambios de estado, despacho de unidades).
 */
export const registrosAuditoria = pgTable(
  'registros_auditoria',
  {
    registroAuditId: serial('registro_audit_id').primaryKey(),
    accion: varchar('accion', { length: 100 }).notNull(),
    modulo: varchar('modulo', { length: 50 }).notNull(),
    ipOrigen: varchar('ip_origen', { length: 45 }).notNull(),
    detalles: jsonb('detalles').notNull(),
    fechaHora: timestamp('fecha_hora').notNull().defaultNow(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'restrict' }),
  },
  (table) => [
    index('audit_fecha_idx').on(table.fechaHora),
    index('audit_usuario_idx').on(table.usuarioId),
    index('audit_modulo_idx').on(table.modulo),
  ]
);

// Relaciones Drizzle
export const registrosAuditoriaRelations = relations(registrosAuditoria, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [registrosAuditoria.usuarioId],
    references: [usuarios.id],
  }),
}));

export type RegistroAuditoria = typeof registrosAuditoria.$inferSelect;
export type NewRegistroAuditoria = typeof registrosAuditoria.$inferInsert;
