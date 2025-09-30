import Fastify, { FastifyInstance } from 'fastify';
import { InsuranceController } from '../../src/controller/InsuranceController';
import { InsuranceService } from '../../src/services/InsuranceService';

jest.mock('../../src/services/InsuranceService');

describe('InsuranceController', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(InsuranceController);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('create', () => {
    it('deve chamar InsuranceService.create e retornar 200', async () => {
      const body = {
        type: 'LIFE',
        name: 'Seguro Vida',
        startDate: '2025-01-01',
        durationMo: 120,
        premiumMo: 100,
        insuredAmt: 200000,
      };
      const mockResult = { id: 'ins-1', ...body };
      (InsuranceService.create as jest.Mock).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/versions/ver-1/insurances',
        payload: body,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockResult);
      expect(InsuranceService.create).toHaveBeenCalledWith('ver-1', body);
    });
  });

  describe('list', () => {
    it('deve chamar InsuranceService.list e retornar 200 com os dados', async () => {
      const mockResult = [{ id: 'ins-1' }];
      (InsuranceService.list as jest.Mock).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'GET',
        url: '/versions/ver-1/insurances',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockResult);
      expect(InsuranceService.list).toHaveBeenCalledWith('ver-1');
    });
  });

  describe('delete', () => {
    it('deve chamar InsuranceService.delete e retornar 200', async () => {
      (InsuranceService.delete as jest.Mock).mockResolvedValue({ ok: true });

      const response = await app.inject({
        method: 'DELETE',
        url: '/insurances/ins-1',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ ok: true });
      expect(InsuranceService.delete).toHaveBeenCalledWith('ins-1');
    });
  });
});