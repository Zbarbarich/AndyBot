const purchaseOrderQueries = {
  nextPoNumber: `SELECT LPAD((nextval('purchase_order_number_seq'))::text, 6, '0') AS po_number`,

  create: `
    INSERT INTO purchase_orders (po_number, order_id, status)
    VALUES ($1, $2, 'open')
    RETURNING id, po_number, order_id, created_at, status
  `,

  createLine: `
    INSERT INTO purchase_order_lines (purchase_order_id, quote_order_line_id, item_id, description, quantity, unit_cost, sort_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, purchase_order_id, quote_order_line_id, item_id, description, quantity, unit_cost, sort_order
  `,

  list: `
    SELECT po.id, po.po_number, po.order_id, po.created_at, po.status,
           q.document_number AS order_document_number,
           q.customer_po_number,
           q.total AS order_total,
           c.name AS customer_name
    FROM purchase_orders po
    JOIN quotes_orders q ON q.id = po.order_id
    JOIN customers c ON c.id = q.customer_id
    ORDER BY po.id DESC
  `,

  search: `
    SELECT po.id, po.po_number, po.order_id, po.created_at, po.status,
           q.document_number AS order_document_number,
           c.name AS customer_name
    FROM purchase_orders po
    JOIN quotes_orders q ON q.id = po.order_id
    JOIN customers c ON c.id = q.customer_id
    WHERE po.po_number ILIKE $1 OR q.document_number ILIKE $1 OR c.name ILIKE $1 OR po.id::text = $2
    ORDER BY po.id DESC
    LIMIT 20
  `,

  getById: `
    SELECT po.id, po.po_number, po.order_id, po.created_at, po.status,
           q.document_number AS order_document_number
    FROM purchase_orders po
    JOIN quotes_orders q ON q.id = po.order_id
    WHERE po.id = $1
  `,

  getLinesByPoId: `
    SELECT pol.id, pol.purchase_order_id, pol.quote_order_line_id, pol.item_id, pol.description, pol.quantity, pol.unit_cost, pol.sort_order,
           pol.ordered_at, pol.ordered_via,
           i.sku, i.name AS item_name
    FROM purchase_order_lines pol
    LEFT JOIN items i ON i.id = pol.item_id
    WHERE pol.purchase_order_id = $1
    ORDER BY pol.sort_order ASC, pol.id ASC
  `,

  updateLineOrderedByPoAndLine: `
    UPDATE purchase_order_lines
    SET ordered_at = $3, ordered_via = $4
    WHERE purchase_order_id = $1 AND id = $2
    RETURNING id, purchase_order_id, quote_order_line_id, item_id, description, quantity, unit_cost, sort_order, ordered_at, ordered_via
  `,

  updateStatus: `
    UPDATE purchase_orders SET status = $2 WHERE id = $1 RETURNING id, po_number, order_id, created_at, status
  `,

  /** Quote order line IDs that are already on a purchase order (for "line PO'd once per order" check) */
  linesAlreadyOnPo: `
    SELECT quote_order_line_id FROM purchase_order_lines WHERE quote_order_line_id = ANY($1::int[])
  `,
};

export default purchaseOrderQueries;
