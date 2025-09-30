import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProjectionService } from '../services/ProjectionService.js';
import z2j from 'zod-to-json-schema';

export async function ProjectionController(app: FastifyInstance) {
  const Body = z.object({
    simulationId: z.string().min(1),
    status: z.enum(['VIVO','MORTO','INVALIDO']),
    realRatePct: z.number().optional(),
    startDate: z.string().optional()
  });

  app.post('/projections/run', { schema: { body: z2j(Body, 'RunProjectionBody') } }, async (req, reply) => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    const result = await ProjectionService.run(parsed.data);
    return result;
  });
}
