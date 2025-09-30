import Fastify, { FastifyInstance } from 'fastify';
import { AllocationController } from '../../src/controller/AllocationController';
import { AllocationService } from '../../src/services/AllocationService';

jest.mock('../../src/services/AllocationService');

describe('AllocationController', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(AllocationController);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('addFinancial', () => {
    it('deve chamar AllocationService.addFinancial e retornar 200', async () => {
      const body = { name: 'CDB', value: 1000, date: '2025-01-01' };
      const mockResult = { id: 'alloc-1' };
      (AllocationService.addFinancial as jest.Mock).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/versions/ver-1/allocations/financial',
        payload: body,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockResult);
      expect(AllocationService.addFinancial).toHaveBeenCalledWith('ver-1', body.name, body.value, body.date);
    });

    it('deve chamar next em caso de erro', async () => {
      const error = new Error('Service Error');
      (AllocationService.addFinancial as jest.Mock).mockRejectedValue(error);

      const response = await app.inject({
        method: 'POST',
        url: '/versions/ver-1/allocations/financial',
        payload: { name: 'CDB', value: 1000, date: '2025-01-01' },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('addRealEstate', () => {
    it('deve chamar AllocationService.addRealEstate e retornar 200', async () => {
      const body = { name: 'Apto', value: 500000, date: '2025-01-01' };
      const mockResult = { id: 'alloc-2' };
      (AllocationService.addRealEstate as jest.Mock).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/versions/ver-1/allocations/realestate',
        payload: body,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockResult);
      expect(AllocationService.addRealEstate).toHaveBeenCalledWith('ver-1', body);
    });
  });

  describe('timeline', () => {
    it('deve chamar AllocationService.timeline e retornar 200', async () => {
      const mockResult = [{ id: 'entry-1' }];
      (AllocationService.timeline as jest.Mock).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'GET',
        url: '/allocations/alloc-1/entries',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockResult);
      expect(AllocationService.timeline).toHaveBeenCalledWith('alloc-1');
    });
  });

  describe('addEntry', () => {
    it('deve chamar AllocationService.addEntry e retornar 200', async () => {
      const body = { value: 15000, date: '2026-01-01' };
      const mockResult = { id: 'entry-2' };
      (AllocationService.addEntry as jest.Mock).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/allocations/alloc-1/entries',
        payload: body,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockResult);
      expect(AllocationService.addEntry).toHaveBeenCalledWith('alloc-1', body.value, body.date);
    });
  });
});