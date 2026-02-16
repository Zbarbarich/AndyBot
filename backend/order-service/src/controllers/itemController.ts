import { Response } from 'express';
import { query } from '../config/db';
import itemQueries from '../queries/itemQueries';
import { AppRequest } from '../middleware/userContext';

export const itemController = {
  async getAll(req: AppRequest, res: Response): Promise<void> {
    try {
      const result = await query(itemQueries.getAll);
      res.json(result.rows);
    } catch (e) {
      console.error('itemController.getAll', e);
      res.status(500).json({ error: 'Failed to fetch items' });
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
      const result = await query(itemQueries.search, [term, q]);
      res.json(result.rows);
    } catch (e) {
      console.error('itemController.search', e);
      res.status(500).json({ error: 'Failed to search items' });
    }
  },

  async getById(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid item id' });
        return;
      }
      const result = await query(itemQueries.getById, [id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (e) {
      console.error('itemController.getById', e);
      res.status(500).json({ error: 'Failed to fetch item' });
    }
  },

  async create(req: AppRequest, res: Response): Promise<void> {
    try {
      const { sku, name, category, description, unit_price, taxable } = req.body;
      if (!sku || typeof sku !== 'string' || !sku.trim()) {
        res.status(400).json({ error: 'SKU is required' });
        return;
      }
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }
      const existing = await query(itemQueries.getBySku, [sku.trim()]);
      if (existing.rows.length > 0) {
        res.status(400).json({ error: 'SKU already exists' });
        return;
      }
      const price = parseFloat(unit_price);
      const result = await query(itemQueries.create, [
        sku.trim(),
        name.trim(),
        category ?? null,
        description ?? null,
        isNaN(price) ? 0 : price,
        taxable !== false,
      ]);
      res.status(201).json(result.rows[0]);
    } catch (e) {
      console.error('itemController.create', e);
      res.status(500).json({ error: 'Failed to create item' });
    }
  },

  async update(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid item id' });
        return;
      }
      const { name, category, description, unit_price, taxable } = req.body;
      const price = unit_price !== undefined ? parseFloat(unit_price) : undefined;
      const result = await query(itemQueries.update, [
        id,
        name ?? undefined,
        category ?? undefined,
        description ?? undefined,
        price !== undefined ? (isNaN(price) ? 0 : price) : undefined,
        taxable !== undefined ? !!taxable : undefined,
      ]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (e) {
      console.error('itemController.update', e);
      res.status(500).json({ error: 'Failed to update item' });
    }
  },

  async delete(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid item id' });
        return;
      }
      const result = await query(itemQueries.delete, [id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.status(204).send();
    } catch (e) {
      console.error('itemController.delete', e);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  },
};
