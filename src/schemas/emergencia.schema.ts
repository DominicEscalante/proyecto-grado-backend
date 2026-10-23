import { z } from 'zod';

export const institucionDestinoEnum = z.enum(['POLICIA', 'BOMBEROS'], {
  errorMap: () => ({ message: "La institución de destino debe ser 'POLICIA' o 'BOMBEROS'." }),
});

export const catalogoEmergenciasQuerySchema = z.object({
  institucion: z.enum(['POLICIA', 'BOMBEROS', 'TODOS']).optional().default('TODOS'),
  activo: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .optional()
    .default(true),
});

export type CatalogoEmergenciasQuery = z.infer<typeof catalogoEmergenciasQuerySchema>;
export type InstitucionDestino = z.infer<typeof institucionDestinoEnum>;
