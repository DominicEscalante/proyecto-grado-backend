/**
 * Utilidades para verificación geoespacial y geocercas.
 */

// Bounding box perimetral aproximado del área urbana y distritos del Municipio de La Paz
export const LA_PAZ_BOUNDS = {
  MIN_LAT: -16.65,
  MAX_LAT: -16.35,
  MIN_LNG: -68.30,
  MAX_LNG: -67.95,
} as const;

/**
 * Verifica si un par de coordenadas (latitud, longitud) se encuentra
 * dentro de los límites de la jurisdicción del Municipio de La Paz.
 */
export const estaDentroDeLaPaz = (latitud: number, longitud: number): boolean => {
  return (
    latitud >= LA_PAZ_BOUNDS.MIN_LAT &&
    latitud <= LA_PAZ_BOUNDS.MAX_LAT &&
    longitud >= LA_PAZ_BOUNDS.MIN_LNG &&
    longitud <= LA_PAZ_BOUNDS.MAX_LNG
  );
};
