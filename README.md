# The Nineteenth Chamber

A personal tech company ticket and ERP system built with React, TypeScript, Node.js, Express, and PostgreSQL.

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
│   ├── shared/                  # Shared SQL schema (migrations 001-013, incl. purchase orders)
│   └── scripts/
│       └── setup-env.sh         # Copy env to app services and set ports
└── package.json                # Root scripts (install-all, start)
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v12+)
- npm

### Setup

1. **Install dependencies:**
   ```bash
   npm run install-all
   ```

2. **Configure environment variables:**
   ```bash
   cp backend/api-gateway/.env.example backend/api-gateway/.env
   cp backend/auth-service/.env.example backend/auth-service/.env
   ```
   Edit `backend/auth-service/.env` with your PostgreSQL credentials.

   **Backend app services:** After creating `backend/auth-service/.env`, run the env copy script so customer, ticket, order, invoice, and pdf services get env and correct ports:
   ```bash
   chmod +x backend/scripts/setup-env.sh && backend/scripts/setup-env.sh
   ```
   Or from `backend/`: `./scripts/setup-env.sh`

3. **Create PostgreSQL database:**
   ```sql
   CREATE DATABASE "TheNineteenthChamber";
   ```

4. **Run database migrations:** Run the schema files in `backend/shared/schema/` once (001 through 013; see [backend/shared/README.md](backend/shared/README.md)). Migration 007 is optional (destructive fresh start); 008–013 are sequential.

5. **Start services:**
   ```bash
   npm start
   ```

   **Services:**
   - Frontend: http://localhost:5173
   - API Gateway: http://localhost:3000
   - Auth Service: http://localhost:3001
   - Customer Service: http://localhost:3003
   - Ticket Service: http://localhost:3004
   - Order Service: http://localhost:3005
   - Invoice Service: http://localhost:3006
   - PDF Service: http://localhost:3007

## Development

**Start all services:**
```bash
npm start
```

**Start backend only:**
```bash
cd backend && npm run dev
```

Hot reloading is enabled for both frontend (Vite HMR) and backend (Nodemon).

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
- **Global search:** `GET /api/app/search?q=<term>` returns aggregated results from customers, tickets, orders, invoices, and items in one response: `{ customers, tickets, orders, invoices, items }`.

## Database Schema

The same PostgreSQL database is used by auth-service and all app services. Schema is in `backend/shared/schema/`; run migrations 001-013 once.

**Users table (auth):**
- `userID` (SERIAL PRIMARY KEY)
- `userName` (VARCHAR(50))
- `password` (VARCHAR(255)) - bcrypt hashed
- `email` (VARCHAR(50) UNIQUE NOT NULL)
- `role` (VARCHAR(10)) - 'admin' or 'tech'

App services use additional tables for customers, tickets, orders, quotes, invoices, items, purchase orders, and related data. Notable schema elements: `purchase_orders` / `purchase_order_lines`; `invoice_payments.reference`; invoice `status` column removed; `unit_of_measure` on items and quote_order_lines; ticket id sequence. See the SQL files in `backend/shared/schema/`.

## Frontend

The frontend is a single-page application with protected routes. Login persists the JWT and user in AuthContext (and localStorage). The authenticated layout (AppLayout) includes:

- A collapsible sidebar with Lucide icons (Home, Customers, Tickets, Orders, Invoices, Purchasing, Items, Admin)
- A header with global search (pill-shaped, debounced input; grouped results: customers, tickets, orders/quotes, invoices, items) and a profile dropdown (logged-in user, logout)

**Routes:** `/` (Landing), `/customers`, `/customers/new`, `/customers/:id`, `/tickets`, `/tickets/new`, `/tickets/:id`, `/tickets/:id/edit`, `/orders`, `/orders/:id`, `/orders/:id/billing`, `/invoices`, `/invoices/bill-order`, `/invoices/:id`, `/purchasing`, `/purchasing/:id`, `/items`, `/items/new`, `/items/:id`, `/items/:id/edit`, `/admin`, `/admin/users/new`. Quotes redirect to orders.

**Pages:** Landing, Customers, Customer form/detail, Tickets, Ticket form/detail/edit, Orders (and quotes), Order/Quote detail, Billing (per order), Invoices, Bill order, Invoice detail, Purchasing, Purchase order detail, Items (list/form/detail/edit), Admin (users, create user).

**Billing:** Bill order flow (`/invoices/bill-order`) creates an invoice from an order; order billing page at `/orders/:id/billing`.

**UI:** Pill-shaped primary/secondary/icon and filter tab buttons; filter tabs (Open/Closed/All) and customer filter on list pages; plus button aligned with filters on Orders, Tickets, Invoices; shared ErrorBanner, BackArrow, TicketSelector; `formatDate` and `api/client`, `useListFetch`/`useDetailFetch` hooks.

**Styling:** Grid-based layout; compact table columns (e.g. col-id, col-date, col-status, col-amount) on list pages; short-field styling for IDs, dates, and amounts on detail views.

## Deployment

Production deploy uses Docker Compose (PostgreSQL, all backend services, frontend, Caddy for HTTPS). See [deploy/README.md](deploy/README.md) for quick start, migrations, and build notes. For Oracle Cloud and CI/CD setup, see [docs/DEPLOYMENT_ORACLE_CI_ACCESS.md](docs/DEPLOYMENT_ORACLE_CI_ACCESS.md).

## License

Private project - All rights reserved
