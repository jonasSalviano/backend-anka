import Fastify, { FastifyInstance } from 'fastify';
import { SimulationController } from '../../src/controller/SimulationController';
import { SimulationService } from '../../src/services/SimulationService';
import { prisma } from '../../src/services/prisma';

jest.mock('../../src/services/SimulationService');
jest.mock('../../src/services/prisma', () => ({
  prisma: {
    simulation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    simulationVersion: {
      findFirstOrThrow: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('SimulationController', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(SimulationController);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /simulations', () => {
    it('deve listar todas as simulações com sua última versão', async () => {
      const mockSims = [
        { id: 'sim-1', name: 'Sim A', versions: [{ id: 'ver-a2' }] },
        { id: 'sim-2', name: 'Sim B', versions: [] },
      ];
      (prisma.simulation.findMany as jest.Mock).mockResolvedValue(mockSims);

      const response = await app.inject({
        method: 'GET',
        url: '/simulations',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual([
        { id: 'sim-1', name: 'Sim A', version: { id: 'ver-a2' } },
        { id: 'sim-2', name: 'Sim B', version: null },
      ]);
    });
  });

  describe('create', () => {
    it('deve chamar SimulationService.create e retornar 200', async () => {
      const body = { name: 'Test Sim', startDate: '2025-01-01', realRatePct: 5 };
      const mockResult = { sim: { id: 'sim-1' }, version: { id: 'ver-1' } };
      (SimulationService.create as jest.Mock).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/simulations',
        payload: body,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockResult);
      expect(SimulationService.create).toHaveBeenCalledWith(body.name, new Date(body.startDate), body.realRatePct);
    });

    it('deve chamar next em caso de erro', async () => {
      const error = new Error('Service Error');
      (SimulationService.create as jest.Mock).mockRejectedValue(error);

      const response = await app.inject({
        method: 'POST',
        url: '/simulations',
        payload: { name: 'Test Sim', startDate: '2025-01-01', realRatePct: 5 },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('edit', () => {
    it('deve chamar SimulationService.edit e retornar 200', async () => {
      const body = { name: 'Updated Sim' };
      (SimulationService.edit as jest.Mock).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'PATCH',
        url: '/simulations/sim-1',
        payload: body,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ ok: true });
      expect(SimulationService.edit).toHaveBeenCalledWith('sim-1', expect.objectContaining(body));
    });
  });

  describe('delete', () => {
    it('deve chamar SimulationService.delete e retornar 200', async () => {
      (SimulationService.delete as jest.Mock).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/simulations/sim-1',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ ok: true });
      expect(SimulationService.delete).toHaveBeenCalledWith('sim-1');
    });
  });

  describe('newVersion', () => {
    it('deve chamar SimulationService.newVersion e retornar 200', async () => {
      const mockVersion = { id: 'ver-2' };
      (SimulationService.newVersion as jest.Mock).mockResolvedValue(mockVersion);

      const response = await app.inject({
        method: 'POST',
        url: '/simulations/sim-1/versions',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockVersion);
      expect(SimulationService.newVersion).toHaveBeenCalledWith('sim-1');
    });
  });

  describe('POST /simulations/:id/duplicate', () => {
    const mockLatestVersion = { id: 'ver-old', startDate: new Date(), realRatePct: 4, versionIndex: 1 };
    const mockNewSim = { id: 'sim-new', name: 'Sim Cópia' };
    const mockNewVersion = { id: 'ver-new', simulationId: 'sim-new' };

    beforeEach(() => {
      (prisma.simulationVersion.findFirstOrThrow as jest.Mock).mockResolvedValue(mockLatestVersion);
      (prisma.simulation.create as jest.Mock).mockResolvedValue(mockNewSim);
      (prisma.simulationVersion.create as jest.Mock).mockResolvedValue(mockNewVersion);
      (SimulationService.copyVersionData as jest.Mock).mockResolvedValue(undefined);
    });

    it('deve duplicar uma simulação e retornar 200', async () => {
      (prisma.simulation.findUnique as jest.Mock).mockResolvedValue(null); // Nome não existe

      const response = await app.inject({
        method: 'POST',
        url: '/simulations/sim-old/duplicate',
        payload: { newName: 'Sim Cópia' },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ sim: mockNewSim, version: mockNewVersion });
      expect(SimulationService.copyVersionData).toHaveBeenCalledWith(mockLatestVersion.id, mockNewVersion.id);
    });

    it('deve retornar 409 se o novo nome já existir', async () => {
      (prisma.simulation.findUnique as jest.Mock).mockResolvedValue({ id: 'sim-exists' }); // Nome já existe

      const response = await app.inject({
        method: 'POST',
        url: '/simulations/sim-old/duplicate',
        payload: { newName: 'Sim Cópia' },
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body)).toEqual({ error: 'name_taken' });
      expect(SimulationService.copyVersionData).not.toHaveBeenCalled();
    });
  });

  describe('createCurrentSituation', () => {
    it('deve chamar SimulationService.createCurrentSituation e retornar 200', async () => {
      const mockResult = { sim: { id: 'sim-current' }, version: { id: 'ver-current' } };
      (SimulationService.createCurrentSituation as jest.Mock).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/simulations/current',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockResult);
      expect(SimulationService.createCurrentSituation).toHaveBeenCalled();
    });
  });

  describe('getVersions', () => {
    it('deve chamar SimulationService.getVersions e retornar 200 com os dados', async () => {
      const mockVersions = [{ id: 'ver-1', versionIndex: 1 }];
      (SimulationService.getVersions as jest.Mock).mockResolvedValue(mockVersions);

      const response = await app.inject({
        method: 'GET',
        url: '/simulations/sim-1/versions',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockVersions);
      expect(SimulationService.getVersions).toHaveBeenCalledWith('sim-1');
    });
  });
});