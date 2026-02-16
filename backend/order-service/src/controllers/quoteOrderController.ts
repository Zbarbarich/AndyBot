import { Response } from 'express';
import { query, pool } from '../config/db';
import quoteOrderQueries from '../queries/quoteOrderQueries';
import { AppRequest } from '../middleware/userContext';

type LineInput = { item_id?: number; description?: string; quantity: number; unit_price: number; sort_order?: number; billing_status?: string };

function computeTotals(lines: { quantity: number; unit_price: number }[], taxRate: number, shippingAmount: number) {
  const subtotal = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unit_price), 0);
  const taxAmount = subtotal * Number(taxRate);
  const total = subtotal + taxAmount + Number(shippingAmount);
  return { subtotal, tax_amount: taxAmount, total };
}

export const quoteOrderController = {
  async listQuotes(req: AppRequest, res: Response): Promise<void> {
    try {
      const result = await query(quoteOrderQueries.listQuotes);
      res.json(result.rows);
    } catch (e) {
      console.error('quoteOrderController.listQuotes', e);
      res.status(500).json({ error: 'Failed to fetch quotes' });
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
      const result = await query(quoteOrderQueries.search, [term, q]);
      res.json(result.rows);
    } catch (e) {
      console.error('quoteOrderController.search', e);
      res.status(500).json({ error: 'Failed to search orders' });
    }
  },

  async listOrders(req: AppRequest, res: Response): Promise<void> {
    try {
      const type = (req.query.type as string)?.toLowerCase();
      const validTypes = ['quote', 'order', 'return'];
      if (type && validTypes.includes(type)) {
        const result = await query(quoteOrderQueries.listDocumentsByType, [type]);
        res.json(result.rows);
      } else {
        const result = await query(quoteOrderQueries.listDocuments);
        res.json(result.rows);
      }
    } catch (e) {
      console.error('quoteOrderController.listOrders', e);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  },

  async getQuoteById(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      const docResult = await query(quoteOrderQueries.getByIdWithCustomer, [id]);
      if (docResult.rows.length === 0) {
        res.status(404).json({ error: 'Quote not found' });
        return;
      }
      const doc = docResult.rows[0];
      if (doc.type !== 'quote') {
        res.status(404).json({ error: 'Quote not found' });
        return;
      }
      const linesResult = await query(quoteOrderQueries.getLinesByQuoteOrderId, [id]);
      res.json({ ...doc, lines: linesResult.rows });
    } catch (e) {
      console.error('quoteOrderController.getQuoteById', e);
      res.status(500).json({ error: 'Failed to fetch quote' });
    }
  },

  async getOrderById(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      const docResult = await query(quoteOrderQueries.getByIdWithCustomer, [id]);
      if (docResult.rows.length === 0) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      const doc = docResult.rows[0];
      const linesResult = await query(quoteOrderQueries.getLinesByQuoteOrderId, [id]);
      res.json({ ...doc, lines: linesResult.rows });
    } catch (e) {
      console.error('quoteOrderController.getOrderById', e);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  },

  async createQuote(req: AppRequest, res: Response): Promise<void> {
    try {
      const { customer_id, ticket_id, status, valid_until, notes, tax_rate, shipping_amount, lines } = req.body;
      const cid = parseInt(customer_id, 10);
      if (isNaN(cid)) {
        res.status(400).json({ error: 'customer_id is required' });
        return;
      }
      const docNumResult = await query(quoteOrderQueries.nextDocumentNumber);
      const document_number = docNumResult.rows[0].document_number;
      const taxRate = parseFloat(tax_rate) || 0;
      const shippingAmount = parseFloat(shipping_amount) || 0;
      const lineList: LineInput[] = Array.isArray(lines) ? lines : [];
      const { subtotal, tax_amount, total } = computeTotals(lineList, taxRate, shippingAmount);

      const createResult = await query(quoteOrderQueries.createQuoteOrder, [
        document_number,
        'quote',
        cid,
        ticket_id != null ? parseInt(ticket_id, 10) : null,
        status || 'draft',
        valid_until || null,
        null,
        notes ?? null,
        subtotal,
        taxRate,
        tax_amount,
        shippingAmount,
        total,
      ]);
      const quote = createResult.rows[0];
      const quoteId = quote.id;

      for (let i = 0; i < lineList.length; i++) {
        const l = lineList[i];
        const qty = parseFloat(String(l.quantity)) || 1;
        const up = parseFloat(String(l.unit_price)) || 0;
        await query(quoteOrderQueries.insertLine, [
          quoteId,
          l.item_id ?? null,
          l.description ?? null,
          qty,
          up,
          l.sort_order ?? i,
          null,
        ]);
      }

      const linesResult = await query(quoteOrderQueries.getLinesByQuoteOrderId, [quoteId]);
      res.status(201).json({ ...quote, lines: linesResult.rows });
    } catch (e) {
      console.error('quoteOrderController.createQuote', e);
      res.status(500).json({ error: 'Failed to create quote' });
    }
  },

  async createOrder(req: AppRequest, res: Response): Promise<void> {
    try {
      const { customer_id, ticket_id, status, order_date, notes, tax_rate, shipping_amount, lines, type: docType } = req.body;
      const cid = parseInt(customer_id, 10);
      if (isNaN(cid)) {
        res.status(400).json({ error: 'customer_id is required' });
        return;
      }
      const type = docType === 'return' ? 'return' : 'order';
      const docNumResult = await query(quoteOrderQueries.nextDocumentNumber);
      const document_number = docNumResult.rows[0].document_number;
      const taxRate = parseFloat(tax_rate) || 0;
      const shippingAmount = parseFloat(shipping_amount) || 0;
      const lineList: LineInput[] = Array.isArray(lines) ? lines : [];
      const { subtotal, tax_amount, total } = computeTotals(lineList, taxRate, shippingAmount);

      const createResult = await query(quoteOrderQueries.createQuoteOrder, [
        document_number,
        type,
        cid,
        ticket_id != null ? parseInt(ticket_id, 10) : null,
        status || 'draft',
        null,
        order_date || null,
        notes ?? null,
        subtotal,
        taxRate,
        tax_amount,
        shippingAmount,
        total,
      ]);
      const order = createResult.rows[0];
      const orderId = order.id;

      for (let i = 0; i < lineList.length; i++) {
        const l = lineList[i];
        const qty = parseFloat(String(l.quantity)) || 1;
        const up = parseFloat(String(l.unit_price)) || 0;
        await query(quoteOrderQueries.insertLine, [
          orderId,
          l.item_id ?? null,
          l.description ?? null,
          qty,
          up,
          l.sort_order ?? i,
          l.billing_status || 'pending',
        ]);
      }

      const linesResult = await query(quoteOrderQueries.getLinesByQuoteOrderId, [orderId]);
      res.status(201).json({ ...order, lines: linesResult.rows });
    } catch (e) {
      console.error('quoteOrderController.createOrder', e);
      res.status(500).json({ error: 'Failed to create order' });
    }
  },

  async updateQuote(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      const docResult = await query(quoteOrderQueries.getById, [id]);
      if (docResult.rows.length === 0) {
        res.status(404).json({ error: 'Quote not found' });
        return;
      }
      const doc = docResult.rows[0];
      if (doc.type !== 'quote') {
        res.status(400).json({ error: 'Not a quote' });
        return;
      }
      if (doc.status === 'converted') {
        res.status(400).json({ error: 'Quote already converted; cannot edit' });
        return;
      }

      const { customer_id, ticket_id, status, valid_until, notes, tax_rate, shipping_amount, lines } = req.body;
      const taxRate = tax_rate !== undefined ? parseFloat(tax_rate) : doc.tax_rate;
      const shippingAmount = shipping_amount !== undefined ? parseFloat(shipping_amount) : doc.shipping_amount;
      const lineList: LineInput[] = Array.isArray(lines) ? lines : [];
      const { subtotal, tax_amount, total } = computeTotals(lineList, taxRate, shippingAmount);

      await query(quoteOrderQueries.updateQuoteOrder, [
        id,
        customer_id != null ? parseInt(customer_id, 10) : undefined,
        ticket_id !== undefined ? (ticket_id == null ? null : parseInt(ticket_id, 10)) : undefined,
        status ?? undefined,
        valid_until ?? undefined,
        undefined,
        notes !== undefined ? notes : undefined,
        subtotal,
        taxRate,
        tax_amount,
        shippingAmount,
        total,
      ]);

      await query(quoteOrderQueries.deleteLinesByQuoteOrderId, [id]);
      for (let i = 0; i < lineList.length; i++) {
        const l = lineList[i];
        const qty = parseFloat(String(l.quantity)) || 1;
        const up = parseFloat(String(l.unit_price)) || 0;
        await query(quoteOrderQueries.insertLine, [id, l.item_id ?? null, l.description ?? null, qty, up, l.sort_order ?? i, null]);
      }

      const updated = await query(quoteOrderQueries.getByIdWithCustomer, [id]);
      const linesResult = await query(quoteOrderQueries.getLinesByQuoteOrderId, [id]);
      res.json({ ...updated.rows[0], lines: linesResult.rows });
    } catch (e) {
      console.error('quoteOrderController.updateQuote', e);
      res.status(500).json({ error: 'Failed to update quote' });
    }
  },

  async updateOrder(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      const docResult = await query(quoteOrderQueries.getById, [id]);
      if (docResult.rows.length === 0) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      const doc = docResult.rows[0];
      if (doc.type !== 'order') {
        res.status(400).json({ error: 'Not an order' });
        return;
      }

      const { customer_id, ticket_id, status, order_date, notes, tax_rate, shipping_amount, lines } = req.body;
      const taxRate = tax_rate !== undefined ? parseFloat(tax_rate) : doc.tax_rate;
      const shippingAmount = shipping_amount !== undefined ? parseFloat(shipping_amount) : doc.shipping_amount;
      const lineList: LineInput[] = Array.isArray(lines) ? lines : [];
      const { subtotal, tax_amount, total } = computeTotals(lineList, taxRate, shippingAmount);

      await query(quoteOrderQueries.updateQuoteOrder, [
        id,
        customer_id != null ? parseInt(customer_id, 10) : undefined,
        ticket_id !== undefined ? (ticket_id == null ? null : parseInt(ticket_id, 10)) : undefined,
        status ?? undefined,
        undefined,
        order_date ?? undefined,
        notes !== undefined ? notes : undefined,
        subtotal,
        taxRate,
        tax_amount,
        shippingAmount,
        total,
      ]);

      await query(quoteOrderQueries.deleteLinesByQuoteOrderId, [id]);
      for (let i = 0; i < lineList.length; i++) {
        const l = lineList[i];
        const qty = parseFloat(String(l.quantity)) || 1;
        const up = parseFloat(String(l.unit_price)) || 0;
        await query(quoteOrderQueries.insertLine, [
          id,
          l.item_id ?? null,
          l.description ?? null,
          qty,
          up,
          l.sort_order ?? i,
          l.billing_status || 'pending',
        ]);
      }

      const updated = await query(quoteOrderQueries.getByIdWithCustomer, [id]);
      const linesResult = await query(quoteOrderQueries.getLinesByQuoteOrderId, [id]);
      res.json({ ...updated.rows[0], lines: linesResult.rows });
    } catch (e) {
      console.error('quoteOrderController.updateOrder', e);
      res.status(500).json({ error: 'Failed to update order' });
    }
  },

  async deleteQuote(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      const docResult = await query(quoteOrderQueries.getById, [id]);
      if (docResult.rows.length === 0) {
        res.status(404).json({ error: 'Quote not found' });
        return;
      }
      if (docResult.rows[0].type !== 'quote') {
        res.status(400).json({ error: 'Not a quote' });
        return;
      }
      if (docResult.rows[0].status === 'converted') {
        res.status(400).json({ error: 'Cannot delete converted quote' });
        return;
      }
      await query(quoteOrderQueries.deleteQuoteOrder, [id]);
      res.status(204).send();
    } catch (e) {
      console.error('quoteOrderController.deleteQuote', e);
      res.status(500).json({ error: 'Failed to delete quote' });
    }
  },

  async deleteOrder(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      const docResult = await query(quoteOrderQueries.getById, [id]);
      if (docResult.rows.length === 0) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      if (docResult.rows[0].type !== 'order') {
        res.status(400).json({ error: 'Not an order' });
        return;
      }
      await query(quoteOrderQueries.deleteQuoteOrder, [id]);
      res.status(204).send();
    } catch (e) {
      console.error('quoteOrderController.deleteOrder', e);
      res.status(500).json({ error: 'Failed to delete order' });
    }
  },

  async convertToOrder(req: AppRequest, res: Response): Promise<void> {
    const quoteId = parseInt(req.params.id, 10);
    if (isNaN(quoteId)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const docResult = await client.query(quoteOrderQueries.getById, [quoteId]);
      if (docResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Quote not found' });
        return;
      }
      const quote = docResult.rows[0];
      if (quote.type !== 'quote') {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Not a quote' });
        return;
      }
      if (quote.status === 'converted') {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Quote already converted' });
        return;
      }

      const linesResult = await client.query(quoteOrderQueries.getLinesByQuoteOrderId, [quoteId]);
      const lines = linesResult.rows;

      const orderResult = await client.query(quoteOrderQueries.createQuoteOrder, [
        quote.document_number,
        'order',
        quote.customer_id,
        quote.ticket_id,
        'draft',
        null,
        new Date().toISOString().slice(0, 10),
        quote.notes,
        quote.subtotal,
        quote.tax_rate,
        quote.tax_amount,
        quote.shipping_amount,
        quote.total,
      ]);
      const order = orderResult.rows[0];
      const orderId = order.id;

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await client.query(quoteOrderQueries.insertLine, [
          orderId,
          l.item_id,
          l.description,
          l.quantity,
          l.unit_price,
          l.sort_order ?? i,
          'pending',
        ]);
      }

      await client.query(quoteOrderQueries.setQuoteStatusConverted, [quoteId]);
      await client.query('COMMIT');

      const orderWithCustomer = await query(quoteOrderQueries.getByIdWithCustomer, [orderId]);
      const orderLines = await query(quoteOrderQueries.getLinesByQuoteOrderId, [orderId]);
      res.status(201).json({ ...orderWithCustomer.rows[0], lines: orderLines.rows });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('quoteOrderController.convertToOrder', e);
      res.status(500).json({ error: 'Failed to convert quote to order' });
    } finally {
      client.release();
    }
  },
};
