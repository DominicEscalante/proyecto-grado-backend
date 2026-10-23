import { db } from '../db/index.js';
import { usuarios, roles, verification } from '../db/schema/index.js';
import { eq, and, or, ilike, isNull, desc, count } from 'drizzle-orm';
import {
  ListarUsuariosQueryDTO,
  ListarUsuariosResultado,
  UsuarioItemAdmin,
  Usuario,
} from '../types/usuario.types.js';

/**
 * Repositorio de datos para Usuarios, Cuentas y Verificaciones.
 * Implementa consultas 100% tipadas mediante Drizzle ORM sin SQL crudo.
 */
export const usuarioRepository = {
  /**
   * Obtiene la lista paginada de usuarios (ciudadanos y operadores) con filtros avanzados.
   */
  async listarUsuarios(params: ListarUsuariosQueryDTO): Promise<ListarUsuariosResultado> {
    const conditions = [];

    // Filtro por rol
    if (params.rol_id) {
      conditions.push(eq(usuarios.rolId, params.rol_id));
    }

    // Filtro por institucion (POLICIA, BOMBEROS o NINGUNA para ciudadanos)
    if (params.institucion && params.institucion !== 'TODOS') {
      if (params.institucion === 'NINGUNA') {
        conditions.push(isNull(usuarios.institucion));
      } else {
        conditions.push(eq(usuarios.institucion, params.institucion));
      }
    }

    // Filtro por estado de cuenta
    if (params.estado_cuenta && params.estado_cuenta !== 'TODOS') {
      const estadoBool = params.estado_cuenta === 'true';
      conditions.push(eq(usuarios.estadoCuenta, estadoBool));
    }

    // Filtro de busqueda libre por texto
    if (params.busqueda && params.busqueda.trim() !== '') {
      const termino = `%${params.busqueda.trim()}%`;
      conditions.push(
        or(
          ilike(usuarios.name, termino),
          ilike(usuarios.email, termino),
          ilike(usuarios.ci, termino),
          ilike(usuarios.telefono, termino),
          ilike(usuarios.nombres, termino),
          ilike(usuarios.apellidos, termino)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const limite = params.limite || 20;
    const pagina = params.pagina || 1;
    const offset = (pagina - 1) * limite;

    // 1. Conteo total con Drizzle
    const totalResult = await db
      .select({ total: count() })
      .from(usuarios)
      .where(whereClause);

    const total = totalResult[0]?.total ?? 0;

    // 2. Consulta paginada con relacion a roles
    const rows = await db
      .select({
        id: usuarios.id,
        usuarioId: usuarios.usuarioId,
        name: usuarios.name,
        email: usuarios.email,
        ci: usuarios.ci,
        complemento: usuarios.complemento,
        nombres: usuarios.nombres,
        apellidos: usuarios.apellidos,
        telefono: usuarios.telefono,
        institucion: usuarios.institucion,
        rango: usuarios.rango,
        identidadVerificada: usuarios.identidadVerificada,
        estadoCuenta: usuarios.estadoCuenta,
        createdAt: usuarios.createdAt,
        updatedAt: usuarios.updatedAt,
        rolId: roles.rolId,
        rolNombre: roles.nombre,
        rolDescripcion: roles.descripcion,
      })
      .from(usuarios)
      .innerJoin(roles, eq(usuarios.rolId, roles.rolId))
      .where(whereClause)
      .orderBy(desc(usuarios.createdAt))
      .limit(limite)
      .offset(offset);

    const items: UsuarioItemAdmin[] = rows.map((row) => ({
      id: row.id,
      usuarioId: row.usuarioId,
      name: row.name,
      email: row.email,
      ci: row.ci,
      complemento: row.complemento,
      nombres: row.nombres,
      apellidos: row.apellidos,
      telefono: row.telefono,
      institucion: row.institucion,
      rango: row.rango,
      identidadVerificada: row.identidadVerificada,
      estadoCuenta: row.estadoCuenta,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      rol: {
        rolId: row.rolId,
        nombre: row.rolNombre,
        descripcion: row.rolDescripcion,
      },
    }));

    const totalPaginas = Math.ceil(total / limite) || 1;

    return {
      items,
      total,
      pagina,
      limite,
      totalPaginas,
    };
  },

  /**
   * Busca los datos de un usuario por su identificador primario con rol asociado.
   */
  async buscarUsuarioPorId(id: string): Promise<UsuarioItemAdmin | null> {
    const rows = await db
      .select({
        id: usuarios.id,
        usuarioId: usuarios.usuarioId,
        name: usuarios.name,
        email: usuarios.email,
        ci: usuarios.ci,
        complemento: usuarios.complemento,
        nombres: usuarios.nombres,
        apellidos: usuarios.apellidos,
        telefono: usuarios.telefono,
        institucion: usuarios.institucion,
        rango: usuarios.rango,
        identidadVerificada: usuarios.identidadVerificada,
        estadoCuenta: usuarios.estadoCuenta,
        createdAt: usuarios.createdAt,
        updatedAt: usuarios.updatedAt,
        rolId: roles.rolId,
        rolNombre: roles.nombre,
        rolDescripcion: roles.descripcion,
      })
      .from(usuarios)
      .innerJoin(roles, eq(usuarios.rolId, roles.rolId))
      .where(eq(usuarios.id, id))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];

    return {
      id: row.id,
      usuarioId: row.usuarioId,
      name: row.name,
      email: row.email,
      ci: row.ci,
      complemento: row.complemento,
      nombres: row.nombres,
      apellidos: row.apellidos,
      telefono: row.telefono,
      institucion: row.institucion,
      rango: row.rango,
      identidadVerificada: row.identidadVerificada,
      estadoCuenta: row.estadoCuenta,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      rol: {
        rolId: row.rolId,
        nombre: row.rolNombre,
        descripcion: row.rolDescripcion,
      },
    };
  },

  /**
   * Busca un usuario por su direccion de correo electronico.
   */
  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const rows = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, email.toLowerCase().trim()))
      .limit(1);

    return rows[0] || null;
  },

  /**
   * Busca un usuario por su numero de celular.
   */
  async buscarPorTelefono(telefono: string): Promise<Usuario | null> {
    const rows = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.telefono, telefono.trim()))
      .limit(1);

    return rows[0] || null;
  },

  /**
  /**
   * Busca un usuario por su cedula de identidad o identificador/alias simple.
   */
  async buscarPorCi(ci: string): Promise<Usuario | null> {
    const ciTrim = ci.trim();
    const ciNorm = ciTrim.replace(/\s+/g, '').toLowerCase();

    const rows = await db
      .select()
      .from(usuarios)
      .where(
        or(
          ilike(usuarios.ci, ciTrim),
          ilike(usuarios.ci, ciNorm),
          ilike(usuarios.email, `${ciNorm}@%`)
        )
      )
      .limit(1);

    return rows[0] || null;
  },

  /**
   * Actualiza atributos de un usuario en la base de datos.
   */
  async actualizarUsuario(
    id: string,
    datos: Partial<typeof usuarios.$inferInsert>
  ): Promise<UsuarioItemAdmin | null> {
    await db
      .update(usuarios)
      .set({
        ...datos,
        updatedAt: new Date(),
      })
      .where(eq(usuarios.id, id));

    return this.buscarUsuarioPorId(id);
  },

  /**
   * Aplica cambio de estado de cuenta (baja logica o reactivacion - HU-16).
   */
  async cambiarEstadoCuenta(id: string, estado: boolean): Promise<UsuarioItemAdmin | null> {
    return this.actualizarUsuario(id, { estadoCuenta: estado });
  },

  /**
   * Marca el perfil de un usuario como verificado (HU-03).
   */
  async marcarIdentidadVerificada(
    id: string,
    verificada: boolean = true
  ): Promise<UsuarioItemAdmin | null> {
    return this.actualizarUsuario(id, { identidadVerificada: verificada });
  },

  /**
   * Guarda o actualiza un codigo de verificacion temporal en la tabla verification.
   */
  async guardarCodigoVerificacion(
    identifier: string,
    codigo: string,
    expiraEn: Date
  ): Promise<void> {
    // Elimina codigos previos para el mismo identificador
    await db.delete(verification).where(eq(verification.identifier, identifier));

    await db.insert(verification).values({
      identifier,
      value: codigo,
      expiresAt: expiraEn,
    });
  },

  /**
   * Obtiene el codigo de verificacion activo para un identificador.
   */
  async obtenerCodigoVerificacion(
    identifier: string
  ): Promise<{ value: string; expiresAt: Date } | null> {
    const rows = await db
      .select({
        value: verification.value,
        expiresAt: verification.expiresAt,
      })
      .from(verification)
      .where(eq(verification.identifier, identifier))
      .limit(1);

    return rows[0] || null;
  },

  /**
   * Elimina el codigo de verificacion una vez consumido exitosamente.
   */
  async eliminarCodigoVerificacion(identifier: string): Promise<void> {
    await db.delete(verification).where(eq(verification.identifier, identifier));
  },
};
