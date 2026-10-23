import { describe, it, expect } from 'vitest';
import { estaDentroDeLaPaz, LA_PAZ_BOUNDS } from '../../src/utils/geo.util.js';

describe('Geo Util - estaDentroDeLaPaz', () => {
  it('debe retornar true para coordenadas centricas de la ciudad de La Paz (Plaza Murillo)', () => {
    const latitud = -16.4957;
    const longitud = -68.1335;
    expect(estaDentroDeLaPaz(latitud, longitud)).toBe(true);
  });

  it('debe retornar true para coordenadas de la Zona Sur de La Paz (Calacoto)', () => {
    const latitud = -16.5412;
    const longitud = -68.0845;
    expect(estaDentroDeLaPaz(latitud, longitud)).toBe(true);
  });

  it('debe retornar false para coordenadas de otra ciudad (Santa Cruz de la Sierra)', () => {
    const latitud = -17.7833;
    const longitud = -63.1821;
    expect(estaDentroDeLaPaz(latitud, longitud)).toBe(false);
  });

  it('debe retornar false para coordenadas fuera del pais (Buenos Aires)', () => {
    const latitud = -34.6037;
    const longitud = -58.3816;
    expect(estaDentroDeLaPaz(latitud, longitud)).toBe(false);
  });

  it('debe verificar los limites perimetrales exactos de la delimitacion de La Paz', () => {
    // Esquinas limites
    expect(estaDentroDeLaPaz(LA_PAZ_BOUNDS.MIN_LAT, LA_PAZ_BOUNDS.MIN_LNG)).toBe(true);
    expect(estaDentroDeLaPaz(LA_PAZ_BOUNDS.MAX_LAT, LA_PAZ_BOUNDS.MAX_LNG)).toBe(true);

    // Fuera por margen minimo
    expect(estaDentroDeLaPaz(LA_PAZ_BOUNDS.MIN_LAT - 0.01, -68.13)).toBe(false);
    expect(estaDentroDeLaPaz(LA_PAZ_BOUNDS.MAX_LAT + 0.01, -68.13)).toBe(false);
    expect(estaDentroDeLaPaz(-16.50, LA_PAZ_BOUNDS.MIN_LNG - 0.01)).toBe(false);
    expect(estaDentroDeLaPaz(-16.50, LA_PAZ_BOUNDS.MAX_LNG + 0.01)).toBe(false);
  });
});
