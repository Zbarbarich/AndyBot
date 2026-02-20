-- Plan changes: line item refs, items stock/our_cost, customer_po, status open/closed, invoice_payments, original_quote_id, purchase_orders

-- 1. quote_order_lines: order_id, order_document_number, sku for data analysis/reference
ALTER TABLE quote_order_lines
  ADD COLUMN IF NOT EXISTS order_id INTEGER,
  ADD COLUMN IF NOT EXISTS order_document_number VARCHAR(6),
  ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
-- Backfill from parent: order_id = quote_order_id, order_document_number from quotes_orders, sku from items
UPDATE quote_order_lines qol
SET
  order_id = qo.id,
  order_document_number = qo.document_number,
  sku = (SELECT i.sku FROM items i WHERE i.id = qol.item_id LIMIT 1)
FROM quotes_orders qo
WHERE qol.quote_order_id = qo.id AND (qol.order_id IS NULL OR qol.order_document_number IS NULL);

-- 2. items: stock and our_cost (PO only; default 0)
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS stock DECIMAL(12, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS our_cost DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- 3. quotes_orders: customer_po_number, original_quote_id (order row points to source quote)
ALTER TABLE quotes_orders
  ADD COLUMN IF NOT EXISTS customer_po_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS original_quote_id INTEGER REFERENCES quotes_orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_orders_original_quote ON quotes_orders(original_quote_id);

-- 4. status: open | closed | converted (converted internal only). Migrate all legacy statuses.
UPDATE quotes_orders SET status = 'closed' WHERE status IN ('fulfilled', 'closed');
UPDATE quotes_orders SET status = 'open' WHERE status IS NULL OR status NOT IN ('open', 'closed', 'converted');
ALTER TABLE quotes_orders DROP CONSTRAINT IF EXISTS quotes_orders_status_check;
ALTER TABLE quotes_orders ADD CONSTRAINT quotes_orders_status_check
  CHECK (status IN ('open', 'closed', 'converted'));
ALTER TABLE quotes_orders ALTER COLUMN status SET DEFAULT 'open';

-- 5. invoice_payments: per-payment rows for invoice
CREATE TABLE IF NOT EXISTS invoice_payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(20),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);

-- Backfill: existing invoices with amount_paid get one payment row so totals stay correct
INSERT INTO invoice_payments (invoice_id, amount, payment_method, paid_at)
SELECT id, amount_paid, payment_method, COALESCE(paid_at, NOW())
FROM invoices
WHERE amount_paid > 0
  AND NOT EXISTS (SELECT 1 FROM invoice_payments ip WHERE ip.invoice_id = invoices.id);

-- 6. purchase_orders (PO numbers from sequence starting 5001; app sets po_number on insert)
CREATE SEQUENCE IF NOT EXISTS purchase_order_number_seq START 5001;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  po_number VARCHAR(10) UNIQUE NOT NULL,
  order_id INTEGER NOT NULL REFERENCES quotes_orders(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'open'
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order ON purchase_orders(order_id);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  quote_order_line_id INTEGER REFERENCES quote_order_lines(id) ON DELETE SET NULL,
  item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
  description TEXT,
  quantity DECIMAL(12, 4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  sort_order SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_po ON purchase_order_lines(purchase_order_id);
