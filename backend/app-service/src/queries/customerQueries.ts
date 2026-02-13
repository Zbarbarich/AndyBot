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

  // Aggregations / sorting
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
};

export default customerQueries;
