import { afterEach, describe, expect, it, vi } from 'vitest';
import { esReferenciaGps, obtenerDireccionAproximada } from '../../src/services/direccion.service.js';

afterEach(() => vi.unstubAllGlobals());

describe('Dirección aproximada', () => {
  it('compone una dirección legible desde la respuesta del geocodificador', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [{ properties: { name: 'Calle Nueva York', locality: 'Los Andes', city: 'La Paz' } }] }),
    }));
    expect(await obtenerDireccionAproximada(-16.50001, -68.15001)).toBe('Calle Nueva York, Los Andes, La Paz');
    expect(esReferenciaGps('Coordenadas GPS sincronizadas (-16.5, -68.15)')).toBe(true);
  });

  it('no inventa una dirección cuando el proveedor no devuelve lugares', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) }));
    expect(await obtenerDireccionAproximada(-16.51111, -68.12222)).toBeNull();
  });
});
