-- Clear orders and invoices data only. Keeps tables and all other data (customers, tickets, items, etc.).
-- Run order respects foreign keys: delete children before parents.
--
-- Run with: cd backend/order-service && NODE_PATH=./node_modules node ../scripts/run-migration-018.js

BEGIN;

-- Invoice-related (children first)
DELETE FROM invoice_payments;
DELETE FROM invoice_lines;

-- order_deposits references both quotes_orders and invoices; clear so we can delete invoices and orders
DELETE FROM order_deposits;

DELETE FROM invoices;

-- Order-related (children first)
DELETE FROM purchase_order_lines;
DELETE FROM purchase_orders;
DELETE FROM quote_order_lines;
DELETE FROM quotes_orders;

-- Reset document number sequences so new orders start at 001001 and new invoices at 003001
ALTER SEQUENCE quote_order_number_seq RESTART WITH 1001;
ALTER SEQUENCE invoice_number_seq RESTART WITH 3001;
-- PO sequence optional (new POs start at 5001 again)
ALTER SEQUENCE purchase_order_number_seq RESTART WITH 5001;

COMMIT;
