import Fastify from "fastify";
import cors from '@fastify/cors';
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import dotenv from "dotenv";
import { routes } from "./routes/index.js";

dotenv.config();

const PORT = Number(process.env.PORT || 4000);

export const buildServer = (opts = {}) => {
  const app = Fastify(opts);

  app.register(swagger, {
    swagger: {
      info: {
        title: "Anka API",
        description: "Documentação da API para o backend da plataforma Anka.",
        version: "1.0.0",
      },
      externalDocs: {
        url: "https://swagger.io",
        description: "Saiba mais sobre Swagger",
      },
      host: `localhost:${PORT}`,
      schemes: ["http"],
      consumes: ["application/json"],
      produces: ["application/json"],
    },
  });

  // Swagger UI
  app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

   app.register(cors, {
    origin: (origin, cb) => {
      const allow = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ].filter(Boolean);
      if (!origin) return cb(null, true);
      if (allow.includes(origin)) return cb(null, true);
      return cb(new Error('CORS not allowed'), false);
    },
    methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
    credentials: true,
    maxAge: 86400
  });
  app.register(routes, { prefix: '/api' });

  return app;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = buildServer({
    logger: {
      level: "info",
    },
  });

  server
    .listen({ host: "0.0.0.0", port: PORT })
    .catch((err) => {
      server.log.error(err);
      process.exit(1);
    });
}
