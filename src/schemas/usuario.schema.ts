import { nuevaPasswordSchema } from './password.schema.js';
import { z } from 'zod';

export const actualizarPerfilSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').optional(),
  telefono: z
    .string()
    .trim()
    .regex(/^[67]\d{7}$/, 'El telefono debe ser un numero celular boliviano valido (8 digitos iniciando con 6 o 7).')
    .optional(),
  image: z.string().url('La URL de imagen debe ser valida.').optional(),
});

/**
 * Esquema para cambio de estado / baja logica de usuarios (HU-16)
 */
export const cambiarEstadoUsuarioSchema = z.object({
  estado_cuenta: z.boolean({ required_error: 'El estado de cuenta es requerido.' }),
  motivo: z.string().trim().max(500).min(5, 'Debe especificar un motivo para el cambio de estado.').optional(),
});

/**
 * Esquema para restablecimiento administrativo de contraseñas (HU-16)
 */
export const restablecerPasswordSchema = z.object({
  password: nuevaPasswordSchema,
});

/**
 * Esquema para creacion de nuevos operadores por el administrador (HU-16 - Figura 3.18)
 */
export const crearOperadorSchema = z.object({
  email: z.string().trim().email('Formato de correo electronico invalido.').max(254),
  password: nuevaPasswordSchema,
  ci: z
    .string()
    .trim()
    .min(5, 'El CI debe tener al menos 5 caracteres.')
    .max(15, 'El CI no puede exceder los 15 caracteres.').regex(/^\d+$/, 'El CI debe contener solo dígitos.'),
  complemento: z.string().trim().regex(/^[A-Za-z0-9]*$/).max(5).optional(),
  nombres: z.string().trim().min(2, 'Los nombres deben tener al menos 2 caracteres.').max(100).regex(/^[\p{L}\p{M}]+(?:[ .'’-]+[\p{L}\p{M}]+)*$/u, 'Usa letras en nombres y apellidos.'),
  apellidos: z.string().trim().min(2, 'Los apellidos deben tener al menos 2 caracteres.').max(100).regex(/^[\p{L}\p{M}]+(?:[ .'’-]+[\p{L}\p{M}]+)*$/u, 'Usa letras en nombres y apellidos.'),
  telefono: z
    .string()
    .trim()
    .regex(/^[67]\d{7}$/, 'El telefono debe ser un celular boliviano valido (8 digitos).'),
  institucion: z.enum(['POLICIA', 'BOMBEROS'], {
    errorMap: () => ({ message: "La institucion debe ser 'POLICIA' o 'BOMBEROS'." }),
  }),
  rango: z.string().trim().max(50).min(2, 'El rango institucional es obligatorio (ej. Sargento, Teniente).'),
  rol_id: z.coerce.number().int().refine((val) => val === 2 || val === 3, {
    message: 'El rol debe ser 2 (OPERADOR_POLICIA) o 3 (OPERADOR_BOMBEROS).',
  }),
}).refine(data => data.rol_id === (data.institucion === 'POLICIA' ? 2 : 3), { path: ['rol_id'], message: 'El rol debe corresponder a la institución.' });

/**
 * Esquema para edicion de datos de usuario/operador por el administrador (HU-16)
 */
export const editarUsuarioSchema = z.object({
  nombres: z.string().trim().min(2).max(100).regex(/^[\p{L}\p{M}]+(?:[ .'’-]+[\p{L}\p{M}]+)*$/u, 'Usa letras en nombres y apellidos.').optional(),
  apellidos: z.string().trim().min(2).max(100).regex(/^[\p{L}\p{M}]+(?:[ .'’-]+[\p{L}\p{M}]+)*$/u, 'Usa letras en nombres y apellidos.').optional(),
  telefono: z.string().trim().regex(/^[67]\d{7}$/).optional(),
  institucion: z.enum(['POLICIA', 'BOMBEROS']).optional(),
  rango: z.string().trim().min(2).max(50).optional(),
  rol_id: z.coerce.number().int().min(1).max(4).optional(),
}).strict().refine(data => Object.keys(data).length > 0, 'Ingresa al menos un cambio.')
  .refine(data => data.rol_id === undefined && data.institucion === undefined ||
    data.institucion !== undefined && data.rol_id === (data.institucion === 'POLICIA' ? 2 : 3),
    { path: ['institucion'], message: 'El cambio de institución requiere su rol de operador correspondiente.' });

export const listarUsuariosQuerySchema = z.object({
  busqueda: z.string().trim().max(254).optional(),
  rol_id: z.coerce.number().int().min(1).max(4).optional(),
  institucion: z.enum(['POLICIA', 'BOMBEROS', 'NINGUNA', 'TODOS']).optional().default('TODOS'),
  estado_cuenta: z.enum(['true', 'false', 'TODOS']).optional().default('TODOS'),
  limite: z.coerce.number().int().min(1).max(100).optional().default(20),
  pagina: z.coerce.number().int().min(1).optional().default(1),
});

export type ActualizarPerfilDTO = z.infer<typeof actualizarPerfilSchema>;
export type CambiarEstadoUsuarioDTO = z.infer<typeof cambiarEstadoUsuarioSchema>;
export type CrearOperadorDTO = z.infer<typeof crearOperadorSchema>;
export type EditarUsuarioDTO = z.infer<typeof editarUsuarioSchema>;
export type ListarUsuariosQueryDTO = z.infer<typeof listarUsuariosQuerySchema>;
