const purchaseOrderQueries = {
  getById: `
    SELECT po.id, po.po_number, po.order_id, po.created_at, po.status,
           q.document_number AS order_document_number,
           c.name AS customer_name, c.contact_name AS customer_contact_name, c.physical_address AS customer_address
    FROM purchase_orders po
    JOIN quotes_orders q ON q.id = po.order_id
    JOIN customers c ON c.id = q.customer_id
    WHERE po.id = $1
  `,

  getLinesByPoId: `
    SELECT pol.id,
           COALESCE(NULLIF(TRIM(qol.description), ''), pol.description) AS description,
           pol.quantity,
           COALESCE(NULLIF(pol.unit_cost::numeric, 0), qol.unit_price::numeric, pol.unit_cost) AS unit_cost,
           pol.sort_order,
           COALESCE(NULLIF(TRIM(qol.sku), ''), i.sku) AS sku,
           i.name AS item_name
    FROM purchase_order_lines pol
    LEFT JOIN quote_order_lines qol ON qol.id = pol.quote_order_line_id
    LEFT JOIN items i ON i.id = pol.item_id
    WHERE pol.purchase_order_id = $1
    ORDER BY pol.sort_order ASC, pol.id ASC
  `,
};

export default purchaseOrderQueries;
