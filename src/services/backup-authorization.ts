const authorizations = new Map<string, string>();
const validityMs = 60_000;

export function authorizeBackup(token: string, userId: string) {
  authorizations.set(token, userId);
  setTimeout(() => authorizations.delete(token), validityMs).unref();
}

export function consumeBackupAuthorization(token: unknown, userId: string): boolean {
  if (typeof token !== 'string' || authorizations.get(token) !== userId) return false;
  return authorizations.delete(token);
}
