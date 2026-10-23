import { z } from 'zod';
import { catalogoEmergenciasQuerySchema, institucionDestinoEnum } from '../schemas/emergencia.schema.js';
import { TipoEmergencia, NewTipoEmergencia } from '../db/schema/emergencias.js';

export type { TipoEmergencia, NewTipoEmergencia };
export type CatalogoEmergenciasQuery = z.infer<typeof catalogoEmergenciasQuerySchema>;
export type InstitucionDestino = z.infer<typeof institucionDestinoEnum>;
