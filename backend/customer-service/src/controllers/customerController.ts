import { Response } from 'express';
import { query } from '../config/db';
import customerQueries from '../queries/customerQueries';
import { AppRequest } from '../middleware/userContext';

const CLOSED_ORDER_STATUSES = ['fulfilled', 'closed', 'converted'];

export const customerController = {
  async getAll(req: AppRequest, res: Response): Promise<void> {
    try {
      const result = await query(customerQueries.getAll);
      res.json(result.rows);
    } catch (e) {
      console.error('customerController.getAll', e);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  },

  async getById(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid customer id' });
        return;
      }
      const result = await query(customerQueries.getById, [id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (e) {
      console.error('customerController.getById', e);
      res.status(500).json({ error: 'Failed to fetch customer' });
    }
  },

  async getPaymentHistory(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid customer id' });
        return;
      }
      const custResult = await query(customerQueries.getById, [id]);
      if (custResult.rows.length === 0) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }
      const [invPayments, deposits] = await Promise.all([
        query(customerQueries.paymentHistoryInvoicePayments, [id]),
        query(customerQueries.paymentHistoryOrderDeposits, [id]),
      ]);
      const invRows = (invPayments.rows as Record<string, unknown>[]).map((r) => ({
        ...r,
        applied_to_invoice_id: null,
        applied_invoice_number: null,
      }));
      const depRows = deposits.rows as Record<string, unknown>[];
      const combined: Record<string, unknown>[] = [...invRows, ...depRows];
      combined.sort((a, b) => {
        const ta = new Date((a.paid_at as string) || 0).getTime();
        const tb = new Date((b.paid_at as string) || 0).getTime();
        return tb - ta;
      });
      res.json(combined);
    } catch (e) {
      console.error('customerController.getPaymentHistory', e);
      res.status(500).json({ error: 'Failed to fetch payment history' });
    }
  },

  async create(req: AppRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        contact_name,
        physical_address,
        email,
        phone,
        email_notifications = true,
        text_notifications = false,
      } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }
      const result = await query(customerQueries.create, [
        name.trim(),
        contact_name != null && typeof contact_name === 'string' ? contact_name.trim() || null : null,
        physical_address ?? null,
        email ?? null,
        phone ?? null,
        !!email_notifications,
        !!text_notifications,
      ]);
      res.status(201).json(result.rows[0]);
    } catch (e: unknown) {
      console.error('customerController.create', e);
      const err = e as { code?: string };
      if (err.code === '23505') {
        res.status(400).json({ error: 'A customer with this email already exists.' });
        return;
      }
      res.status(500).json({ error: 'Failed to create customer' });
    }
  },

  async update(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid customer id' });
        return;
      }
      const {
        name,
        contact_name,
        physical_address,
        email,
        phone,
        email_notifications,
        text_notifications,
      } = req.body;
      const result = await query(customerQueries.update, [
        id,
        name ?? undefined,
        contact_name !== undefined ? (contact_name != null && typeof contact_name === 'string' ? contact_name.trim() || null : null) : undefined,
        physical_address ?? undefined,
        email ?? undefined,
        phone ?? undefined,
        email_notifications !== undefined ? !!email_notifications : undefined,
        text_notifications !== undefined ? !!text_notifications : undefined,
      ]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (e: unknown) {
      console.error('customerController.update', e);
      const err = e as { code?: string };
      if (err.code === '23505') {
        res.status(400).json({ error: 'A customer with this email already exists.' });
        return;
      }
      res.status(500).json({ error: 'Failed to update customer' });
    }
  },

  async delete(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid customer id' });
        return;
      }
      const result = await query(customerQueries.delete, [id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }
      res.status(204).send();
    } catch (e) {
      console.error('customerController.delete', e);
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  },

  async listSorted(req: AppRequest, res: Response): Promise<void> {
    try {
      const orderBy = (req.query.orderBy as string) || 'id';
      const order = ((req.query.order as string) || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const sql = customerQueries.listSorted(orderBy, order);
      const result = await query(sql);
      res.json(result.rows);
    } catch (e) {
      console.error('customerController.listSorted', e);
      res.status(500).json({ error: 'Failed to list customers' });
    }
  },

  async search(req: AppRequest, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const term = `%${q}%`;
      const result = await query(customerQueries.search, [term]);
      res.json(result.rows);
    } catch (e) {
      console.error('customerController.search', e);
      res.status(500).json({ error: 'Failed to search customers' });
    }
  },

  async getCustomerOrders(req: AppRequest, res: Response): Promise<void> {
    try {
      const customerId = parseInt(req.params.id, 10);
      if (isNaN(customerId)) {
        res.status(400).json({ error: 'Invalid customer id' });
        return;
      }
      const status = (req.query.status as string) || 'open';
      const result = await query(customerQueries.listOrdersByCustomerId, [customerId]);
      const filtered =
        status === 'closed'
          ? result.rows.filter((r: { status: string }) => CLOSED_ORDER_STATUSES.includes(r.status))
          : result.rows.filter((r: { status: string }) => !CLOSED_ORDER_STATUSES.includes(r.status));
      res.json(filtered);
    } catch (e) {
      console.error('customerController.getCustomerOrders', e);
      res.status(500).json({ error: 'Failed to fetch customer orders' });
    }
  },

  async getCustomerInvoices(req: AppRequest, res: Response): Promise<void> {
    try {
      const customerId = parseInt(req.params.id, 10);
      if (isNaN(customerId)) {
        res.status(400).json({ error: 'Invalid customer id' });
        return;
      }
      const status = (req.query.status as string) || 'open';
      const result = await query(customerQueries.listInvoicesByCustomerId, [customerId]);
      const rows = result.rows.map((r: { total: string; amount_paid: string }) => ({
        ...r,
        balance_due: Number(r.total) - Number(r.amount_paid ?? 0),
      }));
      const filtered =
        status === 'closed'
          ? rows.filter((r: { balance_due: number }) => r.balance_due <= 0)
          : rows.filter((r: { balance_due: number }) => r.balance_due > 0);
      res.json(filtered);
    } catch (e) {
      console.error('customerController.getCustomerInvoices', e);
      res.status(500).json({ error: 'Failed to fetch customer invoices' });
    }
  },
};
