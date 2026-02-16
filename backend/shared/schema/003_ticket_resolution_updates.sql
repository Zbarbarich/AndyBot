-- Resolution updates per ticket (chat-style with timestamps)
CREATE TABLE IF NOT EXISTS ticket_resolution_updates (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_resolution_updates_ticket_id ON ticket_resolution_updates(ticket_id);
