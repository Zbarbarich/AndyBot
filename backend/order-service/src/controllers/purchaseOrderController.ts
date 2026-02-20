import { Response } from 'express';
import { query } from '../config/db';
import purchaseOrderQueries from '../queries/purchaseOrderQueries';
import { AppRequest } from '../middleware/userContext';

export const purchaseOrderController = {
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
