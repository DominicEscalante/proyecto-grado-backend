import { describe, expect, it } from 'vitest';
import { registroCiudadanoSchema, loginSchema } from '../src/schemas/auth.schema.js';
import { crearOperadorSchema, editarUsuarioSchema, restablecerPasswordSchema } from '../src/schemas/usuario.schema.js';
import { coincidenciasQuerySchema } from '../src/schemas/reporte.schema.js';

const citizen = {
  nombres: 'María José', apellidos: 'Pérez-López', ci: '1234567', complemento: '1A',
  email: 'prueba@example.com', telefono: '71234567', password: 'Tres montañas y un río',
};

describe('Validaciones de entrada', () => {
  it('acepta nombres compuestos y frases de contraseña', () => {
    expect(registroCiudadanoSchema.safeParse(citizen).success).toBe(true);
  });
  it.each([{ ci: 'abcde' }, { nombres: '123' }, { complemento: 'A!' }, { telefono: '123' }, { email: 'correo' }])('rechaza datos personales inválidos', fields => {
    expect(registroCiudadanoSchema.safeParse({ ...citizen, ...fields }).success).toBe(false);
  });
  it.each(['12345678', 'aaaaaaaaaaaaaaaaaa', 'Password123456789', 'x'.repeat(129)])('aplica la política al alta y al restablecimiento', password => {
    expect(registroCiudadanoSchema.safeParse({ ...citizen, password }).success).toBe(false);
    expect(restablecerPasswordSchema.safeParse({ password }).success).toBe(false);
    expect(crearOperadorSchema.safeParse({ ...citizen, password, institucion: 'POLICIA', rol_id: 2, rango: 'Sargento' }).success).toBe(false);
  });
  it('permite autenticar cuentas anteriores', () => {
    expect(loginSchema.safeParse({ identificador: citizen.email, password: 'anterior' }).success).toBe(true);
  });
  it('rechaza roles incompatibles y ediciones vacías', () => {
    expect(editarUsuarioSchema.safeParse({ rol_id: 2, institucion: 'BOMBEROS' }).success).toBe(false);
    expect(editarUsuarioSchema.safeParse({}).success).toBe(false);
  });
  it.each(['', null, true, 91])('rechaza coordenadas no válidas', latitud => {
    expect(coincidenciasQuerySchema.safeParse({ latitud, longitud: -68, tipo_emergencia_id: 1, institucion_destino: 'POLICIA' }).success).toBe(false);
  });
});
