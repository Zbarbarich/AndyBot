-- Add contact name (POC) to customers for PDFs and POCA
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
