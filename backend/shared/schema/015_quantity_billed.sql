-- Partial billing: track how much of each order line has been invoiced
ALTER TABLE quote_order_lines
  ADD COLUMN IF NOT EXISTS quantity_billed DECIMAL(12, 4) NOT NULL DEFAULT 0;

ALTER TABLE quote_order_lines
  DROP CONSTRAINT IF EXISTS chk_quantity_billed;

ALTER TABLE quote_order_lines
  ADD CONSTRAINT chk_quantity_billed CHECK (quantity_billed <= quantity);
