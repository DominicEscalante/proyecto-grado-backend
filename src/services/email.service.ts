import { Resend } from 'resend';
import { env } from '../config/env.js';

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/**
 * Plantilla HTML accesible y profesional para la emision de codigos OTP de identidad.
 */
function buildOtpEmailHtml(nombre: string, codigo: string): string {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código de Verificación - AMPAR</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
      <!-- Header con gradiente institucional -->
      <tr>
        <td style="background: linear-gradient(135deg, #143601 0%, #245501 100%); padding: 32px 28px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 1px;">AMPAR</h1>
          <p style="margin: 6px 0 0; color: rgba(255, 255, 255, 0.85); font-size: 13px; font-weight: 500;">
            Sistema de Reportes y Emergencias Ciudadanas
          </p>
        </td>
      </tr>

      <!-- Cuerpo del Mensaje -->
      <tr>
        <td style="padding: 36px 32px 28px;">
          <h2 style="margin: 0 0 12px; font-size: 18px; color: #111827; font-weight: 700;">
            Hola, ${nombre || 'Ciudadano'}
          </h2>
          <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #4b5563;">
            Para validar tu identidad y completar la activación de tu cuenta ciudadana en <strong>AMPAR</strong>, ingresa el siguiente código de verificación de un solo uso (OTP):
          </p>

          <!-- Bloque de Codigo OTP -->
          <div style="background-color: #f0fdf4; border: 2px dashed #86efac; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #143601; display: inline-block;">
              ${codigo}
            </span>
          </div>

          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-align: center;">
            ⏱ Este código tiene una validez de <strong>15 minutos</strong>.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 20px;">

          <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
            Si tú no solicitaste este registro ni iniciaste sesión en el sistema, por favor ignora este correo. Ningún funcionario te solicitará este código.
          </p>
        </td>
      </tr>

      <!-- Pie de Pagina -->
      <tr>
        <td style="background-color: #f9fafb; padding: 18px 32px; text-align: center; border-top: 1px solid #f3f4f6;">
          <p style="margin: 0; font-size: 11px; color: #9ca3af;">
            AMPAR · Plataforma de Seguridad y Gestión Geoespacial · La Paz, Bolivia
          </p>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

export const emailService = {
  /**
   * Envia codigo OTP por correo electronico mediante la API de Resend (Plan Gratuito).
   * En ausencia de API Key o en desarrollo local, simula el envio imprimiendo el codigo en consola.
   */
  async enviarCodigoOtpEmail(
    destinatario: string,
    nombre: string,
    codigo: string
  ): Promise<{ success: boolean; id?: string; simulated?: boolean }> {
    if (!resendClient || !env.RESEND_API_KEY) {
      console.log('----------------------------------------------------');
      console.log('✉️  [RESEND MOCK / DEV] Email de Verificación OTP:');
      console.log(`   Destinatario: ${destinatario} (${nombre})`);
      console.log(`   Código OTP:   ${codigo}`);
      console.log(`   Válido por:   15 minutos`);
      console.log('----------------------------------------------------');
      return { success: true, simulated: true };
    }

    try {
      const response = await resendClient.emails.send({
        from: env.EMAIL_FROM,
        to: [destinatario],
        subject: `${codigo} es tu código de verificación - AMPAR`,
        html: buildOtpEmailHtml(nombre, codigo),
      });

      if (response.error) {
        console.error('Error al enviar correo con Resend:', response.error);
        // En desarrollo local o si el email de prueba es rechazado por el sandbox de Resend,
        // no bloqueamos el flujo de la aplicacion
        if (env.NODE_ENV !== 'production') {
          console.log(`[FALLBACK DEV]: Código OTP para ${destinatario}: ${codigo}`);
          return { success: true, simulated: true };
        }
        return { success: false };
      }

      console.log(`✉️ Correo OTP enviado con éxito a ${destinatario} (ID: ${response.data?.id})`);
      return { success: true, id: response.data?.id };
    } catch (error: any) {
      console.error('Excepción al conectar con la API de Resend:', error?.message || error);
      if (env.NODE_ENV !== 'production') {
        console.log(`[FALLBACK DEV]: Código OTP para ${destinatario}: ${codigo}`);
        return { success: true, simulated: true };
      }
      return { success: false };
    }
  },
};
