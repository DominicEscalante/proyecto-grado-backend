import { Usuario, NewUsuario } from '../db/schema/usuarios.js';
import { Rol, Permiso } from '../db/schema/roles-permisos.js';
import {
  ActualizarPerfilDTO,
  CambiarEstadoUsuarioDTO,
  ListarUsuariosQueryDTO,
  CrearOperadorDTO,
  EditarUsuarioDTO,
} from '../schemas/usuario.schema.js';

export type { Usuario, NewUsuario, Rol, Permiso };
export type {
  ActualizarPerfilDTO,
  CambiarEstadoUsuarioDTO,
  ListarUsuariosQueryDTO,
  CrearOperadorDTO,
  EditarUsuarioDTO,
};


/**
 * Representacion estructurada de un usuario para el panel de administracion
 */
export interface UsuarioItemAdmin {
  id: string;
  usuarioId: number;
  name: string;
  email: string;
  ci: string;
  complemento: string | null;
  nombres: string;
  apellidos: string;
  telefono: string;
  institucion: string | null;
  rango: string | null;
  identidadVerificada: boolean;
  estadoCuenta: boolean;
  createdAt: Date;
  updatedAt: Date;
  rol: {
    rolId: number;
    nombre: string;
    descripcion: string | null;
  };
}

/**
 * Resultado paginado del listado de usuarios para el panel de administracion
 */
export interface ListarUsuariosResultado {
  items: UsuarioItemAdmin[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}
