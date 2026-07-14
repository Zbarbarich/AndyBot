import { Response } from 'express';
import { query } from '../config/db';
import depositQueries from '../queries/depositQueries';
import quoteOrderQueries from '../queries/quoteOrderQueries';
import { AppRequest } from '../middleware/userContext';

export const depositController = {
  async list(req: AppRequest, res: Response): Promise<void> {
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
        res.status(400).json({ error: 'Deposits are only for orders' });
        return;
      }
      const result = await query(depositQueries.listByOrderId, [orderId]);
      res.json(result.rows);
    } catch (e) {
      console.error('depositController.list', e);
      res.status(500).json({ error: 'Failed to fetch deposits' });
    }
  },

  async create(req: AppRequest, res: Response): Promise<void> {
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
        res.status(400).json({ error: 'Deposits are only for orders' });
        return;
      }
      const { amount, payment_method, paid_at, reference } = req.body ?? {};
      const amountNum = amount != null ? Number(amount) : NaN;
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        res.status(400).json({ error: 'amount is required and must be a positive number' });
        return;
      }
      const method = payment_method === 'cash' || payment_method === 'check' ? payment_method : null;
      // When omitted, use server now (DB session is America/New_York). When provided, used for backdating (interpret as NY).
      const paidAt = paid_at != null && paid_at !== '' ? new Date(paid_at) : new Date();
      if (Number.isNaN(paidAt.getTime())) {
        res.status(400).json({ error: 'paid_at must be a valid date' });
        return;
      }
      const ref = reference != null ? String(reference).trim().slice(0, 50) || null : null;
      const result = await query(depositQueries.create, [orderId, amountNum, method, paidAt, ref]);
      res.status(201).json(result.rows[0]);
    } catch (e) {
      console.error('depositController.create', e);
      res.status(500).json({ error: 'Failed to add deposit' });
    }
  },

  async delete(req: AppRequest, res: Response): Promise<void> {
    try {
      const orderId = parseInt(req.params.orderId, 10);
      const depositId = parseInt(req.params.depositId, 10);
      if (isNaN(orderId) || isNaN(depositId)) {
        res.status(400).json({ error: 'Invalid order or deposit id' });
        return;
      }
      const depResult = await query(depositQueries.getById, [depositId]);
      if (depResult.rows.length === 0) {
        res.status(404).json({ error: 'Deposit not found' });
        return;
      }
      const dep = depResult.rows[0] as { quote_order_id: number; applied_to_invoice_id: number | null };
      if (dep.quote_order_id !== orderId) {
        res.status(404).json({ error: 'Deposit not found for this order' });
        return;
      }
      if (dep.applied_to_invoice_id != null) {
        res.status(400).json({ error: 'Cannot remove a deposit that has been applied to an invoice. Reverse the payment on that invoice instead.' });
        return;
      }
      const delResult = await query(depositQueries.delete, [depositId, orderId]);
      if (delResult.rows.length === 0) {
        res.status(404).json({ error: 'Deposit not found' });
        return;
      }
      res.status(204).send();
    } catch (e) {
      console.error('depositController.delete', e);
      res.status(500).json({ error: 'Failed to remove deposit' });
    }
  },
};
