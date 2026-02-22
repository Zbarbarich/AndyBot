# A.N.D.Y. – Advanced Notation & Deployment Yard

A personal tech company ticket and ERP system by 19th Chamber Integrated, built with React, TypeScript, Node.js, Express, and PostgreSQL.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript (microservices)
- **Database**: PostgreSQL
- **Authentication**: JWT + bcrypt

## Project Structure

```
theNineteenthChamber/
├── frontend/                    # React + TypeScript frontend (port 5173)
├── backend/
│   ├── api-gateway/             # API Gateway (port 3000)
│   ├── auth-service/            # Authentication (port 3001)
│   ├── customer-service/        # Customers (port 3003)
│   ├── ticket-service/          # Tickets (port 3004)
│   ├── order-service/           # Orders, quotes, items (port 3005)
│   ├── invoice-service/         # Invoices (port 3006)
│   ├── pdf-service/             # PDF generation (port 3007)
│   ├── shared/                  # Shared SQL schema (migrations 000-019; see shared/schema/README.md)
│   └── scripts/
│       └── setup-env.sh         # Copy env to app services and set ports
└── package.json                # Root scripts (install-all, start)
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

For **development mode** (see below) you use the hosted database via an SSH tunnel; no local PostgreSQL is required. For **local database** development you would need PostgreSQL (v12+) and would run migrations yourself.

## Development mode (recommended: local app + hosted DB via SSH tunnel)

This is the setup for day-to-day development: run the frontend and backend on your machine while connecting to the **same PostgreSQL database** used by the hosted app. No Docker and no local Postgres needed. All local env files are gitignored; production and CI/CD are unchanged.

### One-time setup

1. **Install dependencies**
   ```bash
   npm run install-all
   ```

2. **Create local env files from examples** (do not commit these; they are in `.gitignore`):
   ```bash
   cp backend/auth-service/.env.example backend/auth-service/.env
   cp backend/api-gateway/.env.example backend/api-gateway/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Edit `backend/auth-service/.env`** for the tunnel setup. The app expects **`DB_*`** variable names (not `POSTGRES_*`). Use exactly:
   - **DB_HOST=localhost** — required when using the SSH tunnel (tunnel forwards localhost:5432 to the server).
   - **DB_PORT=5432**
   - **DB_NAME=the_nineteenth_chamber** — must match the hosted app’s database name (lowercase, underscores).
   - **DB_USER** and **DB_PASSWORD** — same as on the server (e.g. from the deploy env or from `docker exec deploy-postgres-1 env | grep POSTGRES_` on the server; the role name is often the value of `POSTGRES_USER`).
   - **DB_SSL=false** — the Postgres container on the server does not use SSL; the tunnel is already encrypted.

   Example (replace with your real credentials):
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=the_nineteenth_chamber
   DB_USER=your_actual_db_user
   DB_PASSWORD=your_actual_password
   DB_SSL=false
   ```

4. **Propagate auth-service env to all DB-using services** (customer, ticket, order, invoice, pdf) and set their ports:
   ```bash
   cd backend
   chmod +x scripts/setup-env.sh
   ./scripts/setup-env.sh
   ```

5. **Edit `backend/api-gateway/.env`** — ensure `CORS_ORIGIN=http://localhost:5173` so the browser can call the API when the frontend runs on port 5173.

6. **Edit `frontend/.env`** — ensure `VITE_API_BASE=http://localhost:3000` so the dev server talks to your local API gateway.

### Port 5432 on your machine

If you have **local PostgreSQL** installed and it is using port 5432, either stop it while using the tunnel or the tunnel will fail with “Address already in use.” You do not need local Postgres for this development setup.

### Run each time you develop

1. **Open the SSH tunnel** (leave this terminal open):
   ```bash
   ssh -i /path/to/your/key -L 5432:127.0.0.1:5432 ubuntu@YOUR_SERVER_IP
   ```
   Replace with your key path and server IP. This forwards your local port 5432 to the Postgres container on the server.

2. **Start the backend** (from repo root or `backend/`):
   ```bash
   cd backend
   npm run dev
   ```
   Or from repo root: `npm start` (starts backend only; start frontend separately).

3. **Start the frontend** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

4. **Open the app:** http://localhost:5173 — you’ll be using the same data as the hosted app (same DB via tunnel).

### Summary

| Item | Development mode | Production (hosted) |
|------|------------------|----------------------|
| Env source | Per-service `.env` (gitignored), from `.env.example` | `deploy/.env` + Docker Compose |
| DB connection | SSH tunnel: localhost:5432 → server Postgres | Containers → `postgres:5432` |
| Start | Tunnel + `npm run dev` (backend + frontend) | `docker compose -f deploy/docker-compose.yml --env-file deploy/.env up` |

### Preparing for commit

- **Do not commit** `.env` or `deploy/.env` — they are listed in `.gitignore`. They contain secrets and local/remote DB settings.
- **Safe to commit:** code changes, `.env.example` files, README, `setup-env.sh`, and other non-secret config. Run `git status` before committing to confirm no `.env` files are staged.

## Development (other)

**Backend only (from repo root):**
```bash
npm start
```

**Backend only (from backend/):**
```bash
cd backend && npm run dev
```

Hot reloading: frontend (Vite HMR), backend (Nodemon).

## Services (ports)

When running locally:

