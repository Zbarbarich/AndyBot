-- Customers: unique id is used for ticket submission access
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  physical_address TEXT,
  email VARCHAR(255),
  phone VARCHAR(64),
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  text_notifications BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tickets: customer_id nullable for N/A; status: Open | Pending Closure Review | Closed.
-- creation_date = business date (display/sort); created_at = audit; both DEFAULT NOW(), do not set from app.
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  creation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subject VARCHAR(500) NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  category VARCHAR(100),
  description TEXT,
  email VARCHAR(255),
  priority SMALLINT NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  status VARCHAR(50) NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Up to 5 images per ticket (position 1-5)
CREATE TABLE IF NOT EXISTS ticket_images (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL CHECK (position >= 1 AND position <= 5),
  image_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id, position)
);

CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_creation_date ON tickets(creation_date DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_ticket_images_ticket_id ON ticket_images(ticket_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
