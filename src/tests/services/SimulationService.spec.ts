import { Prisma } from '@prisma/client';
import { prisma } from '../../services/prisma';
import { SimulationService } from '../../services/SimulationService';

const Dec = (n: number | string) => new Prisma.Decimal(n);

jest.mock('../../services/prisma', () => ({
  prisma: {
    simulation: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
    },
    simulationVersion: {
      create: jest.fn(),
      update: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
    allocation: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    allocationEntry: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    movement: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    insurance: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (fn) => fn(prisma)),
  },
}));

describe('SimulationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    test('deve criar uma simulação e sua primeira versão', async () => {
      const mockSim = { id: 'sim-1', name: 'Nova Simulação' };
      const mockVersion = { id: 'ver-1', simulationId: 'sim-1', versionIndex: 1 };

      (prisma.simulation.create as jest.Mock).mockResolvedValue(mockSim);
      (prisma.simulationVersion.create as jest.Mock).mockResolvedValue(mockVersion);

      const name = 'Nova Simulação';
      const startDate = new Date('2025-01-01');
      const realRatePct = 5;

      const result = await SimulationService.create(name, startDate, realRatePct);

      expect(prisma.simulation.create).toHaveBeenCalledWith({ data: { name } });
      expect(prisma.simulationVersion.create).toHaveBeenCalledWith({
        data: {
          simulationId: mockSim.id,
          startDate,
          realRatePct: Dec(realRatePct),
          versionIndex: 1,
        },
      });
      expect(result).toEqual({ sim: mockSim, version: mockVersion });
    });
  });

  describe('edit', () => {
    const latestVersion = { id: 'ver-1', simulationId: 'sim-1' };

    beforeEach(() => {
      (prisma.simulationVersion.findFirstOrThrow as jest.Mock).mockResolvedValue(latestVersion);
    });

    test('deve editar o nome da simulação e os dados da versão', async () => {
      const args = { name: 'Nome Editado', startDate: new Date('2026-01-01'), realRatePct: 6 };
      await SimulationService.edit('sim-1', args);

      expect(prisma.simulation.update).toHaveBeenCalledWith({
        where: { id: 'sim-1' },
        data: { name: args.name },
      });
      expect(prisma.simulationVersion.update).toHaveBeenCalledWith({
        where: { id: latestVersion.id },
        data: {
          startDate: args.startDate,
          realRatePct: Dec(args.realRatePct),
        },
      });
    });

    test('não deve atualizar a versão se apenas o nome for fornecido', async () => {
      await SimulationService.edit('sim-1', { name: 'Apenas Nome' });

      expect(prisma.simulation.update).toHaveBeenCalledWith({
        where: { id: 'sim-1' },
        data: { name: 'Apenas Nome' },
      });
      expect(prisma.simulationVersion.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    test('deve deletar uma simulação', async () => {
      (prisma.simulation.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: 'sim-1', name: 'Simulação a Deletar' });

      await SimulationService.delete('sim-1');

      expect(prisma.simulation.delete).toHaveBeenCalledWith({ where: { id: 'sim-1' } });
    });

    test('deve impedir a exclusão da "Situação Atual"', async () => {
      (prisma.simulation.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: 'sim-1', name: 'Situação Atual' });

      await expect(SimulationService.delete('sim-1')).rejects.toThrow('Situação Atual não pode ser deletada');
      expect(prisma.simulation.delete).not.toHaveBeenCalled();
    });
  });

  describe('newVersion', () => {
    test('deve criar uma nova versão e copiar os dados da anterior', async () => {
      const latestVersion = { id: 'ver-1', simulationId: 'sim-1', startDate: new Date(), realRatePct: Dec(4), versionIndex: 1 };
      const newVersion = { ...latestVersion, id: 'ver-2', versionIndex: 2 };

      (prisma.simulationVersion.findFirstOrThrow as jest.Mock).mockResolvedValue(latestVersion);
      (prisma.simulationVersion.create as jest.Mock).mockResolvedValue(newVersion);

      // Mock para a cópia de dados
      (prisma.allocation.findMany as jest.Mock).mockResolvedValue([{ id: 'alloc-1', versionId: 'ver-1' }]);
      (prisma.movement.findMany as jest.Mock).mockResolvedValue([{ id: 'move-1', versionId: 'ver-1' }]);
      (prisma.allocationEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.insurance.findMany as jest.Mock).mockResolvedValue([{ id: 'ins-1', versionId: 'ver-1' }]);

      const result = await SimulationService.newVersion('sim-1');

      // 1. Marca a versão antiga como legada
      expect(prisma.simulationVersion.update).toHaveBeenCalledWith({
        where: { id: latestVersion.id },
        data: { isLegacy: true },
      });

      // 2. Cria a nova versão
      expect(prisma.simulationVersion.create).toHaveBeenCalledWith({
        data: {
          simulationId: latestVersion.simulationId,
          startDate: latestVersion.startDate,
          realRatePct: latestVersion.realRatePct,
          versionIndex: latestVersion.versionIndex + 1,
        },
      });

      // 3. Verifica se a transação de cópia foi chamada
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(newVersion);
    });
  });

  describe('copyVersionData', () => {
    test('deve copiar todos os dados de uma versão para outra', async () => {
      const fromVersionId = 'ver-from';
      const toVersionId = 'ver-to';

      const mockAlloc = { id: 'a-1', versionId: fromVersionId, type: 'FINANCIAL', name: 'CDB' };
      const mockAllocEntry = { id: 'ae-1', allocationId: 'a-1', date: new Date(), value: Dec(100) };
      const mockMove = { id: 'm-1', versionId: fromVersionId, type: 'INCOME', value: Dec(1000), frequency: 'MONTHLY', startDate: new Date() };
      const mockIns = { id: 'i-1', versionId: fromVersionId, type: 'LIFE', name: 'Seguro Vida', startDate: new Date(), durationMo: 12, premiumMo: Dec(50), insuredAmt: Dec(100000) };

      (prisma.allocation.findMany as jest.Mock).mockResolvedValue([mockAlloc]);
      (prisma.allocationEntry.findMany as jest.Mock).mockResolvedValue([mockAllocEntry]);
      (prisma.movement.findMany as jest.Mock).mockResolvedValue([mockMove]);
      (prisma.insurance.findMany as jest.Mock).mockResolvedValue([mockIns]);

      const newMockAlloc = { ...mockAlloc, id: 'a-2', versionId: toVersionId };
      (prisma.allocation.create as jest.Mock).mockResolvedValue(newMockAlloc);

      await SimulationService.copyVersionData(fromVersionId, toVersionId);

      // Cópia de Allocation
      expect(prisma.allocation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ versionId: toVersionId, name: mockAlloc.name }),
      });

      // Cópia de AllocationEntry
      expect(prisma.allocationEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ allocationId: newMockAlloc.id, value: mockAllocEntry.value }),
      });

      // Cópia de Movement
      expect(prisma.movement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ versionId: toVersionId, value: mockMove.value }),
      });

      // Cópia de Insurance
      expect(prisma.insurance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ versionId: toVersionId, name: mockIns.name }),
      });
    });
  });
});