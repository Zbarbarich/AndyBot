const invoiceQueries = {
  nextInvoiceNumber: `SELECT LPAD((nextval('invoice_number_seq'))::text, 6, '0') AS invoice_number`,

  list: `
    SELECT i.id, i.invoice_number, i.order_id, i.customer_id, i.ticket_id, i.invoice_date, i.due_date,
           i.subtotal, i.tax_rate, i.tax_amount, i.shipping_amount, i.total, i.amount_paid, i.payment_method, i.paid_at,
           i.created_at, i.updated_at,
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
           i.created_at, i.updated_at,
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
           i.created_at, i.updated_at,
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
           i.subtotal, i.tax_amount, i.shipping_amount, i.total,
           c.name AS customer_name,
           q.document_number AS order_document_number
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    JOIN quotes_orders q ON q.id = i.order_id
    WHERE i.order_id = $1
    ORDER BY i.invoice_number ASC
  `,

  orderBillableLines: `
    SELECT id, quote_order_id, item_id, description, quantity, unit_price, sort_order,
           COALESCE(quantity_billed, 0)::numeric AS quantity_billed
    FROM quote_order_lines
    WHERE quote_order_id = $1 AND billing_status = 'billable'
      AND (quantity - COALESCE(quantity_billed, 0)) > 0
    ORDER BY sort_order ASC, id ASC
  `,

  createInvoice: `
    INSERT INTO invoices (invoice_number, order_id, customer_id, ticket_id, invoice_date, due_date, subtotal, tax_rate, tax_amount, shipping_amount, total)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, invoice_number, order_id, customer_id, ticket_id, invoice_date, due_date, subtotal, tax_rate, tax_amount, shipping_amount, total, amount_paid, payment_method, paid_at, created_at, updated_at
  `,

  insertInvoiceLine: `
    INSERT INTO invoice_lines (invoice_id, order_line_id, item_id, description, quantity, unit_price, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, invoice_id, order_line_id, item_id, description, quantity, unit_price, sort_order
  `,

  setOrderLineInvoiced: `UPDATE quote_order_lines SET billing_status = 'invoiced' WHERE id = $1`,

  /** Add quantity_billed and set billing_status to 'invoiced' when fully billed */
  addOrderLineQuantityBilled: `
    UPDATE quote_order_lines
    SET quantity_billed = quantity_billed + $2,
        billing_status = CASE WHEN (quantity_billed + $2) >= quantity THEN 'invoiced' ELSE billing_status END
    WHERE id = $1
    RETURNING id, quantity_billed, billing_status
  `,

  countOrderLinesNotInvoiced: `
    SELECT COUNT(*)::int AS count
    FROM quote_order_lines
    WHERE quote_order_id = $1 AND billing_status = 'billable' AND (quantity - COALESCE(quantity_billed, 0)) > 0
  `,

  setOrderClosed: `UPDATE quotes_orders SET status = 'closed', updated_at = NOW() WHERE id = $1 AND type = 'order' RETURNING id`,

  getPaymentsByInvoiceId: `
    SELECT id, invoice_id, amount, payment_method, paid_at, reference
    FROM invoice_payments
    WHERE invoice_id = $1
    ORDER BY paid_at ASC
  `,

  getPaymentById: `
    SELECT id, invoice_id, amount, payment_method, paid_at, reference
    FROM invoice_payments
    WHERE id = $1 AND invoice_id = $2
  `,

  deletePayment: `
    DELETE FROM invoice_payments WHERE id = $1 AND invoice_id = $2
    RETURNING id
  `,

  insertPayment: `
    INSERT INTO invoice_payments (invoice_id, amount, payment_method, paid_at, reference)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, invoice_id, amount, payment_method, paid_at, reference
  `,

  syncInvoiceAmountPaid: `
    UPDATE invoices i
    SET amount_paid = LEAST((SELECT COALESCE(SUM(amount), 0)::numeric FROM invoice_payments WHERE invoice_id = i.id), i.total),
        payment_method = (SELECT payment_method FROM invoice_payments WHERE invoice_id = i.id ORDER BY paid_at DESC LIMIT 1),
        paid_at = CASE WHEN (SELECT COALESCE(SUM(amount), 0)::numeric FROM invoice_payments WHERE invoice_id = i.id) >= i.total
          THEN (SELECT MAX(paid_at) FROM invoice_payments WHERE invoice_id = i.id) ELSE paid_at END,
        updated_at = NOW()
    WHERE i.id = $1
    RETURNING id, invoice_number, order_id, customer_id, ticket_id, invoice_date, due_date, subtotal, tax_rate, tax_amount, shipping_amount, total, amount_paid, payment_method, paid_at, created_at, updated_at
  `,

  getUnappliedDepositsByOrderId: `
    SELECT id, quote_order_id, amount, payment_method, paid_at, reference
    FROM order_deposits
    WHERE quote_order_id = $1 AND applied_to_invoice_id IS NULL
    ORDER BY paid_at ASC
  `,

  markDepositsApplied: `
    UPDATE order_deposits SET applied_to_invoice_id = $2 WHERE id = ANY($1::int[])
  `,
};

export default invoiceQueries;
