import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../../src/services/auth.service.js';
import { usuarioRepository } from '../../src/repositories/usuario.repository.js';
import { auth } from '../../src/config/auth.js';
import { registrarAuditoria } from '../../src/services/audit.service.js';
import { AppError } from '../../src/utils/error.util.js';

vi.mock('../../src/repositories/usuario.repository.js', () => ({
  usuarioRepository: {
    buscarPorEmail: vi.fn(),
    buscarPorCi: vi.fn(),
    buscarPorTelefono: vi.fn(),
    buscarUsuarioPorId: vi.fn(),
    guardarCodigoVerificacion: vi.fn(),
    obtenerCodigoVerificacion: vi.fn(),
    eliminarCodigoVerificacion: vi.fn(),
    marcarIdentidadVerificada: vi.fn(),
  },
}));

vi.mock('../../src/config/auth.js', () => ({
  auth: {
    api: {
      signUpEmail: vi.fn(),
      signInEmail: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/audit.service.js', () => ({
  registrarAuditoria: vi.fn(),
}));

describe('Auth Service - HU-01, HU-02, HU-03', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registroCiudadano (HU-01)', () => {
    const validDto = {
      email: 'nuevo@test.com',
      password: 'Password1234',
      ci: '12345678',
      complemento: '1A',
      nombres: 'Roberto',
      apellidos: 'Gomez',
      telefono: '71234567',
    };

    it('debe registrar un ciudadano correctamente si los datos son unicos', async () => {
      vi.mocked(usuarioRepository.buscarPorEmail).mockResolvedValueOnce(null);
      vi.mocked(usuarioRepository.buscarPorCi).mockResolvedValueOnce(null);
      vi.mocked(usuarioRepository.buscarPorTelefono).mockResolvedValueOnce(null);

      const mockUserResult = {
        user: {
          id: 'usr-nuevo-1',
          email: 'nuevo@test.com',
          name: 'Roberto Gomez',
        },
        token: 'token-sesion-xyz',
      };
      vi.mocked(auth.api.signUpEmail).mockResolvedValueOnce(mockUserResult as any);

      const res = await authService.registroCiudadano(validDto, '127.0.0.1');

      expect(usuarioRepository.buscarPorEmail).toHaveBeenCalledWith(validDto.email);
      expect(usuarioRepository.buscarPorCi).toHaveBeenCalledWith(validDto.ci);
      expect(usuarioRepository.buscarPorTelefono).toHaveBeenCalledWith(validDto.telefono);
      expect(auth.api.signUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            email: 'nuevo@test.com',
            ci: '12345678',
            rol_id: 1,
            identidad_verificada: false,
            estado_cuenta: true,
          }),
        })
      );
      expect(registrarAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'REGISTRO_CIUDADANO',
          modulo: 'AUTH',
          usuarioId: 'usr-nuevo-1',
        })
      );
      expect(res).toEqual(mockUserResult);
    });

    it('debe rechazar el registro si el correo ya existe', async () => {
      vi.mocked(usuarioRepository.buscarPorEmail).mockResolvedValueOnce({ id: 'existing' } as any);

      await expect(
        authService.registroCiudadano(validDto)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'EMAIL_DUPLICADO',
      });
    });

    it('debe rechazar el registro si el CI ya existe', async () => {
      vi.mocked(usuarioRepository.buscarPorEmail).mockResolvedValueOnce(null);
      vi.mocked(usuarioRepository.buscarPorCi).mockResolvedValueOnce({ id: 'existing' } as any);

      await expect(
        authService.registroCiudadano(validDto)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'CI_DUPLICADO',
      });
    });

    it('debe rechazar el registro si el telefono celular ya existe', async () => {
      vi.mocked(usuarioRepository.buscarPorEmail).mockResolvedValueOnce(null);
      vi.mocked(usuarioRepository.buscarPorCi).mockResolvedValueOnce(null);
      vi.mocked(usuarioRepository.buscarPorTelefono).mockResolvedValueOnce({ id: 'existing' } as any);

      await expect(
        authService.registroCiudadano(validDto)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'TELEFONO_DUPLICADO',
      });
    });
  });

  describe('login (HU-02)', () => {
    it('debe permitir inicio de sesion usando correo electronico', async () => {
      const loginDto = {
        identificador: 'ciudadano@test.com',
        password: 'Password1234',
      };

      vi.mocked(usuarioRepository.buscarPorEmail).mockResolvedValueOnce({
        id: 'usr-1',
        email: 'ciudadano@test.com',
        estadoCuenta: true,
      } as any);

      const mockLoginRes = {
        user: { id: 'usr-1', email: 'ciudadano@test.com' },
        session: { id: 'sess-1' },
      };
      vi.mocked(auth.api.signInEmail).mockResolvedValueOnce(mockLoginRes as any);

      const res = await authService.login(loginDto, '127.0.0.1');

      expect(auth.api.signInEmail).toHaveBeenCalledWith({
        body: {
          email: 'ciudadano@test.com',
          password: 'Password1234',
        },
      });
      expect(registrarAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'INICIO_SESION',
          modulo: 'AUTH',
          usuarioId: 'usr-1',
        })
      );
      expect(res).toEqual(mockLoginRes);
    });

    it('debe permitir inicio de sesion usando numero de celular boliviano (8 digitos)', async () => {
      const loginDto = {
        identificador: '70011223',
        password: 'Password1234',
      };

      vi.mocked(usuarioRepository.buscarPorTelefono).mockResolvedValueOnce({
        id: 'usr-1',
        email: 'ciudadano@test.com',
        telefono: '70011223',
        estadoCuenta: true,
      } as any);

      vi.mocked(usuarioRepository.buscarPorEmail).mockResolvedValueOnce({
        id: 'usr-1',
        email: 'ciudadano@test.com',
        estadoCuenta: true,
      } as any);

      const mockLoginRes = {
        user: { id: 'usr-1', email: 'ciudadano@test.com' },
        session: { id: 'sess-1' },
      };
      vi.mocked(auth.api.signInEmail).mockResolvedValueOnce(mockLoginRes as any);

      const res = await authService.login(loginDto, '127.0.0.1');

      expect(usuarioRepository.buscarPorTelefono).toHaveBeenCalledWith('70011223');
      expect(auth.api.signInEmail).toHaveBeenCalledWith({
        body: {
          email: 'ciudadano@test.com',
          password: 'Password1234',
        },
      });
      expect(res).toEqual(mockLoginRes);
    });

    it('debe rechazar si la cuenta se encuentra desactivada', async () => {
      const loginDto = {
        identificador: 'suspendido@test.com',
        password: 'Password1234',
      };

      vi.mocked(usuarioRepository.buscarPorEmail).mockResolvedValueOnce({
        id: 'usr-susp',
        email: 'suspendido@test.com',
        estadoCuenta: false,
      } as any);

      await expect(authService.login(loginDto)).rejects.toMatchObject({
        statusCode: 403,
        code: 'ACCOUNT_DISABLED',
      });
    });

    it('debe permitir inicio de sesion usando Carnet de Identidad (CI)', async () => {
      const loginDto = {
        identificador: '8492011',
        password: 'Password1234',
      };

      vi.mocked(usuarioRepository.buscarPorCi).mockResolvedValueOnce({
        id: 'usr-ci-1',
        email: 'ciudadano.ci@test.com',
        ci: '8492011',
        estadoCuenta: true,
      } as any);

      vi.mocked(usuarioRepository.buscarPorEmail).mockResolvedValueOnce({
        id: 'usr-ci-1',
        email: 'ciudadano.ci@test.com',
        ci: '8492011',
        estadoCuenta: true,
      } as any);

      const mockLoginRes = {
        user: { id: 'usr-ci-1', email: 'ciudadano.ci@test.com' },
        session: { id: 'sess-ci-1' },
      };
      vi.mocked(auth.api.signInEmail).mockResolvedValueOnce(mockLoginRes as any);

      const res = await authService.login(loginDto, '127.0.0.1');

      expect(usuarioRepository.buscarPorCi).toHaveBeenCalledWith('8492011');
      expect(auth.api.signInEmail).toHaveBeenCalledWith({
        body: {
          email: 'ciudadano.ci@test.com',
          password: 'Password1234',
        },
      });
      expect(registrarAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'INICIO_SESION',
          modulo: 'AUTH',
          usuarioId: 'usr-ci-1',
          detalles: expect.objectContaining({
            identificadorUsado: '8492011',
            metodo: 'CI',
          }),
        })
      );
      expect(res).toEqual(mockLoginRes);
    });

    it('debe rechazar si el identificador no coincide con ningun CI, telefono ni correo', async () => {
      const loginDto = {
        identificador: '79998877',
        password: 'Password1234',
      };

      vi.mocked(usuarioRepository.buscarPorCi).mockResolvedValueOnce(null);
      vi.mocked(usuarioRepository.buscarPorTelefono).mockResolvedValueOnce(null);

      await expect(authService.login(loginDto)).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('debe rechazar si la contrasena es incorrecta', async () => {
      const loginDto = {
        identificador: 'usuario@test.com',
        password: 'WrongPassword',
      };

      vi.mocked(usuarioRepository.buscarPorEmail).mockResolvedValueOnce({
        id: 'usr-1',
        email: 'usuario@test.com',
        estadoCuenta: true,
      } as any);

      vi.mocked(auth.api.signInEmail).mockRejectedValueOnce(new Error('Invalid password'));

      await expect(authService.login(loginDto)).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });
  });

  describe('solicitarVerificacionIdentidad (HU-03)', () => {
    it('debe generar y registrar un codigo OTP de 6 digitos para un usuario no verificado', async () => {
      const mockUsuario = {
        id: 'usr-ciud',
        telefono: '71122334',
        identidadVerificada: false,
      };
      vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValueOnce(mockUsuario as any);

      const res = await authService.solicitarVerificacionIdentidad('usr-ciud', '127.0.0.1');

      expect(usuarioRepository.guardarCodigoVerificacion).toHaveBeenCalledWith(
        'identidad:usr-ciud',
        expect.stringMatching(/^\d{6}$/),
        expect.any(Date)
      );
      expect(registrarAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'SOLICITUD_VERIFICACION_IDENTIDAD',
          usuarioId: 'usr-ciud',
        })
      );
      expect(res.mensaje).toBe('Codigo de verificacion emitido exitosamente.');
    });

    it('debe rechazar si el usuario ya tenia la identidad verificada', async () => {
      vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValueOnce({
        id: 'usr-ciud',
        identidadVerificada: true,
      } as any);

      await expect(
        authService.solicitarVerificacionIdentidad('usr-ciud')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'ALREADY_VERIFIED',
      });
    });
  });

  describe('confirmarVerificacionIdentidad (HU-03)', () => {
    it('debe validar el codigo OTP y marcar identidad_verificada como true', async () => {
      const mockUsuario = {
        id: 'usr-ciud',
        ci: '1234567',
        telefono: '71122334',
        identidadVerificada: false,
      };
      vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValueOnce(mockUsuario as any);

      vi.mocked(usuarioRepository.obtenerCodigoVerificacion).mockResolvedValueOnce({
        id: 'rec-1',
        identifier: 'identidad:usr-ciud',
        value: '654321',
        expiresAt: new Date(Date.now() + 60000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const usuarioActualizado = { ...mockUsuario, identidadVerificada: true };
      vi.mocked(usuarioRepository.marcarIdentidadVerificada).mockResolvedValueOnce(
        usuarioActualizado as any
      );

      const res = await authService.confirmarVerificacionIdentidad('usr-ciud', '654321', '127.0.0.1');

      expect(usuarioRepository.marcarIdentidadVerificada).toHaveBeenCalledWith('usr-ciud', true);
      expect(usuarioRepository.eliminarCodigoVerificacion).toHaveBeenCalledWith('identidad:usr-ciud');
      expect(registrarAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'IDENTIDAD_VERIFICADA',
          usuarioId: 'usr-ciud',
        })
      );
      expect(res).toEqual(usuarioActualizado);
    });

    it('debe rechazar si el codigo es incorrecto', async () => {
      vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValueOnce({
        id: 'usr-ciud',
      } as any);

      vi.mocked(usuarioRepository.obtenerCodigoVerificacion).mockResolvedValueOnce({
        id: 'rec-1',
        identifier: 'identidad:usr-ciud',
        value: '111111',
        expiresAt: new Date(Date.now() + 60000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.confirmarVerificacionIdentidad('usr-ciud', '999999')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'CODIGO_INVALIDO',
      });
    });

    it('debe rechazar si el codigo ha expirado', async () => {
      vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValueOnce({
        id: 'usr-ciud',
      } as any);

      vi.mocked(usuarioRepository.obtenerCodigoVerificacion).mockResolvedValueOnce({
        id: 'rec-1',
        identifier: 'identidad:usr-ciud',
        value: '111111',
        expiresAt: new Date(Date.now() - 5000), // Expirado
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.confirmarVerificacionIdentidad('usr-ciud', '111111')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'CODIGO_EXPIRADO',
      });
    });
  });
});
