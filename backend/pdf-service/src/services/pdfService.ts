import PDFDocument from 'pdfkit';
import { Response } from 'express';
import fs from 'fs';
import path from 'path';

const COMPANY_NAME = process.env.COMPANY_NAME || 'Your Company';
const COMPANY_LOGO_URL = process.env.COMPANY_LOGO_URL || '';
const COMPANY_ADDRESS_LINE1 = process.env.COMPANY_ADDRESS_LINE1 || '123 Main Street';
const COMPANY_CITY_STATE_ZIP = process.env.COMPANY_CITY_STATE_ZIP || 'City ST 00000';
const COMPANY_ADDRESS_FULL = `${COMPANY_NAME}, ${COMPANY_ADDRESS_LINE1}, ${COMPANY_CITY_STATE_ZIP}`;

/** Flat teal/black Andy head for invoices (outline-only raster of brand SVG). */
const ANDY_MARK_PNG = path.join(__dirname, '..', '..', 'assets', 'andy-head-minimal.png');
function getAndyMark(): Buffer | null {
  try {
    return fs.readFileSync(ANDY_MARK_PNG);
  } catch {
    return null;
  }
}

/**
 * Styling inspired by clean teal / black commercial invoices:
 * large doc title, BILL TO + meta, teal summary chips + black total chip, airy table.
 */
const COLOR = {
  teal: '#22d4cc',
  ink: '#1a1a1a',
  muted: '#6b6b6b',
  line: '#d8d8d8',
  lineDark: '#1a1a1a',
  white: '#ffffff',
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const FOOTER_BAND = 36;
const CONTENT_BOTTOM = PAGE_HEIGHT - FOOTER_BAND - 6;
/** Shared right-column width so header brand aligns with order meta. */
const RIGHT_COL_W = 210;
const RIGHT_COL_X = PAGE_WIDTH - PAGE_MARGIN - RIGHT_COL_W;

/** #10 window recipient block (mail-ready). */
const WINDOW = {
  x: PAGE_MARGIN,
  y: 128,
  width: 260,
  height: 78,
};

type PDFDoc = InstanceType<typeof PDFDocument>;

function formatDatePdf(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const month = parts.find((p) => p.type === 'month')?.value ?? '00';
    const day = parts.find((p) => p.type === 'day')?.value ?? '00';
    const year = parts.find((p) => p.type === 'year')?.value ?? '00';
    return `${month}-${day}-${year}`;
  } catch {
    return String(dateStr);
  }
}

function money(n: number): string {
  const v = Number(n);
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  reference?: string | null;
}

