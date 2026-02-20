const purchaseOrderQueries = {
  getById: `
    SELECT po.id, po.po_number, po.order_id, po.created_at, po.status,
           q.document_number AS order_document_number,
           c.name AS customer_name
    FROM purchase_orders po
    JOIN quotes_orders q ON q.id = po.order_id
    JOIN customers c ON c.id = q.customer_id
    WHERE po.id = $1
  `,

  getLinesByPoId: `
    SELECT pol.id, pol.description, pol.quantity, pol.unit_cost, pol.sort_order,
           i.sku, i.name AS item_name
    FROM purchase_order_lines pol
    LEFT JOIN items i ON i.id = pol.item_id
    WHERE pol.purchase_order_id = $1
    ORDER BY pol.sort_order ASC, pol.id ASC
  `,
};

export default purchaseOrderQueries;
