import { describe, expect, it, vi } from 'vitest';
import { operadorController } from '../../src/controllers/operador.controller.js';
import { operadorService } from '../../src/services/operador.service.js';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/services/operador.service.js', () => ({ operadorService: { listarHistorial: vi.fn() } }));

const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }) as unknown as Response;
const next = vi.fn() as NextFunction;

describe('historial de operadores', () => {
  it('aplica la institución del operador y pagina desde la API', async () => {
    const result = { items: [], total: 0, pagina: 2, limite: 20, totalPaginas: 0 };
    vi.mocked(operadorService.listarHistorial).mockResolvedValueOnce(result);
    const req = { user: { rol_id: 2 }, query: { pagina: '2', orden: 'antiguos' } } as unknown as Request;
    const res = response();
    await operadorController.listarHistorial(req, res, next);
    expect(operadorService.listarHistorial).toHaveBeenCalledWith('POLICIA', 2, 'antiguos');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: result }));
  });

  it('rechaza páginas inválidas', async () => {
    const req = { user: { rol_id: 3 }, query: { pagina: '0' } } as unknown as Request;
    await operadorController.listarHistorial(req, response(), next);
    expect(operadorService.listarHistorial).not.toHaveBeenCalledWith('BOMBEROS', 0, 'recientes');
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});
