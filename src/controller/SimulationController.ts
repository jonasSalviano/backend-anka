import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SimulationService } from '../services/SimulationService.js';
import { prisma } from '../services/prisma.js';
import z2j from 'zod-to-json-schema';

export async function SimulationController(app: FastifyInstance) {
  app.get('/simulations', async () => {
    const sims = await prisma.simulation.findMany({
      include: { versions: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    return sims.map(s => ({ id: s.id, name: s.name, version: s.versions[0] ?? null }));
  });

  const CreateBody = z.object({ name: z.string().min(1), startDate: z.string(), realRatePct: z.number().default(4) });
  app.post('/simulations', { schema: { body: z2j(CreateBody, 'CreateSimulation') } }, async (req, reply) => {
    const p = CreateBody.safeParse(req.body); if (!p.success) return reply.status(400).send(p.error.flatten());
    const { sim, version } = await SimulationService.create(p.data.name, new Date(p.data.startDate), p.data.realRatePct);
    return { sim, version };
  });

  const PatchBody = z.object({ name: z.string().min(1).optional(), startDate: z.string().optional(), realRatePct: z.number().optional() });
  app.patch('/simulations/:id', { schema: { body: z2j(PatchBody, 'PatchSimulation') } }, async (req, reply) => {
    const Params = z.object({ id: z.string().min(1) });
    const prm = Params.safeParse(req.params); const bod = PatchBody.safeParse(req.body);
    if (!prm.success || !bod.success) return reply.status(400).send({ params: prm.success ? null : prm.error, body: bod.success ? null : bod.error });
    await SimulationService.edit(prm.data.id, { name: bod.data.name, startDate: bod.data.startDate ? new Date(bod.data.startDate) : undefined, realRatePct: bod.data.realRatePct });
    return { ok: true };
  });

  app.delete('/simulations/:id', async (req) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    await SimulationService.delete(id);
    return { ok: true };
  });

  app.post('/simulations/:id/versions', async (req) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const v = await SimulationService.newVersion(id);
    return v;
  });

  const DupBody = z.object({ newName: z.string().min(1) });
  app.post('/simulations/:id/duplicate', { schema: { body: z2j(DupBody, 'DuplicateSimulation') } }, async (req, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const { newName } = DupBody.parse(req.body);
    const exists = await prisma.simulation.findUnique({ where: { name: newName } });
    if (exists) return reply.status(409).send({ error: 'name_taken' });

    const latest = await prisma.simulationVersion.findFirstOrThrow({ where: { simulationId: id }, orderBy: { createdAt: 'desc' } });
    const sim = await prisma.simulation.create({ data: { name: newName } });
    const ver = await prisma.simulationVersion.create({ data: { simulationId: sim.id, startDate: latest.startDate, realRatePct: latest.realRatePct, versionIndex: 1 } });
    await SimulationService.copyVersionData(latest.id, ver.id);
    return { sim, version: ver };
  });

  app.post('/simulations/current', async () => {
    const result = await SimulationService.createCurrentSituation();
    return result;
  });

  app.get('/simulations/:id/versions', async (req) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    return SimulationService.getVersions(id);
  });
}
