# Deploy — A.N.D.Y. (19th Chamber Integrated)

Single-instance Docker Compose deployment with Caddy (HTTPS), PostgreSQL, and all backend/frontend services.

## Quick start

1. Copy `deploy/.env.example` to `deploy/.env` and set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET`, and optionally `POSTGRES_DB`, `JWT_EXPIRES_IN`, `CORS_ORIGIN` (your production URL, e.g. `https://yourdomain.com`), `COMPANY_NAME`, `COMPANY_LOGO_URL`.
2. Copy `deploy/Caddyfile.example` to `deploy/Caddyfile` and replace `yourdomain.com` with your real domain. `deploy/Caddyfile` is gitignored — the production file lives on the server only.
3. **On a small instance (e.g. 1 GB RAM):** add swap before the first build so parallel builds don’t freeze (see [Build issues on small instances](#build-issues-on-small-instances)).
4. Run database migrations once (see below) before or right after first `docker compose up`.
5. From the **repo root**:
   ```bash
   docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
   ```

## Build issues on small instances

**Symptom:** `docker compose up -d --build` freezes (often around step 30–40) or the system becomes unresponsive.

**Cause:** Docker Compose builds multiple images in parallel. Each image runs `npm ci`, which is memory-heavy. On a 1 GB instance (e.g. Oracle VM.Standard.E2.1.Micro), several concurrent `npm ci` processes exhaust RAM and the build freezes or gets OOM-killed.

**Fix:** Add swap so the system has enough effective memory for parallel builds. On the server, run once:

```bash
sudo bash deploy/add-swap.sh
```

Then run the full build again. To make swap persistent across reboots, add this line to `/etc/fstab` (as suggested by the script):

```
/swapfile none swap sw 0 0
```

Alternative: use a larger instance (e.g. Oracle Ampere with 6 GB RAM) so swap is optional.

**Symptom:** Build fails with `ECONNRESET` or “Client network socket disconnected before secure TLS connection” during `npm ci`.

**Cause:** Many parallel builds hit the npm registry at once; connections get reset (rate limiting or overload).

**Fix:** Build one service at a time so only one `npm ci` talks to the registry. From repo root:

```bash
./deploy/build-sequential.sh
```

This builds auth-service, customer-service, ticket-service, order-service, invoice-service, pdf-service, api-gateway, and frontend in order, then runs `docker compose up -d`. Slower but reliable on small instances or flaky networks.

## Faster builds and limiting Docker disk

### What changed in the repo

- **BuildKit** is enabled in `deploy/build-sequential.sh` (`DOCKER_BUILDKIT=1`, `COMPOSE_DOCKER_CLI_BUILD=1`).
- **npm cache** persists across image builds via `RUN --mount=type=cache,target=/root/.npm` in each service `Dockerfile` (requires BuildKit). The first deploy after this change still downloads everything; later deploys reuse the cache and **`npm ci` gets much faster**.
- **`deploy/prune-docker.sh`** (called from GitHub Actions after each deploy):
  1. **`docker container prune -f`** — removes **stopped** containers so old image references are released.
  2. **`docker image prune -a -f`** — removes **all images not used by any container**. Running containers keep **one** live generation per service (no pile-up of old `deploy-*` images).
  3. **Build cache cap** — runs `docker builder prune -f --max-used-space "$MAX_BUILD_CACHE"` (default **`3GB`**) so roughly **~two recent deploys’** worth of BuildKit/npm cache can remain. Smaller VPS: set `MAX_BUILD_CACHE=2GB` when calling the script.

Override cache cap on the VPS or in CI by exporting before the script, e.g. `export MAX_BUILD_CACHE=2GB` (you would add that to the SSH script in `.github/workflows/deploy.yml` if you want it permanent).

**Docker version:** `--max-used-space` needs a recent Docker Engine (about **23+**). Older engines fall back to `docker builder prune -f` (frees unused cache only).

### Manual prune on the VPS

From the **repo root** on the server:

```bash
chmod +x deploy/prune-docker.sh
./deploy/prune-docker.sh
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

`deploy/Caddyfile.example` is the template in git. On each server:

```bash
cp deploy/Caddyfile.example deploy/Caddyfile
# edit deploy/Caddyfile — set your real domain
```

`deploy/Caddyfile` is listed in `.gitignore` and is not committed. Caddy obtains and renews Let's Encrypt certificates automatically. Ports 80 and 443 must be open on the host.

### VPS pre-flight (before first deploy after Caddyfile is untracked)

SSH to the server **before** merging this change to `main`:

```bash
cd ~/theNineteenthChamber   # or your DEPLOY_PATH
cp deploy/Caddyfile ~/andybot-Caddyfile.backup
```

GitHub Actions backs up and restores `deploy/Caddyfile` around `git reset --hard`. After deploy, confirm your site still loads over HTTPS.

## GitHub Actions

See [docs/DEPLOYMENT_ORACLE_CI_ACCESS.md](../docs/DEPLOYMENT_ORACLE_CI_ACCESS.md) for CI/CD setup (secrets `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, optional `DEPLOY_PATH`). Production `.env` stays on the server in `deploy/.env`; do not put it in GitHub.

**Test deploy without merging to `main`:** GitHub → **Actions** → **Deploy to VPS** → **Run workflow**. Pick the workflow definition branch, set **Branch to deploy on VPS** to the ref the server should run (must exist on `origin`). Pushes only auto-deploy from **`main`**; manual runs can deploy any branch.

### Live site still shows old UI after a “successful” deploy

**Cause A — Git on the VPS cannot pull from GitHub.** If `git remote` uses HTTPS and the server has no valid credential, `git fetch` fails with `Authentication failed for 'https://github.com/...'`. With `set -e` in the deploy script, that should **fail the GitHub Actions job** before any Docker build. If you ever see that error in a run that still went on to build images, treat the log with care (mixed runs or an old server-side script). After fixing Git, confirm a green deploy log includes **“Building from commit”** and that the hash matches **main** on GitHub.

**Fix A (recommended):** Use SSH and a deploy key:

1. On the VPS: `cd` to the clone (e.g. `~/theNineteenthChamber` or `DEPLOY_PATH`), then:
   ```bash
   git remote set-url origin git@github.com:YOUR_USER/theNineteenthChamber.git
   ```
2. In the GitHub repo: **Settings → Deploy keys → Add deploy key**, paste the server’s **public** SSH key (`~/.ssh/id_ed25519.pub` or similar), allow read access.
3. Test on the server: `git fetch origin` (must complete with no auth error).

**Fix B:** Keep HTTPS and use a [fine-grained or classic PAT](https://docs.github.com/en/authentication) with repo read access in the remote URL or credential helper (avoid storing the token in plain text in shared scripts; prefer deploy key).

**Cause B — Workflow only deploys `main`.** [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) runs on `push` to **`main`**. Commits that exist only on a feature branch are not deployed until they are merged (or pushed) to `main`.

**Verify what production is running:** SSH to the VPS, `cd` to the repo root, run `git rev-parse HEAD` and `git log -1 --oneline`, and compare to the latest commit on GitHub **main**. They must match after a good deploy. The workflow log also prints the deployed commit after `git reset` (see “Building from commit”).

### How to push deploy changes and get them live

The workflow runs only on **`push` to `main`**. Use this checklist whenever you change Dockerfiles, `deploy/`, or `.github/workflows/deploy.yml`.

1. On your **laptop**, from the repo root:
   ```bash
   git status
   git add -A
   git commit -m "Your message"
   ```
2. Put the commit on **`main`** (pick one):
   - **Merge a PR** into `main` on GitHub, or  
   - Locally: `git checkout main && git pull origin main && git merge your-feature-branch`
3. **Push `main`:**
   ```bash
   git push origin main
   ```
4. Open **GitHub → Actions → Deploy to VPS** and wait for green. Scroll to **“Building from commit”** and confirm the hash matches the commit you just pushed.
5. On the **VPS**, confirm Git auth works (`git fetch origin` from the deploy clone). If fetch fails, fix the deploy key / remote URL (see above) or production will keep rebuilding old files.

After a successful run, optional: SSH in and run `docker system df` to see image and build-cache usage.
