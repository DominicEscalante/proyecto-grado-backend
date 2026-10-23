import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generarCodigoTicket } from '../../src/utils/ticket.util.js';
import { db } from '../../src/db/index.js';

vi.mock('../../src/db/index.js', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('Ticket Util - generarCodigoTicket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDrizzleChain = (resultado: any[]) => {
    const limit = vi.fn().mockResolvedValue(resultado);
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    (db.select as any).mockReturnValue({ from });
  };

  it('debe generar el primer correlativo TKT-YYYY-000001 cuando no existen reportes previos en el anio', async () => {
    const anioActual = new Date().getFullYear();
    mockDrizzleChain([]);

    const ticket = await generarCodigoTicket();

    expect(ticket).toBe(`TKT-${anioActual}-000001`);
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it('debe incrementar secuencialmente a partir del ultimo ticket registrado', async () => {
    const anioActual = new Date().getFullYear();
    mockDrizzleChain([{ codigoTicket: `TKT-${anioActual}-000042` }]);

    const ticket = await generarCodigoTicket();

    expect(ticket).toBe(`TKT-${anioActual}-000043`);
  });

  it('debe rellenar con ceros a la izquierda para mantener longitud de 6 digitos', async () => {
    const anioActual = new Date().getFullYear();
    mockDrizzleChain([{ codigoTicket: `TKT-${anioActual}-000999` }]);

    const ticket = await generarCodigoTicket();

    expect(ticket).toBe(`TKT-${anioActual}-001000`);
  });
});
