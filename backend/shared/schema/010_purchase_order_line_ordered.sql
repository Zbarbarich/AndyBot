-- Purchase order lines: track when/how each line was ordered
ALTER TABLE purchase_order_lines
  ADD COLUMN IF NOT EXISTS ordered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ordered_via VARCHAR(200);
