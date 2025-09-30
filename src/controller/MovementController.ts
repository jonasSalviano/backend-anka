import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MovementService } from '../services/MovementService.js';
import z2j from 'zod-to-json-schema';

export async function MovementController(app: FastifyInstance) {
  app.get('/versions/:versionId/movements', async (req) => {
    const { versionId } = z.object({ versionId: z.string() }).parse(req.params);
    return MovementService.list(versionId);
  });

  const CreateBody = z.object({
    type: z.enum(['INCOME','EXPENSE']),
    value: z.number(),
    frequency: z.enum(['UNIQUE','MONTHLY','YEARLY']),
    startDate: z.string(),
    endDate: z.string().optional()
  });
  app.post('/versions/:versionId/movements', { schema: { body: z2j(CreateBody, 'CreateMovement') } }, async (req) => {
    const { versionId } = z.object({ versionId: z.string() }).parse(req.params);
    const b = CreateBody.parse(req.body);
    return MovementService.create(versionId, b);
  });

  const PatchBody = z.object({
    type: z.enum(['INCOME','EXPENSE']).optional(),
    value: z.number().optional(),
    frequency: z.enum(['UNIQUE','MONTHLY','YEARLY']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().nullable().optional()
  });
  app.patch('/movements/:id', { schema: { body: z2j(PatchBody, 'PatchMovement') } }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = PatchBody.parse(req.body);
    return MovementService.update(id, b);
  });

  app.delete('/movements/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return MovementService.delete(id);
  });
}
