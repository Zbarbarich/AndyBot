import { Response } from 'express';
import { query, pool } from '../config/db';
import quoteOrderQueries from '../queries/quoteOrderQueries';
import itemQueries from '../queries/itemQueries';
import purchaseOrderQueries from '../queries/purchaseOrderQueries';
import orderInvoiceQueries from '../queries/orderInvoiceQueries';
import { AppRequest } from '../middleware/userContext';

type LineInput = { item_id?: number; description?: string; quantity: number; unit_price: number; sort_order?: number; billing_status?: string; unit_of_measure?: string; include_in_po?: boolean; po_unit_cost?: number };

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
      let lines = linesResult.rows as Array<Record<string, unknown>>;

      if (doc.type === 'order') {
        const invLinesResult = await query(orderInvoiceQueries.getInvoiceLinesWithSubOrder, [id]);
        const invLines = invLinesResult.rows as Array<{ order_line_id: number; qty_invoiced: string; sub_order_number: string; invoice_number: string }>;
        const map = new Map<number, Array<{ sub_order_number: string; invoice_number: string; quantity: number }>>();
        for (const r of invLines) {
          const list = map.get(r.order_line_id) ?? [];
          list.push({
            sub_order_number: r.sub_order_number,
            invoice_number: r.invoice_number,
            quantity: Number(r.qty_invoiced),
          });
          map.set(r.order_line_id, list);
        }
        lines = lines.map((l) => {
          const lineId = l.id as number;
          return { ...l, invoiced_on: map.get(lineId) ?? [] };
        });
      }

      res.json({ ...doc, lines });
    } catch (e) {
      console.error('quoteOrderController.getOrderById', e);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  },

  async createQuote(req: AppRequest, res: Response): Promise<void> {
    try {
      const { customer_id, ticket_id, status, valid_until, notes, customer_po_number, tax_rate, shipping_amount, lines } = req.body;
      const cid = parseInt(customer_id, 10);
      if (isNaN(cid)) {
        res.status(400).json({ error: 'customer_id is required' });
        return;
      }
      if (ticket_id != null && ticket_id !== '') {
        const tid = parseInt(ticket_id, 10);
        if (!isNaN(tid)) {
          const ticketCheck = await query(quoteOrderQueries.ticketExists, [tid]);
          if (ticketCheck.rows.length === 0) {
            res.status(400).json({ error: 'Ticket not found. Only existing tickets can be linked.' });
            return;
          }
        }
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
        status || 'open',
        valid_until || null,
        null,
        notes ?? null,
        customer_po_number ?? null,
        null,
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
        let sku: string | null = null;
        let unitOfMeasure: string = (l.unit_of_measure && String(l.unit_of_measure).trim()) ? String(l.unit_of_measure).trim() : 'EA';
        if (l.item_id != null) {
          const skuRes = await query(itemQueries.getSkuById, [l.item_id]);
          if (skuRes.rows[0]) sku = skuRes.rows[0].sku;
          if (unitOfMeasure === 'EA') {
            const itemRes = await query(itemQueries.getById, [l.item_id]);
            if (itemRes.rows[0]?.unit_of_measure) unitOfMeasure = itemRes.rows[0].unit_of_measure;
          }
        }
        await query(quoteOrderQueries.insertLine, [
          quoteId,
          l.item_id ?? null,
          l.description ?? null,
          qty,
          up,
          l.sort_order ?? i,
          null,
          quoteId,
          document_number,
          sku,
          unitOfMeasure,
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
      const { customer_id, ticket_id, status, order_date, notes, customer_po_number, tax_rate, shipping_amount, lines, type: docType } = req.body;
      const cid = parseInt(customer_id, 10);
      if (isNaN(cid)) {
        res.status(400).json({ error: 'customer_id is required' });
        return;
      }
      if (ticket_id != null && ticket_id !== '') {
        const tid = parseInt(ticket_id, 10);
        if (!isNaN(tid)) {
          const ticketCheck = await query(quoteOrderQueries.ticketExists, [tid]);
          if (ticketCheck.rows.length === 0) {
            res.status(400).json({ error: 'Ticket not found. Only existing tickets can be linked.' });
            return;
          }
        }
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
        status || 'open',
        null,
        order_date || null,
        notes ?? null,
        customer_po_number ?? null,
        null,
        subtotal,
        taxRate,
        tax_amount,
        shippingAmount,
        total,
      ]);
      const order = createResult.rows[0];
      const orderId = order.id;

      const insertedLineIds: number[] = [];
      for (let i = 0; i < lineList.length; i++) {
        const l = lineList[i];
        const qty = parseFloat(String(l.quantity)) || 1;
        const up = parseFloat(String(l.unit_price)) || 0;
        let sku: string | null = null;
        let unitOfMeasure: string = (l.unit_of_measure && String(l.unit_of_measure).trim()) ? String(l.unit_of_measure).trim() : 'EA';
        if (l.item_id != null) {
          const skuRes = await query(itemQueries.getSkuById, [l.item_id]);
          if (skuRes.rows[0]) sku = skuRes.rows[0].sku;
          if (unitOfMeasure === 'EA') {
            const itemRes = await query(itemQueries.getById, [l.item_id]);
            if (itemRes.rows[0]?.unit_of_measure) unitOfMeasure = itemRes.rows[0].unit_of_measure;
          }
        }
        const lineResult = await query(quoteOrderQueries.insertLine, [
          orderId,
          l.item_id ?? null,
          l.description ?? null,
          qty,
          up,
          l.sort_order ?? i,
          'pending',
          orderId,
          document_number,
          sku,
          unitOfMeasure,
        ]);
        insertedLineIds.push(lineResult.rows[0].id);
      }

      if (req.body.create_purchase_order && Array.isArray(req.body.lines)) {
        const lineListForPo = req.body.lines as LineInput[];
        type PoLineEntry = { index: number; unit_cost: number | undefined };
        const poLines: PoLineEntry[] = lineListForPo
          .map((l, idx) => (l.include_in_po ? { index: idx, unit_cost: l.po_unit_cost != null ? Number(l.po_unit_cost) : undefined } : null))
          .filter((x): x is PoLineEntry => x != null);
        if (poLines.length > 0) {
          const poNumResult = await query(purchaseOrderQueries.nextPoNumber);
          const po_number = poNumResult.rows[0].po_number;
          const poResult = await query(purchaseOrderQueries.create, [po_number, orderId]);
          const poId = poResult.rows[0].id;
          const orderLines = await query(quoteOrderQueries.getLinesByQuoteOrderId, [orderId]);
          const lineRows = orderLines.rows as { id: number; item_id: number | null; description: string | null; quantity: string; unit_price: string }[];
          for (let i = 0; i < poLines.length; i++) {
            const entry = poLines[i];
            const { index, unit_cost } = entry;
            const ol = lineRows[index];
            if (!ol) continue;
            let cost = unit_cost;
            if (cost === undefined || Number.isNaN(cost)) {
              if (ol.item_id != null) {
                const itemRow = await query(itemQueries.getById, [ol.item_id]);
                cost = itemRow.rows[0]?.our_cost != null ? Number(itemRow.rows[0].our_cost) : 0;
              } else cost = 0;
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
        }
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

      const { customer_id, ticket_id, status, valid_until, notes, customer_po_number, tax_rate, shipping_amount, lines } = req.body;
      if (ticket_id != null && ticket_id !== '') {
        const tid = parseInt(ticket_id, 10);
        if (!isNaN(tid)) {
          const ticketCheck = await query(quoteOrderQueries.ticketExists, [tid]);
          if (ticketCheck.rows.length === 0) {
            res.status(400).json({ error: 'Ticket not found. Only existing tickets can be linked.' });
            return;
          }
        }
      }
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
        customer_po_number !== undefined ? customer_po_number : undefined,
        subtotal,
        taxRate,
        tax_amount,
        shippingAmount,
        total,
      ]);

      await query(quoteOrderQueries.deleteLinesByQuoteOrderId, [id]);
      const document_number = doc.document_number;
      for (let i = 0; i < lineList.length; i++) {
        const l = lineList[i];
        const qty = parseFloat(String(l.quantity)) || 1;
        const up = parseFloat(String(l.unit_price)) || 0;
        let sku: string | null = null;
        let unitOfMeasure: string = (l.unit_of_measure && String(l.unit_of_measure).trim()) ? String(l.unit_of_measure).trim() : 'EA';
        if (l.item_id != null) {
          const skuRes = await query(itemQueries.getSkuById, [l.item_id]);
          if (skuRes.rows[0]) sku = skuRes.rows[0].sku;
          if (unitOfMeasure === 'EA') {
            const itemRes = await query(itemQueries.getById, [l.item_id]);
            if (itemRes.rows[0]?.unit_of_measure) unitOfMeasure = itemRes.rows[0].unit_of_measure;
          }
        }
        await query(quoteOrderQueries.insertLine, [id, l.item_id ?? null, l.description ?? null, qty, up, l.sort_order ?? i, null, id, document_number, sku, unitOfMeasure]);
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

      const { customer_id, ticket_id, status, order_date, notes, customer_po_number, tax_rate, shipping_amount, lines } = req.body;
      if (ticket_id != null && ticket_id !== '') {
        const tid = parseInt(ticket_id, 10);
        if (!isNaN(tid)) {
          const ticketCheck = await query(quoteOrderQueries.ticketExists, [tid]);
          if (ticketCheck.rows.length === 0) {
            res.status(400).json({ error: 'Ticket not found. Only existing tickets can be linked.' });
            return;
          }
        }
      }
      const taxRate = tax_rate !== undefined ? parseFloat(tax_rate) : doc.tax_rate;
      const shippingAmount = shipping_amount !== undefined ? parseFloat(shipping_amount) : doc.shipping_amount;
      const lineList: LineInput[] = Array.isArray(lines) ? lines : [];
      const { subtotal, tax_amount, total } = computeTotals(lineList, taxRate, shippingAmount);

      // Orders can only be closed by invoicing all items; ignore client sending status 'closed'
      const statusForUpdate = status === 'closed' ? undefined : (status ?? undefined);

      await query(quoteOrderQueries.updateQuoteOrder, [
        id,
        customer_id != null ? parseInt(customer_id, 10) : undefined,
        ticket_id !== undefined ? (ticket_id == null ? null : parseInt(ticket_id, 10)) : undefined,
        statusForUpdate,
        undefined,
        order_date ?? undefined,
        notes !== undefined ? notes : undefined,
        customer_po_number !== undefined ? customer_po_number : undefined,
        subtotal,
        taxRate,
        tax_amount,
        shippingAmount,
        total,
      ]);

      await query(quoteOrderQueries.deleteLinesByQuoteOrderId, [id]);
      const document_number = doc.document_number;
      for (let i = 0; i < lineList.length; i++) {
        const l = lineList[i];
        const qty = parseFloat(String(l.quantity)) || 1;
        const up = parseFloat(String(l.unit_price)) || 0;
        let sku: string | null = null;
        let unitOfMeasure: string = (l.unit_of_measure && String(l.unit_of_measure).trim()) ? String(l.unit_of_measure).trim() : 'EA';
        if (l.item_id != null) {
          const skuRes = await query(itemQueries.getSkuById, [l.item_id]);
          if (skuRes.rows[0]) sku = skuRes.rows[0].sku;
          if (unitOfMeasure === 'EA') {
            const itemRes = await query(itemQueries.getById, [l.item_id]);
            if (itemRes.rows[0]?.unit_of_measure) unitOfMeasure = itemRes.rows[0].unit_of_measure;
          }
        }
        await query(quoteOrderQueries.insertLine, [
          id,
          l.item_id ?? null,
          l.description ?? null,
          qty,
          up,
          l.sort_order ?? i,
          'pending',
          id,
          document_number,
          sku,
          unitOfMeasure,
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
        'open',
        null,
        new Date().toISOString().slice(0, 10),
        quote.notes,
        quote.customer_po_number ?? null,
        null,
        quote.subtotal,
        quote.tax_rate,
        quote.tax_amount,
        quote.shipping_amount,
        quote.total,
      ]);
      const order = orderResult.rows[0];
      const orderId = order.id;

      await client.query(quoteOrderQueries.setOriginalQuoteId, [orderId, quoteId]);

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        let sku: string | null = null;
        if (l.item_id != null) {
          const skuRes = await client.query(itemQueries.getSkuById, [l.item_id]);
          if (skuRes.rows[0]) sku = skuRes.rows[0].sku;
        }
        const unitOfMeasure = l.unit_of_measure ?? (l as { item_unit_of_measure?: string }).item_unit_of_measure ?? 'EA';
        await client.query(quoteOrderQueries.insertLine, [
          orderId,
          l.item_id,
          l.description,
          l.quantity,
          l.unit_price,
          l.sort_order ?? i,
          'pending',
          orderId,
          quote.document_number,
          sku,
          unitOfMeasure,
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

  async patchLineBillingStatus(req: AppRequest, res: Response): Promise<void> {
    const orderId = parseInt(req.params.orderId, 10);
    const lineId = parseInt(req.params.lineId, 10);
    if (isNaN(orderId) || isNaN(lineId)) {
      res.status(400).json({ error: 'Invalid order or line id' });
      return;
    }
    const { billing_status } = req.body;
    if (billing_status !== 'pending' && billing_status !== 'billable') {
      res.status(400).json({ error: 'billing_status must be "pending" or "billable"' });
      return;
    }
    try {
      const lineResult = await query(quoteOrderQueries.getLineById, [lineId]);
      if (lineResult.rows.length === 0) {
        res.status(404).json({ error: 'Line not found' });
        return;
      }
      const line = lineResult.rows[0];
      if (line.quote_order_id !== orderId) {
        res.status(404).json({ error: 'Line not found for this order' });
        return;
      }
      if (line.billing_status === 'invoiced') {
        res.status(400).json({ error: 'Cannot change billing status of invoiced line' });
        return;
      }
      const result = await query(quoteOrderQueries.updateLineBillingStatus, [lineId, billing_status, orderId]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Line not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (e) {
      console.error('quoteOrderController.patchLineBillingStatus', e);
      res.status(500).json({ error: 'Failed to update line billing status' });
    }
  },
};
