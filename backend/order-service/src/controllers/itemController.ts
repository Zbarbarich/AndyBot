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
      const { sku, name, category, description, unit_price, taxable, stock, our_cost, unit_of_measure } = req.body;
      if (!sku || typeof sku !== 'string' || !sku.trim()) {
        res.status(400).json({ error: 'SKU is required' });
        return;
      }
      const skuTrimmed = sku.trim();
      if (skuTrimmed.length > 16) {
        res.status(400).json({ error: 'SKU must be up to 16 characters.' });
        return;
      }
      if (!/^[A-Za-z0-9_-]+$/.test(skuTrimmed)) {
        res.status(400).json({ error: 'SKU must contain only letters, numbers, hyphens, and underscores.' });
        return;
      }
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }
      const nameTrimmed = name.trim();
      if (nameTrimmed.length > 255) {
        res.status(400).json({ error: 'Name must be 255 characters or less.' });
        return;
      }
      if (description != null && typeof description === 'string' && description.length > 5000) {
        res.status(400).json({ error: 'Description must be 5000 characters or less.' });
        return;
      }
      const existing = await query(itemQueries.getBySku, [skuTrimmed]);
      if (existing.rows.length > 0) {
        res.status(400).json({ error: 'SKU already exists' });
        return;
      }
      const price = unit_price !== undefined && unit_price !== null && unit_price !== '' ? Number(unit_price) : 0;
      const stockNum = stock !== undefined && stock !== null && stock !== '' ? Number(stock) : 0;
      const costNum = our_cost !== undefined && our_cost !== null && our_cost !== '' ? Number(our_cost) : 0;
      if (unit_price !== undefined && unit_price !== null && unit_price !== '' && (typeof price !== 'number' || isNaN(price) || price < 0)) {
        res.status(400).json({ error: 'Unit price must be a valid non-negative number.' });
        return;
      }
      if (stock !== undefined && stock !== null && stock !== '' && (typeof stockNum !== 'number' || isNaN(stockNum) || stockNum < 0)) {
        res.status(400).json({ error: 'Stock must be a valid non-negative number.' });
        return;
      }
      if (our_cost !== undefined && our_cost !== null && our_cost !== '' && (typeof costNum !== 'number' || isNaN(costNum) || costNum < 0)) {
        res.status(400).json({ error: 'Our cost must be a valid non-negative number.' });
        return;
      }
      const um = unit_of_measure != null ? String(unit_of_measure).trim() || 'EA' : 'EA';
      const result = await query(itemQueries.create, [
        skuTrimmed,
        nameTrimmed,
        category ?? null,
        description ?? null,
        price,
        taxable !== false,
        stockNum,
        costNum,
        um,
      ]);
      res.status(201).json(result.rows[0]);
    } catch (e: unknown) {
      console.error('itemController.create', e);
      const err = e as { code?: string };
      if (err.code === '22P02') {
        res.status(400).json({ error: 'Invalid numeric value for price, stock, or cost. Please use numbers only.' });
        return;
      }
      if (err.code === '23505') {
        res.status(400).json({ error: 'SKU already exists.' });
        return;
      }
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
      const { name, category, description, unit_price, taxable, stock, our_cost, unit_of_measure } = req.body;
      if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
        res.status(400).json({ error: 'Name cannot be empty.' });
        return;
      }
      if (name !== undefined && name.trim().length > 255) {
        res.status(400).json({ error: 'Name must be 255 characters or less.' });
        return;
      }
      if (description !== undefined && description !== null && typeof description === 'string' && description.length > 5000) {
        res.status(400).json({ error: 'Description must be 5000 characters or less.' });
        return;
      }
      const price = unit_price !== undefined ? Number(unit_price) : undefined;
      const stockNum = stock !== undefined ? Number(stock) : undefined;
      const costNum = our_cost !== undefined ? Number(our_cost) : undefined;
      if (unit_price !== undefined && (typeof price !== 'number' || isNaN(price) || price < 0)) {
        res.status(400).json({ error: 'Unit price must be a valid non-negative number.' });
        return;
      }
      if (stock !== undefined && (typeof stockNum !== 'number' || isNaN(stockNum) || stockNum < 0)) {
        res.status(400).json({ error: 'Stock must be a valid non-negative number.' });
        return;
      }
      if (our_cost !== undefined && (typeof costNum !== 'number' || isNaN(costNum) || costNum < 0)) {
        res.status(400).json({ error: 'Our cost must be a valid non-negative number.' });
        return;
      }
      const um = unit_of_measure !== undefined ? (unit_of_measure != null ? String(unit_of_measure).trim() || undefined : undefined) : undefined;
      const result = await query(itemQueries.update, [
        id,
        name ?? undefined,
        category ?? undefined,
        description ?? undefined,
        price !== undefined ? price : undefined,
        taxable !== undefined ? !!taxable : undefined,
        stockNum !== undefined ? stockNum : undefined,
        costNum !== undefined ? costNum : undefined,
        um,
      ]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (e: unknown) {
      console.error('itemController.update', e);
      const err = e as { code?: string };
      if (err.code === '22P02') {
        res.status(400).json({ error: 'Invalid numeric value for price, stock, or cost. Please use numbers only.' });
        return;
      }
      if (err.code === '23505') {
        res.status(400).json({ error: 'SKU already exists.' });
        return;
      }
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
