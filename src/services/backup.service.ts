import { execFile } from 'node:child_process';
import { mkdtemp, rmdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { env } from '../config/env.js';
import { AppError } from '../utils/error.util.js';

const run = promisify(execFile);
let backupRunning = false;

export async function withDatabaseBackup(
  deliver: (file: string, filename: string) => Promise<void>,
): Promise<void> {
  if (backupRunning) {
    throw new AppError('Ya se está generando un respaldo.', 409, 'BACKUP_RUNNING');
  }
  backupRunning = true;
  let directory: string | undefined;
  let file: string | undefined;
  try {
    directory = await mkdtemp(join(tmpdir(), 'ampar-backup-'));
    const filename = `ampar-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`;
    file = join(directory, filename);
    try {
      await run('pg_dump', [
        '--host', env.DB_HOST, '--port', String(env.DB_PORT), '--username', env.DB_USER,
        '--dbname', env.DB_NAME, '--no-password', '--format=custom', '--compress=6',
        '--lock-wait-timeout=5s', '--file', file,
      ], {
        timeout: 300_000,
        windowsHide: true,
        env: { ...process.env, PGPASSWORD: env.DB_PASSWORD, PGSSLMODE: env.DB_SSL ? 'require' : 'disable' },
      });
    } catch {
      throw new AppError('No se pudo generar el respaldo de la base de datos.', 503, 'BACKUP_FAILED');
    }
    await deliver(file, filename);
  } finally {
    try {
      if (file) await rm(file, { force: true });
      if (directory) await rmdir(directory);
    } finally {
      backupRunning = false;
    }
  }
}