- Frontend: http://localhost:5173
- API Gateway: http://localhost:3000
- Auth Service: http://localhost:3001
- Customer Service: http://localhost:3003
- Ticket Service: http://localhost:3004
- Order Service: http://localhost:3005
- Invoice Service: http://localhost:3006
- PDF Service: http://localhost:3007

## API Endpoints

**Auth (no JWT required for login/register):**
- `POST /api/auth/login` - Login
- `POST /api/auth/users` - Create user (public for first user)
- `GET /api/auth/users` - Get all users (admin)
- `PUT /api/auth/users/:id` - Update user (admin)
- `DELETE /api/auth/users/:id` - Delete user (admin)

**App (JWT required; gateway proxies to the appropriate service):**
- Customers, tickets, orders, quotes, invoices, items, purchase orders, and PDFs are exposed under `/api/app/*`. The gateway proxies requests to customer-service, ticket-service, order-service, invoice-service, or pdf-service by path.
- **Purchase orders:** `GET /api/app/purchase-orders`, `GET /api/app/purchase-orders/:id`, `GET /api/app/purchase-orders/:id/pdf` (proxied to order-service and pdf-service).
- **Global search:** `GET /api/app/search?q=<term>` returns aggregated results from customers, tickets, orders, invoices, items, and purchase orders: `{ customers, tickets, orders, invoices, items, purchase_orders }`.
- **Customer payment history:** `GET /api/app/customers/:id/payment-history` returns all invoice payments and order deposits for that customer. Payments can be reversed via `DELETE /api/app/invoices/:id/payments/:paymentId` (invoice payments) or `DELETE /api/app/orders/:orderId/deposits/:depositId` (unapplied deposits only).

## Database Schema

The same PostgreSQL database is used by auth-service and all app services. Schema is in `backend/shared/schema/`; run migrations 000-019 in order. See `backend/shared/schema/README.md` for table/FK reference, timezone, and timestamp discipline.

**Users table (auth):**
- `userID` (SERIAL PRIMARY KEY)
- `userName` (VARCHAR(50))
- `password` (VARCHAR(255)) - bcrypt hashed
- `email` (VARCHAR(50) UNIQUE NOT NULL)
- `role` (VARCHAR(10)) - 'admin' or 'tech'

App services use additional tables for customers, tickets, orders, quotes, invoices, items, purchase orders, order deposits, and related data. All DB connections set `timezone = 'America/New_York'`; the app displays dates as mm/dd/yyyy in Eastern. Notable schema: `order_deposits`, `invoice_payments`, `purchase_orders` / `purchase_order_lines`; quantity_billed and customer contact; migrations 014-019 (contact, quantity_billed, decimals, deposits, data clear, redundant index drop). See the SQL files and `backend/shared/schema/README.md`.

## Frontend

The frontend is a single-page application with protected routes. Login persists the JWT and user in AuthContext (and localStorage). The authenticated layout (AppLayout) includes:

- A collapsible sidebar with A.N.D.Y. branding (Bot icon + “A.N.D.Y.” and tagline when expanded; Bot icon only when collapsed), then nav links: The Yard, Customers, Tickets, Begin Order, Invoices, Purchasing, Items, Admin. Sidebar expand/collapse chevron is borderless and transparent.
- A header with global search (pill-shaped, debounced input; grouped results: customers, tickets, orders/quotes, invoices, purchase orders, items) and a profile dropdown (logged-in user, logout)

**Routes:** `/` (The Yard), `/customers`, `/customers/new`, `/customers/:id`, `/customers/:id/payment-history`, `/tickets`, `/tickets/new`, `/tickets/:id`, `/tickets/:id/edit`, `/orders`, `/orders/:id`, `/orders/:id/billing`, `/invoices`, `/invoices/bill-order`, `/invoices/:id`, `/purchasing`, `/purchasing/:id`, `/items`, `/items/new`, `/items/:id`, `/items/:id/edit`, `/admin`, `/admin/users/new`. Quotes redirect to orders.

**Pages:** Landing, Customers, Customer form/detail, Customer payment history (with reverse payment), Tickets, Ticket form/detail/edit, Orders (and quotes), Order/Quote detail (deposits, POs), Billing (per order), Invoices, Bill order, Invoice detail, Purchasing, Purchase order detail, Items (list/form/detail/edit), Admin (users, create user).

**Billing:** Bill order flow (`/invoices/bill-order`) creates an invoice from an order; order billing page at `/orders/:id/billing`.

**UI:** Pill-shaped primary/secondary/icon and filter tab buttons; filter tabs (Open/Closed/All) and customer filter on list pages; plus button aligned with filters on Orders, Tickets, Invoices; shared ErrorBanner, BackArrow, TicketSelector; `formatDate` (mm/dd/yyyy in America/New_York) and `api/client`, `useListFetch`/`useDetailFetch` hooks.

**Styling:** Grid-based layout; compact table columns (e.g. col-id, col-date, col-status, col-amount) on list pages; short-field styling for IDs, dates, and amounts on detail views.

## Deployment

Production deploy uses Docker Compose (PostgreSQL, all backend services, frontend, Caddy for HTTPS). See [deploy/README.md](deploy/README.md) for quick start, migrations, and build notes. For Oracle Cloud and CI/CD setup, see [docs/DEPLOYMENT_ORACLE_CI_ACCESS.md](docs/DEPLOYMENT_ORACLE_CI_ACCESS.md).

## License

Private project - All rights reserved
