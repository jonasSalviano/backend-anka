import { Prisma } from '@prisma/client';
const Dec = (n: number | string) => new Prisma.Decimal(n);

jest.mock('../../../src/services/prisma', () => ({
  prisma: {
    simulationVersion: { findFirstOrThrow: jest.fn() },
    allocation: { findMany: jest.fn() },
    allocationEntry: {
      findFirst: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    movement: { findMany: jest.fn() },
    insurance: { findMany: jest.fn() },
  },
}));
import { prisma } from '../../../src/services/prisma';
import { ProjectionService } from '../../../src/services/ProjectionService';

describe('ProjectionService.run (Extended Scenarios)', () => {
  const baseVersion = {
    id: 'ver-1',
    simulationId: 'sim-1',
    startDate: new Date('2025-01-01T00:00:00.000Z'),
    realRatePct: Dec(4),
    isLegacy: false,
    versionIndex: 1,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (prisma.simulationVersion.findFirstOrThrow as jest.Mock).mockResolvedValue(baseVersion);
    (prisma.allocation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.allocationEntry.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.allocationEntry.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.movement.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.insurance.findMany as jest.Mock).mockResolvedValue([]);
  });

  test('status INVALIDO: zera entradas e mantém despesas', async () => {
    (prisma.movement.findMany as jest.Mock).mockResolvedValue([
      { type: 'INCOME', value: Dec(1200), frequency: 'YEARLY',  startDate: new Date('2025-01-01'), endDate: null },
      { type: 'EXPENSE', value: Dec(1000), frequency: 'YEARLY', startDate: new Date('2025-01-01'), endDate: null },
    ]);

    const invalido = await ProjectionService.run({
      simulationId: 'sim-1', status: 'INVALIDO', realRatePct: 0, startDate: '2025-01-01T00:00:00.000Z',
    });

    // INVALIDO: +0 - 1000 = -1000
    expect(invalido.points.find(p => p.year === 2025)!.total).toBe(-1000);
  });

  test('deve aplicar taxa de juros real (realRatePct) a partir do segundo ano', async () => {
    (prisma.allocation.findMany as jest.Mock).mockResolvedValue([
      { id: 'a1', type: 'FINANCIAL' },
    ]);
    const entryDate = new Date('2025-01-01T00:00:00.000Z');
    (prisma.allocationEntry.groupBy as jest.Mock).mockResolvedValue([
      { allocationId: 'a1', _max: { date: entryDate } },
    ]);
    (prisma.allocationEntry.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'e1',
        allocationId: 'a1',
        date: entryDate,
        value: Dec(1000),
      },
    ]);

    const res = await ProjectionService.run({
      simulationId: 'sim-1',
      status: 'VIVO',
      realRatePct: 10, // 10% a.a.
      startDate: '2025-01-01T00:00:00.000Z',
    });

    const y2025 = res.points.find(p => p.year === 2025)!;
    expect(y2025.total).toBe(1000); // No primeiro ano, sem juros.

    const y2026 = res.points.find(p => p.year === 2026)!;
    expect(y2026.total).toBe(1100); // 1000 + 10%

    const y2027 = res.points.find(p => p.year === 2027)!;
    expect(y2027.total).toBe(1210); // 1100 + 10%
  });

  test('movimentos devem respeitar a data de término (endDate)', async () => {
    (prisma.movement.findMany as jest.Mock).mockResolvedValue([
      { type: 'INCOME', value: Dec(100), frequency: 'YEARLY',  startDate: new Date('2025-01-01'), endDate: new Date('2026-12-31') },
    ]);

    const res = await ProjectionService.run({
      simulationId: 'sim-1',
      status: 'VIVO',
      realRatePct: 0,
      startDate: '2025-01-01T00:00:00.000Z',
    });

    const y2025 = res.points.find(p => p.year === 2025)!;
    expect(y2025.total).toBe(100);

    const y2026 = res.points.find(p => p.year === 2026)!;
    expect(y2026.total).toBe(200); // 100 (2025) + 100 (2026)

    const y2027 = res.points.find(p => p.year === 2027)!;
    expect(y2027.total).toBe(200); // movimento já encerrou, não soma mais
  });
});