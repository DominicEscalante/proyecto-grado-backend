import { pgTable, text, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usuarios } from './usuarios.js';

/**
 * Tabla: account (Better Auth)
 * Credenciales de usuario (contraseñas hasheadas y proveedores OAuth)
 */
export const account = pgTable(
  'account',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    password: text('password'),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
    refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
    scope: text('scope'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => [
    index('account_user_idx').on(table.userId),
  ]
);

/**
 * Tabla: session (Better Auth)
 * Sesiones de usuario activas con tokens y metadatos del cliente
 */
export const session = pgTable(
  'session',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    token: text('token').notNull().unique(),
    userId: text('userId')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expiresAt').notNull(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => [
    index('session_user_idx').on(table.userId),
    index('session_token_idx').on(table.token),
  ]
);

/**
 * Tabla: passkey (Better Auth Plugin WebAuthn)
 * Credenciales FIDO2/Passkey para autenticación biométrica en la PWA móvil
 */
export const passkey = pgTable(
  'passkey',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name'),
    publicKey: text('publicKey').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    credentialID: text('credentialID').notNull(),
    counter: integer('counter').notNull().default(0),
    deviceType: text('deviceType').notNull().default('singleDevice'),
    backedUp: boolean('backedUp').notNull().default(false),
    transports: text('transports'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => [
    index('passkey_user_idx').on(table.userId),
    index('passkey_credential_idx').on(table.credentialID),
  ]
);

/**
 * Tabla: verification (Better Auth)
 * Tokens de verificación temporal (OTP, email verification, password reset)
 */
export const verification = pgTable(
  'verification',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expiresAt').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => [
    index('verification_identifier_idx').on(table.identifier),
  ]
);

// Relaciones Drizzle
export const accountRelations = relations(account, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [account.userId],
    references: [usuarios.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [session.userId],
    references: [usuarios.id],
  }),
}));

export const passkeyRelations = relations(passkey, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [passkey.userId],
    references: [usuarios.id],
  }),
}));

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Passkey = typeof passkey.$inferSelect;
export type NewPasskey = typeof passkey.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;
