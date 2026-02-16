-- Allow same document_number for quote and order (e.g. 001001 quote + 001001 order after convert)
ALTER TABLE quotes_orders DROP CONSTRAINT IF EXISTS quotes_orders_document_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS quotes_orders_document_number_type_key ON quotes_orders (document_number, type);
