import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AllocationService } from '../services/AllocationService.js';
import z2j from 'zod-to-json-schema';

export async function AllocationController(app: FastifyInstance) {
  const FinBody = z.object({ name: z.string(), value: z.number().positive(), date: z.string() });
  app.post('/versions/:versionId/allocations/financial', { schema: { body: z2j(FinBody, 'AddFinancial') } }, async (req) => {
    const { versionId } = z.object({ versionId: z.string() }).parse(req.params);
    const b = FinBody.parse(req.body);
    return AllocationService.addFinancial(versionId, b.name, b.value, b.date);
  });

  const ReBody = z.object({
    name: z.string(), value: z.number().positive(), date: z.string(),
    financed: z.object({ start: z.string(), installments: z.number().int().positive(), monthlyRate: z.number().optional(), downPayment: z.number().optional() }).optional()
  });
  app.post('/versions/:versionId/allocations/realestate', { schema: { body: z2j(ReBody, 'AddRealEstate') } }, async (req) => {
    const { versionId } = z.object({ versionId: z.string() }).parse(req.params);
    const b = ReBody.parse(req.body);
    return AllocationService.addRealEstate(versionId, { name: b.name, value: b.value, date: b.date, financed: b.financed });
  });

  app.get('/allocations/:id/entries', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return AllocationService.timeline(id);
  });

  const AddEntry = z.object({ value: z.number(), date: z.string() });
  app.post('/allocations/:id/entries', { schema: { body: z2j(AddEntry, 'AddAllocationEntry') } }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = AddEntry.parse(req.body);
    return AllocationService.addEntry(id, b.value, b.date);
  });

  const PatchEntry = z.object({ value: z.number() });
  app.patch('/entries/:entryId', { schema: { body: z2j(PatchEntry, 'PatchAllocationEntry') } }, async (req) => {
    const { entryId } = z.object({ entryId: z.string() }).parse(req.params);
    const b = PatchEntry.parse(req.body);
    return AllocationService.editEntry(entryId, b.value);
  });

  const UpdateToday = z.object({ value: z.number() });
  app.post('/allocations/:id/update-today', { schema: { body: z2j(UpdateToday, 'UpdateAllocationToday') } }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = UpdateToday.parse(req.body);
    return AllocationService.updateToday(id, b.value);
  });
}
