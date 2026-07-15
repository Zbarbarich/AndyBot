# Deploy — Andy Bot

Single-instance Docker Compose deployment with Caddy (HTTPS), PostgreSQL, and all backend and frontend services.

## Quick start

1. Copy `deploy/.env.example` to `deploy/.env` and set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET`. Optionally set `POSTGRES_DB` (default `the_nineteenth_chamber`), `JWT_EXPIRES_IN`, `CORS_ORIGIN` (production URL, e.g. `https://yourdomain.com`), and PDF sender identity:

   ```env
   COMPANY_NAME=Your Company
   COMPANY_ADDRESS_LINE1=123 Main Street
   COMPANY_CITY_STATE_ZIP=City ST 00000
   COMPANY_LOGO_URL=
   ```

   These are passed into `pdf-service` by `deploy/docker-compose.yml`. Keep real operator details in `deploy/.env` on the server only—never commit them.
2. Copy `deploy/Caddyfile.example` to `deploy/Caddyfile` and replace `yourdomain.com` with your domain. `deploy/Caddyfile` is gitignored; the production file lives on the server only.
3. On a small instance (about 1 GB RAM), add swap before the first build (see below).
4. Run database migrations once against Postgres (see [Database migrations](#database-migrations)).
5. From the repository root:

   ```bash
   docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
   ```

For local development Postgres only (not production), use `deploy/docker-compose.dev.yml` — see [docs/ONBOARDING.md](../docs/ONBOARDING.md).

## Build issues on small instances

**Symptom:** `docker compose up -d --build` freezes or the host becomes unresponsive.

**Cause:** Parallel image builds each run `npm ci` and exhaust RAM on 1 GB instances.

**Fix:** Add swap once:

```bash
sudo bash deploy/add-swap.sh
```

To persist swap across reboots, add `/swapfile none swap sw 0 0` to `/etc/fstab` as suggested by the script.

**Symptom:** `ECONNRESET` during `npm ci`.

**Fix:** Build one service at a time:

```bash
./deploy/build-sequential.sh
```

## Faster builds and Docker disk

- BuildKit is enabled in `deploy/build-sequential.sh`.
- Dockerfiles use BuildKit npm cache mounts.
- `deploy/prune-docker.sh` (used by CI after deploy) prunes stopped containers, unused images, and caps build cache (default `3GB`; override with `MAX_BUILD_CACHE`).

Manual prune from repo root on the server:

```bash
chmod +x deploy/prune-docker.sh
./deploy/prune-docker.sh
```

## Database migrations

Migrations live in `backend/shared/schema/` (`000`–`022`). On a **fresh** database:

```bash
cd backend/auth-service
# Point .env at the target Postgres (same user/password/db as deploy/.env)
NODE_PATH=./node_modules node ../scripts/run-all-migrations.js
```

On an existing database that already has through `021`:

```bash
cd backend/auth-service
NODE_PATH=./node_modules node ../scripts/run-migration-022.js
```

See [backend/shared/README.md](../backend/shared/README.md) for per-file notes. Some historical migrations are destructive; review before re-running on an existing database.

## Caddyfile

```bash
cp deploy/Caddyfile.example deploy/Caddyfile
# edit deploy/Caddyfile — set your real domain
```

Caddy obtains and renews Let's Encrypt certificates. Ports 80 and 443 must be open.

### VPS pre-flight (Caddyfile untracked)

Before deploying a tree that does not contain a committed `Caddyfile`:

```bash
cd "$DEPLOY_PATH"   # or your existing clone path on the server
cp deploy/Caddyfile ~/andybot-Caddyfile.backup
```

GitHub Actions backs up and restores `deploy/Caddyfile` around `git reset --hard`. Confirm HTTPS still works after deploy.

## GitHub Actions

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

Required Actions secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`. Optional: `DEPLOY_PATH` (absolute path to the clone on the VPS; if unset the workflow uses the legacy default clone directory name on the server), `GH_DEPLOY_TOKEN` (for HTTPS fetch when the VPS remote cannot use SSH).

Production `deploy/.env` stays on the server only.

**Manual deploy:** GitHub → Actions → Deploy to VPS → Run workflow. Pushes auto-deploy from `main` only.

### Git auth on the VPS

If `git fetch` fails on HTTPS remotes, prefer a deploy key:

```bash
git remote set-url origin git@github.com:Zbarbarich/AndyBot.git
```

Add the server public key under the GitHub repo **Settings → Deploy keys** (read-only).

Then confirm `git fetch origin` succeeds and that a green Actions run prints **Building from commit** with a hash matching GitHub `main`.

### Verifying what production runs

SSH to the VPS, `cd` to the deploy clone, run `git rev-parse HEAD` and `git log -1 --oneline`, and compare to GitHub `main`.
