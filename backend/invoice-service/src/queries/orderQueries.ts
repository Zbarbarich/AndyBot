const orderQueries = {
  getById: `
    SELECT id, document_number, type, customer_id, ticket_id, status, valid_until, order_date, notes,
           subtotal, tax_rate, tax_amount, shipping_amount, total, created_at, updated_at
    FROM quotes_orders
    WHERE id = $1
  `,
};

export default orderQueries;
