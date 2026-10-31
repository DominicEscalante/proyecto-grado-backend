import { beforeEach, describe, expect, it, vi } from 'vitest';
import { operadorService } from '../../src/services/operador.service.js';
import { db } from '../../src/db/index.js';

vi.mock('../../src/db/index.js', () => ({ db: { select: vi.fn(), transaction: vi.fn() } }));
vi.mock('../../src/services/report-events.service.js', () => ({ publishReportEvent: vi.fn().mockResolvedValue(undefined) }));

const original = { reporteId: 5, incidentePrincipalId: null, codigoTicket: 'TKT-2026-000005', institucionDestino: 'POLICIA', estado: 'PENDIENTE' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.select).mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [original] }) }) } as any);
});

describe('historial institucional', () => {
  it('consulta 20 casos por página y conserva el orden solicitado', async () => {
    const offset = vi.fn().mockResolvedValue([{ id: 21 }]);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: () => ({ where: async () => [{ total: 21 }] }) } as any)
      .mockReturnValueOnce({ from: () => ({ where: () => ({ orderBy }) }) } as any);
    const list = vi.spyOn(operadorService, 'listarReportes').mockResolvedValueOnce([]);
    const result = await operadorService.listarHistorial('BOMBEROS', 2, 'antiguos');
    expect(limit).toHaveBeenCalledWith(20);
    expect(offset).toHaveBeenCalledWith(20);
    expect(list).toHaveBeenCalledWith('BOMBEROS', undefined, [21]);
    expect(result).toMatchObject({ pagina: 2, limite: 20, total: 21, totalPaginas: 2 });
    list.mockRestore();
  });
});

describe('cambio de estado institucional', () => {
  let currentState = 'PENDIENTE';
  let closedAt: Date | null = null;
  let closureReason: string | null = null;
  let lastOperator: string | null = null;
  let auditRows: unknown[];
  const lock = vi.fn();

  beforeEach(() => {
    currentState = 'PENDIENTE';
    closedAt = null;
    closureReason = null;
    lastOperator = null;
    auditRows = [];
    lock.mockClear();
    vi.mocked(db.transaction).mockImplementation(async (callback: any) => callback({
      select: () => ({ from: () => ({ where: () => ({
        limit: async () => [original],
        for: async () => { lock(); return [{ ...original, estado: currentState }]; },
      }) }) }),
      update: () => ({ set: (changes: any) => ({ where: () => ({ returning: async () => {
        currentState = changes.estado;
        closedAt = changes.fechaAtencion;
        closureReason = changes.motivoNoAtencion;
        lastOperator = changes.operadorId;
        return [{ ...original, estado: currentState }];
      } }) }) }),
      insert: () => ({ values: async (row: unknown) => { auditRows.push(row); } }),
    }));
  });

  it('guarda estado y auditoría tras bloquear el incidente', async () => {
    const result = await operadorService.actualizarEstado(original.codigoTicket, 'EN_CURSO', 'PENDIENTE', 'operator-1', 'POLICIA', '192.0.2.10');
    expect(result.estado).toBe('EN_CURSO');
    expect(lock).toHaveBeenCalledOnce();
    expect(auditRows[0]).toEqual(expect.objectContaining({
      accion: 'CAMBIO_ESTADO_REPORTE', usuarioId: 'operator-1', ipOrigen: '192.0.2.10',
      detalles: expect.objectContaining({ estadoAnterior: 'PENDIENTE', nuevoEstado: 'EN_CURSO' }),
    }));
  });

  it('rechaza al segundo operador y conserva el primer cierre', async () => {
    await operadorService.actualizarEstado(original.codigoTicket, 'FALSA_ALARMA', 'PENDIENTE', 'operator-1', 'POLICIA');
    await expect(operadorService.actualizarEstado(original.codigoTicket, 'EN_CURSO', 'PENDIENTE', 'operator-2', 'POLICIA'))
      .rejects.toMatchObject({ statusCode: 409, code: 'STATE_CONFLICT' });
    expect(currentState).toBe('FALSA_ALARMA');
    expect(lastOperator).toBe('operator-1');
    expect(closedAt).toBeInstanceOf(Date);
    expect(closureReason).toContain('Falsa alarma');
    expect(auditRows).toHaveLength(1);
  });

  it('conserva al primer operador cuando ambos marcan atendido', async () => {
    await operadorService.actualizarEstado(original.codigoTicket, 'EN_CURSO', 'PENDIENTE', 'operator-0', 'POLICIA');
    await operadorService.actualizarEstado(original.codigoTicket, 'ATENDIDO', 'EN_CURSO', 'operator-1', 'POLICIA');
    await expect(operadorService.actualizarEstado(original.codigoTicket, 'ATENDIDO', 'EN_CURSO', 'operator-2', 'POLICIA'))
      .rejects.toMatchObject({ statusCode: 409, code: 'STATE_CONFLICT' });
    expect(currentState).toBe('ATENDIDO');
    expect(lastOperator).toBe('operator-1');
    expect(auditRows).toHaveLength(2);
  });

  it('limpia los datos de cierre al reabrir una falsa alarma', async () => {
    await operadorService.actualizarEstado(original.codigoTicket, 'FALSA_ALARMA', 'PENDIENTE', 'operator-1', 'POLICIA');
    await operadorService.actualizarEstado(original.codigoTicket, 'PENDIENTE', 'FALSA_ALARMA', 'operator-2', 'POLICIA');
    expect(currentState).toBe('PENDIENTE');
    expect(closedAt).toBeNull();
    expect(closureReason).toBeNull();
  });

  it('rechaza estados fuera del flujo único', async () => {
    await expect(operadorService.actualizarEstado(original.codigoTicket, 'RECHAZADO', 'PENDIENTE', 'operator-1', 'POLICIA'))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
