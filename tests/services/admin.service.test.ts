import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from '../../src/services/admin.service.js';
import { usuarioRepository } from '../../src/repositories/usuario.repository.js';
import { auth } from '../../src/config/auth.js';
import { registrarAuditoria } from '../../src/services/audit.service.js';
import { AppError } from '../../src/utils/error.util.js';
import { ListarUsuariosQueryDTO, CrearOperadorDTO, EditarUsuarioDTO } from '../../src/types/usuario.types.js';

vi.mock('../../src/repositories/usuario.repository.js', () => ({
  usuarioRepository: {
    listarUsuarios: vi.fn(),
    buscarUsuarioPorId: vi.fn(),
    buscarPorEmail: vi.fn(),
    buscarPorCi: vi.fn(),
    buscarPorTelefono: vi.fn(),
    actualizarUsuario: vi.fn(),
    cambiarEstadoCuenta: vi.fn(),
  },
}));

vi.mock('../../src/config/auth.js', () => ({
  auth: {
    api: {
      signUpEmail: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/audit.service.js', () => ({
  registrarAuditoria: vi.fn(),
}));

describe('Admin Service - Gestion de Usuarios (HU-16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listarUsuarios', () => {
    it('debe delegar la consulta con filtros al repositorio de usuarios', async () => {
      const mockQuery: ListarUsuariosQueryDTO = {
        busqueda: 'Carlos',
        rol_id: 2,
        institucion: 'POLICIA',
        estado_cuenta: 'true',
        limite: 10,
        pagina: 1,
      };

      const mockResultado = {
        items: [
          {
            id: 'usr-dev-policia',
            usuarioId: 2,
            name: 'Carlos Mamani',
            email: 'policia@test.com',
            ci: '7654321',
            complemento: null,
            nombres: 'Carlos',
            apellidos: 'Mamani',
            telefono: '71122334',
            institucion: 'POLICIA',
            rango: 'Sargento',
            identidadVerificada: true,
            estadoCuenta: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            rol: {
              rolId: 2,
              nombre: 'OPERADOR_POLICIA',
              descripcion: null,
            },
          },
        ],
        total: 1,
        pagina: 1,
        limite: 10,
        totalPaginas: 1,
      };

      vi.mocked(usuarioRepository.listarUsuarios).mockResolvedValueOnce(mockResultado);

      const resultado = await adminService.listarUsuarios(mockQuery);

      expect(usuarioRepository.listarUsuarios).toHaveBeenCalledWith(mockQuery);
      expect(resultado).toEqual(mockResultado);
    });
  });

  describe('obtenerUsuarioPorId', () => {
    it('debe retornar los datos del usuario si existe', async () => {
      const mockUsuario = {
        id: 'usr-dev-ciudadano',
        usuarioId: 1,
        name: 'Juan Perez',
        email: 'ciudadano@test.com',
        ci: '1234567',
        complemento: null,
        nombres: 'Juan',
        apellidos: 'Perez',
        telefono: '70011223',
        institucion: null,
        rango: null,
        identidadVerificada: true,
        estadoCuenta: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        rol: {
          rolId: 1,
          nombre: 'CIUDADANO',
          descripcion: null,
        },
      };

      vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValueOnce(mockUsuario);

      const resultado = await adminService.obtenerUsuarioPorId('usr-dev-ciudadano');

      expect(usuarioRepository.buscarUsuarioPorId).toHaveBeenCalledWith('usr-dev-ciudadano');
      expect(resultado).toEqual(mockUsuario);
    });

    it('debe lanzar error 404 si el usuario no existe', async () => {
      vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValueOnce(null);

      await expect(
        adminService.obtenerUsuarioPorId('usr-inexistente')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'USUARIO_NOT_FOUND',
      });
    });
  });

  describe('crearOperador', () => {
    const dto: CrearOperadorDTO = {
      email: 'sargento.lopez@policia.gob.bo',
      password: 'SecurePassword123',
      ci: '8877665',
      nombres: 'Marcelo',
      apellidos: 'Lopez',
      telefono: '76543210',
      institucion: 'POLICIA',
      rango: 'Sargento Primero',
      rol_id: 2,
    };

    it('debe registrar un nuevo operador policial y registrar auditoria', async () => {
      vi.mocked(usuarioRepository.buscarPorEmail).mockResolvedValueOnce(null);
      vi.mocked(usuarioRepository.buscarPorCi).mockResolvedValueOnce(null);
      vi.mocked(usuarioRepository.buscarPorTelefono).mockResolvedValueOnce(null);

      vi.mocked(auth.api.signUpEmail).mockResolvedValueOnce({
        user: { id: 'usr-op-1', email: dto.email },
      } as any);

      const mockOperadorCreado = {
        id: 'usr-op-1',
        name: 'Marcelo Lopez',
        email: dto.email,
        ci: dto.ci,
        institucion: 'POLICIA',
        rango: 'Sargento Primero',
        rolId: 2,
      };
      vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValueOnce(mockOperadorCreado as any);

      const res = await adminService.crearOperador('admin-1', dto, '127.0.0.1');

      expect(auth.api.signUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            email: dto.email,
            ci: dto.ci,
            institucion: 'POLICIA',
            rango: 'Sargento Primero',
            rol_id: 2,
            identidad_verificada: true,
            estado_cuenta: true,
          }),
        })
      );
      expect(registrarAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'OPERADOR_CREADO',
          modulo: 'ADMIN',
          usuarioId: 'admin-1',
        })
      );
      expect(res).toEqual(mockOperadorCreado);
    });

    it('debe rechazar si el correo ya esta registrado', async () => {
      vi.mocked(usuarioRepository.buscarPorEmail).mockResolvedValueOnce({ id: 'exists' } as any);

      await expect(adminService.crearOperador('admin-1', dto)).rejects.toMatchObject({
        statusCode: 400,
        code: 'EMAIL_DUPLICADO',
      });
    });

    it('debe rechazar si el carnet de identidad ya esta registrado', async () => {
      vi.mocked(usuarioRepository.buscarPorEmail).mockResolvedValueOnce(null);
      vi.mocked(usuarioRepository.buscarPorCi).mockResolvedValueOnce({ id: 'exists' } as any);

      await expect(adminService.crearOperador('admin-1', dto)).rejects.toMatchObject({
        statusCode: 400,
        code: 'CI_DUPLICADO',
      });
    });

    it('debe rechazar si el telefono celular ya esta registrado', async () => {
      vi.mocked(usuarioRepository.buscarPorEmail).mockResolvedValueOnce(null);
      vi.mocked(usuarioRepository.buscarPorCi).mockResolvedValueOnce(null);
      vi.mocked(usuarioRepository.buscarPorTelefono).mockResolvedValueOnce({ id: 'exists' } as any);

      await expect(adminService.crearOperador('admin-1', dto)).rejects.toMatchObject({
        statusCode: 400,
        code: 'TELEFONO_DUPLICADO',
      });
    });
  });

  describe('editarUsuario', () => {
    it('debe modificar datos de un usuario existente y registrar auditoria', async () => {
      const usuarioExistente = {
        id: 'usr-edit-1',
        nombres: 'Pedro',
        apellidos: 'Vargas',
      };
      vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValueOnce(usuarioExistente as any);

      const dto: EditarUsuarioDTO = {
        rango: 'Teniente',
        telefono: '72233445',
      };

      const usuarioModificado = { ...usuarioExistente, rango: 'Teniente', telefono: '72233445' };
      vi.mocked(usuarioRepository.actualizarUsuario).mockResolvedValueOnce(usuarioModificado as any);

      const res = await adminService.editarUsuario('admin-1', 'usr-edit-1', dto, '127.0.0.1');

      expect(usuarioRepository.actualizarUsuario).toHaveBeenCalledWith(
        'usr-edit-1',
        expect.objectContaining({
          rango: 'Teniente',
          telefono: '72233445',
        })
      );
      expect(registrarAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'USUARIO_MODIFICADO',
          usuarioId: 'admin-1',
        })
      );
      expect(res).toEqual(usuarioModificado);
    });

    it('debe lanzar 404 si el usuario a editar no existe', async () => {
      vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValueOnce(null);

      await expect(
        adminService.editarUsuario('admin-1', 'usr-inexistente', { telefono: '71122334' })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'USUARIO_NOT_FOUND',
      });
    });
  });

  describe('cambiarEstadoUsuario (Baja logica / Reactivacion)', () => {
    it('debe desactivar la cuenta del usuario y registrar el motivo en auditoria', async () => {
      const mockUsuario = { id: 'usr-target', estadoCuenta: true };
      vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValueOnce(mockUsuario as any);

      const mockActualizado = { id: 'usr-target', estadoCuenta: false };
      vi.mocked(usuarioRepository.cambiarEstadoCuenta).mockResolvedValueOnce(mockActualizado as any);

      const res = await adminService.cambiarEstadoUsuario(
        'admin-1',
        'usr-target',
        false,
        'Conducta inapropiada en reportes falsos',
        '127.0.0.1'
      );

      expect(usuarioRepository.cambiarEstadoCuenta).toHaveBeenCalledWith('usr-target', false);
      expect(registrarAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'USUARIO_DESACTIVADO',
          usuarioId: 'admin-1',
          detalles: expect.objectContaining({
            nuevoEstado: false,
            motivo: 'Conducta inapropiada en reportes falsos',
          }),
        })
      );
      expect(res).toEqual(mockActualizado);
    });

    it('debe reactivar la cuenta del usuario y registrar auditoria de reactivacion', async () => {
      const mockUsuario = { id: 'usr-target', estadoCuenta: false };
      vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValueOnce(mockUsuario as any);

      const mockActualizado = { id: 'usr-target', estadoCuenta: true };
      vi.mocked(usuarioRepository.cambiarEstadoCuenta).mockResolvedValueOnce(mockActualizado as any);

      const res = await adminService.cambiarEstadoUsuario(
        'admin-1',
        'usr-target',
        true,
        'Reincorporacion a la unidad de bomberos',
        '127.0.0.1'
      );

      expect(usuarioRepository.cambiarEstadoCuenta).toHaveBeenCalledWith('usr-target', true);
      expect(registrarAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'USUARIO_REACTIVADO',
          usuarioId: 'admin-1',
          detalles: expect.objectContaining({
            nuevoEstado: true,
            motivo: 'Reincorporacion a la unidad de bomberos',
          }),
        })
      );
      expect(res).toEqual(mockActualizado);
    });

    it('debe lanzar 404 si el usuario para cambio de estado no existe', async () => {
      vi.mocked(usuarioRepository.buscarUsuarioPorId).mockResolvedValueOnce(null);

      await expect(
        adminService.cambiarEstadoUsuario('admin-1', 'usr-inexistente', false)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'USUARIO_NOT_FOUND',
      });
    });
  });
});
