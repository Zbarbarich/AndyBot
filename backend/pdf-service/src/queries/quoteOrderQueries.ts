const quoteOrderQueries = {
  getByIdWithCustomer: `
    SELECT q.id, q.document_number, q.type, q.customer_id, q.ticket_id, q.status, q.valid_until, q.order_date, q.notes,
           q.customer_po_number, q.original_quote_id,
           q.subtotal, q.tax_rate, q.tax_amount, q.shipping_amount, q.total, q.created_at, q.updated_at,
           c.name AS customer_name, c.contact_name AS customer_contact_name, c.physical_address AS customer_address
    FROM quotes_orders q
    JOIN customers c ON c.id = q.customer_id
    WHERE q.id = $1
  `,

  getLinesByQuoteOrderId: `
    SELECT l.id, l.quote_order_id, l.item_id, l.description, l.quantity, l.unit_price, l.sort_order, l.billing_status, l.unit_of_measure,
           i.sku AS item_sku, i.name AS item_name, i.unit_of_measure AS item_unit_of_measure
    FROM quote_order_lines l
    LEFT JOIN items i ON i.id = l.item_id
    WHERE l.quote_order_id = $1
    ORDER BY l.sort_order ASC, l.id ASC
  `,

  getDepositsByOrderId: `
    SELECT d.amount, d.payment_method, d.paid_at, d.reference, d.applied_to_invoice_id
    FROM order_deposits d
    WHERE d.quote_order_id = $1
    ORDER BY d.paid_at ASC, d.id ASC
  `,
};

export default quoteOrderQueries;
