import { usuarioRepository } from '../repositories/usuario.repository.js';
import { auth } from '../config/auth.js';
import { registrarAuditoria } from './audit.service.js';
import { AppError } from '../utils/error.util.js';
import {
  ListarUsuariosQueryDTO,
  ListarUsuariosResultado,
  UsuarioItemAdmin,
  CrearOperadorDTO,
  EditarUsuarioDTO,
} from '../types/usuario.types.js';

/**
 * Servicio de Dominio para el Modulo de Administracion y Gestion de Usuarios (HU-16).
 * Maneja la logica de negocio, consultas de usuarios, filtros, bajas logicas y altas de operadores.
 */
export const adminService = {
  /**
   * Obtiene la lista paginada de todos los usuarios (ciudadanos y operadores) con filtros (HU-16).
   */
  async listarUsuarios(query: ListarUsuariosQueryDTO): Promise<ListarUsuariosResultado> {
    return usuarioRepository.listarUsuarios(query);
  },

  /**
   * Obtiene la informacion detallada de un usuario por su identificador (HU-16).
   */
  async obtenerUsuarioPorId(id: string): Promise<UsuarioItemAdmin> {
    const usuario = await usuarioRepository.buscarUsuarioPorId(id);

    if (!usuario) {
      throw new AppError('Usuario no encontrado.', 404, 'USUARIO_NOT_FOUND');
    }

    return usuario;
  },

  /**
   * Registra un nuevo operador institucional (Policia o Bomberos) por parte del administrador (HU-16).
   */
  async crearOperador(adminId: string, dto: CrearOperadorDTO, ipOrigen?: string) {
    // Validar unicidad
    const existeEmail = await usuarioRepository.buscarPorEmail(dto.email);
    if (existeEmail) {
      throw new AppError('El correo electronico ya se encuentra registrado.', 400, 'EMAIL_DUPLICADO');
    }

    const existeCi = await usuarioRepository.buscarPorCi(dto.ci);
    if (existeCi) {
      throw new AppError('El carnet de identidad ya se encuentra registrado.', 400, 'CI_DUPLICADO');
    }

    const existeTelefono = await usuarioRepository.buscarPorTelefono(dto.telefono);
    if (existeTelefono) {
      throw new AppError('El telefono ya se encuentra asociado a otra cuenta.', 400, 'TELEFONO_DUPLICADO');
    }

    const nombreCompleto = `${dto.nombres} ${dto.apellidos}`;

    // Crear operador mediante Better Auth
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
        institucion: dto.institucion,
        rango: dto.rango.trim(),
        rol_id: dto.rol_id,
        identidad_verificada: true,
        estado_cuenta: true,
      } as any,
    });

    if (!authResult || !authResult.user) {
      throw new AppError('Error al crear la cuenta del operador.', 500, 'CREATION_FAILED');
    }

    // Auditoria
    await registrarAuditoria({
      accion: 'OPERADOR_CREADO',
      modulo: 'ADMIN',
      usuarioId: adminId,
      ipOrigen,
      detalles: {
        operadorCreadoId: authResult.user.id,
        institucion: dto.institucion,
        rango: dto.rango,
        rolId: dto.rol_id,
      },
    });

    return await usuarioRepository.buscarUsuarioPorId(authResult.user.id);
  },

  /**
   * Modifica atributos de un usuario u operador (HU-16 - Boton Editar).
   */
  async editarUsuario(adminId: string, id: string, dto: EditarUsuarioDTO, ipOrigen?: string) {
    const usuarioExistente = await usuarioRepository.buscarUsuarioPorId(id);
    if (!usuarioExistente) {
      throw new AppError('Usuario no encontrado.', 404, 'USUARIO_NOT_FOUND');
    }

    const updateData: any = {};
    if (dto.nombres) updateData.nombres = dto.nombres.trim();
    if (dto.apellidos) updateData.apellidos = dto.apellidos.trim();
    if (dto.nombres || dto.apellidos) {
      const nom = dto.nombres || usuarioExistente.nombres;
      const ape = dto.apellidos || usuarioExistente.apellidos;
      updateData.name = `${nom} ${ape}`;
    }
    if (dto.telefono) updateData.telefono = dto.telefono.trim();
    if (dto.institucion) updateData.institucion = dto.institucion;
    if (dto.rango) updateData.rango = dto.rango.trim();
    if (dto.rol_id !== undefined) updateData.rolId = dto.rol_id;
    if (dto.estado_cuenta !== undefined) updateData.estadoCuenta = dto.estado_cuenta;

    const usuarioActualizado = await usuarioRepository.actualizarUsuario(id, updateData);

    // Auditoria
    await registrarAuditoria({
      accion: 'USUARIO_MODIFICADO',
      modulo: 'ADMIN',
      usuarioId: adminId,
      ipOrigen,
      detalles: {
        usuarioModificadoId: id,
        cambios: dto,
      },
    });

    return usuarioActualizado;
  },

  /**
   * Ejecuta baja logica o reactivacion de un usuario (HU-16 - Desactivar / Reactivar).
   */
  async cambiarEstadoUsuario(
    adminId: string,
    id: string,
    estado: boolean,
    motivo?: string,
    ipOrigen?: string
  ) {
    const usuario = await usuarioRepository.buscarUsuarioPorId(id);
    if (!usuario) {
      throw new AppError('Usuario no encontrado.', 404, 'USUARIO_NOT_FOUND');
    }

    const usuarioActualizado = await usuarioRepository.cambiarEstadoCuenta(id, estado);

    // Auditoria inmutable
    await registrarAuditoria({
      accion: estado ? 'USUARIO_REACTIVADO' : 'USUARIO_DESACTIVADO',
      modulo: 'ADMIN',
      usuarioId: adminId,
      ipOrigen,
      detalles: {
        usuarioAfectadoId: id,
        estadoAnterior: usuario.estadoCuenta,
        nuevoEstado: estado,
        motivo: motivo || 'Sin motivo especificado',
      },
    });

    return usuarioActualizado;
  },
};
