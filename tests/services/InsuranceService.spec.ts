import { Prisma } from '@prisma/client';
import { prisma } from '../../src/services/prisma';
import { InsuranceService } from '../../src/services/InsuranceService';

const Dec = (n: number | string) => new Prisma.Decimal(n);

jest.mock('../../src/services/prisma', () => ({
  prisma: {
    insurance: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('InsuranceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('create: deve criar um seguro com os dados corretos', async () => {
    const args = {
      type: 'LIFE' as const,
      name: 'Seguro de Vida',
      startDate: '2025-01-01T00:00:00.000Z',
      durationMo: 120,
      premiumMo: 150,
      insuredAmt: 500000,
    };
    const versionId = 'ver-1';

    await InsuranceService.create(versionId, args);

    expect(prisma.insurance.create).toHaveBeenCalledWith({
      data: {
        versionId,
        type: args.type,
        name: args.name,
        startDate: new Date(args.startDate),
        durationMo: args.durationMo,
        premiumMo: Dec(args.premiumMo),
        insuredAmt: Dec(args.insuredAmt),
      },
    });
  });

  test('list: deve listar os seguros de uma versão ordenados por data', async () => {
    await InsuranceService.list('ver-1');
    expect(prisma.insurance.findMany).toHaveBeenCalledWith({ where: { versionId: 'ver-1' }, orderBy: { startDate: 'asc' } });
  });

  test('delete: deve deletar um seguro pelo id', async () => {
    await InsuranceService.delete('ins-1');
    expect(prisma.insurance.delete).toHaveBeenCalledWith({ where: { id: 'ins-1' } });
  });
});