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
  motivo: z.string().trim().min(5, 'Debe especificar un motivo para el cambio de estado.').optional(),
});

/**
 * Esquema para restablecimiento administrativo de contraseñas (HU-16)
 */
export const restablecerPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'La contrasena debe tener al menos 8 caracteres.')
    .max(128, 'La contrasena no puede exceder los 128 caracteres.'),
});

/**
 * Esquema para creacion de nuevos operadores por el administrador (HU-16 - Figura 3.18)
 */
export const crearOperadorSchema = z.object({
  email: z.string().trim().email('Formato de correo electronico invalido.'),
  password: z
    .string()
    .min(8, 'La contrasena debe tener al menos 8 caracteres.')
    .max(128, 'La contrasena no puede exceder los 128 caracteres.'),
  ci: z
    .string()
    .trim()
    .min(5, 'El CI debe tener al menos 5 caracteres.')
    .max(15, 'El CI no puede exceder los 15 caracteres.'),
  complemento: z.string().trim().max(5).optional(),
  nombres: z.string().trim().min(2, 'Los nombres deben tener al menos 2 caracteres.'),
  apellidos: z.string().trim().min(2, 'Los apellidos deben tener al menos 2 caracteres.'),
  telefono: z
    .string()
    .trim()
    .regex(/^[67]\d{7}$/, 'El telefono debe ser un celular boliviano valido (8 digitos).'),
  institucion: z.enum(['POLICIA', 'BOMBEROS'], {
    errorMap: () => ({ message: "La institucion debe ser 'POLICIA' o 'BOMBEROS'." }),
  }),
  rango: z.string().trim().min(2, 'El rango institucional es obligatorio (ej. Sargento, Teniente).'),
  rol_id: z.coerce.number().int().refine((val) => val === 2 || val === 3, {
    message: 'El rol debe ser 2 (OPERADOR_POLICIA) o 3 (OPERADOR_BOMBEROS).',
  }),
});

/**
 * Esquema para edicion de datos de usuario/operador por el administrador (HU-16)
 */
export const editarUsuarioSchema = z.object({
  nombres: z.string().trim().min(2).max(100).optional(),
  apellidos: z.string().trim().min(2).max(100).optional(),
  telefono: z.string().trim().regex(/^[67]\d{7}$/).optional(),
  institucion: z.enum(['POLICIA', 'BOMBEROS']).optional(),
  rango: z.string().trim().min(2).optional(),
  rol_id: z.coerce.number().int().optional(),
  estado_cuenta: z.boolean().optional(),
});

export const listarUsuariosQuerySchema = z.object({
  busqueda: z.string().trim().optional(),
  rol_id: z.coerce.number().int().optional(),
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
