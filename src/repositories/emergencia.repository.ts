import { db } from '../db/index.js';
import { tiposEmergencias } from '../db/schema/index.js';
import { eq, and, or, asc } from 'drizzle-orm';
import { TipoEmergencia } from '../types/emergencia.types.js';

/**
 * Repositorio de acceso a datos para Tipos de Emergencias y Catalogo.
 * Utiliza Drizzle ORM para consultas completamente tipadas y protegidas contra inyeccion SQL.
 */
export const emergenciaRepository = {
  /**
   * Obtiene la lista de tipos de emergencias filtradas por institucion y estado de activacion.
   */
  async listarTiposEmergencias(
    institucion?: string,
    soloActivos: boolean = true
  ): Promise<TipoEmergencia[]> {
    const conditions = [];

    if (soloActivos) {
      conditions.push(eq(tiposEmergencias.activo, true));
    }

    if (institucion && institucion !== 'TODOS') {
      conditions.push(
        or(
          eq(tiposEmergencias.institucion, institucion),
          eq(tiposEmergencias.institucion, 'AMBOS')
        )
      );
    }

    return db
      .select()
      .from(tiposEmergencias)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(tiposEmergencias.nombre));
  },

  /**
   * Busca un tipo de emergencia especifico por su ID primario.
   */
  async buscarTipoEmergenciaPorId(id: number): Promise<TipoEmergencia | null> {
    const rows = await db
      .select()
      .from(tiposEmergencias)
      .where(eq(tiposEmergencias.tipoEmergenciaId, id))
      .limit(1);

    return rows[0] || null;
  },
};
