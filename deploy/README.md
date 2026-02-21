# Deploy — The Nineteenth Chamber

Single-instance Docker Compose deployment with Caddy (HTTPS), PostgreSQL, and all backend/frontend services.

## Quick start

1. Copy `deploy/.env.example` to `deploy/.env` and set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET`, and optionally `POSTGRES_DB`, `JWT_EXPIRES_IN`, `CORS_ORIGIN` (your production URL, e.g. `https://yourdomain.com`), `COMPANY_NAME`, `COMPANY_LOGO_URL`.
2. Replace `yourdomain.com` in `deploy/Caddyfile` with your real domain.
3. Run database migrations once (see below) before or right after first `docker compose up`.
4. From the **repo root**:
   ```bash
   docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
   ```

## Database migrations

Migrations live in `backend/shared/schema/` (001–013). They must be run **once** against the deployed PostgreSQL before the app works.

### Option A: From your machine (SSH tunnel to DB)

1. Start only Postgres and wait for it to be healthy:
   ```bash
   docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d postgres
   ```
2. Create an SSH tunnel to the host where Postgres is running (e.g. VPS), forwarding local 5432 to host:5432. On the host, temporarily expose Postgres port 5432 in docker-compose (add `ports: ["5432:5432"]` under postgres) or use a one-off container that runs migrations (Option B).
3. From repo root, with `DB_HOST=localhost` and `DB_PORT=5432` in `backend/auth-service/.env` (and same user/password as deploy/.env):
   ```bash
   cd backend/auth-service && npm install
   node ../scripts/run-migration-006.js
   node ../scripts/run-migration-008.js
   node ../scripts/run-migration-009.js
   node ../scripts/run-migration-010.js
   node ../scripts/run-migration-011.js
   ```
   For 012 and 013, run the SQL with `psql` or add small runners. See `backend/shared/README.md` for full migration list and order.

### Option B: One-off migration container on the server

On the VPS, after `docker compose up -d postgres`, run a one-off container that has access to the DB and the schema files (e.g. mount `backend/shared/schema` and run `psql` or a Node script that applies 001–013 in order). Document the exact command here if you add a migration script.

### Migration order (summary)

Run in order: **001** → **002** → **003** → **004** → **005** → **006** → (optional **007** if reset) → **008** → **009** → **010** → **011** → **012** → **013**. See [backend/shared/README.md](../backend/shared/README.md) for details.

## Caddyfile

Edit `deploy/Caddyfile` and replace `yourdomain.com` with your domain. Caddy will obtain and renew a Let's Encrypt certificate automatically. Ports 80 and 443 must be open on the host.

## GitHub Actions

See [docs/DEPLOYMENT_ORACLE_CI_ACCESS.md](../docs/DEPLOYMENT_ORACLE_CI_ACCESS.md) for CI/CD setup (secrets `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, optional `DEPLOY_PATH`). Production `.env` stays on the server in `deploy/.env`; do not put it in GitHub.