export interface DepositRow {
  amount: number;
  payment_method: string | null;
  paid_at: string;
  reference?: string | null;
  applied_to_invoice_id?: number | null;
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
  /** Linked service ticket id (displayed as Ticket #N on Reference). */
  ticket_id?: number | null;
  lines: DocLine[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  amount_paid?: number;
  payments?: PaymentRow[];
  /** Order-level deposits (shown on order PDFs before/after invoice application). */
  deposits?: DepositRow[];
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

function splitAddressLines(addr: string): string[] {
  const t = addr.trim();
  if (!t) return [];
  if (t.includes('\n')) {
    return t
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }
  const firstComma = t.indexOf(', ');
  if (firstComma >= 0) {
    return [t.slice(0, firstComma).trim(), t.slice(firstComma + 2).trim()].filter(Boolean);
  }
  return [t];
}

function docTitleForType(type: string): string {
  const t = (type || '').toLowerCase();
  if (t === 'quote') return 'Quote';
  if (t === 'invoice') return 'Invoice';
  if (t === 'return') return 'Return';
  if (t === 'purchase_order' || t === 'po') return 'Purchase Order';
  return 'Order';
}

function summaryLabelForType(type: string): string {
  const t = (type || '').toLowerCase();
  if (t === 'quote') return 'Quote Summary';
  if (t === 'invoice') return 'Invoice Summary';
  if (t === 'return') return 'Return Summary';
  return 'Order Summary';
}

function setupDoc(doc: PDFDoc, title: string): { streamDone: Promise<void> } {
  const info = (doc as unknown as { info?: Record<string, unknown> }).info;
  if (info) {
    info.Title = title;
    info.Author = COMPANY_NAME;
  }
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

function newDoc(): PDFDoc {
  return new PDFDocument({
    size: 'LETTER',
    margin: 0,
    autoFirstPage: true,
    bufferPages: true,
  });
}

function ensureSpace(doc: PDFDoc, y: number, needed: number): number {
  if (y + needed <= CONTENT_BOTTOM) return y;
  doc.addPage();
  return PAGE_MARGIN + 8;
}

/** Large title left; flat Andy mark + company name right. */
async function drawHeader(doc: PDFDoc, docTitle: string): Promise<number> {
  const top = PAGE_MARGIN - 4;

  doc.fillColor(COLOR.ink).font('Helvetica').fontSize(28).text(docTitle, PAGE_MARGIN, top, {
    lineBreak: false,
  });

  const rightX = RIGHT_COL_X;
  const rightBlockW = RIGHT_COL_W;
  const markSize = 22;
  const nameSize = 13;
  const markGap = 7;
  const markY = top;
  // Optical vertical align: PDFKit y is top-of-line; nudge down to sit with icon center.
  const nameY = markY + (markSize - nameSize) / 2 + 4.5;
  let nameX = rightX;
  let brandRowBottom = markY + markSize;

  let usedLogo = false;
  if (COMPANY_LOGO_URL) {
    try {
      const res = await fetch(COMPANY_LOGO_URL);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        doc.image(Buffer.from(buf), rightX, markY, { height: markSize });
        nameX = rightX + markSize + markGap;
        usedLogo = true;
      }
    } catch {
      /* fall through */
    }
  }

  if (!usedLogo) {
    const mark = getAndyMark();
    if (mark) {
      doc.image(mark, rightX, markY, { height: markSize, width: markSize });
      nameX = rightX + markSize + markGap;
    }
  }

  doc
    .fillColor(COLOR.ink)
    .font('Helvetica')
    .fontSize(nameSize)
    .text(COMPANY_NAME, nameX, nameY, {
      width: rightBlockW - (nameX - rightX),
      align: 'left',
      lineBreak: false,
    });

  const addressY = brandRowBottom + 6;
  doc
    .fillColor(COLOR.muted)
    .font('Helvetica')
    .fontSize(8)
    .text(`${COMPANY_ADDRESS_LINE1}, ${COMPANY_CITY_STATE_ZIP}`, rightX, addressY, {
      width: rightBlockW,
      align: 'left',
    });

  return Math.max(top + 54, addressY + 14);
}

/** BILL TO (window zone) + right meta column. */
function drawBillToAndMeta(
  doc: PDFDoc,
  customerName: string,
  contactName: string | null | undefined,
  addressStr: string | null | undefined,
  meta: Array<{ label: string; value: string }>
): number {
  const leftX = WINDOW.x;
  let y = WINDOW.y;

  doc.fillColor(COLOR.ink).font('Helvetica-Bold').fontSize(9).text('BILL TO', leftX, y, { lineBreak: false });
  y += 14;

  doc.fillColor(COLOR.ink).font('Helvetica').fontSize(10).text(customerName, leftX, y, {
    width: WINDOW.width,
    lineBreak: false,
  });
  y += 13;

  if (contactName?.trim()) {
    doc.fillColor(COLOR.ink).font('Helvetica').fontSize(9).text(contactName.trim(), leftX, y, {
      width: WINDOW.width,
      lineBreak: false,
    });
    y += 12;
  }

  for (const line of splitAddressLines(addressStr ?? '')) {
    if (y > WINDOW.y + WINDOW.height - 10) break;
    doc.fillColor(COLOR.ink).font('Helvetica').fontSize(9).text(line, leftX, y, {
      width: WINDOW.width,
      lineBreak: false,
    });
    y += 11;
  }

  const metaW = RIGHT_COL_W;
  const metaX = RIGHT_COL_X;
  let metaY = WINDOW.y;
  for (const { label, value } of meta) {
    doc.fillColor(COLOR.muted).font('Helvetica').fontSize(9).text(`${label}:`, metaX, metaY, {
      width: 95,
      lineBreak: false,
    });
    doc
      .fillColor(COLOR.ink)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(value, metaX + 95, metaY, { width: 115, align: 'right', lineBreak: false });
    metaY += 14;
  }

  return Math.max(WINDOW.y + WINDOW.height + 16, metaY + 8);
}

/** Full-width summary chips: 3 teal + 1 black total. */
function drawSummaryBar(
  doc: PDFDoc,
  y: number,
  chips: Array<{ label: string; value: string }>,
  totalLabel: string,
  totalValue: string
): number {
  const gap = 6;
  const boxH = 48;
  const boxes = [...chips.slice(0, 3)];
  while (boxes.length < 3) boxes.push({ label: '', value: '' });

  const totalBoxW = Math.floor(CONTENT_WIDTH * 0.28);
  const tealW = Math.floor((CONTENT_WIDTH - totalBoxW - gap * 3) / 3);
  let x = PAGE_MARGIN;

  for (const box of boxes) {
    doc.save();
    doc.roundedRect(x, y, tealW, boxH, 4).fill(COLOR.teal);
    doc.restore();
    if (box.label) {
      doc.fillColor(COLOR.white).font('Helvetica').fontSize(8).text(box.label, x + 10, y + 9, {
        width: tealW - 20,
        lineBreak: false,
      });
      doc
        .fillColor(COLOR.white)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(box.value, x + 10, y + 24, { width: tealW - 20, lineBreak: false });
    }
    x += tealW + gap;
  }

  doc.save();
  doc.roundedRect(x, y, totalBoxW, boxH, 4).fill(COLOR.ink);
  doc.restore();
  doc.fillColor(COLOR.white).font('Helvetica').fontSize(8).text(totalLabel, x + 10, y + 9, {
    width: totalBoxW - 20,
    lineBreak: false,
  });
  doc
    .fillColor(COLOR.white)
    .font('Helvetica-Bold')
    .fontSize(13)
    .text(totalValue, x + 10, y + 24, { width: totalBoxW - 20, lineBreak: false });

  return y + boxH + 18;
}

function drawNotes(doc: PDFDoc, y: number, type: string, notes?: string | null): number {
  if (!notes?.trim()) return y;
  const label = summaryLabelForType(type);
  doc.fillColor(COLOR.muted).font('Helvetica-Bold').fontSize(8).text(label.toUpperCase(), PAGE_MARGIN, y, {
    lineBreak: false,
  });
  y += 12;
  doc.fillColor(COLOR.ink).font('Helvetica').fontSize(9).text(notes.trim(), PAGE_MARGIN, y, {
    width: CONTENT_WIDTH,
  });
  const h = doc.heightOfString(notes.trim(), { width: CONTENT_WIDTH });
  return y + h + 14;
}

function drawLineTable(
  doc: PDFDoc,
  startY: number,
  headers: string[],
  rows: (string | number)[][],
  colWidths: number[],
  alignRightFrom = 1
): number {
  let y = startY;
  const left = PAGE_MARGIN;

  // Header rule
  doc.save();
  doc
    .moveTo(left, y)
    .lineTo(left + CONTENT_WIDTH, y)
    .strokeColor(COLOR.lineDark)
    .lineWidth(1)
    .stroke();
  doc.restore();
  y += 8;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.ink);
  let x = left;
  for (let i = 0; i < headers.length; i++) {
    const align = i >= alignRightFrom ? 'right' : 'left';
    doc.text(headers[i], x, y, { width: colWidths[i], align, lineBreak: false });
    x += colWidths[i];
  }
  y += 14;

  doc.save();
  doc
    .moveTo(left, y)
    .lineTo(left + CONTENT_WIDTH, y)
    .strokeColor(COLOR.lineDark)
    .lineWidth(0.8)
    .stroke();
  doc.restore();
  y += 8;

  doc.font('Helvetica').fontSize(9);
  for (const row of rows) {
    let rowH = 16;
    for (let i = 0; i < row.length; i++) {
      const h = doc.heightOfString(String(row[i]), { width: colWidths[i] - 4 });
      rowH = Math.max(rowH, h + 6);
    }
    y = ensureSpace(doc, y, rowH + 10);

    x = left;
    doc.fillColor(COLOR.ink);
    for (let i = 0; i < row.length; i++) {
      const align = i >= alignRightFrom ? 'right' : 'left';
      doc.text(String(row[i]), x, y, { width: colWidths[i], align });
      x += colWidths[i];
    }
    y += rowH;

    doc.save();
    doc
      .moveTo(left, y)
      .lineTo(left + CONTENT_WIDTH, y)
      .strokeColor(COLOR.line)
      .lineWidth(0.5)
      .stroke();
    doc.restore();
    y += 6;
  }

  return y;
}

function drawBottomTotals(
  doc: PDFDoc,
  y: number,
  rows: Array<{ label: string; value: string; bold?: boolean }>
): number {
  const boxW = 220;
  const boxX = PAGE_WIDTH - PAGE_MARGIN - boxW;
  const rowH = 14;

  y = ensureSpace(doc, y, rows.length * rowH + 8);

  let ty = y;
  for (const row of rows) {
    doc
      .fillColor(row.bold ? COLOR.ink : COLOR.muted)
      .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(row.bold ? 10 : 9)
      .text(row.label, boxX, ty, { width: 110, lineBreak: false });
    doc
      .fillColor(COLOR.ink)
      .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(row.bold ? 10 : 9)
      .text(row.value, boxX, ty, { width: boxW, align: 'right', lineBreak: false });
    ty += rowH;
  }
  return ty + 4;
}

function drawFooter(doc: PDFDoc): void {
  const y = PAGE_HEIGHT - 24;
  doc.save();
  doc
    .moveTo(PAGE_MARGIN, y - 10)
    .lineTo(PAGE_WIDTH - PAGE_MARGIN, y - 10)
    .strokeColor(COLOR.line)
    .lineWidth(0.6)
    .stroke();
  doc.restore();

  doc
    .fillColor(COLOR.ink)
    .font('Helvetica')
    .fontSize(7)
    .text(COMPANY_ADDRESS_FULL, PAGE_MARGIN, y, {
      width: CONTENT_WIDTH * 0.62,
      lineBreak: false,
    });

  doc
    .fillColor(COLOR.ink)
    .font('Helvetica')
    .fontSize(7)
    .text(COMPANY_NAME, PAGE_MARGIN, y, {
      width: CONTENT_WIDTH,
      align: 'right',
      lineBreak: false,
    });
}

function finishPages(doc: PDFDoc): void {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    drawFooter(doc);
  }
}

