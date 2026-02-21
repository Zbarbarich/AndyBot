const itemQueries = {
  getAll: `
    SELECT id, sku, name, category, description, unit_price, taxable, stock, our_cost, unit_of_measure, created_at, updated_at
    FROM items
    ORDER BY sku ASC
  `,

  getById: `
    SELECT id, sku, name, category, description, unit_price, taxable, stock, our_cost, unit_of_measure, created_at, updated_at
    FROM items
    WHERE id = $1
  `,

  search: `
    SELECT id, sku, name, category, description, unit_price, taxable, stock, our_cost, unit_of_measure, created_at, updated_at
    FROM items
    WHERE sku ILIKE $1 OR name ILIKE $1 OR category ILIKE $1 OR id::text = $2
    ORDER BY sku ASC
    LIMIT 20
  `,

  getBySku: `SELECT id FROM items WHERE sku = $1`,
  getSkuById: `SELECT sku FROM items WHERE id = $1`,

  create: `
    INSERT INTO items (sku, name, category, description, unit_price, taxable, stock, our_cost, unit_of_measure)
    VALUES ($1, $2, $3, $4, $5::numeric, $6, $7::numeric, $8::numeric, COALESCE(NULLIF(TRIM($9), ''), 'EA'))
    RETURNING id, sku, name, category, description, unit_price, taxable, stock, our_cost, unit_of_measure, created_at, updated_at
  `,

  update: `
    UPDATE items
    SET name = COALESCE($2, name),
        category = COALESCE($3, category),
        description = COALESCE($4, description),
        unit_price = COALESCE($5, unit_price),
        taxable = COALESCE($6, taxable),
        stock = COALESCE($7, stock),
        our_cost = COALESCE($8, our_cost),
        unit_of_measure = COALESCE($9, unit_of_measure),
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, sku, name, category, description, unit_price, taxable, stock, our_cost, unit_of_measure, created_at, updated_at
  `,

  delete: `
    DELETE FROM items
    WHERE id = $1
    RETURNING id
  `,
};

export default itemQueries;
