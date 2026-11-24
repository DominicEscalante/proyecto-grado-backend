import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import type { ConfirmarRegistroDTO, RegistroCiudadanoDTO } from '../schemas/auth.schema.js';
import { AppError } from '../utils/error.util.js';
import { authService } from './auth.service.js';
import { emailService } from './email.service.js';

function firmaRegistro(dto: RegistroCiudadanoDTO, solicitudId: string, codigo: string) {
  return createHmac('sha256', env.BETTER_AUTH_SECRET)
    .update(JSON.stringify([
      solicitudId, codigo, dto.email.toLowerCase(), dto.password,
      dto.name, dto.ci, dto.complemento, dto.nombres, dto.apellidos, dto.telefono,
    ]))
    .digest('hex');
}

export const registroOtpService = {
  async solicitar(dto: RegistroCiudadanoDTO) {
    await authService.validarDatosRegistro(dto);
    const email = dto.email.toLowerCase();
    const identifier = `registro:${email}`;
    const solicitudId = randomUUID();
    const codigo = randomInt(1_000_000).toString().padStart(6, '0');
    const firma = firmaRegistro(dto, solicitudId, codigo);

    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [identifier]);
      const reciente = await client.query(
        `select 1 from verification
         where identifier = $1 and "createdAt" > now() - interval '60 seconds'`,
        [identifier]
      );
      if (reciente.rowCount) {
        throw new AppError('Espera un minuto para solicitar otro código.', 429, 'OTP_REENVIO_LIMITADO');
      }
      await client.query('delete from verification where identifier = $1', [identifier]);
      await client.query(
        `insert into verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt")
         values ($1, $2, $3, now() + interval '15 minutes', now(), now())`,
        [solicitudId, identifier, `0:${firma}`]
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }

    const envio = await emailService.enviarCodigoOtpEmail(email, 'Ciudadano', codigo);
    if (!envio.success || (env.NODE_ENV === 'production' && envio.simulated)) {
      await pool.query('delete from verification where id = $1', [solicitudId]);
      throw new AppError('No se pudo enviar el código. Inténtalo nuevamente.', 503, 'OTP_ENVIO_FALLIDO');
    }

    return {
      solicitudId,
      ...(env.NODE_ENV !== 'production' && envio.simulated ? { codigoSimulado: codigo } : {}),
    };
  },

  async confirmar({ solicitudId, codigo, ...dto }: ConfirmarRegistroDTO, ipOrigen?: string) {
    const firma = firmaRegistro(dto, solicitudId, codigo);
    const resultado = await pool.query<{ valido: boolean }>(
      `update verification
       set value = (split_part(value, ':', 1)::int + 1)::text || ':' || split_part(value, ':', 2),
           "expiresAt" = case when split_part(value, ':', 2) = $3 then now() else "expiresAt" end
       where id = $1 and identifier = $2 and "expiresAt" > now()
         and split_part(value, ':', 1)::int < 5
       returning split_part(value, ':', 2) = $3 as valido`,
      [solicitudId, `registro:${dto.email.toLowerCase()}`, firma]
    );
    if (!resultado.rows.length) {
      throw new AppError('Solicita un código nuevo para continuar.', 400, 'CODIGO_EXPIRADO');
    }
    if (!resultado.rows[0].valido) {
      throw new AppError('El código ingresado es incorrecto.', 400, 'CODIGO_INVALIDO');
    }

    return authService.registroCiudadano(dto, ipOrigen);
  },
};
