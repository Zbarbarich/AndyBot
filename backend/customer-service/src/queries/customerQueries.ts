const customerQueries = {
  getAll: `
    SELECT id, name, physical_address, email, phone, email_notifications, text_notifications, created_at, updated_at,
           (SELECT COALESCE(array_agg(id ORDER BY id), ARRAY[]::integer[]) FROM tickets WHERE customer_id = customers.id) AS ticket_ids
    FROM customers
    ORDER BY id ASC
  `,

  getById: `
    SELECT id, name, physical_address, email, phone, email_notifications, text_notifications, created_at, updated_at,
           (SELECT COALESCE(array_agg(id ORDER BY id), ARRAY[]::integer[]) FROM tickets WHERE customer_id = customers.id) AS ticket_ids
    FROM customers
    WHERE id = $1
  `,

  create: `
    INSERT INTO customers (name, physical_address, email, phone, email_notifications, text_notifications)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, physical_address, email, phone, email_notifications, text_notifications, created_at, updated_at
  `,

  update: `
    UPDATE customers
    SET name = COALESCE($2, name),
        physical_address = COALESCE($3, physical_address),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        email_notifications = COALESCE($6, email_notifications),
        text_notifications = COALESCE($7, text_notifications),
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, name, physical_address, email, phone, email_notifications, text_notifications, created_at, updated_at
  `,

  delete: `
    DELETE FROM customers
    WHERE id = $1
    RETURNING id
  `,

  listSorted: (orderBy: string, order: 'ASC' | 'DESC'): string => {
    const allowed = ['id', 'name', 'email', 'created_at', 'updated_at'];
    const col = allowed.includes(orderBy) ? orderBy : 'id';
    const dir = order === 'DESC' ? 'DESC' : 'ASC';
    return `
      SELECT id, name, physical_address, email, phone, email_notifications, text_notifications, created_at, updated_at,
             (SELECT COALESCE(array_agg(id ORDER BY id), ARRAY[]::integer[]) FROM tickets WHERE customer_id = customers.id) AS ticket_ids
      FROM customers
      ORDER BY ${col} ${dir}
    `;
  },

  search: `
    SELECT id, name, physical_address, email, phone, email_notifications, text_notifications, created_at, updated_at,
           (SELECT COALESCE(array_agg(id ORDER BY id), ARRAY[]::integer[]) FROM tickets WHERE customer_id = customers.id) AS ticket_ids
    FROM customers
    WHERE (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)
    ORDER BY id ASC
  `,

  listOrdersByCustomerId: `
    SELECT q.id, q.document_number, q.type, q.customer_id, q.ticket_id, q.status, q.valid_until, q.order_date, q.notes,
           q.subtotal, q.tax_rate, q.tax_amount, q.shipping_amount, q.total, q.created_at, q.updated_at,
           c.name AS customer_name
    FROM quotes_orders q
    JOIN customers c ON c.id = q.customer_id
    WHERE q.customer_id = $1
    ORDER BY q.document_number DESC
  `,

  listInvoicesByCustomerId: `
    SELECT i.id, i.invoice_number, i.order_id, i.customer_id, i.invoice_date, i.due_date,
           i.subtotal, i.tax_amount, i.shipping_amount, i.total, i.amount_paid, i.payment_method, i.paid_at, i.status,
           (i.total - COALESCE(i.amount_paid, 0)) AS balance_due
    FROM invoices i
    WHERE i.customer_id = $1
    ORDER BY i.invoice_number DESC
  `,
};

export default customerQueries;
