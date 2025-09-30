import { Prisma } from '@prisma/client';
import { prisma } from '../../src/services/prisma';
import { AllocationService } from '../../src/services/AllocationService';

const Dec = (n: number | string) => new Prisma.Decimal(n);

jest.mock('../../../src/services/prisma', () => ({
  prisma: {
    allocation: {
      create: jest.fn(),
    },
    allocationEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('AllocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('addFinancial: deve criar uma alocação financeira e sua entrada inicial', async () => {
    const mockAllocation = { id: 'alloc-1' };
    (prisma.allocation.create as jest.Mock).mockResolvedValue(mockAllocation);

    const result = await AllocationService.addFinancial('ver-1', 'CDB 120%', 10000, '2025-01-01');

    expect(prisma.allocation.create).toHaveBeenCalledWith({
      data: { versionId: 'ver-1', type: 'FINANCIAL', name: 'CDB 120%' },
    });
    expect(prisma.allocationEntry.create).toHaveBeenCalledWith({
      data: { allocationId: mockAllocation.id, date: new Date('2025-01-01'), value: Dec(10000) },
    });
    expect(result).toBe(mockAllocation);
  });

  describe('addRealEstate', () => {
    test('deve criar um imóvel sem financiamento', async () => {
      const mockAllocation = { id: 'alloc-re-1' };
      (prisma.allocation.create as jest.Mock).mockResolvedValue(mockAllocation);

      const args = { name: 'Apartamento', value: 500000, date: '2025-01-01' };
      await AllocationService.addRealEstate('ver-1', args);

      expect(prisma.allocation.create).toHaveBeenCalledWith({
        data: {
          versionId: 'ver-1',
          type: 'REAL_ESTATE',
          name: args.name,
          hasFinancing: false,
          financeStart: null,
          financeInstallments: null,
          financeMonthlyRate: null,
          financeDownPayment: null,
        },
      });
      expect(prisma.allocationEntry.create).toHaveBeenCalledWith({
        data: { allocationId: mockAllocation.id, date: new Date(args.date), value: Dec(args.value) },
      });
    });

    test('deve criar um imóvel com financiamento', async () => {
      const args = {
        name: 'Casa Financiada', value: 800000, date: '2025-01-01',
        financed: { start: '2025-02-01', installments: 360, monthlyRate: 0.8, downPayment: 160000 },
      };
      await AllocationService.addRealEstate('ver-1', args);

      expect(prisma.allocation.create).toHaveBeenCalledWith({
        data: {
          versionId: 'ver-1',
          type: 'REAL_ESTATE',
          name: args.name,
          hasFinancing: true,
          financeStart: new Date(args.financed.start),
          financeInstallments: args.financed.installments,
          financeMonthlyRate: Dec(args.financed.monthlyRate),
          financeDownPayment: Dec(args.financed.downPayment),
        },
      });
    });
  });

  test('timeline: deve buscar o histórico de uma alocação ordenado por data', async () => {
    await AllocationService.timeline('alloc-1');
    expect(prisma.allocationEntry.findMany).toHaveBeenCalledWith({
      where: { allocationId: 'alloc-1' },
      orderBy: { date: 'asc' },
    });
  });

  test('addEntry: deve adicionar uma nova entrada ao histórico', async () => {
    await AllocationService.addEntry('alloc-1', 15000, '2026-01-01');
    expect(prisma.allocationEntry.create).toHaveBeenCalledWith({
      data: { allocationId: 'alloc-1', value: Dec(15000), date: new Date('2026-01-01') },
    });
  });

  test('editEntry: deve editar o valor de uma entrada existente', async () => {
    await AllocationService.editEntry('entry-1', 16000);
    expect(prisma.allocationEntry.update).toHaveBeenCalledWith({
      where: { id: 'entry-1' },
      data: { value: Dec(16000) },
    });
  });
});