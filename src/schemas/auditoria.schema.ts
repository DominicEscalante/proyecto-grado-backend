import { z } from "zod";

export const auditoriaQuerySchema = z.object({
  modulo: z.string().trim().optional(),
  accion: z.string().trim().optional(),
  usuario_id: z.string().trim().optional(),
  fecha_desde: z.coerce.date().optional(),
  fecha_hasta: z.coerce.date().optional(),
  limite: z.coerce.number().int().min(1).max(100).optional().default(50),
  pagina: z.coerce.number().int().min(1).optional().default(1),
});

export type AuditoriaQueryDTO = z.infer<typeof auditoriaQuerySchema>;
