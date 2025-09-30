import Fastify, { FastifyInstance } from 'fastify';
import { ProjectionController } from '../../src/controller/ProjectionController';
import { ProjectionService } from '../../src/services/ProjectionService';

jest.mock('../../src/services/ProjectionService');

describe('ProjectionController', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(ProjectionController);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /projections/run', () => {
    it('deve chamar ProjectionService.run e retornar 200 com o resultado', async () => {
      const body = {
        simulationId: 'sim-1',
        status: 'VIVO',
        realRatePct: 5,
      };
      const mockResult = [{ year: 2025, total: 1000 }];
      (ProjectionService.run as jest.Mock).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/projections/run',
        payload: body,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockResult);
      expect(ProjectionService.run).toHaveBeenCalledWith(body);
    });

    it('deve retornar 400 para um body inválido', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/projections/run',
        payload: { simulationId: '' }, // Body inválido
      });

      expect(response.statusCode).toBe(400);
      expect(ProjectionService.run).not.toHaveBeenCalled();
    });
  });
});