/** Reference line: ticket when attached, plus customer PO when set. */
function formatReference(data: Pick<DocData, 'ticket_id' | 'customer_po_number'>): string | null {
  const parts: string[] = [];
  if (data.ticket_id != null && Number.isFinite(Number(data.ticket_id))) {
    parts.push(`Ticket #${Number(data.ticket_id)}`);
  }
  const po = data.customer_po_number?.trim();
  if (po) parts.push(po);
  return parts.length ? parts.join(' · ') : null;
}

async function renderQuoteOrderInvoice(data: DocData, res: Response, title: string): Promise<void> {
  const doc = newDoc();
  const { streamDone } = setupDoc(doc, title);
  doc.pipe(res);

  const typeKey = (data.type || title).toLowerCase();
  const docTitle = docTitleForType(typeKey.includes('invoice') ? 'invoice' : typeKey);

  await drawHeader(doc, docTitle);

  const reference = formatReference(data);
  const meta: Array<{ label: string; value: string }> = [];
  let chips: Array<{ label: string; value: string }> = [];
  let totalChipLabel = 'Total';

  if (typeKey.includes('invoice')) {
    meta.push({ label: 'Invoice No.', value: data.document_number });
    meta.push({ label: 'Issue date', value: formatDatePdf(data.invoice_date) });
    meta.push({ label: 'Due date', value: formatDatePdf(data.due_date) });
    if (reference) meta.push({ label: 'Reference', value: reference });
    chips = [
      { label: 'Invoice No.', value: data.document_number },
      { label: 'Issue date', value: formatDatePdf(data.invoice_date) },
      { label: 'Due date', value: formatDatePdf(data.due_date) },
    ];
    totalChipLabel = 'Total due';
  } else if (typeKey.includes('quote')) {
    meta.push({ label: 'Quote No.', value: data.document_number });
    meta.push({ label: 'Valid through', value: formatDatePdf(data.valid_until) });
    if (reference) meta.push({ label: 'Reference', value: reference });
    chips = [
      { label: 'Quote No.', value: data.document_number },
      { label: 'Valid through', value: formatDatePdf(data.valid_until) },
      { label: 'Reference', value: reference || '—' },
    ];
    totalChipLabel = 'Quote total';
  } else if (typeKey.includes('return')) {
    meta.push({ label: 'Return No.', value: data.document_number });
    meta.push({ label: 'Date', value: formatDatePdf(data.order_date) });
    chips = [
      { label: 'Return No.', value: data.document_number },
      { label: 'Date', value: formatDatePdf(data.order_date) },
      { label: 'Reference', value: reference || '—' },
    ];
    totalChipLabel = 'Total';
  } else {
    meta.push({ label: 'Order No.', value: data.document_number });
    meta.push({ label: 'Order date', value: formatDatePdf(data.order_date) });
    if (reference) meta.push({ label: 'Reference', value: reference });
    chips = [
      { label: 'Order No.', value: data.document_number },
      { label: 'Order date', value: formatDatePdf(data.order_date) },
      { label: 'Reference', value: reference || '—' },
    ];
    totalChipLabel = 'Order total';
  }

  let y = drawBillToAndMeta(doc, data.customer_name, data.contact_name, data.customer_address, meta);

  y = drawSummaryBar(doc, y, chips, totalChipLabel, money(Number(data.total)));

  y = drawNotes(doc, y, typeKey.includes('invoice') ? 'invoice' : typeKey, data.notes);

  // Qty + U/M combined for cleaner 4-column look like the sample
  const colWidths = [250, 70, 100, 92];
  y = drawLineTable(
    doc,
    y,
    ['Description', 'Quantity', 'Unit price', 'Amount'],
    data.lines.map((l) => {
      const um = l.unit_of_measure ? ` ${l.unit_of_measure}` : '';
      return [
        l.description ?? '—',
        `${Number(l.quantity)}${um}`,
        money(Number(l.unit_price)),
        money(Number(l.quantity) * Number(l.unit_price)),
      ];
    }),
    colWidths,
    1
  );

  y += 6;

  const deposits = data.deposits ?? [];
  const depositTotal = deposits.reduce((s, d) => s + Number(d.amount), 0);
  const unappliedDepositTotal = deposits
    .filter((d) => d.applied_to_invoice_id == null)
    .reduce((s, d) => s + Number(d.amount), 0);

  const totalRows: Array<{ label: string; value: string; bold?: boolean }> = [
    { label: 'Subtotal', value: money(Number(data.subtotal)) },
    {
      label: typeKey.includes('invoice') ? 'Tax' : `Tax (${(Number(data.tax_rate) * 100).toFixed(2)}%)`,
      value: money(Number(data.tax_amount)),
    },
    { label: 'Shipping', value: money(Number(data.shipping_amount)) },
    { label: 'Total', value: money(Number(data.total)), bold: true },
  ];

  if (!typeKey.includes('invoice') && !typeKey.includes('quote') && deposits.length > 0) {
    totalRows.push({ label: 'Deposits', value: money(depositTotal) });
    if (unappliedDepositTotal > 0) {
      totalRows.push({
        label: 'Net after deposits',
        value: money(Math.max(0, Number(data.total) - unappliedDepositTotal)),
        bold: true,
      });
    }
  }

  if (typeKey.includes('invoice')) {
    const paid = data.amount_paid ?? 0;
    totalRows.push({ label: 'Amount paid', value: money(Number(paid)) });
    totalRows.push({
      label: 'Balance due',
      value: money(Number(data.total) - Number(paid)),
      bold: true,
    });
  }

  drawBottomTotals(doc, y, totalRows);

  let listY = y + totalRows.length * 14 + 12;

  if (deposits.length > 0 && !typeKey.includes('invoice') && !typeKey.includes('quote')) {
    listY = ensureSpace(doc, listY, 20 + deposits.length * 11);
    doc.fillColor(COLOR.ink).font('Helvetica-Bold').fontSize(9).text('Deposits', PAGE_MARGIN, listY, {
      lineBreak: false,
    });
    listY += 12;
    doc.fillColor(COLOR.muted).font('Helvetica').fontSize(8);
    for (const d of deposits) {
      const method = d.payment_method ?? 'deposit';
      const ref = d.reference ? ` · ${d.reference}` : '';
      const status = d.applied_to_invoice_id != null ? ' (applied)' : '';
      doc.text(
        `${formatDatePdf(d.paid_at)}    ${money(Number(d.amount))}    ${method}${ref}${status}`,
        PAGE_MARGIN,
        listY,
        { width: CONTENT_WIDTH, lineBreak: false }
      );
      listY += 11;
    }
    listY += 8;
  }

  if (data.payments && data.payments.length > 0) {
    listY = ensureSpace(doc, listY, 20 + data.payments.length * 11);
    doc.fillColor(COLOR.ink).font('Helvetica-Bold').fontSize(9).text('Payments', PAGE_MARGIN, listY, {
      lineBreak: false,
    });
    listY += 12;
    doc.fillColor(COLOR.muted).font('Helvetica').fontSize(8);
    for (const p of data.payments) {
      const method = p.payment_method ?? '—';
      const ref = p.reference ? ` · ${p.reference}` : '';
      doc.text(
        `${formatDatePdf(p.paid_at)}    ${money(Number(p.amount))}    ${method}${ref}`,
        PAGE_MARGIN,
        listY,
        { width: CONTENT_WIDTH, lineBreak: false }
      );
      listY += 11;
    }
  }

  finishPages(doc);
  doc.end();
  await streamDone;
}

