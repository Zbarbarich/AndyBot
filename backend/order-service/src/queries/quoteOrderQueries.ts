const quoteOrderQueries = {
  nextDocumentNumber: `SELECT LPAD((nextval('quote_order_number_seq'))::text, 6, '0') AS document_number`,

  listQuotes: `
    SELECT q.id, q.document_number, q.type, q.customer_id, q.ticket_id, q.status, q.valid_until, q.order_date, q.notes,
           q.subtotal, q.tax_rate, q.tax_amount, q.shipping_amount, q.total, q.created_at, q.updated_at,
           c.name AS customer_name
    FROM quotes_orders q
    JOIN customers c ON c.id = q.customer_id
    WHERE q.type = 'quote'
    ORDER BY q.document_number DESC
  `,

  listOrders: `
    SELECT q.id, q.document_number, q.type, q.customer_id, q.ticket_id, q.status, q.valid_until, q.order_date, q.notes,
           q.subtotal, q.tax_rate, q.tax_amount, q.shipping_amount, q.total, q.created_at, q.updated_at,
           c.name AS customer_name
    FROM quotes_orders q
    JOIN customers c ON c.id = q.customer_id
    WHERE q.type = 'order'
    ORDER BY q.document_number DESC
  `,

  listDocuments: `
    SELECT q.id, q.document_number, q.type, q.customer_id, q.ticket_id, q.status, q.valid_until, q.order_date, q.notes,
           q.subtotal, q.tax_rate, q.tax_amount, q.shipping_amount, q.total, q.created_at, q.updated_at,
           c.name AS customer_name
    FROM quotes_orders q
    JOIN customers c ON c.id = q.customer_id
    ORDER BY q.document_number DESC
  `,

  search: `
    SELECT q.id, q.document_number, q.type, q.customer_id, q.ticket_id, q.status, q.valid_until, q.order_date, q.notes,
           q.subtotal, q.tax_rate, q.tax_amount, q.shipping_amount, q.total, q.created_at, q.updated_at,
           c.name AS customer_name
    FROM quotes_orders q
    JOIN customers c ON c.id = q.customer_id
    WHERE q.document_number ILIKE $1 OR c.name ILIKE $1 OR q.id::text = $2
    ORDER BY q.document_number DESC
    LIMIT 20
  `,

  listDocumentsByType: `
    SELECT q.id, q.document_number, q.type, q.customer_id, q.ticket_id, q.status, q.valid_until, q.order_date, q.notes,
           q.subtotal, q.tax_rate, q.tax_amount, q.shipping_amount, q.total, q.created_at, q.updated_at,
           c.name AS customer_name
    FROM quotes_orders q
    JOIN customers c ON c.id = q.customer_id
    WHERE q.type = $1
    ORDER BY q.document_number DESC
  `,

  listByCustomerId: `
    SELECT q.id, q.document_number, q.type, q.customer_id, q.ticket_id, q.status, q.valid_until, q.order_date, q.notes,
           q.subtotal, q.tax_rate, q.tax_amount, q.shipping_amount, q.total, q.created_at, q.updated_at,
           c.name AS customer_name
    FROM quotes_orders q
    JOIN customers c ON c.id = q.customer_id
    WHERE q.customer_id = $1
    ORDER BY q.document_number DESC
  `,

  getById: `
    SELECT id, document_number, type, customer_id, ticket_id, status, valid_until, order_date, notes,
           subtotal, tax_rate, tax_amount, shipping_amount, total, created_at, updated_at
    FROM quotes_orders
    WHERE id = $1
  `,

  getByIdWithCustomer: `
    SELECT q.id, q.document_number, q.type, q.customer_id, q.ticket_id, q.status, q.valid_until, q.order_date, q.notes,
           q.subtotal, q.tax_rate, q.tax_amount, q.shipping_amount, q.total, q.created_at, q.updated_at,
           c.name AS customer_name
    FROM quotes_orders q
    JOIN customers c ON c.id = q.customer_id
    WHERE q.id = $1
  `,

  getLinesByQuoteOrderId: `
    SELECT l.id, l.quote_order_id, l.item_id, l.description, l.quantity, l.unit_price, l.sort_order, l.billing_status,
           i.sku AS item_sku, i.name AS item_name
    FROM quote_order_lines l
    LEFT JOIN items i ON i.id = l.item_id
    WHERE l.quote_order_id = $1
    ORDER BY l.sort_order ASC, l.id ASC
  `,

  createQuoteOrder: `
    INSERT INTO quotes_orders (document_number, type, customer_id, ticket_id, status, valid_until, order_date, notes, subtotal, tax_rate, tax_amount, shipping_amount, total)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id, document_number, type, customer_id, ticket_id, status, valid_until, order_date, notes, subtotal, tax_rate, tax_amount, shipping_amount, total, created_at, updated_at
  `,

  updateQuoteOrder: `
    UPDATE quotes_orders
    SET customer_id = COALESCE($2, customer_id),
        ticket_id = $3,
        status = COALESCE($4, status),
        valid_until = $5,
        order_date = $6,
        notes = $7,
        subtotal = COALESCE($8, subtotal),
        tax_rate = COALESCE($9, tax_rate),
        tax_amount = COALESCE($10, tax_amount),
        shipping_amount = COALESCE($11, shipping_amount),
        total = COALESCE($12, total),
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, document_number, type, customer_id, ticket_id, status, valid_until, order_date, notes, subtotal, tax_rate, tax_amount, shipping_amount, total, created_at, updated_at
  `,

  setQuoteStatusConverted: `
    UPDATE quotes_orders SET status = 'converted', updated_at = NOW() WHERE id = $1
  `,

  deleteQuoteOrder: `DELETE FROM quotes_orders WHERE id = $1 RETURNING id`,

  insertLine: `
    INSERT INTO quote_order_lines (quote_order_id, item_id, description, quantity, unit_price, sort_order, billing_status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, quote_order_id, item_id, description, quantity, unit_price, sort_order, billing_status
  `,

  deleteLinesByQuoteOrderId: `DELETE FROM quote_order_lines WHERE quote_order_id = $1`,
  getLineById: `SELECT id, quote_order_id, item_id, description, quantity, unit_price, sort_order, billing_status FROM quote_order_lines WHERE id = $1`,
  updateLine: `
    UPDATE quote_order_lines SET item_id = $2, description = $3, quantity = $4, unit_price = $5, sort_order = $6, billing_status = COALESCE($7, billing_status)
    WHERE id = $1
    RETURNING id, quote_order_id, item_id, description, quantity, unit_price, sort_order, billing_status
  `,
  deleteLine: `DELETE FROM quote_order_lines WHERE id = $1 RETURNING id`,
};

export default quoteOrderQueries;
