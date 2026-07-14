-- Optional check/reference number for payments (e.g. check number or "ACH").
ALTER TABLE invoice_payments ADD COLUMN IF NOT EXISTS reference VARCHAR(50);
