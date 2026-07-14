-- Ensure items.stock and items.our_cost are numeric (fix DBs where they were integer)
-- Run after 009. Safe if columns are already DECIMAL/NUMERIC.
ALTER TABLE items ADD COLUMN IF NOT EXISTS stock NUMERIC(12, 4) NOT NULL DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS our_cost NUMERIC(12, 2) NOT NULL DEFAULT 0;
-- Force type to numeric (no-op if already numeric)
ALTER TABLE items ALTER COLUMN our_cost TYPE NUMERIC(12, 2) USING our_cost::numeric(12, 2);
ALTER TABLE items ALTER COLUMN stock TYPE NUMERIC(12, 4) USING stock::numeric(12, 4);
