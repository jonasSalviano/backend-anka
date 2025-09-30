Backend Anka

API Fastify + Prisma + Postgres. Dev com Docker (hot-reload). Swagger em /docs. SonarCloud opcional.

## Requisitos
- Docker Desktop (ou Docker Engine + Compose)
- (Opcional p/ rodar no host) Node 20+ e npm

## Variáveis de ambiente
### Docker
O docker-compose.yml já define:
DATABASE_URL=postgresql://planner:plannerpw@db:5432/plannerdb
PORT=4000

### Host (sem Docker)
Crie .env:
DATABASE_URL=postgresql://planner:plannerpw@localhost:5432/plannerdb
PORT=4000

---

## Subir em DEV (Docker) — recomendado
No diretório do projeto (mesmo do docker-compose.yml):
1) Subir Postgres e backend (hot-reload)
   docker compose up -d db backend

2) (Primeira vez) instalar deps DENTRO do container
   docker compose exec backend npm ci

3) Gerar Prisma Client
   docker compose exec backend npx prisma generate

4) Criar/aplicar migrações (cria as tabelas)
   docker compose exec backend npx prisma migrate dev --name init
   # depois (ambientes já migrados)
   # docker compose exec backend npx prisma migrate deploy

5) Popular o banco (seed)
   docker compose exec backend npm run seed

6) Ver logs
   docker compose logs -f backend

Testes rápidos:
- Health:  curl http://localhost:4000/api/health
- Swagger: abrir http://localhost:4000/docs

Prisma Studio (opcional):
- (se necessário, exponha "5555:5555" no compose)
  docker compose exec backend npx prisma studio --hostname 0.0.0.0 --port 5555
  # abrir http://localhost:5555

PSQL sem instalar no host:
  docker compose exec db psql -U planner -d plannerdb -c '\dt'

Rebuild completo (mudou Dockerfile/deps):
  docker compose down -v
  docker compose build backend
  docker compose up -d db backend
  docker compose exec backend npm ci
  docker compose exec backend npx prisma generate
  docker compose exec backend npx prisma migrate deploy

---

## Rodar no host (sem Docker)
> Requer Postgres local em localhost:5432 com planner/plannerpw e DB plannerdb.

  npm ci
  npx prisma generate
  npx prisma migrate dev --name init
  npm run seed
  npm run dev
  ## API: http://localhost:4000
  ## Docs: http://localhost:4000/docs

## Endpoints
- GET /api/health
- Simulações
  - GET/POST/PATCH/DELETE /api/simulations
  - POST /api/simulations/:id/versions (nova versão; marca anterior como legado)
  - POST /api/simulations/:id/duplicate { newName } (nome único)
  - POST /api/simulations/current (Situação Atual)
  - GET /api/simulations/:id/versions (histórico)
- Projeções
  - POST /api/projections/run { simulationId, status: VIVO|MORTO|INVALIDO, realRatePct?, startDate? }
  - Retorna séries anuais (inclui totalNoIns)
- Alocações
  - POST /api/versions/:versionId/allocations/financial { name, value, date }
  - POST /api/versions/:versionId/allocations/realestate { name, value, date, financed? }
  - GET /api/allocations/:id/entries
  - POST /api/allocations/:id/entries { value, date }
  - PATCH /api/entries/:entryId { value }
  - POST /api/allocations/:id/update-today { value }
- Movimentações
  - GET/POST /api/versions/:versionId/movements
  - PATCH/DELETE /api/movements/:id
- Seguros
  - GET/POST /api/versions/:versionId/insurances
  - DELETE /api/insurances/:id

---

## Testes (Jest) + Cobertura
Local:
  npm test
Docker:
  docker compose exec backend npm test
Gera coverage/lcov.info.


## Comandos úteis
### subir tudo
docker compose up -d

## logs do backend
docker compose logs -f backend

## prisma
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma format
docker compose exec backend npx prisma studio --hostname 0.0.0.0 --port 5555

# banco
docker compose exec db psql -U planner -d plannerdb -c 'SELECT NOW()'
docker compose exec db psql -U planner -d plannerdb -c '\dt'

---

## Troubleshooting
- P1000 (auth DB): credencial/host.
  Docker: DATABASE_URL=...@db:5432/... e db no ar.
  Host: use localhost e confirme user/senha. Se mudou, docker compose down -v && up -d db.

- P1001 (não conecta): DB não subiu ou porta conflitando.
  Altere mapeamento para 5433:5432 e use localhost:5433 no host.

- ENOENT /app/package.json: volume errado no compose. Monte a pasta do backend em /app.

- Hot-reload não atualiza:
  docker compose exec backend npm ci && docker compose restart backend.
  Garanta env CHOKIDAR_USEPOLLING=1 e CHOKIDAR_INTERVAL=300.

- Swagger vazio: controllers precisam de schema (Zod → zod-to-json-schema) e acesse /docs.
