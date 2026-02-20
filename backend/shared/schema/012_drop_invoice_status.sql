-- Remove invoice status/draft; invoices are created only from billable order lines.
ALTER TABLE invoices DROP COLUMN IF EXISTS status;
