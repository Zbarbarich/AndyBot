import { Response } from 'express';
import { query } from '../config/db';
import customerQueries from '../queries/customerQueries';
import { AppRequest } from '../middleware/userContext';

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

  async create(req: AppRequest, res: Response): Promise<void> {
    try {
      const {
        name,
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
        physical_address ?? null,
        email ?? null,
        phone ?? null,
        !!email_notifications,
        !!text_notifications,
      ]);
      res.status(201).json(result.rows[0]);
    } catch (e) {
      console.error('customerController.create', e);
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
        physical_address,
        email,
        phone,
        email_notifications,
        text_notifications,
      } = req.body;
      const result = await query(customerQueries.update, [
        id,
        name ?? undefined,
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
    } catch (e) {
      console.error('customerController.update', e);
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
};
