import { FastifyInstance } from 'fastify';
import { ProjectionController } from '../controller/ProjectionController.js';
import { SimulationController } from '../controller/SimulationController.js';
import { AllocationController } from '../controller/AllocationController.js';
import { MovementController } from '../controller/MovementController.js';
import { InsuranceController } from '../controller/InsuranceController.js';

export async function routes(app: FastifyInstance) {
  app.get('/health', async () => ({ ok: true }));
  await app.register(ProjectionController);
  await app.register(SimulationController);
  await app.register(AllocationController);
  await app.register(MovementController);
  await app.register(InsuranceController);
}
