import Fastify, { FastifyInstance } from 'fastify';
import { MovementController } from '../../src/controller/MovementController';
import { MovementService } from '../../src/services/MovementService';

jest.mock('../../src/services/MovementService');

describe('MovementController', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(MovementController);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('create', () => {
    it('deve chamar MovementService.create e retornar 200', async () => {
      const body = { type: 'INCOME', value: 1000, frequency: 'MONTHLY', startDate: '2025-01-01' };
      const mockResult = { id: 'move-1', ...body };
      (MovementService.create as jest.Mock).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/versions/ver-1/movements',
        payload: body,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockResult);
      expect(MovementService.create).toHaveBeenCalledWith('ver-1', body);
    });
  });

  describe('list', () => {
    it('deve chamar MovementService.list e retornar 200 com os dados', async () => {
      const mockResult = [{ id: 'move-1' }];
      (MovementService.list as jest.Mock).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'GET',
        url: '/versions/ver-1/movements',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockResult);
      expect(MovementService.list).toHaveBeenCalledWith('ver-1');
    });
  });

  describe('update', () => {
    it('deve chamar MovementService.update e retornar 200', async () => {
      const body = { value: 1200 };
      const mockResult = { id: 'move-1', ...body };
      (MovementService.update as jest.Mock).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'PATCH',
        url: '/movements/move-1',
        payload: body,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockResult);
      expect(MovementService.update).toHaveBeenCalledWith('move-1', body);
    });
  });

  describe('delete', () => {
    it('deve chamar MovementService.delete e retornar 200', async () => {
      (MovementService.delete as jest.Mock).mockResolvedValue({ ok: true });

      const response = await app.inject({
        method: 'DELETE',
        url: '/movements/move-1',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ ok: true });
      expect(MovementService.delete).toHaveBeenCalledWith('move-1');
    });
  });
});