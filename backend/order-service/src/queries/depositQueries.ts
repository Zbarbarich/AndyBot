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
};

export default depositQueries;
