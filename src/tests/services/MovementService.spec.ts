import { Prisma } from '@prisma/client';
import { prisma } from '../../services/prisma';
import { MovementService } from '../../services/MovementService';

const Dec = (n: number | string) => new Prisma.Decimal(n);

jest.mock('../../../src/services/prisma', () => ({
  prisma: {
    movement: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('MovementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    test('deve criar um movimento com os dados corretos', async () => {
      const args = {
        type: 'INCOME' as const,
        value: 5000,
        frequency: 'MONTHLY' as const,
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2030-12-31T00:00:00.000Z',
      };
      const versionId = 'ver-1';

      await MovementService.create(versionId, args);

      expect(prisma.movement.create).toHaveBeenCalledWith({
        data: {
          versionId,
          type: args.type,
          value: Dec(Math.abs(args.value)),
          frequency: args.frequency,
          startDate: new Date(args.startDate),
          endDate: new Date(args.endDate),
        },
      });
    });

    test('deve criar um movimento sem data de fim', async () => {
      const args = {
        type: 'EXPENSE' as const,
        value: -200,
        frequency: 'YEARLY' as const,
        startDate: '2025-01-01T00:00:00.000Z',
      };
      await MovementService.create('ver-1', args);
      expect(prisma.movement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ endDate: null, value: Dec(200) }) })
      );
    });
  });

  test('list: deve listar os movimentos de uma versão ordenados por data', async () => {
    await MovementService.list('ver-1');
    expect(prisma.movement.findMany).toHaveBeenCalledWith({ where: { versionId: 'ver-1' }, orderBy: { startDate: 'asc' } });
  });

  describe('update', () => {
    test('deve atualizar parcialmente um movimento', async () => {
      const args = { value: 123, endDate: null };
      await MovementService.update('move-1', args);

      expect(prisma.movement.update).toHaveBeenCalledWith({
        where: { id: 'move-1' },
        data: {
          value: Dec(123),
          endDate: null,
        },
      });
    });
  });

  test('delete: deve deletar um movimento pelo id', async () => {
    await MovementService.delete('move-1');
    expect(prisma.movement.delete).toHaveBeenCalledWith({ where: { id: 'move-1' } });
  });
});