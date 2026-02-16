const invoiceQueries = {
  nextInvoiceNumber: `SELECT LPAD((nextval('invoice_number_seq'))::text, 6, '0') AS invoice_number`,

  list: `
    SELECT i.id, i.invoice_number, i.order_id, i.customer_id, i.ticket_id, i.invoice_date, i.due_date,
           i.subtotal, i.tax_rate, i.tax_amount, i.shipping_amount, i.total, i.amount_paid, i.payment_method, i.paid_at,
           i.status, i.created_at, i.updated_at,
           (i.total - COALESCE(i.amount_paid, 0)) AS balance_due,
           q.document_number AS order_document_number,
           c.name AS customer_name
    FROM invoices i
    JOIN quotes_orders q ON q.id = i.order_id
    JOIN customers c ON c.id = i.customer_id
    ORDER BY i.invoice_number DESC
  `,

  search: `
    SELECT i.id, i.invoice_number, i.order_id, i.customer_id, i.ticket_id, i.invoice_date, i.due_date,
           i.subtotal, i.tax_rate, i.tax_amount, i.shipping_amount, i.total, i.amount_paid, i.payment_method, i.paid_at,
           i.status, i.created_at, i.updated_at,
           (i.total - COALESCE(i.amount_paid, 0)) AS balance_due,
           q.document_number AS order_document_number,
           c.name AS customer_name
    FROM invoices i
    JOIN quotes_orders q ON q.id = i.order_id
    JOIN customers c ON c.id = i.customer_id
    WHERE i.invoice_number ILIKE $1 OR c.name ILIKE $1 OR q.document_number ILIKE $1 OR i.id::text = $2
    ORDER BY i.invoice_number DESC
    LIMIT 20
  `,

  getById: `
    SELECT i.id, i.invoice_number, i.order_id, i.customer_id, i.ticket_id, i.invoice_date, i.due_date,
           i.subtotal, i.tax_rate, i.tax_amount, i.shipping_amount, i.total, i.amount_paid, i.payment_method, i.paid_at,
           i.status, i.created_at, i.updated_at,
           (i.total - COALESCE(i.amount_paid, 0)) AS balance_due,
           q.document_number AS order_document_number,
           c.name AS customer_name
    FROM invoices i
    JOIN quotes_orders q ON q.id = i.order_id
    JOIN customers c ON c.id = i.customer_id
    WHERE i.id = $1
  `,

  getLinesByInvoiceId: `
    SELECT id, invoice_id, order_line_id, item_id, description, quantity, unit_price, sort_order
    FROM invoice_lines
    WHERE invoice_id = $1
    ORDER BY sort_order ASC, id ASC
  `,

  getByOrderId: `
    SELECT i.id, i.invoice_number, i.order_id, i.customer_id, i.invoice_date, i.due_date,
           i.subtotal, i.tax_amount, i.shipping_amount, i.total, i.status,
           c.name AS customer_name
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    WHERE i.order_id = $1
    ORDER BY i.invoice_number ASC
  `,

  orderBillableLines: `
    SELECT id, quote_order_id, item_id, description, quantity, unit_price, sort_order
    FROM quote_order_lines
    WHERE quote_order_id = $1 AND billing_status = 'billable'
    ORDER BY sort_order ASC, id ASC
  `,

  createInvoice: `
    INSERT INTO invoices (invoice_number, order_id, customer_id, ticket_id, invoice_date, due_date, subtotal, tax_rate, tax_amount, shipping_amount, total, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id, invoice_number, order_id, customer_id, ticket_id, invoice_date, due_date, subtotal, tax_rate, tax_amount, shipping_amount, total, amount_paid, payment_method, paid_at, status, created_at, updated_at
  `,

  insertInvoiceLine: `
    INSERT INTO invoice_lines (invoice_id, order_line_id, item_id, description, quantity, unit_price, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, invoice_id, order_line_id, item_id, description, quantity, unit_price, sort_order
  `,

  setOrderLineInvoiced: `UPDATE quote_order_lines SET billing_status = 'invoiced' WHERE id = $1`,

  recordPayment: `
    UPDATE invoices
    SET amount_paid = LEAST(COALESCE(amount_paid, 0) + $2, total),
        payment_method = COALESCE($3, payment_method),
        paid_at = CASE WHEN (COALESCE(amount_paid, 0) + $2) >= total THEN COALESCE($4, NOW()) ELSE paid_at END,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, invoice_number, order_id, customer_id, ticket_id, invoice_date, due_date, subtotal, tax_rate, tax_amount, shipping_amount, total, amount_paid, payment_method, paid_at, status, created_at, updated_at
  `,
};

export default invoiceQueries;
