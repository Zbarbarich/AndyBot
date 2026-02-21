import PDFDocument from 'pdfkit';
import { Response } from 'express';

const COMPANY_NAME = process.env.COMPANY_NAME || '19th Chamber';
const COMPANY_LOGO_URL = process.env.COMPANY_LOGO_URL || '';
const COMPANY_ADDRESS = [
  process.env.COMPANY_ADDRESS_LINE1 || '106 Packer Street',
  process.env.COMPANY_CITY_STATE_ZIP || 'Johnstown PA 15904',
];

const PAGE_WIDTH = 595;
const PAGE_MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

/** Format date as mm/dd/yyyy in America/New_York for PDF output. */
function formatDatePdf(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

const DOC_INFO_BLOCK_WIDTH = 180;
const DOC_INFO_TOP = 50;
const DOC_INFO_LINE_HEIGHT = 14;

/** Draw document info block at top right with labeled lines (e.g. "Quote #", "Valid through:", "Page"). Returns y after block. */
function drawDocInfoBlockRight(
  doc: PDFDoc,
  lines: Array<{ label: string; value: string }>
): number {
  const x = PAGE_WIDTH - PAGE_MARGIN - DOC_INFO_BLOCK_WIDTH;
  let y = DOC_INFO_TOP;
  doc.fontSize(10);
  for (const { label, value } of lines) {
    const line = `${label} ${value}`;
    doc.font('Helvetica').text(line, x, y, { width: DOC_INFO_BLOCK_WIDTH, align: 'right' });
    y += DOC_INFO_LINE_HEIGHT;
  }
  return y + 8;
}

interface DocLine {
  description: string | null;
  quantity: number;
  unit_price: number;
  unit_of_measure?: string | null;
}

export interface PaymentRow {
  amount: number;
  payment_method: string | null;
  paid_at: string;
}

export interface DocData {
  document_number: string;
  type: string;
  customer_name: string;
  customer_address?: string | null;
  contact_name?: string | null;
  customer_id?: number;
  valid_until?: string | null;
  order_date?: string | null;
  invoice_date?: string;
  due_date?: string | null;
  notes?: string | null;
  customer_po_number?: string | null;
  lines: DocLine[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  amount_paid?: number;
  payments?: PaymentRow[];
}

type PDFDoc = InstanceType<typeof PDFDocument>;

/**
 * Split a single address string into [street, cityStateZip] for two-line display.
 * Street (address before city) on line 1; city, state zip on line 2.
 * Uses first newline if present; otherwise splits on first ", " so street is before city.
 */
function splitAddressLines(addr: string): [string, string] {
  const t = addr.trim();
  if (!t) return ['', ''];
  const nl = t.indexOf('\n');
  if (nl >= 0) {
    const street = t.slice(0, nl).trim();
    const cityStateZip = t.slice(nl + 1).replace(/\n/g, ' ').trim();
    return [street, cityStateZip];
  }
  const firstComma = t.indexOf(', ');
  if (firstComma >= 0) {
    return [t.slice(0, firstComma).trim(), t.slice(firstComma + 2).trim()];
  }
  return [t, ''];
}

/** Draw customer address as two lines (street, then city/state/zip). Returns y after block. */
function drawCustomerAddressBlock(
  doc: PDFDoc,
  y: number,
  addressStr: string | null | undefined,
  width: number,
  align: 'left' | 'right' = 'left'
): number {
  if (!addressStr || !addressStr.trim()) return y + 8;
  const [street, cityStateZip] = splitAddressLines(addressStr);
  const opts = { width, align };
  doc.fontSize(9);
  if (street) {
    doc.text(street, PAGE_MARGIN, y, opts);
    y += doc.heightOfString(street, opts) + 4;
  }
  if (cityStateZip) {
    doc.text(cityStateZip, PAGE_MARGIN, y, opts);
    y += doc.heightOfString(cityStateZip, opts) + 8;
  } else if (street) {
    y += 8;
  }
  doc.fontSize(10);
  return y;
}

/** Draw company name, optional logo, and address starting at startY. Returns y after block. */
async function addCompanyHeader(doc: PDFDoc, startY: number): Promise<number> {
  let y = startY;
  doc.fontSize(11).font('Helvetica-Bold').text(COMPANY_NAME, PAGE_MARGIN, y);
  y += 18;
  if (COMPANY_LOGO_URL) {
    try {
      const res = await fetch(COMPANY_LOGO_URL);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        doc.image(Buffer.from(buf), PAGE_MARGIN, y - 8, { width: 80 });
        y += 78;
      }
    } catch {
      // ignore logo load errors
    }
  }
  doc.fontSize(9).font('Helvetica');
  for (const line of COMPANY_ADDRESS) {
    doc.text(line, PAGE_MARGIN, y);
    y += 12;
  }
  y += 8;
  return y;
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

function commonDocLayout(doc: PDFDoc, data: DocData, startY: number): number {
  let y = startY;
  if (data.customer_po_number) {
    doc.fontSize(10).font('Helvetica');
    doc.text(`Customer PO: ${data.customer_po_number}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'right' });
    y += 16;
  }

  doc.font('Helvetica-Bold').text('Bill to:', PAGE_MARGIN, y);
  y += 18;
  doc.font('Helvetica').text(data.customer_name, PAGE_MARGIN, y);
  y += 14;
  if (data.contact_name) {
    doc.text(data.contact_name, PAGE_MARGIN, y);
    y += 14;
  }
  y = drawCustomerAddressBlock(doc, y, data.customer_address, CONTENT_WIDTH);
  y += 12;

  const colWidths = [180, 32, 52, 72, 82];
  y = drawBorderedTable(
    doc,
    y,
    ['Description', 'U/M', 'Qty', 'Unit price', 'Extended'],
    data.lines.map((l) => [
      l.description ?? '—',
      l.unit_of_measure ?? 'EA',
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

  drawDocInfoBlockRight(doc, [
    { label: 'Quote #:', value: data.document_number },
    { label: 'Valid through:', value: formatDatePdf(data.valid_until) },
    { label: 'Page:', value: '1' },
  ]);
  let y = await addCompanyHeader(doc, DOC_INFO_TOP);
  if (y < 140) y = 140;

  y = commonDocLayout(doc, data, y);

  doc.end();
  await streamDone;
}

export async function streamOrderPdf(data: DocData, res: Response): Promise<void> {
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
  const { streamDone } = setupDoc(doc, 'Order');
  doc.pipe(res);

  drawDocInfoBlockRight(doc, [
    { label: 'Order #:', value: data.document_number },
    { label: 'Order date:', value: formatDatePdf(data.order_date) },
    { label: 'Page:', value: '1' },
  ]);
  let y = await addCompanyHeader(doc, DOC_INFO_TOP);
  if (y < 140) y = 140;

  y = commonDocLayout(doc, data, y);

  doc.end();
  await streamDone;
}

export async function streamInvoicePdf(data: DocData, res: Response): Promise<void> {
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
  const { streamDone } = setupDoc(doc, 'Invoice');
  doc.pipe(res);

  drawDocInfoBlockRight(doc, [
    { label: 'Invoice #:', value: data.document_number },
    { label: 'Invoice date:', value: formatDatePdf(data.invoice_date) },
    { label: 'Due date:', value: formatDatePdf(data.due_date) },
    { label: 'Page:', value: '1' },
  ]);
  let y = await addCompanyHeader(doc, DOC_INFO_TOP);
  if (y < 140) y = 140;

  doc.font('Helvetica-Bold').text('Bill to:', PAGE_MARGIN, y);
  y += 18;
  doc.font('Helvetica').text(data.customer_name, PAGE_MARGIN, y);
  y += 14;
  if (data.contact_name) {
    doc.text(data.contact_name, PAGE_MARGIN, y);
    y += 14;
  }
  y = drawCustomerAddressBlock(doc, y, data.customer_address, CONTENT_WIDTH);
  y += 12;

  const colWidths = [180, 32, 52, 72, 82];
  y = drawBorderedTable(
    doc,
    y,
    ['Description', 'U/M', 'Qty', 'Unit price', 'Extended'],
    data.lines.map((l) => [
      l.description ?? '—',
      l.unit_of_measure ?? 'EA',
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
  y += 16;
  const paid = data.amount_paid ?? 0;
  doc.text(`Amount paid: ${Number(paid).toFixed(2)}`, totalsX, y);
  y += 16;
  doc.text(`Balance due: ${Number(Number(data.total) - paid).toFixed(2)}`, totalsX, y);
  y += 24;

  if (data.payments && data.payments.length > 0) {
    doc.font('Helvetica-Bold').fontSize(10).text('Payments', PAGE_MARGIN, y);
    y += 18;
    doc.font('Helvetica').fontSize(9);
    for (const p of data.payments) {
      const d = formatDatePdf(p.paid_at);
      doc.text(`${d}  ${Number(p.amount).toFixed(2)}  ${p.payment_method ?? '—'}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH });
      y += 14;
    }
    y += 8;
  }

  if (data.notes) {
    doc.font('Helvetica').fontSize(9).text(`Notes: ${data.notes}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH });
  }

  doc.end();
  await streamDone;
}

export interface POLine {
  description: string | null;
  quantity: number;
  unit_cost: number;
  item_sku?: string | null;
  item_name?: string | null;
}

export interface POData {
  po_number: string;
  order_document_number: string;
  customer_name: string;
  customer_address?: string | null;
  contact_name?: string | null;
  created_at: string;
  lines: POLine[];
}

export async function streamPurchaseOrderPdf(data: POData, res: Response): Promise<void> {
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
  const { streamDone } = setupDoc(doc, 'Purchase Order');
  doc.pipe(res);

  const poDateStr = data.created_at ? formatDatePdf(data.created_at) : '—';
  drawDocInfoBlockRight(doc, [
    { label: 'PO #:', value: data.po_number },
    { label: 'Order:', value: data.order_document_number },
    { label: 'Date:', value: poDateStr },
    { label: 'Page:', value: '1' },
  ]);
  let y = await addCompanyHeader(doc, DOC_INFO_TOP);
  if (y < 140) y = 140;

  doc.fontSize(10).font('Helvetica');
  doc.text(`Customer: ${data.customer_name}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'right' });
  y += 14;
  if (data.contact_name) {
    doc.text(`Contact: ${data.contact_name}`, PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'right' });
    y += 14;
  }
  y = drawCustomerAddressBlock(doc, y, data.customer_address, CONTENT_WIDTH / 2, 'right');
  y += 12;

  const colWidths = [200, 60, 80, 95];
  y = drawBorderedTable(
    doc,
    y,
    ['Description', 'Qty', 'Unit cost', 'Extended'],
    data.lines.map((l) => [
      l.description ?? l.item_name ?? l.item_sku ?? '—',
      Number(l.quantity),
      Number(l.unit_cost).toFixed(2),
      (Number(l.quantity) * Number(l.unit_cost)).toFixed(2),
    ]),
    colWidths
  );

  const total = data.lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unit_cost), 0);
  y += 18;
  const totalsX = PAGE_MARGIN + CONTENT_WIDTH - 140;
  doc.font('Helvetica-Bold').text(`Total: ${Number(total).toFixed(2)}`, totalsX, y);

  doc.end();
  await streamDone;
}
