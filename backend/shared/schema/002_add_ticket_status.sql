-- Add status to tickets: Open, Pending Closure Review, Closed
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'Open';

-- Ensure constraint for allowed values (optional; comment out if you prefer app-level only)
-- ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
-- ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
--   CHECK (status IN ('Open', 'Pending Closure Review', 'Closed'));
-- Note: idx_tickets_status is created in 001_customers_tickets.sql; no duplicate here.
