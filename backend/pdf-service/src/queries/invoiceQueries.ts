const invoiceQueries = {
  getById: `
    SELECT i.id, i.invoice_number, i.order_id, i.customer_id,
           COALESCE(i.ticket_id, q.ticket_id) AS ticket_id,
           i.invoice_date, i.due_date,
           i.subtotal, i.tax_rate, i.tax_amount, i.shipping_amount, i.total, i.amount_paid, i.payment_method, i.paid_at,
           i.created_at, i.updated_at,
           (i.total - COALESCE(i.amount_paid, 0)) AS balance_due,
           q.document_number AS order_document_number,
           q.customer_po_number, q.notes AS order_notes,
           c.name AS customer_name, c.contact_name AS customer_contact_name, c.physical_address AS customer_address
    FROM invoices i
    JOIN quotes_orders q ON q.id = i.order_id
    JOIN customers c ON c.id = i.customer_id
    WHERE i.id = $1
  `,

  getLinesByInvoiceId: `
    SELECT il.id, il.invoice_id, il.order_line_id, il.item_id, il.description, il.quantity, il.unit_price, il.sort_order,
           COALESCE(NULLIF(TRIM(qol.unit_of_measure), ''), NULLIF(TRIM(i.unit_of_measure), ''), 'EA') AS unit_of_measure,
           i.unit_of_measure AS item_unit_of_measure
    FROM invoice_lines il
    LEFT JOIN quote_order_lines qol ON qol.id = il.order_line_id
    LEFT JOIN items i ON i.id = il.item_id
    WHERE il.invoice_id = $1
    ORDER BY il.sort_order ASC, il.id ASC
  `,

  getPaymentsByInvoiceId: `
    SELECT id, invoice_id, amount, payment_method, paid_at, reference
    FROM invoice_payments
    WHERE invoice_id = $1
    ORDER BY paid_at ASC
  `,
};

export default invoiceQueries;
