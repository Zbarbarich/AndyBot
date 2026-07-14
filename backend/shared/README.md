# Shared backend resources

SQL migrations run once against the single PostgreSQL database used by auth-service and all app services (customer, ticket, order, invoice, pdf).

Database name in examples: `the_nineteenth_chamber`.

## Fresh install (recommended)

With Postgres running and `backend/auth-service/.env` configured:

```bash
cd backend/auth-service
NODE_PATH=./node_modules node ../scripts/run-all-migrations.js
```

This applies `schema/000_*.sql` through `schema/021_*.sql` in order.

## Individual runners

Per-file Node runners also exist as `backend/scripts/run-migration-NNN.js` for incremental updates on existing hosts. Example:

```bash
cd backend/auth-service && NODE_PATH=./node_modules node ../scripts/run-migration-020.js
```

## Migration notes

| File | Notes |
|------|--------|
| `000` | Auth `users` table |
| `001`–`006` | Customers, tickets, quotes/orders, invoices foundation |
| `007` | Destructive drop of quotes/orders/invoices (optional reset) |
| `008` | Ticket id sequence starts at 100001 |
| `009`–`013` | Purchasing, payments, unit of measure, invoice tweaks |
| `014`–`017` | Contact name, quantity billed, item decimals, deposits |
| `018` | Clears order/invoice/PO data (destructive) |
| `019` | Drop redundant indexes |
| `020` | PO line notes / received |
| `021` | Ticket attachments extension |

After creating users schema, create an admin with `create-first-user.js` (see [docs/ONBOARDING.md](../../docs/ONBOARDING.md)).

Schema table reference: [schema/README.md](schema/README.md).
