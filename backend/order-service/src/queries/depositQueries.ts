const depositQueries = {
  listByOrderId: `
    SELECT d.id, d.quote_order_id, d.amount, d.payment_method, d.paid_at, d.reference, d.applied_to_invoice_id,
           i.invoice_number AS applied_to_invoice_number
    FROM order_deposits d
    LEFT JOIN invoices i ON i.id = d.applied_to_invoice_id
    WHERE d.quote_order_id = $1
    ORDER BY d.paid_at ASC
  `,

  create: `
    INSERT INTO order_deposits (quote_order_id, amount, payment_method, paid_at, reference)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, quote_order_id, amount, payment_method, paid_at, reference, applied_to_invoice_id
  `,

  getById: `
    SELECT id, quote_order_id, amount, payment_method, paid_at, reference, applied_to_invoice_id
    FROM order_deposits WHERE id = $1
  `,

  delete: `DELETE FROM order_deposits WHERE id = $1 AND quote_order_id = $2 RETURNING id`,

  getOpenInvoiceForOrder: `
    SELECT id, invoice_number, total, COALESCE(amount_paid, 0) AS amount_paid
    FROM invoices
    WHERE order_id = $1 AND COALESCE(amount_paid, 0) < total
    ORDER BY invoice_date ASC, id ASC
    LIMIT 1
  `,

  insertInvoicePayment: `
    INSERT INTO invoice_payments (invoice_id, amount, payment_method, paid_at, reference)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `,

  markDepositApplied: `
    UPDATE order_deposits SET applied_to_invoice_id = $2 WHERE id = $1
    RETURNING id, quote_order_id, amount, payment_method, paid_at, reference, applied_to_invoice_id
  `,

  syncInvoiceAmountPaid: `
    UPDATE invoices i
    SET amount_paid = (SELECT COALESCE(SUM(amount), 0)::numeric FROM invoice_payments WHERE invoice_id = i.id),
        payment_method = (SELECT payment_method FROM invoice_payments WHERE invoice_id = i.id ORDER BY paid_at DESC LIMIT 1),
        paid_at = CASE WHEN (SELECT COALESCE(SUM(amount), 0)::numeric FROM invoice_payments WHERE invoice_id = i.id) >= i.total
          THEN (SELECT MAX(paid_at) FROM invoice_payments WHERE invoice_id = i.id) ELSE paid_at END,
        updated_at = NOW()
    WHERE i.id = $1
  `,
  listUnapplied: `
    SELECT d.id, d.quote_order_id, d.amount, d.paid_at, q.document_number
    FROM order_deposits d
    JOIN quotes_orders q ON q.id = d.quote_order_id
    WHERE d.applied_to_invoice_id IS NULL
    ORDER BY d.paid_at ASC
  `,
};

export default depositQueries;
