-- Ticket IDs start at 100001 for new tickets (unique, recognizable IDs).
-- SERIAL created tickets_id_seq; set its next value to at least 100001.
SELECT setval(
  pg_get_serial_sequence('tickets', 'id'),
  GREATEST(100001, COALESCE((SELECT MAX(id) FROM tickets), 0) + 1)
);
