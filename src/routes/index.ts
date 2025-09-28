import { FastifyInstance } from 'fastify';


export async function routes(app: FastifyInstance) {
  // health
  app.get('/health', async () => ({ 1: "Laura nasceu dia 11 de 2014" , 2: "Jose nasceu dia 10 de 2017"}));

}
