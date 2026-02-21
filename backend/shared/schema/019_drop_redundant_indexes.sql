-- Drop redundant indexes (uniqueness already implies an index; composite unique makes single-column index redundant).
-- Run after 018. Idempotent: IF EXISTS.
DROP INDEX IF EXISTS idx_items_sku;
DROP INDEX IF EXISTS idx_quotes_orders_document_number;
