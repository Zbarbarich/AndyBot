-- Drop quotes_orders and quote_order_lines so we can start fresh.
-- Must drop dependents first: invoice_lines, then invoices (both reference these tables).
--
-- After running this, re-create the tables:
--   cd backend/auth-service ; NODE_PATH=./node_modules node ../scripts/run-schema-004-005-006.js
-- Or run schema files 004, 005, 006 in order via psql.

DROP TABLE IF EXISTS invoice_lines;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS quote_order_lines;
DROP TABLE IF EXISTS quotes_orders;
