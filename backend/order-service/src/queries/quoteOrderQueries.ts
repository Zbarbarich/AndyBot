const quoteOrderQueries = {
  nextDocumentNumber: `SELECT LPAD((nextval('quote_order_number_seq'))::text, 6, '0') AS document_number`,

  listQuotes: `
    SELECT q.id, q.document_number, q.type, q.customer_id, q.ticket_id, q.status, q.valid_until, q.order_date, q.notes,
           q.subtotal, q.tax_rate, q.tax_amount, q.shipping_amount, q.total, q.created_at, q.updated_at,
           c.name AS customer_name
    FROM quotes_orders q
    JOIN customers c ON c.id = q.customer_id
    WHERE q.type = 'quote' AND (q.status IS NULL OR q.status != 'converted')
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
           customer_po_number, original_quote_id,
           subtotal, tax_rate, tax_amount, shipping_amount, total, created_at, updated_at
    FROM quotes_orders
    WHERE id = $1
  `,

  getByIdWithCustomer: `
    SELECT q.id, q.document_number, q.type, q.customer_id, q.ticket_id, q.status, q.valid_until, q.order_date, q.notes,
           q.customer_po_number, q.original_quote_id,
           q.subtotal, q.tax_rate, q.tax_amount, q.shipping_amount, q.total, q.created_at, q.updated_at,
           c.name AS customer_name
    FROM quotes_orders q
    JOIN customers c ON c.id = q.customer_id
    WHERE q.id = $1
  `,

  getLinesByQuoteOrderId: `
    SELECT l.id, l.quote_order_id, l.order_id, l.order_document_number, l.sku, l.item_id, l.description, l.quantity, l.unit_price, l.sort_order, l.billing_status, l.unit_of_measure,
           COALESCE(l.quantity_billed, 0)::numeric AS quantity_billed,
           i.sku AS item_sku, i.name AS item_name, i.unit_of_measure AS item_unit_of_measure
    FROM quote_order_lines l
    LEFT JOIN items i ON i.id = l.item_id
    WHERE l.quote_order_id = $1
    ORDER BY l.sort_order ASC, l.id ASC
  `,

  createQuoteOrder: `
    INSERT INTO quotes_orders (document_number, type, customer_id, ticket_id, status, valid_until, order_date, notes, customer_po_number, original_quote_id, subtotal, tax_rate, tax_amount, shipping_amount, total)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id, document_number, type, customer_id, ticket_id, status, valid_until, order_date, notes, customer_po_number, original_quote_id, subtotal, tax_rate, tax_amount, shipping_amount, total, created_at, updated_at
  `,

  updateQuoteOrder: `
    UPDATE quotes_orders
    SET customer_id = COALESCE($2, customer_id),
        ticket_id = $3,
        status = COALESCE($4, status),
        valid_until = $5,
        order_date = $6,
        notes = $7,
        customer_po_number = $8,
        subtotal = COALESCE($9, subtotal),
        tax_rate = COALESCE($10, tax_rate),
        tax_amount = COALESCE($11, tax_amount),
        shipping_amount = COALESCE($12, shipping_amount),
        total = COALESCE($13, total),
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, document_number, type, customer_id, ticket_id, status, valid_until, order_date, notes, customer_po_number, original_quote_id, subtotal, tax_rate, tax_amount, shipping_amount, total, created_at, updated_at
  `,

  setQuoteStatusConverted: `UPDATE quotes_orders SET status = 'converted', updated_at = NOW() WHERE id = $1`,

  setQuoteStatusClosed: `
    UPDATE quotes_orders
    SET status = 'closed', updated_at = NOW()
    WHERE id = $1 AND type = 'quote' AND status NOT IN ('converted', 'closed')
    RETURNING id, document_number, type, customer_id, ticket_id, status, valid_until, order_date, notes,
              customer_po_number, original_quote_id, subtotal, tax_rate, tax_amount, shipping_amount, total, created_at, updated_at
  `,
  setOriginalQuoteId: `UPDATE quotes_orders SET original_quote_id = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,

  deleteQuoteOrder: `DELETE FROM quotes_orders WHERE id = $1 RETURNING id`,

  insertLine: `
    INSERT INTO quote_order_lines (quote_order_id, item_id, description, quantity, unit_price, sort_order, billing_status, order_id, order_document_number, sku, unit_of_measure)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE(NULLIF(TRIM($11), ''), 'EA'))
    RETURNING id, quote_order_id, item_id, description, quantity, unit_price, sort_order, billing_status, unit_of_measure
  `,

  deleteLinesByQuoteOrderId: `DELETE FROM quote_order_lines WHERE quote_order_id = $1`,
  getLineById: `SELECT id, quote_order_id, item_id, description, quantity, unit_price, sort_order, billing_status, unit_of_measure FROM quote_order_lines WHERE id = $1`,
  updateLine: `
    UPDATE quote_order_lines SET item_id = $2, description = $3, quantity = $4, unit_price = $5, sort_order = $6, billing_status = COALESCE($7, billing_status), unit_of_measure = COALESCE($8, unit_of_measure)
    WHERE id = $1
    RETURNING id, quote_order_id, item_id, description, quantity, unit_price, sort_order, billing_status, unit_of_measure
  `,

  /** Order line update scoped to order; preserves sku when $9 is null; does not touch quantity_billed. */
  updateOrderLine: `
    UPDATE quote_order_lines
    SET item_id = $2,
        description = $3,
        quantity = $4,
        unit_price = $5,
        sort_order = $6,
        billing_status = COALESCE($7, billing_status),
        unit_of_measure = COALESCE(NULLIF(TRIM($8), ''), unit_of_measure),
        sku = COALESCE($9, sku)
    WHERE id = $1 AND quote_order_id = $10
    RETURNING id, quote_order_id, item_id, description, quantity, unit_price, sort_order, billing_status, unit_of_measure
  `,

  /** Remove a line only if nothing has been invoiced on it (quantity_billed = 0). */
  deleteUnbilledOrderLine: `
    DELETE FROM quote_order_lines
    WHERE id = $1 AND quote_order_id = $2 AND COALESCE(quantity_billed, 0) = 0
    RETURNING id
  `,
  updateLineBillingStatus: `
    UPDATE quote_order_lines SET billing_status = $2
    WHERE id = $1 AND quote_order_id = $3
    RETURNING id, quote_order_id, item_id, description, quantity, unit_price, sort_order, billing_status, unit_of_measure
  `,
  deleteLine: `DELETE FROM quote_order_lines WHERE id = $1 RETURNING id`,

  ticketExists: `SELECT 1 FROM tickets WHERE id = $1`,
};

export default quoteOrderQueries;
