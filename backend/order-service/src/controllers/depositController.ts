import { Response } from 'express';
import { query, getClient } from '../config/db';
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
    const client = await getClient();
    try {
      const orderId = parseInt(req.params.orderId, 10);
      if (isNaN(orderId)) {
        res.status(400).json({ error: 'Invalid order id' });
        return;
      }
      const orderResult = await client.query(quoteOrderQueries.getById, [orderId]);
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
      const paidAt = paid_at != null && paid_at !== '' ? new Date(paid_at) : new Date();
      if (Number.isNaN(paidAt.getTime())) {
        res.status(400).json({ error: 'paid_at must be a valid date' });
        return;
      }
      const ref = reference != null ? String(reference).trim().slice(0, 50) || null : null;

      await client.query('BEGIN');
      const result = await client.query(depositQueries.create, [orderId, amountNum, method, paidAt, ref]);
      let deposit = result.rows[0] as {
        id: number;
        quote_order_id: number;
        amount: string;
        payment_method: string | null;
        paid_at: Date;
        reference: string | null;
        applied_to_invoice_id: number | null;
        applied_to_invoice_number?: string | null;
      };

      // Auto-apply to oldest open invoice on this order, if any
      const invResult = await client.query(depositQueries.getOpenInvoiceForOrder, [orderId]);
      if (invResult.rows.length > 0) {
        const inv = invResult.rows[0] as { id: number; invoice_number: string };
        await client.query(depositQueries.insertInvoicePayment, [
          inv.id,
          amountNum,
          method || 'deposit',
          paidAt,
          ref || 'Deposit',
        ]);
        const marked = await client.query(depositQueries.markDepositApplied, [deposit.id, inv.id]);
        await client.query(depositQueries.syncInvoiceAmountPaid, [inv.id]);
        deposit = {
          ...marked.rows[0],
          applied_to_invoice_number: inv.invoice_number,
        };
      }

      await client.query('COMMIT');
      res.status(201).json(deposit);
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('depositController.create', e);
      res.status(500).json({ error: 'Failed to add deposit' });
    } finally {
      client.release();
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
        res.status(400).json({
          error:
            'Cannot remove a deposit that has been applied to an invoice. Reverse the payment on that invoice instead.',
        });
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

  async listUnapplied(_req: AppRequest, res: Response): Promise<void> {
    try {
      const result = await query(depositQueries.listUnapplied, []);
      const rows = result.rows as Array<{ amount: string }>;
      const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
      res.json({ total, deposits: result.rows });
    } catch (e) {
      console.error('depositController.listUnapplied', e);
      res.status(500).json({ error: 'Failed to fetch deposits' });
    }
  },
};
