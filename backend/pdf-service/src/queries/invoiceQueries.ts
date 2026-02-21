const invoiceQueries = {
  getById: `
    SELECT i.id, i.invoice_number, i.order_id, i.customer_id, i.ticket_id, i.invoice_date, i.due_date,
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
    SELECT id, invoice_id, order_line_id, item_id, description, quantity, unit_price, sort_order
    FROM invoice_lines
    WHERE invoice_id = $1
    ORDER BY sort_order ASC, id ASC
  `,

  getPaymentsByInvoiceId: `
    SELECT id, invoice_id, amount, payment_method, paid_at
    FROM invoice_payments
    WHERE invoice_id = $1
    ORDER BY paid_at ASC
  `,
};

export default invoiceQueries;
