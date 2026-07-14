-- ERP: Items (admin-managed billable items)
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  taxable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

-- Quote/Order shared document number sequence (001001, 001002, ...)
CREATE SEQUENCE IF NOT EXISTS quote_order_number_seq START 1001;

-- Quotes and orders (single table; type = 'quote' | 'order')
CREATE TABLE IF NOT EXISTS quotes_orders (
  id SERIAL PRIMARY KEY,
  document_number VARCHAR(6) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('quote', 'order')),
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  valid_until DATE,
  order_date DATE,
  notes TEXT,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 4) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  shipping_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_orders_customer ON quotes_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_orders_type ON quotes_orders(type);
CREATE INDEX IF NOT EXISTS idx_quotes_orders_document_number ON quotes_orders(document_number);

-- Quote/Order line items (billing_status for order lines: pending | billable | invoiced)
CREATE TABLE IF NOT EXISTS quote_order_lines (
  id SERIAL PRIMARY KEY,
  quote_order_id INTEGER NOT NULL REFERENCES quotes_orders(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
  description TEXT,
  quantity DECIMAL(12, 4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  billing_status VARCHAR(20) DEFAULT 'pending' CHECK (billing_status IN ('pending', 'billable', 'invoiced'))
);

CREATE INDEX IF NOT EXISTS idx_quote_order_lines_quote_order ON quote_order_lines(quote_order_id);

-- Invoice number sequence (003001, 003002, ...)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 3001;

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(6) UNIQUE NOT NULL,
  order_id INTEGER NOT NULL REFERENCES quotes_orders(id) ON DELETE RESTRICT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 4) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  shipping_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);

-- Invoice lines (snapshot at creation)
CREATE TABLE IF NOT EXISTS invoice_lines (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  order_line_id INTEGER REFERENCES quote_order_lines(id) ON DELETE SET NULL,
  item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
  description TEXT,
  quantity DECIMAL(12, 4) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);
