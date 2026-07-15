# Backend – API Gateway + Microservices

The API gateway is the single entry point for the frontend. It proxies `/api/auth` to auth-service and `/api/app/*` to customer-, ticket-, order-, invoice-, or pdf-service by path. `/api/app/purchase-orders` and purchase order PDFs are proxied to order-service and pdf-service. It also exposes:

- `GET /api/app/search?q=<term>` (JWT) — aggregated `{ customers, tickets, orders, invoices, items, purchase_orders }`
- `GET /api/app/dashboard/summary` (JWT) — open counts, A/R, month revenue, deposits total, open POs / unpurchased line counts, stale tickets, revenue-by-month, recent orders

Customer payment history: `GET /api/app/customers/:id/payment-history`. Reverse invoice payment: `DELETE /api/app/invoices/:id/payments/:paymentId`. Remove unapplied deposit: `DELETE /api/app/orders/:orderId/deposits/:depositId`. List unapplied deposits: `GET /api/app/orders/deposits/held`.

Auth UI preferences: `GET` / `PATCH /api/auth/me/preferences` (JWT) — merges JSON into `users.ui_preferences` (`tableColumns`, `sidebarCollapsed`, etc.).

Item SKU typeahead (any authenticated user): `GET /api/app/items/search?q=<term>` — matches SKU / name / category (ILIKE), max 20 rows; used by quote and order line editors. Full catalog `GET /api/app/items` remains admin-only.

PDF sender identity (pdf-service env): `COMPANY_NAME`, `COMPANY_ADDRESS_LINE1`, `COMPANY_CITY_STATE_ZIP`, `COMPANY_LOGO_URL`. Bundled mark: `pdf-service/assets/`.

Schema and migrations 000–022 are in `shared/schema/`; see [shared/README.md](shared/README.md) for run order and [shared/schema/README.md](shared/schema/README.md) for table reference, timezone, and timestamp discipline.

## Running locally

1. **Install dependencies** (from `backend/`):
   ```bash
   npm run install-all
   ```

2. **Database env for app services**  
   Auth, customer, ticket, order, invoice, and pdf services all need the same PostgreSQL settings. From `auth-service/.env` as the source, copy into each service and set each service’s `PORT`:

   **Option A – script (recommended, from `backend/`):**
   ```bash
   chmod +x scripts/setup-env.sh && ./scripts/setup-env.sh
   ```
   This copies `auth-service/.env` into each app service and sets `PORT=3003`, `3004`, `3005`, `3006`, `3007` so you don’t get “address already in use” on 3001.

   **Option B – manual:** Copy `auth-service/.env` into each service folder, then set `PORT` in each `.env` to 3003 (customer), 3004 (ticket), 3005 (order), 3006 (invoice), 3007 (pdf).

3. **Start all services**:
   ```bash
   npm run dev
   ```

## Services and ports

| Service          | Port |
|------------------|------|
| api-gateway      | 3000 |
| auth-service     | 3001 |
| customer-service | 3003 |
| ticket-service   | 3004 |
| order-service    | 3005 |
| invoice-service  | 3006 |
| pdf-service      | 3007 |
