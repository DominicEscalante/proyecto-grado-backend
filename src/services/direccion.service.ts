type PhotonFeature = {
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    locality?: string;
    city?: string;
    country?: string;
  };
};

const cache = new Map<string, string>();

export async function obtenerDireccionAproximada(latitud: number, longitud: number): Promise<string | null> {
  const key = `${latitud.toFixed(4)},${longitud.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const baseUrl = process.env.GEOCODER_URL || 'https://photon.komoot.io';
    const url = new URL('/reverse', baseUrl);
    url.searchParams.set('lat', String(latitud));
    url.searchParams.set('lon', String(longitud));
    url.searchParams.set('limit', '1');
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    const data = await response.json() as { features?: PhotonFeature[] };
    const place = data.features?.[0]?.properties;
    if (!place) return null;
    const street = place.street || place.name;
    const parts = [street && `${street}${place.housenumber ? ` ${place.housenumber}` : ''}`, place.locality || place.district, place.city]
      .filter((part): part is string => Boolean(part));
    const direccion = [...new Set(parts)].join(', ');
    if (!direccion) return null;
    cache.set(key, direccion);
    return direccion;
  } catch {
    return null;
  }
}

export function esReferenciaGps(referencia: string): boolean {
  return referencia.startsWith('Coordenadas GPS sincronizadas (');
}
