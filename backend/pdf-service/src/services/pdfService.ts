import PDFDocument from 'pdfkit';
import { Response } from 'express';

const COMPANY_NAME = process.env.COMPANY_NAME || '19th Chamber';
const COMPANY_LOGO_URL = process.env.COMPANY_LOGO_URL || '';

const PAGE_WIDTH = 595;
const PAGE_MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

interface DocLine {
  description: string | null;
  quantity: number;
  unit_price: number;
}

export interface DocData {
  document_number: string;
  type: string;
  customer_name: string;
  customer_id?: number;
  valid_until?: string | null;
  order_date?: string | null;
  invoice_date?: string;
  due_date?: string | null;
  notes?: string | null;
  lines: DocLine[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
}

type PDFDoc = InstanceType<typeof PDFDocument>;

async function addCompanyHeader(doc: PDFDoc): Promise<number> {
  doc.fontSize(11).font('Helvetica-Bold').text(COMPANY_NAME, PAGE_MARGIN, 50);
  let y = 72;
  if (COMPANY_LOGO_URL) {
    try {
      const res = await fetch(COMPANY_LOGO_URL);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        doc.image(Buffer.from(buf), PAGE_MARGIN, 70, { width: 80 });
        y = 155;
      }
    } catch {
      // ignore logo load errors
    }
  }
  return y;
}

function drawCenteredTitle(doc: PDFDoc, title: string, startY: number): number {
  doc.fontSize(16).font('Helvetica-Bold');
  doc.text(title, 0, startY, { align: 'center', width: PAGE_WIDTH });
  return startY + 28;
}

function drawBorderedTable(
  doc: PDFDoc,
  startY: number,
  headers: string[],
  rows: (string | number)[][],
  colWidths: number[]
): number {
  const rowHeight = 20;
  const headerHeight = 22;
  const left = PAGE_MARGIN;
  let y = startY;

  doc.fontSize(10).font('Helvetica-Bold');
  let x = left;
  for (let i = 0; i < headers.length; i++) {
    doc.rect(x, y, colWidths[i], headerHeight).stroke();
    doc.text(String(headers[i]), x + 4, y + 6, { width: colWidths[i] - 8 });
    x += colWidths[i];
  }
  y += headerHeight;

  doc.font('Helvetica');
  for (const row of rows) {
    x = left;
    for (let i = 0; i < row.length; i++) {
      doc.rect(x, y, colWidths[i], rowHeight).stroke();
      doc.text(String(row[i]), x + 4, y + 5, { width: colWidths[i] - 8 });
      x += colWidths[i];
    }
    y += rowHeight;
  }
  return y;
}

function commonDocLayout(
  doc: PDFDoc,
  data: DocData,
  docTypeTitle: string,
  docNumberLabel: string,
  dateLine: string,
  startY: number
): number {
  let y = drawCenteredTitle(doc, docTypeTitle, startY);

  doc.fontSize(10).font('Helvetica');
  doc.text(`${docNumberLabel} ${data.document_number}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'right' });
  y += 16;
  doc.text(dateLine, PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'right' });
  y += 24;

  doc.font('Helvetica-Bold').text('Bill to:', PAGE_MARGIN, y);
  y += 18;
  doc.font('Helvetica').text(data.customer_name, PAGE_MARGIN, y);
  y += 28;

  const colWidths = [220, 60, 80, 90];
  y = drawBorderedTable(
    doc,
    y,
    ['Description', 'Qty', 'Unit price', 'Extended'],
    data.lines.map((l) => [
      l.description ?? '—',
      Number(l.quantity),
      Number(l.unit_price).toFixed(2),
      (Number(l.quantity) * Number(l.unit_price)).toFixed(2),
    ]),
    colWidths
  );

  y += 18;
  const totalsX = PAGE_MARGIN + CONTENT_WIDTH - 140;
  doc.text(`Subtotal: ${Number(data.subtotal).toFixed(2)}`, totalsX, y);
  y += 16;
  doc.text(`Tax (${(Number(data.tax_rate) * 100).toFixed(2)}%): ${Number(data.tax_amount).toFixed(2)}`, totalsX, y);
  y += 16;
  doc.text(`Shipping: ${Number(data.shipping_amount).toFixed(2)}`, totalsX, y);
  y += 16;
  doc.font('Helvetica-Bold').text(`Total: ${Number(data.total).toFixed(2)}`, totalsX, y);
  y += 24;

  if (data.notes) {
    doc.font('Helvetica').fontSize(9).text(`Notes: ${data.notes}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH });
  }
  return y;
}

