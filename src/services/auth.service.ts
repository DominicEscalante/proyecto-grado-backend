import { auth } from '../config/auth.js';
import { usuarioRepository } from '../repositories/usuario.repository.js';
import { registrarAuditoria } from './audit.service.js';
import { emailService } from './email.service.js';
import { AppError } from '../utils/error.util.js';
import { env } from '../config/env.js';
import {
  RegistroCiudadanoDTO,
  LoginDTO,
} from '../schemas/auth.schema.js';

/**
 * Servicio de Dominio para Autenticacion, Registro e Identidad.
 * Implementa la logica para HU-01 (Registro), HU-02 (Login) y HU-03 (Validacion de Identidad).
 */
export const authService = {
  /**
   * Registra un nuevo ciudadano con datos personales, carnet y celular (HU-01).
   */
  async registroCiudadano(dto: RegistroCiudadanoDTO, ipOrigen?: string) {
    // 1. Validar unicidad de correo
    const existeEmail = await usuarioRepository.buscarPorEmail(dto.email);
    if (existeEmail) {
      throw new AppError(
        'El correo electronico ya se encuentra registrado en el sistema.',
        400,
        'EMAIL_DUPLICADO'
      );
    }

    // 2. Validar unicidad de CI
    const existeCi = await usuarioRepository.buscarPorCi(dto.ci);
    if (existeCi) {
      throw new AppError(
        'El numero de Carnet de Identidad ya se encuentra registrado.',
        400,
        'CI_DUPLICADO'
      );
    }

    // 3. Validar unicidad de telefono celular
    const existeTelefono = await usuarioRepository.buscarPorTelefono(dto.telefono);
    if (existeTelefono) {
      throw new AppError(
        'El numero de celular ya esta asociado a otra cuenta.',
        400,
        'TELEFONO_DUPLICADO'
      );
    }

    const nombreCompleto = dto.name || `${dto.nombres} ${dto.apellidos}`;

    // 4. Crear usuario mediante Better Auth
    const authResult = await auth.api.signUpEmail({
      body: {
        email: dto.email.toLowerCase().trim(),
        password: dto.password,
        name: nombreCompleto,
        ci: dto.ci.trim(),
        complemento: dto.complemento?.trim() || null,
        nombres: dto.nombres.trim(),
        apellidos: dto.apellidos.trim(),
        telefono: dto.telefono.trim(),
        rol_id: 1, // CIUDADANO
        identidad_verificada: false,
        estado_cuenta: true,
      } as any,
    });

    if (!authResult || !authResult.user) {
      throw new AppError(
        'Ocurrio un error al registrar la cuenta de usuario.',
        500,
        'REGISTRATION_FAILED'
      );
    }

    // 5. Registro inmutable de auditoria
    await registrarAuditoria({
      accion: 'REGISTRO_CIUDADANO',
      modulo: 'AUTH',
      usuarioId: authResult.user.id,
      ipOrigen,
      detalles: {
        email: dto.email,
        ci: dto.ci,
        telefono: dto.telefono,
      },
    });

    // 6. Emision automatica del primer codigo OTP de verificacion al correo registrado
    try {
      await authService.solicitarVerificacionIdentidad(authResult.user.id, ipOrigen);
    } catch (otpError) {
      console.warn('Advertencia: No se pudo despachar el primer OTP en el registro:', otpError);
    }

    return authResult;
  },

  /**
   * Inicia sesion con credenciales por correo electronico, Carnet de Identidad (CI) o numero de celular (HU-02).
   */
  async login(dto: LoginDTO, ipOrigen?: string) {
    const idTrim = dto.identificador.trim();
    let emailFinal = idTrim.toLowerCase();
    let metodoAcceso: 'EMAIL' | 'CI' | 'CELULAR' = 'EMAIL';
    let usuarioAlternativoPorTelefono: typeof usuarioRepository extends { buscarPorTelefono: (...args: any[]) => Promise<infer U> } ? U : any = null;

    if (idTrim.includes('@')) {
      emailFinal = idTrim.toLowerCase();
      metodoAcceso = 'EMAIL';
    } else {
      // 1. Buscar candidato por Carnet de Identidad (CI) y/o por Celular
      const usuarioPorCi = await usuarioRepository.buscarPorCi(idTrim);
      const usuarioPorTelefono = /^[67]\d{7}$/.test(idTrim)
        ? await usuarioRepository.buscarPorTelefono(idTrim)
        : null;

      if (!usuarioPorCi && !usuarioPorTelefono) {
        throw new AppError('Credenciales invalidas.', 401, 'INVALID_CREDENTIALS');
      }

      if (usuarioPorCi) {
        emailFinal = usuarioPorCi.email;
        metodoAcceso = 'CI';
        // Guardar referencia por si el identificador coincidia con un telefono diferente
        if (usuarioPorTelefono && usuarioPorTelefono.id !== usuarioPorCi.id) {
          usuarioAlternativoPorTelefono = usuarioPorTelefono;
        }
      } else if (usuarioPorTelefono) {
        emailFinal = usuarioPorTelefono.email;
        metodoAcceso = 'CELULAR';
      }
    }

    // Verificar si la cuenta esta habilitada
    const usuario = await usuarioRepository.buscarPorEmail(emailFinal);
    if (usuario && !usuario.estadoCuenta) {
      throw new AppError(
        'Cuenta inactiva o suspendida. Contacte al administrador.',
        403,
        'ACCOUNT_DISABLED'
      );
    }

    // Autenticar con Better Auth
    try {
      const loginResult = await auth.api.signInEmail({
        body: {
          email: emailFinal,
          password: dto.password,
        },
      });

      if (!loginResult || !loginResult.user) {
        throw new AppError('Credenciales invalidas.', 401, 'INVALID_CREDENTIALS');
      }

      // Registro de auditoria
      await registrarAuditoria({
        accion: 'INICIO_SESION',
        modulo: 'AUTH',
        usuarioId: loginResult.user.id,
        ipOrigen,
        detalles: {
          identificadorUsado: dto.identificador,
          metodo: metodoAcceso,
        },
      });

      return loginResult;
    } catch (error: any) {
      // Si fallo con CI pero existia un usuario alternativo con ese mismo numero de celular, intentar con dicho usuario
      if (usuarioAlternativoPorTelefono && usuarioAlternativoPorTelefono.estadoCuenta) {
        try {
          const reintentoResult = await auth.api.signInEmail({
            body: {
              email: usuarioAlternativoPorTelefono.email,
              password: dto.password,
            },
          });

          if (reintentoResult && reintentoResult.user) {
            await registrarAuditoria({
              accion: 'INICIO_SESION',
              modulo: 'AUTH',
              usuarioId: reintentoResult.user.id,
              ipOrigen,
              detalles: {
                identificadorUsado: dto.identificador,
                metodo: 'CELULAR',
              },
            });

            return reintentoResult;
          }
        } catch {
          // Si tambien falla, propaga INVALID_CREDENTIALS
        }
      }

      if (error instanceof AppError) throw error;
      throw new AppError('Credenciales invalidas.', 401, 'INVALID_CREDENTIALS');
    }
  },

  /**
   * Genera y envia codigo para verificacion de identidad por celular (HU-03).
   */
  async solicitarVerificacionIdentidad(usuarioId: string, ipOrigen?: string) {
    const usuario = await usuarioRepository.buscarUsuarioPorId(usuarioId);
    if (!usuario) {
      throw new AppError('Usuario no encontrado.', 404, 'USUARIO_NOT_FOUND');
    }

    if (usuario.identidadVerificada) {
      throw new AppError(
        'La identidad de esta cuenta ya se encuentra verificada.',
        400,
        'ALREADY_VERIFIED'
      );
    }

    // Generar codigo numerico de 6 digitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEn = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    const key = `identidad:${usuario.id}`;
    await usuarioRepository.guardarCodigoVerificacion(key, codigo, expiraEn);

    // Enviar codigo OTP por correo electronico mediante Resend
    await emailService.enviarCodigoOtpEmail(
      usuario.email,
      usuario.nombres || usuario.name,
      codigo
    );

    await registrarAuditoria({
      accion: 'SOLICITUD_VERIFICACION_IDENTIDAD',
      modulo: 'AUTH',
      usuarioId: usuario.id,
      ipOrigen,
      detalles: {
        email: usuario.email,
        telefono: usuario.telefono,
      },
    });

    return {
      mensaje: 'Codigo de verificacion emitido exitosamente.',
      expiraEn,
      // En modo local o dev se retorna el codigo para facilitar pruebas en Postman y PWA
      codigoSimulado: env.NODE_ENV !== 'production' ? codigo : undefined,
    };
  },

  /**
   * Valida el codigo y marca la cuenta como identidad verificada (HU-03).
   */
  async confirmarVerificacionIdentidad(
    usuarioId: string,
    codigo: string,
    ipOrigen?: string
  ) {
    const usuario = await usuarioRepository.buscarUsuarioPorId(usuarioId);
    if (!usuario) {
      throw new AppError('Usuario no encontrado.', 404, 'USUARIO_NOT_FOUND');
    }

    const key = `identidad:${usuario.id}`;
    const registro = await usuarioRepository.obtenerCodigoVerificacion(key);

    if (!registro) {
      throw new AppError(
        'No existe una solicitud de verificacion activa o el codigo ha expirado.',
        400,
        'CODIGO_EXPIRADO'
      );
    }

    if (new Date() > registro.expiresAt) {
      await usuarioRepository.eliminarCodigoVerificacion(key);
      throw new AppError(
        'El codigo de verificacion ha expirado. Solicite uno nuevo.',
        400,
        'CODIGO_EXPIRADO'
      );
    }

    if (registro.value !== codigo.trim()) {
      throw new AppError(
        'El codigo de verificacion ingresado es incorrecto.',
        400,
        'CODIGO_INVALIDO'
      );
    }

    // Marcar usuario como verificado
    const usuarioActualizado = await usuarioRepository.marcarIdentidadVerificada(
      usuario.id,
      true
    );

    // Eliminar codigo ya utilizado
    await usuarioRepository.eliminarCodigoVerificacion(key);

    // Auditoria
    await registrarAuditoria({
      accion: 'IDENTIDAD_VERIFICADA',
      modulo: 'AUTH',
      usuarioId: usuario.id,
      ipOrigen,
      detalles: {
        ci: usuario.ci,
        telefono: usuario.telefono,
      },
    });

    return usuarioActualizado;
  },
};
