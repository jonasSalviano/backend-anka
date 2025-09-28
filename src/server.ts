import Fastify from 'fastify';
import { routes } from './routes/index.js';

const PORT = Number(process.env.PORT || 4000);

export const buildServer = () => {
  const app = Fastify({ logger: true });
  app.register(routes, { prefix: '/api' });
  return app;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  buildServer()
    .listen({ host: '0.0.0.0', port: PORT })
    .catch((err) => { console.error(err); process.exit(1); });
}
