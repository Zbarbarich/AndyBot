-- Unit of measure: EA (each), DZ (dozen), ST (set), HR (hour). App-level validation for allowed values.
ALTER TABLE items ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(10) NOT NULL DEFAULT 'EA';
ALTER TABLE quote_order_lines ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(10);

-- Backfill order lines from item where possible (for display)
UPDATE quote_order_lines qol
SET unit_of_measure = COALESCE(i.unit_of_measure, 'EA')
FROM items i
WHERE qol.item_id = i.id AND qol.unit_of_measure IS NULL;
UPDATE quote_order_lines SET unit_of_measure = 'EA' WHERE unit_of_measure IS NULL;
