-- Order-level deposits: applied to the next invoice when it is created.
-- Deposits are recorded on the order screen (type = deposit) and applied at next invoice.
CREATE TABLE IF NOT EXISTS order_deposits (
  id SERIAL PRIMARY KEY,
  quote_order_id INTEGER NOT NULL REFERENCES quotes_orders(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(20),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference VARCHAR(50),
  applied_to_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_order_deposits_order ON order_deposits(quote_order_id);
CREATE INDEX IF NOT EXISTS idx_order_deposits_applied ON order_deposits(applied_to_invoice_id);
