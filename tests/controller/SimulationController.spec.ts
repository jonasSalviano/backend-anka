import Fastify, { FastifyInstance } from 'fastify';
import { SimulationController } from '../../src/controller/SimulationController';
import { SimulationService } from '../../src/services/SimulationService';

jest.mock('../../../src/services/SimulationService');

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
});