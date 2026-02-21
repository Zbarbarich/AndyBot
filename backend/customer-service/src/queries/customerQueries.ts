const customerQueries = {
  getAll: `
    SELECT id, name, contact_name, physical_address, email, phone, email_notifications, text_notifications, created_at, updated_at,
           (SELECT COALESCE(array_agg(id ORDER BY id), ARRAY[]::integer[]) FROM tickets WHERE customer_id = customers.id) AS ticket_ids
    FROM customers
    ORDER BY id ASC
  `,

  getById: `
    SELECT id, name, contact_name, physical_address, email, phone, email_notifications, text_notifications, created_at, updated_at,
           (SELECT COALESCE(array_agg(id ORDER BY id), ARRAY[]::integer[]) FROM tickets WHERE customer_id = customers.id) AS ticket_ids
    FROM customers
    WHERE id = $1
  `,

  create: `
    INSERT INTO customers (name, contact_name, physical_address, email, phone, email_notifications, text_notifications)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, name, contact_name, physical_address, email, phone, email_notifications, text_notifications, created_at, updated_at
  `,

  update: `
    UPDATE customers
    SET name = COALESCE($2, name),
        contact_name = COALESCE($3, contact_name),
        physical_address = COALESCE($4, physical_address),
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        email_notifications = COALESCE($7, email_notifications),
        text_notifications = COALESCE($8, text_notifications),
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, name, contact_name, physical_address, email, phone, email_notifications, text_notifications, created_at, updated_at
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
      SELECT id, name, contact_name, physical_address, email, phone, email_notifications, text_notifications, created_at, updated_at,
             (SELECT COALESCE(array_agg(id ORDER BY id), ARRAY[]::integer[]) FROM tickets WHERE customer_id = customers.id) AS ticket_ids
      FROM customers
      ORDER BY ${col} ${dir}
    `;
  },

  search: `
    SELECT id, name, contact_name, physical_address, email, phone, email_notifications, text_notifications, created_at, updated_at,
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
           i.subtotal, i.tax_amount, i.shipping_amount, i.total, i.amount_paid, i.payment_method, i.paid_at,
           (i.total - COALESCE(i.amount_paid, 0)) AS balance_due
    FROM invoices i
    WHERE i.customer_id = $1
    ORDER BY i.invoice_number DESC
  `,

  /** Invoice payments for customer (for payment history). */
  paymentHistoryInvoicePayments: `
    SELECT ip.id, 'invoice' AS payment_type, ip.invoice_id, ip.amount, ip.payment_method, ip.paid_at, ip.reference,
           i.invoice_number, i.order_id, q.document_number AS order_document_number
    FROM invoice_payments ip
    JOIN invoices i ON i.id = ip.invoice_id
    JOIN quotes_orders q ON q.id = i.order_id
    WHERE i.customer_id = $1
    ORDER BY ip.paid_at DESC
  `,

  /** Order deposits for customer (for payment history). */
  paymentHistoryOrderDeposits: `
    SELECT d.id, 'deposit' AS payment_type, d.quote_order_id AS order_id, d.amount, d.payment_method, d.paid_at, d.reference,
           d.applied_to_invoice_id, q.document_number AS order_document_number,
           ai.invoice_number AS applied_invoice_number
    FROM order_deposits d
    JOIN quotes_orders q ON q.id = d.quote_order_id
    LEFT JOIN invoices ai ON ai.id = d.applied_to_invoice_id
    WHERE q.customer_id = $1
    ORDER BY d.paid_at DESC
  `,
};

export default customerQueries;
