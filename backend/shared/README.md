# Shared backend resources

These migrations are run once against the single PostgreSQL database used by auth-service and all app services (customer, ticket, order, invoice, pdf). Replace host/port/user/database in the commands below as needed.

## Schema

Run the SQL migrations once against your PostgreSQL database, in order.

**001–006 (foundation):**

```bash
psql -h localhost -p 5419 -U postgres -d TheNineteenthChamber -f schema/001_customers_tickets.sql
psql -h localhost -p 5419 -U postgres -d TheNineteenthChamber -f schema/002_add_ticket_status.sql
psql -h localhost -p 5419 -U postgres -d TheNineteenthChamber -f schema/003_ticket_resolution_updates.sql
psql -h localhost -p 5419 -U postgres -d TheNineteenthChamber -f schema/004_erp_items_quotes_orders_invoices.sql
psql -h localhost -p 5419 -U postgres -d TheNineteenthChamber -f schema/005_quote_order_shared_document_number.sql
psql -h localhost -p 5419 -U postgres -d TheNineteenthChamber -f schema/006_invoice_payment_and_return_type.sql
```

Replace host/port/user/database if your setup differs.

**007** — `007_drop_quotes_orders_fresh_start.sql`: Drops `invoice_lines`, `invoices`, `quote_order_lines`, `quotes_orders` (destructive fresh start). Optional; only if you need to reset. After 007, re-run 004–006 (e.g. via `run-schema-004-005-006.js`).

**008** — `008_ticket_id_sequence.sql`: Sets tickets id sequence so new IDs start at 100001.

**009** — `009_erp_plan_changes.sql`: ERP plan: `purchase_orders`, `purchase_order_lines`; `customer_po_number`, `original_quote_id`, status open/closed on quotes_orders; `invoice_payments`; items `stock`, `our_cost`; quote_order_lines and invoice changes.

**010** — `010_purchase_order_line_ordered.sql`: Adds `ordered_at`, `ordered_via` to `purchase_order_lines`.

**011** — `011_unit_of_measure.sql`: Adds `unit_of_measure` to items (default `EA`) and `quote_order_lines`.

**012** — `012_drop_invoice_status.sql`: Drops `status` column from `invoices`.

**013** — `013_invoice_payment_reference.sql`: Adds `reference` to `invoice_payments` (e.g. check number).

### Using the app's DB config (006–011)

From the repo root, run a migration with the same credentials the backend uses:

```bash
cd backend/auth-service && NODE_PATH=./node_modules node ../scripts/run-migration-006.js
```

Replace `run-migration-006.js` with `run-migration-007.js` … `run-migration-011.js` as needed. These load `.env` from auth-service and apply the corresponding SQL. Run in order; 007 is optional and destructive. For 012 and 013, run the SQL with psql (or add small runners if desired).

After a fresh start (007), re-create quotes/orders/invoices with:

```bash
cd backend/auth-service && NODE_PATH=./node_modules node ../scripts/run-schema-004-005-006.js
```
