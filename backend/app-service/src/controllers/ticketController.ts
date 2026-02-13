import { Response } from 'express';
import { query } from '../config/db';
import ticketQueries from '../queries/ticketQueries';
import { AppRequest } from '../middleware/userContext';

const MAX_IMAGES = 5;
const MIN_PRIORITY = 1;
const MAX_PRIORITY = 5;
const VALID_STATUSES = ['Open', 'Pending Closure Review', 'Closed'] as const;

function clampPriority(n: unknown): number {
  const num = typeof n === 'number' && !isNaN(n) ? n : parseInt(String(n), 10);
  if (isNaN(num)) return 3;
  return Math.min(MAX_PRIORITY, Math.max(MIN_PRIORITY, Math.floor(num)));
}

function normalizeStatus(s: unknown): string {
  const v = typeof s === 'string' ? s.trim() : '';
  return VALID_STATUSES.includes(v as typeof VALID_STATUSES[number]) ? v : 'Open';
}

export const ticketController = {
  async getAll(req: AppRequest, res: Response): Promise<void> {
    try {
      const result = await query(ticketQueries.getAll);
      res.json(result.rows);
    } catch (e) {
      console.error('ticketController.getAll', e);
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  },

  async getById(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid ticket id' });
        return;
      }
      const result = await query(ticketQueries.getById, [id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }
      const ticket = result.rows[0];
      const [imagesResult, resolutionsResult] = await Promise.all([
        query(ticketQueries.getImages, [id]),
        query(ticketQueries.getResolutionsByTicketId, [id]),
      ]);
      res.json({
        ...ticket,
        images: imagesResult.rows,
        resolution_updates: resolutionsResult.rows,
      });
    } catch (e) {
      console.error('ticketController.getById', e);
      res.status(500).json({ error: 'Failed to fetch ticket' });
    }
  },

  async addResolution(req: AppRequest, res: Response): Promise<void> {
    try {
      const ticketId = parseInt(req.params.id, 10);
      if (isNaN(ticketId)) {
        res.status(400).json({ error: 'Invalid ticket id' });
        return;
      }
      const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
      if (!content) {
        res.status(400).json({ error: 'Content is required' });
        return;
      }
      const result = await query(ticketQueries.insertResolution, [ticketId, content]);
      res.status(201).json(result.rows[0]);
    } catch (e) {
      console.error('ticketController.addResolution', e);
      res.status(500).json({ error: 'Failed to add resolution update' });
    }
  },

  async closeTicket(req: AppRequest, res: Response): Promise<void> {
    try {
      const ticketId = parseInt(req.params.id, 10);
      if (isNaN(ticketId)) {
        res.status(400).json({ error: 'Invalid ticket id' });
        return;
      }
      const finalResolution = typeof req.body?.final_resolution === 'string' ? req.body.final_resolution.trim() : '';
      const result = await query(ticketQueries.getById, [ticketId]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }
      await query(ticketQueries.insertResolution, [
        ticketId,
        finalResolution || '(Ticket closed with no final resolution noted)',
      ]);
      await query(ticketQueries.update, [
        ticketId,
        null,
        null,
        null,
        null,
        null,
        null,
        'Closed',
      ]);
      const [updatedResult, resolutionsResult] = await Promise.all([
        query(ticketQueries.getById, [ticketId]),
        query(ticketQueries.getResolutionsByTicketId, [ticketId]),
      ]);
      const updated = updatedResult.rows[0];
      res.json({ ...updated, resolution_updates: resolutionsResult.rows });
    } catch (e) {
      console.error('ticketController.closeTicket', e);
      res.status(500).json({ error: 'Failed to close ticket' });
    }
  },

  async create(req: AppRequest, res: Response): Promise<void> {
    try {
      const { subject, customer_id, category, description, email, priority, status } = req.body;
      if (!subject || typeof subject !== 'string' || !subject.trim()) {
        res.status(400).json({ error: 'Subject is required' });
        return;
      }
      const priorityVal = clampPriority(priority);
      const statusVal = normalizeStatus(status);
      const result = await query(ticketQueries.create, [
        subject.trim(),
        customer_id == null ? null : parseInt(String(customer_id), 10) || null,
        category ?? null,
        description ?? null,
        email ?? null,
        priorityVal,
        statusVal,
      ]);
      const ticket = result.rows[0];
      res.status(201).json(ticket);
    } catch (e) {
      console.error('ticketController.create', e);
      res.status(500).json({ error: 'Failed to create ticket' });
    }
  },

  async update(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid ticket id' });
        return;
      }
      const { subject, customer_id, category, description, email, priority, status } = req.body;
      const priorityVal = priority !== undefined ? clampPriority(priority) : undefined;
      const statusVal = status !== undefined ? normalizeStatus(status) : undefined;
      const result = await query(ticketQueries.update, [
        id,
        subject ?? undefined,
        customer_id === undefined ? undefined : (customer_id == null ? null : parseInt(String(customer_id), 10) || null),
        category ?? undefined,
        description ?? undefined,
        email ?? undefined,
        priorityVal,
        statusVal,
      ]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (e) {
      console.error('ticketController.update', e);
      res.status(500).json({ error: 'Failed to update ticket' });
    }
  },

  async delete(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid ticket id' });
        return;
      }
      const result = await query(ticketQueries.delete, [id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }
      res.status(204).send();
    } catch (e) {
      console.error('ticketController.delete', e);
      res.status(500).json({ error: 'Failed to delete ticket' });
    }
  },

  async listSorted(req: AppRequest, res: Response): Promise<void> {
    try {
      const orderBy = (req.query.orderBy as string) || 'creation_date';
      const order = ((req.query.order as string) || 'DESC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const sql = ticketQueries.listSorted(orderBy, order);
      const result = await query(sql);
      res.json(result.rows);
    } catch (e) {
      console.error('ticketController.listSorted', e);
      res.status(500).json({ error: 'Failed to list tickets' });
    }
  },

  async filterByCategory(req: AppRequest, res: Response): Promise<void> {
    try {
      const category = req.query.category as string;
      const orderBy = (req.query.orderBy as string) || 'creation_date';
      const order = ((req.query.order as string) || 'DESC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const sql = ticketQueries.filterByCategory(orderBy, order);
      const result = await query(sql, [category]);
      res.json(result.rows);
    } catch (e) {
      console.error('ticketController.filterByCategory', e);
      res.status(500).json({ error: 'Failed to filter tickets' });
    }
  },

  async filterByPriority(req: AppRequest, res: Response): Promise<void> {
    try {
      const priority = clampPriority(req.query.priority);
      const orderBy = (req.query.orderBy as string) || 'creation_date';
      const order = ((req.query.order as string) || 'DESC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const sql = ticketQueries.filterByPriority(orderBy, order);
      const result = await query(sql, [priority]);
      res.json(result.rows);
    } catch (e) {
      console.error('ticketController.filterByPriority', e);
      res.status(500).json({ error: 'Failed to filter tickets' });
    }
  },

  async filterByCustomer(req: AppRequest, res: Response): Promise<void> {
    try {
      const customerId = parseInt(req.query.customerId as string, 10);
      if (isNaN(customerId)) {
        res.status(400).json({ error: 'Valid customerId required' });
        return;
      }
      const orderBy = (req.query.orderBy as string) || 'creation_date';
      const order = ((req.query.order as string) || 'DESC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const statusFilter = req.query.status as string;
      if (statusFilter === 'open' || statusFilter === 'closed') {
        const sql = ticketQueries.filterByCustomerAndStatus(orderBy, order, statusFilter);
        const result = await query(sql, [customerId]);
        res.json(result.rows);
        return;
      }
      const sql = ticketQueries.filterByCustomer(orderBy, order);
      const result = await query(sql, [customerId]);
      res.json(result.rows);
    } catch (e) {
      console.error('ticketController.filterByCustomer', e);
      res.status(500).json({ error: 'Failed to filter tickets' });
    }
  },

  async addImage(req: AppRequest, res: Response): Promise<void> {
    try {
      const ticketId = parseInt(req.params.id, 10);
      if (isNaN(ticketId)) {
        res.status(400).json({ error: 'Invalid ticket id' });
        return;
      }
      const countResult = await query(ticketQueries.countImages, [ticketId]);
      const count = parseInt(countResult.rows[0]?.count ?? '0', 10);
      if (count >= MAX_IMAGES) {
        res.status(400).json({ error: `Maximum ${MAX_IMAGES} images per ticket` });
        return;
      }
      const position = count + 1;
      let imageData: Buffer;
      if (Buffer.isBuffer(req.body)) {
        imageData = req.body;
      } else if (req.body?.data) {
        imageData = Buffer.from(req.body.data, req.body.encoding || 'base64');
      } else if (typeof req.body === 'string') {
        imageData = Buffer.from(req.body, 'base64');
      } else {
        res.status(400).json({ error: 'Image data required (buffer or base64)' });
        return;
      }
      const result = await query(ticketQueries.insertImage, [ticketId, position, imageData]);
      res.status(201).json(result.rows[0]);
    } catch (e) {
      console.error('ticketController.addImage', e);
      res.status(500).json({ error: 'Failed to add image' });
    }
  },

  async deleteImage(req: AppRequest, res: Response): Promise<void> {
    try {
      const ticketId = parseInt(req.params.id, 10);
      const imageId = parseInt(req.params.imageId, 10);
      if (isNaN(ticketId) || isNaN(imageId)) {
        res.status(400).json({ error: 'Invalid ticket or image id' });
        return;
      }
      const result = await query(ticketQueries.deleteImage, [imageId, ticketId]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Image not found' });
        return;
      }
      res.status(204).send();
    } catch (e) {
      console.error('ticketController.deleteImage', e);
      res.status(500).json({ error: 'Failed to delete image' });
    }
  },

  async getImage(req: AppRequest, res: Response): Promise<void> {
    try {
      const ticketId = parseInt(req.params.id, 10);
      const imageId = parseInt(req.params.imageId, 10);
      if (isNaN(ticketId) || isNaN(imageId)) {
        res.status(400).json({ error: 'Invalid ticket or image id' });
        return;
      }
      const result = await query(ticketQueries.getImageData, [imageId, ticketId]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Image not found' });
        return;
      }
      const buf = result.rows[0].image_data;
      if (Buffer.isBuffer(buf)) {
        res.set('Content-Type', 'image/png');
        res.send(buf);
      } else {
        res.status(404).json({ error: 'Image not found' });
      }
    } catch (e) {
      console.error('ticketController.getImage', e);
      res.status(500).json({ error: 'Failed to get image' });
    }
  },
};
