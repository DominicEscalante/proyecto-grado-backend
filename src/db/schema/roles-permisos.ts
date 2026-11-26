import { pgTable, serial, varchar, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usuarios } from './usuarios.js';

export const roles = pgTable('roles', {
  rolId: serial('rol_id').primaryKey(),
  nombre: varchar('nombre', { length: 50 }).notNull().unique(),
  descripcion: varchar('descripcion', { length: 500 }).notNull(),
});

export const permisos = pgTable('permisos', {
  permisoId: serial('permiso_id').primaryKey(),
  codigo: varchar('codigo', { length: 50 }).notNull().unique(),
  descripcion: varchar('descripcion', { length: 200 }).notNull(),
});

export const permisosRoles = pgTable('permisos_roles', {
  permisosRolId: serial('permisos_rol_id').primaryKey(),
  permisoId: integer('permiso_id')
    .notNull()
    .references(() => permisos.permisoId, { onDelete: 'cascade' }),
  rolId: integer('rol_id')
    .notNull()
    .references(() => roles.rolId, { onDelete: 'cascade' }),
});

export const rolesRelations = relations(roles, ({ many }) => ({
  permisosRoles: many(permisosRoles),
  usuarios: many(usuarios),
}));

export const permisosRelations = relations(permisos, ({ many }) => ({
  permisosRoles: many(permisosRoles),
}));

export const permisosRolesRelations = relations(permisosRoles, ({ one }) => ({
  rol: one(roles, {
    fields: [permisosRoles.rolId],
    references: [roles.rolId],
  }),
  permiso: one(permisos, {
    fields: [permisosRoles.permisoId],
    references: [permisos.permisoId],
  }),
}));

export type Rol = typeof roles.$inferSelect;
export type NewRol = typeof roles.$inferInsert;
export type Permiso = typeof permisos.$inferSelect;
export type NewPermiso = typeof permisos.$inferInsert;
export type PermisoRol = typeof permisosRoles.$inferSelect;
export type NewPermisoRol = typeof permisosRoles.$inferInsert;
