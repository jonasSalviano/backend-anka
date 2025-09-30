import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { InsuranceService } from '../services/InsuranceService.js';
import z2j from 'zod-to-json-schema';

export async function InsuranceController(app: FastifyInstance) {
  app.get('/versions/:versionId/insurances', async (req) => {
    const { versionId } = z.object({ versionId: z.string() }).parse(req.params);
    return InsuranceService.list(versionId);
  });

  const CreateBody = z.object({
    type: z.enum(['LIFE','DISABILITY']),
    name: z.string(),
    startDate: z.string(),
    durationMo: z.number().int().positive(),
    premiumMo: z.number().positive(),
    insuredAmt: z.number().positive()
  });
  app.post('/versions/:versionId/insurances', { schema: { body: z2j(CreateBody, 'CreateInsurance') } }, async (req) => {
    const { versionId } = z.object({ versionId: z.string() }).parse(req.params);
    const b = CreateBody.parse(req.body);
    return InsuranceService.create(versionId, b);
  });

  app.delete('/insurances/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return InsuranceService.delete(id);
  });
}
