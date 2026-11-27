import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { account, session } from '../db/schema/auth.js';
import { usuarios } from '../db/schema/usuarios.js';
import { AppError } from '../utils/error.util.js';

export async function changeInitialPassword(userId: string, current: string, next: string) {
  await db.transaction(async (tx) => {
    const [user] = await tx.select({
      pending: usuarios.cambioPasswordPendiente,
      active: usuarios.estadoCuenta,
      role: usuarios.rolId,
    }).from(usuarios).where(eq(usuarios.id, userId)).for('update');

    if (!user?.active || !user.pending || (user.role !== 2 && user.role !== 3)) {
      throw new AppError('Esta cuenta no tiene un cambio inicial pendiente.', 403, 'PASSWORD_CHANGE_NOT_PENDING');
    }

    const [credential] = await tx.select().from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, 'credential'))).for('update');
    if (!credential?.password || !await verifyPassword({ hash: credential.password, password: current })) {
      throw new AppError('La contraseña temporal es incorrecta.', 400, 'INVALID_TEMPORARY_PASSWORD');
    }

    await tx.update(account).set({ password: await hashPassword(next), updatedAt: new Date() })
      .where(eq(account.id, credential.id));
    await tx.update(usuarios).set({ cambioPasswordPendiente: false }).where(eq(usuarios.id, userId));
    await tx.delete(session).where(eq(session.userId, userId));
  });
}
