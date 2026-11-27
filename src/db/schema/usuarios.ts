import { pgTable, text, boolean, timestamp, varchar, integer, serial, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { roles } from './roles-permisos.js';
import { account, session, passkey } from './auth.js';
import { reportes } from './reportes.js';
import { registrosAuditoria } from './auditoria.js';

export const usuarios = pgTable(
  'usuarios',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Correlativo entero para numeración y soporte legado del modelo
    usuarioId: serial('usuario_id').unique(),

    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),

    ci: varchar('ci', { length: 15 }).notNull(),
    complemento: varchar('complemento', { length: 5 }),
    nombres: varchar('nombres', { length: 100 }).notNull(),
    apellidos: varchar('apellidos', { length: 100 }).notNull(),
    telefono: varchar('telefono', { length: 15 }).notNull(),
    institucion: varchar('institucion', { length: 20 }), // 'POLICIA', 'BOMBEROS', null para ciudadanos
    rango: varchar('rango', { length: 50 }),             // Rango institucional (operadores)
    identidadVerificada: boolean('identidad_verificada').notNull().default(false),
    cambioPasswordPendiente: boolean('cambio_password_pendiente').notNull().default(false),
    estadoCuenta: boolean('estado_cuenta').notNull().default(true),

    rolId: integer('rol_id')
      .notNull()
      .references(() => roles.rolId, { onDelete: 'restrict' }),
  },
  (table) => [
    index('usuarios_ci_idx').on(table.ci),
    index('usuarios_rol_idx').on(table.rolId),
  ]
);

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  rol: one(roles, {
    fields: [usuarios.rolId],
    references: [roles.rolId],
  }),
  accounts: many(account),
  sessions: many(session),
  passkeys: many(passkey),
  reportesComoCiudadano: many(reportes, { relationName: 'ciudadano_reportes' }),
  reportesComoOperador: many(reportes, { relationName: 'operador_reportes' }),
  registrosAuditoria: many(registrosAuditoria),
}));

export type Usuario = typeof usuarios.$inferSelect;
export type NewUsuario = typeof usuarios.$inferInsert;
