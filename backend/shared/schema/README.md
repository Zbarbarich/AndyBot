# Schema reference

Migrations run in order (000–021). This doc summarizes tables and foreign keys for reference.

## Tables (dependency order)

| Table | Foreign keys | ON DELETE |
|------|----------------|-----------|
| `users` | — | — |
| `customers` | — | — |
| `tickets` | `customer_id` → customers(id) | SET NULL |
| `ticket_images` | `ticket_id` → tickets(id) | CASCADE |
| `ticket_resolution_updates` | `ticket_id` → tickets(id) | CASCADE |
| `items` | — | — |
| `quotes_orders` | `customer_id` → customers(id), `ticket_id` → tickets(id), `original_quote_id` → quotes_orders(id) | RESTRICT, SET NULL, SET NULL |
| `quote_order_lines` | `quote_order_id` → quotes_orders(id), `item_id` → items(id) | CASCADE, SET NULL |
| `invoices` | `order_id` → quotes_orders(id), `customer_id` → customers(id), `ticket_id` → tickets(id) | RESTRICT, RESTRICT, SET NULL |
| `invoice_lines` | `invoice_id` → invoices(id), `order_line_id` → quote_order_lines(id), `item_id` → items(id) | CASCADE, SET NULL, SET NULL |
| `invoice_payments` | `invoice_id` → invoices(id) | CASCADE |
| `purchase_orders` | `order_id` → quotes_orders(id) | RESTRICT |
| `purchase_order_lines` | `purchase_order_id` → purchase_orders(id), `quote_order_line_id` → quote_order_lines(id), `item_id` → items(id) | CASCADE, SET NULL, SET NULL |
| `order_deposits` | `quote_order_id` → quotes_orders(id), `applied_to_invoice_id` → invoices(id) | CASCADE, SET NULL |

## Denormalized columns (not FKs)

- **quote_order_lines:** `order_id`, `order_document_number`, `sku` — copies from parent order and item for analytics/dashboard. Application must keep them in sync when creating/updating lines.

## Tickets: creation_date vs created_at

- **creation_date** — Business date used for display and list sort (default `NOW()`).
- **created_at** — Audit timestamp (default `NOW()`).

Both are set by the database on insert and must not be overwritten by the application. Do not add application code that sets either from client input; leave them server-authoritative so they stay in sync.

## Timestamp discipline

- **created_at / updated_at:** Set by the database only (`DEFAULT NOW()` and `updated_at = NOW()` in SQL). Do not overwrite from application code with client-provided values so "recorded at" stays server-authoritative.
- **paid_at (invoice_payments, order_deposits):** When the client does not send a value, use server/DB "now" (e.g. `new Date()` in app or rely on DB default). When the client sends a value (backdating), interpret it as a date/time in America/New_York before storing. Prefer server-generated `paid_at` unless backdating is required.

## Timezone

All connections should set `timezone = 'America/New_York'` so `NOW()` and `CURRENT_DATE` are Eastern. Application displays dates as mm/dd/yyyy in America/New_York.