function setupDoc(doc: PDFDoc, title: string): { streamDone: Promise<void> } {
  // Set only Title so PDFKit's default info (CreationDate, ModDate, etc.) is preserved
  const info = (doc as unknown as { info?: Record<string, unknown> }).info;
  if (info) info.Title = title;
  return {
    streamDone: new Promise<void>((resolve, reject) => {
      doc.on('error', (err) => {
        console.error('pdfService stream error', err);
        reject(err);
      });
      doc.on('end', () => resolve());
    }),
  };
}

export async function streamQuotePdf(data: DocData, res: Response): Promise<void> {
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
  const { streamDone } = setupDoc(doc, 'Quote');
  doc.pipe(res);

  let y = await addCompanyHeader(doc);
  if (y < 100) y = 100;

  y = commonDocLayout(
    doc,
    data,
    'QUOTE',
    'Quote #:',
    `Valid until: ${data.valid_until ?? '—'}`,
    y
  );

  doc.end();
  await streamDone;
}

export async function streamOrderPdf(data: DocData, res: Response): Promise<void> {
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
  const { streamDone } = setupDoc(doc, 'Order');
  doc.pipe(res);

  let y = await addCompanyHeader(doc);
  if (y < 100) y = 100;

  y = commonDocLayout(
    doc,
    data,
    'ORDER',
    'Order #:',
    `Order date: ${data.order_date ?? '—'}`,
    y
  );

  doc.end();
  await streamDone;
}

export async function streamInvoicePdf(data: DocData, res: Response): Promise<void> {
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
  const { streamDone } = setupDoc(doc, 'Invoice');
  doc.pipe(res);

  let y = await addCompanyHeader(doc);
  if (y < 100) y = 100;

  doc.fontSize(16).font('Helvetica-Bold');
  doc.text('INVOICE', 0, y, { align: 'center', width: PAGE_WIDTH });
  y += 28;

  doc.fontSize(10).font('Helvetica');
  doc.text(`Invoice #: ${data.document_number}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'right' });
  y += 16;
  doc.text(`Invoice date: ${data.invoice_date ?? '—'}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'right' });
  y += 16;
  doc.text(`Due date: ${data.due_date ?? '—'}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'right' });
  y += 24;

  doc.font('Helvetica-Bold').text('Bill to:', PAGE_MARGIN, y);
  y += 18;
  doc.font('Helvetica').text(data.customer_name, PAGE_MARGIN, y);
  y += 28;

  const colWidths = [220, 60, 80, 90];
  y = drawBorderedTable(
    doc,
    y,
    ['Description', 'Qty', 'Unit price', 'Extended'],
    data.lines.map((l) => [
      l.description ?? '—',
      Number(l.quantity),
      Number(l.unit_price).toFixed(2),
      (Number(l.quantity) * Number(l.unit_price)).toFixed(2),
    ]),
    colWidths
  );

  y += 18;
  const totalsX = PAGE_MARGIN + CONTENT_WIDTH - 140;
  doc.text(`Subtotal: ${Number(data.subtotal).toFixed(2)}`, totalsX, y);
  y += 16;
  doc.text(`Tax: ${Number(data.tax_amount).toFixed(2)}`, totalsX, y);
  y += 16;
  doc.text(`Shipping: ${Number(data.shipping_amount).toFixed(2)}`, totalsX, y);
  y += 16;
  doc.font('Helvetica-Bold').text(`Total: ${Number(data.total).toFixed(2)}`, totalsX, y);
  y += 24;

  if (data.notes) {
    doc.font('Helvetica').fontSize(9).text(`Notes: ${data.notes}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH });
  }

  doc.end();
  await streamDone;
}
