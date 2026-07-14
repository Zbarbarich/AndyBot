/** Queries for order→invoice relationship (same DB as invoice-service). Used to attach invoiced_on to order lines. */
const orderInvoiceQueries = {
  /** For each invoice line on this order, return order_line_id, qty_invoiced, sub_order_number, invoice_number. */
  getInvoiceLinesWithSubOrder: `
    WITH inv AS (
      SELECT i.id, i.invoice_number, q.document_number,
             ROW_NUMBER() OVER (ORDER BY i.invoice_number) AS rn
      FROM invoices i
      JOIN quotes_orders q ON q.id = i.order_id
      WHERE i.order_id = $1
    )
    SELECT il.order_line_id, il.quantity AS qty_invoiced,
           inv.id AS invoice_id,
           inv.document_number || '-' || LPAD(inv.rn::text, 3, '0') AS sub_order_number,
           inv.invoice_number
    FROM invoice_lines il
    JOIN inv ON inv.id = il.invoice_id
    WHERE il.order_line_id IS NOT NULL
  `,
};

export default orderInvoiceQueries;
