import { z } from 'zod';

/**
 * Esquema de validacion para registro de ciudadanos (HU-01)
 */
export const registroCiudadanoSchema = z.object({
  email: z.string().trim().email('Formato de correo electronico invalido.'),
  password: z
    .string()
    .min(8, 'La contrasena debe tener al menos 8 caracteres.')
    .max(128, 'La contrasena no puede exceder los 128 caracteres.'),
  name: z.string().trim().min(3, 'El nombre completo debe tener al menos 3 caracteres.').optional(),
  ci: z
    .string()
    .trim()
    .min(5, 'El CI debe tener al menos 5 caracteres.')
    .max(15, 'El CI no puede exceder los 15 caracteres.'),
  complemento: z.string().trim().max(5, 'El complemento no puede exceder 5 caracteres.').optional(),
  nombres: z.string().trim().min(2, 'Los nombres deben tener al menos 2 caracteres.'),
  apellidos: z.string().trim().min(2, 'Los apellidos deben tener al menos 2 caracteres.'),
  telefono: z
    .string()
    .trim()
    .regex(/^[67]\d{7}$/, 'El telefono debe ser un celular valido en Bolivia (8 digitos iniciando con 6 o 7).'),
});

/**
 * Esquema de inicio de sesion (HU-02)
 * Permite autenticacion multimodal mediante correo electronico, Carnet de Identidad (CI) o numero de celular.
 */
export const loginSchema = z.object({
  identificador: z
    .string({ required_error: 'El correo electronico, CI o numero de celular es requerido.' })
    .trim()
    .min(3, 'El identificador debe tener al menos 3 caracteres.'),
  password: z.string().min(1, 'La contrasena es requerida.'),
});

/**
 * Esquema para confirmacion de validacion de identidad (HU-03)
 */
export const verificarIdentidadSchema = z.object({
  codigo: z
    .string({ required_error: 'El codigo de verificacion es requerido.' })
    .trim()
    .length(6, 'El codigo de verificacion debe contener exactamente 6 digitos.')
    .regex(/^\d{6}$/, 'El codigo de verificacion debe contener exclusivamente digitos numericos.'),
});

export type RegistroCiudadanoDTO = z.infer<typeof registroCiudadanoSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type VerificarIdentidadDTO = z.infer<typeof verificarIdentidadSchema>;
