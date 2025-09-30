import { Prisma } from '@prisma/client';
const Dec = (n: number | string) => new Prisma.Decimal(n);

jest.mock('../../services/prisma', () => ({
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
import { prisma } from '../../services/prisma';
import { ProjectionService } from '../../services/ProjectionService';

describe('ProjectionService.run', () => {
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

  test('ponto inicial usa último registro <= data de início', async () => {
    (prisma.allocation.findMany as jest.Mock).mockResolvedValue([
      { id: 'a1', type: 'FINANCIAL' },
    ]);

    const entryDate = new Date('2022-01-01T00:00:00.000Z');
    (prisma.allocationEntry.groupBy as jest.Mock).mockResolvedValue([
      { allocationId: 'a1', _max: { date: entryDate } },
    ]);
    (prisma.allocationEntry.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'e-2022',
        allocationId: 'a1',
        date: entryDate,
        value: Dec(200),
      },
    ]);

    const res = await ProjectionService.run({
      simulationId: 'sim-1',
      status: 'VIVO',
      realRatePct: 0,
      startDate: '2025-02-01T00:00:00.000Z',
    });

    const y2025 = res.points.find(p => p.year === 2025)!;
    expect(y2025.finWealth).toBe(200);
    expect(y2025.realWealth).toBe(0);
    expect(y2025.total).toBe(200);
  });

  test('frequências: UNIQUE só no ano de start; YEARLY todo ano; MONTHLY *12', async () => {
    (prisma.movement.findMany as jest.Mock).mockResolvedValue([
      { type: 'INCOME', value: Dec(1000), frequency: 'UNIQUE',  startDate: new Date('2026-01-10'), endDate: null },
      { type: 'INCOME', value: Dec(200),  frequency: 'YEARLY',  startDate: new Date('2025-01-01'), endDate: null },
      { type: 'EXPENSE', value: Dec(50),  frequency: 'MONTHLY', startDate: new Date('2025-01-01'), endDate: null },
    ]);

    const res = await ProjectionService.run({
      simulationId: 'sim-1',
      status: 'VIVO',
      realRatePct: 0,
      startDate: '2025-01-01T00:00:00.000Z',
    });

    const y2025 = res.points.find(p => p.year === 2025)!;
    expect(y2025.total).toBe(-400);

    const y2026 = res.points.find(p => p.year === 2026)!;
    expect(y2026.total).toBe(200);
  });

  test('status MORTO: zera entradas e divide despesas por 2', async () => {
    (prisma.movement.findMany as jest.Mock).mockResolvedValue([
      { type: 'INCOME', value: Dec(1200), frequency: 'YEARLY',  startDate: new Date('2025-01-01'), endDate: null },
      { type: 'EXPENSE', value: Dec(1200), frequency: 'YEARLY', startDate: new Date('2025-01-01'), endDate: null },
    ]);

    const vivo = await ProjectionService.run({
      simulationId: 'sim-1', status: 'VIVO', realRatePct: 0, startDate: '2025-01-01T00:00:00.000Z',
    });
    const morto = await ProjectionService.run({
      simulationId: 'sim-1', status: 'MORTO', realRatePct: 0, startDate: '2025-01-01T00:00:00.000Z',
    });

    expect(vivo.points.find(p => p.year === 2025)!.total).toBe(0);
    expect(morto.points.find(p => p.year === 2025)!.total).toBe(-600);
  });

  test('totalNoIns ignora prêmios dos seguros', async () => {
    (prisma.movement.findMany as jest.Mock).mockResolvedValue([
      { type: 'INCOME', value: Dec(0), frequency: 'YEARLY', startDate: new Date('2025-01-01'), endDate: null },
    ]);
    (prisma.insurance.findMany as jest.Mock).mockResolvedValue([
      { startDate: new Date('2025-01-01'), durationMo: 24, premiumMo: Dec(100), insuredAmt: Dec(500000), type: 'LIFE', name: 'Vida' },
    ]);

    const res = await ProjectionService.run({
      simulationId: 'sim-1', status: 'VIVO', realRatePct: 0, startDate: '2025-01-01T00:00:00.000Z',
    });

    const y2025 = res.points.find(p => p.year === 2025)!;
    expect(y2025.total).toBe(-1200);
    expect(y2025.totalNoIns).toBe(0);
  });

  test('status INVALIDO: zera entradas e mantém despesas', async () => { // This test was in the original file, but I'm adding it here for completeness of the diff
    (prisma.movement.findMany as jest.Mock).mockResolvedValue([
      { type: 'INCOME', value: Dec(1200), frequency: 'YEARLY',  startDate: new Date('2025-01-01'), endDate: null },
      { type: 'EXPENSE', value: Dec(1000), frequency: 'YEARLY', startDate: new Date('2025-01-01'), endDate: null },
    ]);

    const invalido = await ProjectionService.run({
      simulationId: 'sim-1', status: 'INVALIDO', realRatePct: 0, startDate: '2025-01-01T00:00:00.000Z',
    });

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
      realRatePct: 10,
      startDate: '2025-01-01T00:00:00.000Z',
    });

    const y2025 = res.points.find(p => p.year === 2025)!;
    expect(y2025.total).toBe(1000);

    const y2026 = res.points.find(p => p.year === 2026)!;
    expect(y2026.total).toBe(1100);

    const y2027 = res.points.find(p => p.year === 2027)!;
    expect(y2027.total).toBe(1210);
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
    expect(y2026.total).toBe(200);

    const y2027 = res.points.find(p => p.year === 2027)!;
    expect(y2027.total).toBe(200);
  });

  test('seguros devem respeitar a duração (durationMo)', async () => {
    (prisma.insurance.findMany as jest.Mock).mockResolvedValue([
      { startDate: new Date('2025-01-01'), durationMo: 24, premiumMo: Dec(100), insuredAmt: Dec(1), type: 'LIFE', name: 'Vida' },
    ]);

    const res = await ProjectionService.run({
      simulationId: 'sim-1',
      status: 'VIVO',
      realRatePct: 0,
      startDate: '2025-01-01T00:00:00.000Z',
    });

    const y2025 = res.points.find(p => p.year === 2025)!;
    expect(y2025.total).toBe(-1200);
    expect(y2025.totalNoIns).toBe(0);

    const y2026 = res.points.find(p => p.year === 2026)!;
    expect(y2026.total).toBe(-2400);
    expect(y2026.totalNoIns).toBe(0);

    const y2027 = res.points.find(p => p.year === 2027)!;
    expect(y2027.total).toBe(-2400);
    expect(y2027.totalNoIns).toBe(0);
  });

});
