# Andy Bot

Field service and asset management ERP for IT, construction, electrical, security, and other installers. Manage tickets, customers, quotes, orders, invoices, purchasing, and PDFs in one application.

## Tech stack

| Layer | Technologies |
|-------|----------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, Lucide React, Recharts |
| Backend | Node.js, Express, TypeScript (microservices) |
| Data access | `pg` (node-postgres) |
| Auth | JWT, bcrypt |
| PDFs | PDFKit |
| Database | PostgreSQL 16 (SQL migrations `000`–`022`) |
| Local orchestration | npm workspaces via root scripts, `concurrently` |
| Production | Docker Compose, Caddy reverse proxy, GitHub Actions deploy workflow |

## Repository layout

```
├── frontend/                 # React + Vite (port 5173 in development)
├── backend/
│   ├── api-gateway/          # Port 3000
│   ├── auth-service/         # Port 3001
│   ├── customer-service/     # Port 3003
│   ├── ticket-service/       # Port 3004
│   ├── order-service/        # Port 3005
│   ├── invoice-service/      # Port 3006
│   ├── pdf-service/          # Port 3007
│   ├── shared/schema/        # SQL migrations 000–022
│   └── scripts/              # setup-env, migrations, create-first-user
├── deploy/                   # Production and local Postgres Compose files
├── docs/                     # Onboarding and changelog
└── package.json              # install-all, start (frontend + all services)
```

The database name remains `the_nineteenth_chamber` for compatibility with existing deployments.

## Prerequisites

- Node.js 18 or newer
- npm
- Docker Desktop (or Docker Engine) for the local Postgres path below

## Quick start (local app + local Postgres)

This is the supported path for cloning and running Andy Bot on your machine.

1. **Install dependencies** (from the repository root):

   ```bash
   npm run install-all
   ```

2. **Start Postgres**:

   ```bash
   docker compose -f deploy/docker-compose.dev.yml up -d
   ```

3. **Create env files**:

   ```bash
   cp backend/auth-service/.env.example backend/auth-service/.env
   cp backend/api-gateway/.env.example backend/api-gateway/.env
   cp frontend/.env.example frontend/.env
   ```

4. **Edit `backend/auth-service/.env`** to match the Compose database:

   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=the_nineteenth_chamber
   DB_USER=andybot
   DB_PASSWORD=andybot_dev_password
   DB_SSL=false
   JWT_SECRET=dev-only-change-me
   ```

5. **Propagate DB settings and ports to app services**:

   ```bash
   cd backend
   chmod +x scripts/setup-env.sh
   ./scripts/setup-env.sh
   cd ..
   ```

6. **Confirm gateway and frontend env**:
   - `backend/api-gateway/.env`: `CORS_ORIGIN=http://localhost:5173`
   - `frontend/.env`: `VITE_API_BASE=http://localhost:3000`

7. **Apply schema migrations** (fresh database only):

   ```bash
   cd backend/auth-service
   NODE_PATH=./node_modules node ../scripts/run-all-migrations.js
   cd ../..
   ```

8. **Create the first admin user**:

   ```bash
   cd backend/auth-service
   NODE_PATH=./node_modules node ../scripts/create-first-user.js "you@example.com" "YourPassword" "Your Name"
   cd ../..
   ```

9. **Start the full stack** (frontend + API gateway + all microservices):

   ```bash
   npm start
   ```

10. Open http://localhost:5173 and sign in with the user you created.

Longer notes and troubleshooting: [docs/ONBOARDING.md](docs/ONBOARDING.md).

## Application overview

- Dashboard Overview: A/R, month-to-date revenue, open POs (unpurchased items), stale tickets; plus KPI cards for open orders/quotes/invoices/tickets
- Customers, tickets (with attachments), quotes and orders, invoices, payments, and deposits
- Quote/order line items: SKU search autocomplete (`GET /api/app/items/search`); default tax rate 6%
- Purchasing (purchase orders), item catalog
- PDF export for quotes, orders, invoices, and purchase orders (deposits on order PDFs; payment refs on invoices; company identity from env)
- Dark and light themes, soft glass UI, sticky sidebar, and per-user table column preferences
- Dates shown as MM-DD-YY in the UI and on PDFs (Eastern timezone)

## Ports

| Service | Port |
|---------|------|
| Frontend (Vite) | 5173 |
| API gateway | 3000 |
| Auth | 3001 |
| Customer | 3003 |
| Ticket | 3004 |
| Order | 3005 |
| Invoice | 3006 |
| PDF | 3007 |
| Postgres (local Compose) | 5432 |

## Production deploy

See [deploy/README.md](deploy/README.md) for Docker Compose, Caddy (`Caddyfile.example`), and GitHub Actions. Production secrets and the real Caddyfile stay on the server and are not committed.

## Optional: develop against a remote Postgres via SSH tunnel

If you already operate a hosted Postgres instance, you can point `DB_HOST=localhost` and `DB_PORT` at a local SSH tunnel (`ssh -L ...`). Use placeholder host and key paths only; do not commit real server addresses or keys. Prefer the local Compose path above for evaluation.

## License

MIT. See [LICENSE](LICENSE).