export async function streamQuotePdf(data: DocData, res: Response): Promise<void> {
  await renderQuoteOrderInvoice({ ...data, type: 'quote' }, res, 'Quote');
}

export async function streamOrderPdf(data: DocData, res: Response): Promise<void> {
  await renderQuoteOrderInvoice({ ...data, type: data.type || 'order' }, res, 'Order');
}

export async function streamInvoicePdf(data: DocData, res: Response): Promise<void> {
  await renderQuoteOrderInvoice({ ...data, type: 'invoice' }, res, 'Invoice');
}

export async function streamPurchaseOrderPdf(data: POData, res: Response): Promise<void> {
  const doc = newDoc();
  const { streamDone } = setupDoc(doc, 'Purchase Order');
  doc.pipe(res);

  await drawHeader(doc, 'Purchase Order');

  const meta = [
    { label: 'PO No.', value: data.po_number },
    { label: 'Order', value: data.order_document_number },
    { label: 'Date', value: data.created_at ? formatDatePdf(data.created_at) : '—' },
  ];

  const total = data.lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unit_cost), 0);

  let y = drawBillToAndMeta(doc, data.customer_name, data.contact_name, data.customer_address, meta);

  y = drawSummaryBar(
    doc,
    y,
    [
      { label: 'PO No.', value: data.po_number },
      { label: 'Order', value: data.order_document_number },
      { label: 'Date', value: data.created_at ? formatDatePdf(data.created_at) : '—' },
    ],
    'PO total',
    money(total)
  );

  const colWidths = [280, 70, 100, 92];
  y = drawLineTable(
    doc,
    y,
    ['Description', 'Quantity', 'Unit cost', 'Amount'],
    data.lines.map((l) => [
      l.description ?? l.item_name ?? l.item_sku ?? '—',
      Number(l.quantity),
      money(Number(l.unit_cost)),
      money(Number(l.quantity) * Number(l.unit_cost)),
    ]),
    colWidths,
    1
  );

  y += 6;
  drawBottomTotals(doc, y, [{ label: 'Total', value: money(total), bold: true }]);

  finishPages(doc);
  doc.end();
  await streamDone;
}
