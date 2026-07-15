# Changelog

Notable product changes for Andy Bot (Field Service and Asset Management ERP).

## Unreleased — portfolio polish (`bugfix/pdfService`)

### Dashboard

- Overview strip: accounts receivable, this month’s revenue, open POs with **unpurchased** line-item count, and stale tickets (no resolution updates or idle &gt; 14 days)
- Existing KPI cards retained: open orders, open quotes, unpaid invoices, open tickets

### Quotes and orders

- Line-item **SKU search**: typeahead against `GET /api/app/items/search` (exact SKU auto-fills description, unit price, and U/M); ad-hoc lines remain supported
- Search results render in a portaled overlay above the line-item table (not clipped by scroll)
- Default tax rate for new quotes/orders: **6%** (`0.06`)

### Deposits and PDFs

- Order PDFs include deposit totals and a deposits list (including before invoicing)
- Invoice PDFs show payment reference (e.g. Deposit) with payments
- UI copy uses “deposits” (removed “held” wording); unapplied deposits still apply on invoice create / open invoice when present
- Auto-apply deposit to an open invoice when recording on an order

### UI preferences and chrome

- Migration `022`: `users.ui_preferences` JSONB
- `GET` / `PATCH /api/auth/me/preferences` — per-user table column widths and sidebar collapsed state (localStorage + server)
- Resizable list tables; glass toasts and confirm dialogs
- Soft glass surfaces (light mode): translucent panels with a gentle teal bloom; dark mode kept quieter
- Dates displayed as **MM-DD-YY** in UI and PDFs (DB timestamps unchanged), including invoice lists
- Sticky desktop sidebar; route change scrolls to top with bounce-in; fixed-background parallax preserved
- Global search clears on navigation
- Sleeker aligned top bar / collapsed Andy rail (minimal Andy mark)

### Purchasing and tickets

- PO mark ordered / received updates the line in place (no full-page reload or scroll jump)
- Ticket list exposes `update_count` / `last_activity_at` for dashboard stale logic; resolution create touches `updated_at`

### PDF branding

- Minimal Andy mark bundled under `backend/pdf-service/assets/` for document headers (copied into the PDF image)
- Sender identity is **env-only**: `COMPANY_NAME`, `COMPANY_ADDRESS_LINE1`, `COMPANY_CITY_STATE_ZIP`, `COMPANY_LOGO_URL`
  - Local: `backend/pdf-service/.env` (gitignored)
  - Production: `deploy/.env` wired through Compose into `pdf-service`
- Source fallbacks and `.env.example` use generic placeholders (no personal operator identity in git)

### Upgrade notes

- Existing DBs through `021`: run `backend/scripts/run-migration-022.js` (or full `run-all-migrations.js` on a fresh DB only)
- Set PDF company env vars per environment before regenerating branded documents
- Do not commit `dist/`, `.env`, or `deploy/.env`

## UI and branding

- Product name: Andy Bot
- Tagline: Field Service and Asset Management ERP
- Dashboard with KPI cards, revenue chart (Recharts), and quick links
- Glass-style surfaces for light and dark themes
- Document shell for orders, quotes, invoices, tickets, and purchase orders
- Mobile navigation with Andy head icon for home; page titles outside glass cards on list pages

## Commerce and operations

- Quotes, orders, returns; convert quote to order
- Invoices with payments, deposits, and line billing notation
- Purchase orders with line ordering and receipt notes
- PDF generation for quotes, orders, invoices, and purchase orders (PDFKit)
- Customer payment history and global search across entities
- Ticket attachments and resolution updates

## Platform

- Microservices behind an API gateway (JWT)
- PostgreSQL schema migrations `000`–`022`
- Docker Compose production stack with Caddy reverse proxy
- Local development Postgres via `deploy/docker-compose.dev.yml`
