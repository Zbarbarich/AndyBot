import { Response } from 'express';
import { query, pool } from '../config/db';
import invoiceQueries from '../queries/invoiceQueries';
import orderQueries from '../queries/orderQueries';
import { AppRequest } from '../middleware/userContext';

export const invoiceController = {
  async search(req: AppRequest, res: Response): Promise<void> {
    try {
      const q = String((req.query.q as string) || '').trim();
      if (!q) {
        res.json([]);
        return;
      }
      const term = `%${q}%`;
      const result = await query(invoiceQueries.search, [term, q]);
      res.json(result.rows);
    } catch (e) {
      console.error('invoiceController.search', e);
      res.status(500).json({ error: 'Failed to search invoices' });
    }
  },

  async list(req: AppRequest, res: Response): Promise<void> {
    try {
      const result = await query(invoiceQueries.list);
      res.json(result.rows);
    } catch (e) {
      console.error('invoiceController.list', e);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  },

  async getById(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid invoice id' });
        return;
      }
      const docResult = await query(invoiceQueries.getById, [id]);
      if (docResult.rows.length === 0) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }
      const linesResult = await query(invoiceQueries.getLinesByInvoiceId, [id]);
      const paymentsResult = await query(invoiceQueries.getPaymentsByInvoiceId, [id]);
      res.json({ ...docResult.rows[0], lines: linesResult.rows, payments: paymentsResult.rows });
    } catch (e) {
      console.error('invoiceController.getById', e);
      res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  },

  async getByOrderId(req: AppRequest, res: Response): Promise<void> {
    try {
      const orderId = parseInt(req.params.orderId, 10);
      if (isNaN(orderId)) {
        res.status(400).json({ error: 'Invalid order id' });
        return;
      }
      const result = await query(invoiceQueries.getByOrderId, [orderId]);
      const docNum = (result.rows[0] as { order_document_number?: string } | undefined)?.order_document_number ?? '';
      const rows = result.rows.map((row: Record<string, unknown>, i: number) => ({
        ...row,
        sub_order_number: `${docNum}-${String(i + 1).padStart(3, '0')}`,
      }));
      res.json(rows);
    } catch (e) {
      console.error('invoiceController.getByOrderId', e);
      res.status(500).json({ error: 'Failed to fetch invoices for order' });
    }
  },

  async createFromOrder(req: AppRequest, res: Response): Promise<void> {
    const orderId = parseInt(req.body?.order_id ?? req.params.orderId ?? '', 10);
    if (isNaN(orderId)) {
      res.status(400).json({ error: 'order_id is required' });
      return;
    }
    const additionalShipping = Number(req.body?.additional_shipping) || 0;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(orderQueries.getById, [orderId]);
      if (orderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      const order = orderResult.rows[0];
      if (order.type !== 'order') {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Not an order' });
        return;
      }

      const existingInvoices = await client.query(invoiceQueries.getByOrderId, [orderId]);
      const orderShipping = Number(order.shipping_amount) || 0;
      const shippingAmount = existingInvoices.rows.length === 0 ? orderShipping + additionalShipping : additionalShipping;

      const billableResult = await client.query(invoiceQueries.orderBillableLines, [orderId]);
      const billableLines = billableResult.rows as Array<{
        id: number;
        item_id: number | null;
        description: string | null;
        quantity: string;
        unit_price: string;
        sort_order?: number;
        quantity_billed: string;
      }>;
      if (billableLines.length === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'No billable lines on this order. Mark lines as Billable first.' });
        return;
      }

      const linesFromBody = Array.isArray(req.body?.lines)
        ? (req.body.lines as Array<{ line_id: number; quantity: number }>).filter(
            (x) => Number.isInteger(x.line_id) && Number.isFinite(Number(x.quantity)) && Number(x.quantity) > 0
          )
        : null;

      const linesToBill: Array<{ line: (typeof billableLines)[0]; quantityToBill: number }> = [];
      for (const l of billableLines) {
        const qty = Number(l.quantity);
        const billed = Number(l.quantity_billed ?? 0);
        const remaining = Math.max(0, qty - billed);
        if (remaining <= 0) continue;
        const requested = linesFromBody?.find((x) => x.line_id === l.id)?.quantity;
        const quantityToBill = requested != null ? Math.min(Number(requested), remaining) : remaining;
        if (quantityToBill <= 0) continue;
        linesToBill.push({ line: l, quantityToBill });
      }

      if (linesToBill.length === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'No quantities to bill; specify line quantities or bill remaining.' });
        return;
      }

      const subtotal = linesToBill.reduce(
        (sum, { line, quantityToBill }) => sum + quantityToBill * Number(line.unit_price),
        0
      );
      const taxRate = Number(order.tax_rate);
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount + shippingAmount;

      const invNumResult = await client.query(invoiceQueries.nextInvoiceNumber);
      const invoice_number = invNumResult.rows[0].invoice_number;

      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 14);
      const invoiceDateStr = invoiceDate.toISOString().slice(0, 10);
      const dueDateStr = dueDate.toISOString().slice(0, 10);

      const createResult = await client.query(invoiceQueries.createInvoice, [
        invoice_number,
        orderId,
        order.customer_id,
        order.ticket_id,
        invoiceDateStr,
        dueDateStr,
        subtotal,
        taxRate,
        taxAmount,
        shippingAmount,
        total,
      ]);
      const invoice = createResult.rows[0];
      const invoiceId = invoice.id;

      for (let i = 0; i < linesToBill.length; i++) {
        const { line: l, quantityToBill } = linesToBill[i];
        await client.query(invoiceQueries.insertInvoiceLine, [
          invoiceId,
          l.id,
          l.item_id,
          l.description,
          quantityToBill,
          l.unit_price,
          l.sort_order ?? i,
        ]);
        await client.query(invoiceQueries.addOrderLineQuantityBilled, [l.id, quantityToBill]);
      }

      const countResult = await client.query(invoiceQueries.countOrderLinesNotInvoiced, [orderId]);
      if (countResult.rows[0].count === 0) {
        await client.query(invoiceQueries.setOrderClosed, [orderId]);
      }

      // Apply order-level deposits to this invoice (they are applied at next invoice)
      const depositsResult = await client.query(invoiceQueries.getUnappliedDepositsByOrderId, [orderId]);
      const deposits = depositsResult.rows as Array<{ id: number; amount: string; payment_method: string | null; paid_at: Date; reference: string | null }>;
      if (deposits.length > 0) {
        const depositIds: number[] = [];
        for (const d of deposits) {
          await client.query(invoiceQueries.insertPayment, [
            invoiceId,
            Number(d.amount),
            d.payment_method || 'deposit',
            d.paid_at,
            d.reference || 'Deposit',
          ]);
          depositIds.push(d.id);
        }
        await client.query(invoiceQueries.markDepositsApplied, [depositIds, invoiceId]);
        await client.query(invoiceQueries.syncInvoiceAmountPaid, [invoiceId]);
      }

      await client.query('COMMIT');

      const fullInvoice = await query(invoiceQueries.getById, [invoiceId]);
      const linesResult = await query(invoiceQueries.getLinesByInvoiceId, [invoiceId]);
      const paymentsResult = await query(invoiceQueries.getPaymentsByInvoiceId, [invoiceId]);
      res.status(201).json({ ...fullInvoice.rows[0], lines: linesResult.rows, payments: paymentsResult.rows });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('invoiceController.createFromOrder', e);
      res.status(500).json({ error: 'Failed to create invoice from order' });
    } finally {
      client.release();
    }
  },

  async recordPayment(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid invoice id' });
        return;
      }
      const { amount, payment_method, reference } = req.body;
      const amountNum = amount != null ? Number(amount) : NaN;
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        res.status(400).json({ error: 'amount is required and must be a positive number' });
        return;
      }
      const method = payment_method === 'cash' || payment_method === 'check' ? payment_method : null;
      const ref = reference != null ? String(reference).trim() || null : null;
      const invCheck = await query(invoiceQueries.getById, [id]);
      if (invCheck.rows.length === 0) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }
      await query(invoiceQueries.insertPayment, [id, amountNum, method, new Date(), ref]);
      await query(invoiceQueries.syncInvoiceAmountPaid, [id]);
      const fullInvoice = await query(invoiceQueries.getById, [id]);
      const linesResult = await query(invoiceQueries.getLinesByInvoiceId, [id]);
      const paymentsResult = await query(invoiceQueries.getPaymentsByInvoiceId, [id]);
      res.json({ ...fullInvoice.rows[0], lines: linesResult.rows, payments: paymentsResult.rows });
    } catch (e) {
      console.error('invoiceController.recordPayment', e);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  },

  async deletePayment(req: AppRequest, res: Response): Promise<void> {
    try {
      const invoiceId = parseInt(req.params.id, 10);
      const paymentId = parseInt(req.params.paymentId, 10);
      if (isNaN(invoiceId) || isNaN(paymentId)) {
        res.status(400).json({ error: 'Invalid invoice or payment id' });
        return;
      }
      const check = await query(invoiceQueries.getPaymentById, [paymentId, invoiceId]);
      if (check.rows.length === 0) {
        res.status(404).json({ error: 'Payment not found for this invoice' });
        return;
      }
      await query(invoiceQueries.deletePayment, [paymentId, invoiceId]);
      await query(invoiceQueries.syncInvoiceAmountPaid, [invoiceId]);
      const fullInvoice = await query(invoiceQueries.getById, [invoiceId]);
      const linesResult = await query(invoiceQueries.getLinesByInvoiceId, [invoiceId]);
      const paymentsResult = await query(invoiceQueries.getPaymentsByInvoiceId, [invoiceId]);
      res.json({ ...fullInvoice.rows[0], lines: linesResult.rows, payments: paymentsResult.rows });
    } catch (e) {
      console.error('invoiceController.deletePayment', e);
      res.status(500).json({ error: 'Failed to reverse payment' });
    }
  },
};
