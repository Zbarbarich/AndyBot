-- Purchase order line: optional notes/URL when "Other" or "Online" for ordered_via
ALTER TABLE purchase_order_lines
  ADD COLUMN IF NOT EXISTS ordered_via_notes TEXT;

-- Purchase order line: when line was received (once set, cannot be unset)
ALTER TABLE purchase_order_lines
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;
