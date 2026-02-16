-- Invoice payment tracking: amount_paid, payment_method, paid_at
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Allow 'return' as a third document type in quotes_orders
ALTER TABLE quotes_orders DROP CONSTRAINT IF EXISTS quotes_orders_type_check;
ALTER TABLE quotes_orders ADD CONSTRAINT quotes_orders_type_check
  CHECK (type IN ('quote', 'order', 'return'));
