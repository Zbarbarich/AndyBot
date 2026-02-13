const TICKET_COLS = `
  t.id, t.creation_date, t.subject, t.customer_id, t.category, t.description, t.email, t.priority, t.status,
  t.created_at, t.updated_at, c.name AS customer_name, c.email AS customer_email
`;

const ticketQueries = {
  getAll: `
    SELECT ${TICKET_COLS}
    FROM tickets t
    LEFT JOIN customers c ON t.customer_id = c.id
    ORDER BY t.creation_date DESC
  `,

  getById: `
    SELECT ${TICKET_COLS}
    FROM tickets t
    LEFT JOIN customers c ON t.customer_id = c.id
    WHERE t.id = $1
  `,

  create: `
    INSERT INTO tickets (subject, customer_id, category, description, email, priority, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, creation_date, subject, customer_id, category, description, email, priority, status, created_at, updated_at
  `,

  update: `
    UPDATE tickets
    SET subject = COALESCE($2, subject),
        customer_id = $3,
        category = COALESCE($4, category),
        description = COALESCE($5, description),
        email = COALESCE($6, email),
        priority = COALESCE($7, priority),
        status = COALESCE($8, status),
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, creation_date, subject, customer_id, category, description, email, priority, status, created_at, updated_at
  `,

  delete: `
    DELETE FROM tickets
    WHERE id = $1
    RETURNING id
  `,

  listSorted: (orderBy: string, order: 'ASC' | 'DESC'): string => {
    const allowed = ['id', 'creation_date', 'subject', 'category', 'priority', 'status', 'created_at'];
    const col = allowed.includes(orderBy) ? `t.${orderBy}` : 't.creation_date';
    const dir = order === 'DESC' ? 'DESC' : 'ASC';
    return `
      SELECT ${TICKET_COLS}
      FROM tickets t
      LEFT JOIN customers c ON t.customer_id = c.id
      ORDER BY ${col} ${dir}
    `;
  },

  filterByCategory: (orderBy: string, order: 'ASC' | 'DESC'): string => {
    const allowed = ['id', 'creation_date', 'subject', 'category', 'priority', 'status', 'created_at'];
    const col = allowed.includes(orderBy) ? `t.${orderBy}` : 't.creation_date';
    const dir = order === 'DESC' ? 'DESC' : 'ASC';
    return `
      SELECT ${TICKET_COLS}
      FROM tickets t
      LEFT JOIN customers c ON t.customer_id = c.id
      WHERE t.category = $1
      ORDER BY ${col} ${dir}
    `;
  },

  filterByPriority: (orderBy: string, order: 'ASC' | 'DESC'): string => {
    const allowed = ['id', 'creation_date', 'subject', 'category', 'priority', 'status', 'created_at'];
    const col = allowed.includes(orderBy) ? `t.${orderBy}` : 't.creation_date';
    const dir = order === 'DESC' ? 'DESC' : 'ASC';
    return `
      SELECT ${TICKET_COLS}
      FROM tickets t
      LEFT JOIN customers c ON t.customer_id = c.id
      WHERE t.priority = $1
      ORDER BY ${col} ${dir}
    `;
  },

  filterByCustomer: (orderBy: string, order: 'ASC' | 'DESC'): string => {
    const allowed = ['id', 'creation_date', 'subject', 'category', 'priority', 'status', 'created_at'];
    const col = allowed.includes(orderBy) ? `t.${orderBy}` : 't.creation_date';
    const dir = order === 'DESC' ? 'DESC' : 'ASC';
    return `
      SELECT ${TICKET_COLS}
      FROM tickets t
      LEFT JOIN customers c ON t.customer_id = c.id
      WHERE t.customer_id = $1
      ORDER BY ${col} ${dir}
    `;
  },

  /** statusFilter: 'open' = Open + Pending Closure Review, 'closed' = Closed */
  filterByCustomerAndStatus: (orderBy: string, order: 'ASC' | 'DESC', statusFilter: 'open' | 'closed'): string => {
    const allowed = ['id', 'creation_date', 'subject', 'category', 'priority', 'status', 'created_at'];
    const col = allowed.includes(orderBy) ? `t.${orderBy}` : 't.creation_date';
    const dir = order === 'DESC' ? 'DESC' : 'ASC';
    const statusCondition =
      statusFilter === 'closed'
        ? "t.status = 'Closed'"
        : "t.status IN ('Open', 'Pending Closure Review')";
    return `
      SELECT ${TICKET_COLS}
      FROM tickets t
      LEFT JOIN customers c ON t.customer_id = c.id
      WHERE t.customer_id = $1 AND ${statusCondition}
      ORDER BY ${col} ${dir}
    `;
  },

  // Ticket images
  getImages: `SELECT id, ticket_id, position, created_at FROM ticket_images WHERE ticket_id = $1 ORDER BY position`,
  getImageData: `SELECT image_data FROM ticket_images WHERE id = $1 AND ticket_id = $2`,
  insertImage: `
    INSERT INTO ticket_images (ticket_id, position, image_data)
    VALUES ($1, $2, $3)
    RETURNING id, ticket_id, position, created_at
  `,
  deleteImage: `DELETE FROM ticket_images WHERE id = $1 AND ticket_id = $2 RETURNING id`,
  countImages: `SELECT COUNT(*) AS count FROM ticket_images WHERE ticket_id = $1`,

  // Resolution updates (chat-style)
  getResolutionsByTicketId: `
    SELECT id, ticket_id, content, created_at
    FROM ticket_resolution_updates
    WHERE ticket_id = $1
    ORDER BY created_at ASC
  `,
  insertResolution: `
    INSERT INTO ticket_resolution_updates (ticket_id, content)
    VALUES ($1, $2)
    RETURNING id, ticket_id, content, created_at
  `,
};

export default ticketQueries;
