import { Response } from 'express';
import { query } from '../config/db';
import purchaseOrderQueries from '../queries/purchaseOrderQueries';
import quoteOrderQueries from '../queries/quoteOrderQueries';
import itemQueries from '../queries/itemQueries';
import { AppRequest } from '../middleware/userContext';

export const purchaseOrderController = {
  /** Create a PO for an existing order. Body: { line_ids?: number[] } — optional quote_order_line ids to include; default all lines not yet on a PO. */
  async createForOrder(req: AppRequest, res: Response): Promise<void> {
    try {
      const orderId = parseInt(req.params.orderId, 10);
      if (isNaN(orderId)) {
        res.status(400).json({ error: 'Invalid order id' });
        return;
      }
      const orderResult = await query(quoteOrderQueries.getById, [orderId]);
      if (orderResult.rows.length === 0) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      const order = orderResult.rows[0] as { type: string };
      if (order.type !== 'order') {
        res.status(400).json({ error: 'Document is not an order; only orders can have purchase orders' });
        return;
      }
      const orderLinesResult = await query(quoteOrderQueries.getLinesByQuoteOrderId, [orderId]);
      const orderLines = orderLinesResult.rows as { id: number; item_id: number | null; description: string | null; quantity: string; unit_price: string }[];
      if (orderLines.length === 0) {
        res.status(400).json({ error: 'Order has no line items to add to a purchase order' });
        return;
      }
      const lineIdsFromBody = Array.isArray(req.body?.line_ids) ? (req.body.line_ids as number[]).filter((x) => Number.isInteger(x)) : null;
      const alreadyOnPoResult = await query(purchaseOrderQueries.linesAlreadyOnPo, [orderLines.map((l) => l.id)]);
      const alreadyOnPo = new Set((alreadyOnPoResult.rows as { quote_order_line_id: number }[]).map((r) => r.quote_order_line_id));
      const availableLines = orderLines.filter((l) => !alreadyOnPo.has(l.id));
      if (availableLines.length === 0) {
        res.status(400).json({ error: 'All order lines are already on a purchase order' });
        return;
      }
      const toInclude = lineIdsFromBody != null
        ? availableLines.filter((l) => lineIdsFromBody.includes(l.id))
        : availableLines;
      if (toInclude.length === 0) {
        res.status(400).json({ error: 'No valid line ids to include; some may already be on a PO' });
        return;
      }
      const poNumResult = await query(purchaseOrderQueries.nextPoNumber);
      const po_number = (poNumResult.rows[0] as { po_number: string }).po_number;
      const poResult = await query(purchaseOrderQueries.create, [po_number, orderId]);
      const poId = (poResult.rows[0] as { id: number }).id;
      for (let i = 0; i < toInclude.length; i++) {
        const ol = toInclude[i];
        let cost = 0;
        if (ol.item_id != null) {
          const itemRow = await query(itemQueries.getById, [ol.item_id]);
          const ourCost = (itemRow.rows[0] as { our_cost?: string | number } | undefined)?.our_cost;
          cost = ourCost != null ? Number(ourCost) : 0;
        }
        await query(purchaseOrderQueries.createLine, [
          poId,
          ol.id,
          ol.item_id,
          ol.description,
          Number(ol.quantity),
          cost,
          i,
        ]);
      }
      const docResult = await query(purchaseOrderQueries.getById, [poId]);
      const poLinesResult = await query(purchaseOrderQueries.getLinesByPoId, [poId]);
      res.status(201).json({ ...docResult.rows[0], lines: poLinesResult.rows });
    } catch (e) {
      console.error('purchaseOrderController.createForOrder', e);
      res.status(500).json({ error: 'Failed to create purchase order' });
    }
  },

  async search(req: AppRequest, res: Response): Promise<void> {
    try {
      const q = String((req.query.q as string) || '').trim();
      if (!q) {
        res.json([]);
        return;
      }
      const term = `%${q}%`;
      const result = await query(purchaseOrderQueries.search, [term, q]);
      res.json(result.rows);
    } catch (e) {
      console.error('purchaseOrderController.search', e);
      res.status(500).json({ error: 'Failed to search purchase orders' });
    }
  },

  async list(req: AppRequest, res: Response): Promise<void> {
    try {
      const result = await query(purchaseOrderQueries.list);
      res.json(result.rows);
    } catch (e) {
      console.error('purchaseOrderController.list', e);
      res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
  },

  async getById(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      const docResult = await query(purchaseOrderQueries.getById, [id]);
      if (docResult.rows.length === 0) {
        res.status(404).json({ error: 'Purchase order not found' });
        return;
      }
      const linesResult = await query(purchaseOrderQueries.getLinesByPoId, [id]);
      res.json({ ...docResult.rows[0], lines: linesResult.rows });
    } catch (e) {
      console.error('purchaseOrderController.getById', e);
      res.status(500).json({ error: 'Failed to fetch purchase order' });
    }
  },

  async updateLineOrdered(req: AppRequest, res: Response): Promise<void> {
    try {
      const poId = parseInt(req.params.id, 10);
      const lineId = parseInt(req.params.lineId, 10);
      if (isNaN(poId) || isNaN(lineId)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      const { ordered_at, ordered_via } = req.body || {};
      const orderedAt = ordered_at === undefined ? new Date() : (ordered_at === null ? null : new Date(ordered_at));
      const result = await query(purchaseOrderQueries.updateLineOrderedByPoAndLine, [
        poId,
        lineId,
        orderedAt,
        ordered_via !== undefined ? (ordered_via == null ? null : String(ordered_via).slice(0, 200)) : null,
      ]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Purchase order or line not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (e) {
      console.error('purchaseOrderController.updateLineOrdered', e);
      res.status(500).json({ error: 'Failed to update line' });
    }
  },

  async close(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      const result = await query(purchaseOrderQueries.updateStatus, [id, 'closed']);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Purchase order not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (e) {
      console.error('purchaseOrderController.close', e);
      res.status(500).json({ error: 'Failed to close purchase order' });
    }
  },
};
