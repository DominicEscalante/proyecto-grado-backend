import { z } from 'zod';

export const passwordHint = 'Usa entre 15 y 128 caracteres. Evita contraseñas comunes y caracteres repetidos.';
export const nuevaPasswordSchema = z.string().min(15, passwordHint).max(128, passwordHint)
  .refine(value => value.trim().length >= 15 && new Set(value).size >= 4 &&
    !/^(?:password|contraseña|contrasena|qwerty|1234567890|administrador)[\d\W]*$/iu.test(value), passwordHint);
