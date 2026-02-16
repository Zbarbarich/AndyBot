import { Response } from 'express';
import { query } from '../config/db';
import quoteOrderQueries from '../queries/quoteOrderQueries';
import invoiceQueries from '../queries/invoiceQueries';
import { streamQuotePdf, streamOrderPdf, streamInvoicePdf, DocData } from '../services/pdfService';
import { AppRequest } from '../middleware/userContext';

function mapLines(rows: { description: string | null; quantity: string; unit_price: string }[]): DocData['lines'] {
  return rows.map((r) => ({
    description: r.description,
    quantity: Number(r.quantity),
    unit_price: Number(r.unit_price),
  }));
}

export const pdfController = {
  async quotePdf(req: AppRequest, res: Response): Promise<void> {
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
      const data: DocData = {
        document_number: doc.document_number,
        type: 'quote',
        customer_name: doc.customer_name,
        valid_until: doc.valid_until,
        notes: doc.notes,
        lines: mapLines(linesResult.rows),
        subtotal: Number(doc.subtotal),
        tax_rate: Number(doc.tax_rate),
        tax_amount: Number(doc.tax_amount),
        shipping_amount: Number(doc.shipping_amount),
        total: Number(doc.total),
      };
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="quote-${doc.document_number}.pdf"`);
      await streamQuotePdf(data, res);
    } catch (e) {
      console.error('pdfController.quotePdf', e);
      if (!res.headersSent) res.status(503).json({ error: 'PDF generation is temporarily unavailable' });
    }
  },

  async orderPdf(req: AppRequest, res: Response): Promise<void> {
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
      const lines = mapLines(linesResult.rows);
      const baseData = {
        document_number: doc.document_number,
        customer_name: doc.customer_name,
        notes: doc.notes,
        lines,
        subtotal: Number(doc.subtotal),
        tax_rate: Number(doc.tax_rate),
        tax_amount: Number(doc.tax_amount),
        shipping_amount: Number(doc.shipping_amount),
        total: Number(doc.total),
      };
      res.setHeader('Content-Type', 'application/pdf');

      if (doc.type === 'quote') {
        const data: DocData = { ...baseData, type: 'quote', valid_until: doc.valid_until };
        res.setHeader('Content-Disposition', `attachment; filename="quote-${doc.document_number}.pdf"`);
        await streamQuotePdf(data, res);
      } else {
        const data: DocData = { ...baseData, type: 'order', order_date: doc.order_date };
        res.setHeader('Content-Disposition', `attachment; filename="order-${doc.document_number}.pdf"`);
        await streamOrderPdf(data, res);
      }
    } catch (e) {
      console.error('pdfController.orderPdf', e);
      if (!res.headersSent) res.status(503).json({ error: 'PDF generation is temporarily unavailable' });
    }
  },

  async invoicePdf(req: AppRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      const docResult = await query(invoiceQueries.getById, [id]);
      if (docResult.rows.length === 0) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }
      const doc = docResult.rows[0];
      const linesResult = await query(invoiceQueries.getLinesByInvoiceId, [id]);
      const data: DocData = {
        document_number: doc.invoice_number,
        type: 'invoice',
        customer_name: doc.customer_name,
        invoice_date: doc.invoice_date,
        due_date: doc.due_date,
        notes: null,
        lines: mapLines(linesResult.rows),
        subtotal: Number(doc.subtotal),
        tax_rate: Number(doc.tax_rate),
        tax_amount: Number(doc.tax_amount),
        shipping_amount: Number(doc.shipping_amount),
        total: Number(doc.total),
      };
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${doc.invoice_number}.pdf"`);
      await streamInvoicePdf(data, res);
    } catch (e) {
      console.error('pdfController.invoicePdf', e);
      if (!res.headersSent) res.status(503).json({ error: 'PDF generation is temporarily unavailable' });
    }
  },
};
