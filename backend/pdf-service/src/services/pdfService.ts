import PDFDocument from 'pdfkit';
import { Response } from 'express';

const COMPANY_NAME = process.env.COMPANY_NAME || 'Your Company';
const COMPANY_LOGO_URL = process.env.COMPANY_LOGO_URL || '';
const COMPANY_ADDRESS = [
  process.env.COMPANY_ADDRESS_LINE1 || '123 Main Street',
  process.env.COMPANY_CITY_STATE_ZIP || 'City ST 00000',
];

/** Mostly B&W; teal / purple only as accents. */
const COLOR = {
  primary: '#22d4cc',
  secondary: '#8b58c3',
  ink: '#111111',
  muted: '#555555',
  line: '#cccccc',
  lightGray: '#f5f5f5',
  white: '#ffffff',
};

/** US Letter — required for #10 window envelope fold. */
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN = 36;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
/** Leave room for footer without forcing early page breaks. */
const CONTENT_BOTTOM = PAGE_HEIGHT - 36;

/**
 * #10 window envelope address zone (points from page top-left).
 * Approx: left 0.75", top 2.05", width 3.5", height 1.15"
 */
const WINDOW = {
  x: 54,
  y: 148,
  width: 252,
  height: 82,
};

/** Body starts just below the first tri-fold / window panel. */
const FOLD_CONTENT_START = 258;

type PDFDoc = InstanceType<typeof PDFDocument>;

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

function summaryLabelForType(type: string): string {
  const t = (type || '').toLowerCase();
  if (t === 'quote') return 'Quote Summary';
  if (t === 'invoice') return 'Invoice Summary';
  if (t === 'return') return 'Return Summary';
  return 'Order Summary';
}

function docTitleForType(type: string): string {
  const t = (type || '').toLowerCase();
  if (t === 'quote') return 'QUOTE';
  if (t === 'invoice') return 'INVOICE';
  if (t === 'return') return 'RETURN';
  if (t === 'purchase_order' || t === 'po') return 'PURCHASE ORDER';
  return 'ORDER';
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

/** Brand header — black type, thin teal accent bar. */
async function drawBrandHeader(doc: PDFDoc, docTypeLabel: string): Promise<number> {
  doc.save();
  doc.rect(0, 0, PAGE_WIDTH, 3).fill(COLOR.primary);
  doc.rect(0, 3, PAGE_WIDTH, 1).fill(COLOR.secondary);
  doc.restore();

  let y = 16;

  doc.fillColor(COLOR.ink).font('Helvetica-Bold').fontSize(13).text(COMPANY_NAME, PAGE_MARGIN, y);
  y += 15;

  if (COMPANY_LOGO_URL) {
    try {
      const res = await fetch(COMPANY_LOGO_URL);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        doc.image(Buffer.from(buf), PAGE_MARGIN, y - 2, { width: 48 });
        y += 44;
      }
    } catch {
      /* ignore */
    }
  }

  doc.fillColor(COLOR.muted).font('Helvetica').fontSize(8);
  for (const line of COMPANY_ADDRESS) {
    doc.text(line, PAGE_MARGIN, y, { lineBreak: false });
    y += 10;
  }

  // Doc type in black; small teal underline accent
  const titleX = PAGE_MARGIN;
  const titleW = CONTENT_WIDTH;
  doc.fillColor(COLOR.ink)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text(docTypeLabel, titleX, 16, { width: titleW, align: 'right', lineBreak: false });
  doc.save();
  doc.rect(PAGE_WIDTH - PAGE_MARGIN - 72, 36, 72, 1.5).fill(COLOR.primary);
  doc.restore();

  return Math.max(y + 4, 58);
}

/** Document meta block (number, dates), right-aligned. */
function drawDocMeta(
  doc: PDFDoc,
  y: number,
  lines: Array<{ label: string; value: string }>
): number {
  const blockW = 200;
  const x = PAGE_WIDTH - PAGE_MARGIN - blockW;
  let metaY = y;
  doc.fontSize(8);
  for (const { label, value } of lines) {
    doc.fillColor(COLOR.muted).font('Helvetica').text(label, x, metaY, {
      width: 88,
      align: 'left',
      lineBreak: false,
    });
    doc.fillColor(COLOR.ink).font('Helvetica-Bold').text(value, x + 86, metaY, {
      width: 114,
      align: 'right',
      lineBreak: false,
    });
    metaY += 11;
  }
  return metaY;
}

/**
 * Draw recipient in the #10 window address zone.
 * Returns FOLD_CONTENT_START so body begins below the fold panel.
 */
function drawWindowRecipient(
  doc: PDFDoc,
  customerName: string,
  contactName?: string | null,
  addressStr?: string | null
): number {
  let y = WINDOW.y;
  const maxY = WINDOW.y + WINDOW.height - 2;

  doc.fillColor(COLOR.ink).font('Helvetica-Bold').fontSize(10).text(customerName, WINDOW.x, y, {
    width: WINDOW.width,
    lineBreak: false,
  });
  y += 12;

  if (contactName && contactName.trim() && y + 11 <= maxY) {
    doc.fillColor(COLOR.ink).font('Helvetica').fontSize(9).text(contactName.trim(), WINDOW.x, y, {
      width: WINDOW.width,
      lineBreak: false,
    });
    y += 11;
  }

  if (addressStr && addressStr.trim()) {
    const [street, cityStateZip] = splitAddressLines(addressStr);
    doc.fillColor(COLOR.ink).font('Helvetica').fontSize(9);
    if (street && y + 10 <= maxY) {
      doc.text(street, WINDOW.x, y, { width: WINDOW.width, lineBreak: false });
      y += 10;
    }
    if (cityStateZip && y + 10 <= maxY) {
      doc.text(cityStateZip, WINDOW.x, y, { width: WINDOW.width, lineBreak: false });
    }
  }

  return FOLD_CONTENT_START;
}

/** Summary — before line items; compact, B&W with teal accent bar. */
function drawSummaryBlock(doc: PDFDoc, y: number, type: string, notes?: string | null): number {
  if (!notes || !notes.trim()) return y;

  const label = summaryLabelForType(type);
  const padX = 8;
  const textW = CONTENT_WIDTH - padX * 2 - 4;
  doc.font('Helvetica').fontSize(8);
  const textH = doc.heightOfString(notes.trim(), { width: textW });
  const boxH = textH + 20;

  doc.save();
  doc.rect(PAGE_MARGIN, y, 2.5, boxH).fill(COLOR.primary);
  doc.restore();

  doc.fillColor(COLOR.ink).font('Helvetica-Bold').fontSize(8).text(label, PAGE_MARGIN + padX + 2, y + 3, {
    width: textW,
    lineBreak: false,
  });
  doc.fillColor(COLOR.ink).font('Helvetica').fontSize(8).text(notes.trim(), PAGE_MARGIN + padX + 2, y + 14, {
    width: textW,
  });

  return y + boxH + 8;
}

const TABLE_CELL_PAD_X = 4;
const TABLE_CELL_PAD_TOP = 4;
const TABLE_CELL_PAD_BOTTOM = 4;
const TABLE_ROW_MIN = 16;
const TABLE_HEADER_MIN = 18;

function cellInnerWidth(colWidth: number): number {
  return Math.max(1, colWidth - 2 * TABLE_CELL_PAD_X);
}

function ensureSpace(doc: PDFDoc, y: number, needed: number): number {
  if (y + needed > CONTENT_BOTTOM) {
    doc.addPage();
    doc.save();
    doc.rect(0, 0, PAGE_WIDTH, 2).fill(COLOR.primary);
    doc.restore();
    return PAGE_MARGIN + 8;
  }
  return y;
}

/** Compact table: black header rule, gray zebra, teal header accent line. */
function drawCompactTable(
  doc: PDFDoc,
  startY: number,
  headers: string[],
  rows: (string | number)[][],
  colWidths: number[],
  alignRightFrom = 1
): number {
  const left = PAGE_MARGIN;
  let y = startY;

  doc.fontSize(8).font('Helvetica-Bold');
  let headerHeight = TABLE_HEADER_MIN;
  for (let i = 0; i < headers.length; i++) {
    const innerW = cellInnerWidth(colWidths[i]);
    const textH = doc.heightOfString(String(headers[i]), { width: innerW });
    headerHeight = Math.max(headerHeight, textH + TABLE_CELL_PAD_TOP + TABLE_CELL_PAD_BOTTOM);
  }

  // Only reserve space for the header itself (not a speculative lookahead).
  y = ensureSpace(doc, y, headerHeight + 2);

  doc.save();
  doc.rect(left, y, CONTENT_WIDTH, headerHeight).fill(COLOR.ink);
  doc.rect(left, y, CONTENT_WIDTH, 1.5).fill(COLOR.primary);
  doc.restore();

  let x = left;
  doc.fillColor(COLOR.white);
  for (let i = 0; i < headers.length; i++) {
    const innerW = cellInnerWidth(colWidths[i]);
    const align = i >= alignRightFrom ? 'right' : 'left';
    doc.text(String(headers[i]), x + TABLE_CELL_PAD_X, y + TABLE_CELL_PAD_TOP, {
      width: innerW,
      align,
      lineBreak: false,
    });
    x += colWidths[i];
  }
  y += headerHeight;

  doc.font('Helvetica').fontSize(8);
  let rowIndex = 0;
  for (const row of rows) {
    let rowHeight = TABLE_ROW_MIN;
    for (let i = 0; i < row.length; i++) {
      const innerW = cellInnerWidth(colWidths[i]);
      const textH = doc.heightOfString(String(row[i]), { width: innerW });
      rowHeight = Math.max(rowHeight, textH + TABLE_CELL_PAD_TOP + TABLE_CELL_PAD_BOTTOM);
    }

    y = ensureSpace(doc, y, rowHeight);

    if (rowIndex % 2 === 1) {
      doc.save();
      doc.rect(left, y, CONTENT_WIDTH, rowHeight).fill(COLOR.lightGray);
      doc.restore();
    }

    doc.save();
    doc
      .moveTo(left, y + rowHeight)
      .lineTo(left + CONTENT_WIDTH, y + rowHeight)
      .strokeColor(COLOR.line)
      .lineWidth(0.4)
      .stroke();
    doc.restore();

    x = left;
    doc.fillColor(COLOR.ink);
    for (let i = 0; i < row.length; i++) {
      const innerW = cellInnerWidth(colWidths[i]);
      const align = i >= alignRightFrom ? 'right' : 'left';
      doc.text(String(row[i]), x + TABLE_CELL_PAD_X, y + TABLE_CELL_PAD_TOP, {
        width: innerW,
        align,
      });
      x += colWidths[i];
    }
    y += rowHeight;
    rowIndex += 1;
  }
  return y;
}

function drawTotals(
  doc: PDFDoc,
  y: number,
  rows: Array<{ label: string; value: string; bold?: boolean; accent?: boolean }>
): number {
  const boxW = 190;
  const boxX = PAGE_WIDTH - PAGE_MARGIN - boxW;
  const rowH = 13;
  const boxH = rows.length * rowH + 6;

  y = ensureSpace(doc, y, boxH);

  let ty = y;
  for (const row of rows) {
    const isAccent = row.accent || row.bold;
    doc.fillColor(COLOR.muted)
      .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(8)
      .text(row.label, boxX, ty, { width: 90, lineBreak: false });
    doc
      .fillColor(isAccent ? COLOR.ink : COLOR.ink)
      .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(8)
      .text(row.value, boxX, ty, { width: boxW, align: 'right', lineBreak: false });
    if (row.bold) {
      doc.save();
      doc
        .moveTo(boxX, ty - 2)
        .lineTo(boxX + boxW, ty - 2)
        .strokeColor(COLOR.primary)
        .lineWidth(1)
        .stroke();
      doc.restore();
    }
    ty += rowH;
  }
  return ty + 6;
}

function drawFooter(doc: PDFDoc, pageLabel: string): void {
  const footerY = PAGE_HEIGHT - 22;
  doc.save();
  doc
    .moveTo(PAGE_MARGIN, footerY - 6)
    .lineTo(PAGE_WIDTH - PAGE_MARGIN, footerY - 6)
    .strokeColor(COLOR.line)
    .lineWidth(0.5)
    .stroke();
  doc
    .fillColor(COLOR.muted)
    .font('Helvetica')
    .fontSize(7)
    .text(`${COMPANY_NAME}  ·  ${pageLabel}`, PAGE_MARGIN, footerY, {
      width: CONTENT_WIDTH,
      align: 'center',
      lineBreak: false,
    });
  doc.restore();
}

function money(n: number): string {
  return Number(n).toFixed(2);
}

async function renderQuoteOrderInvoice(data: DocData, res: Response, title: string): Promise<void> {
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'LETTER', autoFirstPage: true, bufferPages: true });
  const { streamDone } = setupDoc(doc, title);
  doc.pipe(res);

  const typeKey = (data.type || title).toLowerCase();
  await drawBrandHeader(doc, docTitleForType(typeKey.includes('invoice') ? 'invoice' : typeKey));

  const metaLines: Array<{ label: string; value: string }> = [];
  if (typeKey.includes('invoice')) {
    metaLines.push({ label: 'Invoice #', value: data.document_number });
    metaLines.push({ label: 'Invoice date', value: formatDatePdf(data.invoice_date) });
    metaLines.push({ label: 'Due date', value: formatDatePdf(data.due_date) });
  } else if (typeKey.includes('quote')) {
    metaLines.push({ label: 'Quote #', value: data.document_number });
    metaLines.push({ label: 'Valid through', value: formatDatePdf(data.valid_until) });
  } else if (typeKey.includes('return')) {
    metaLines.push({ label: 'Return #', value: data.document_number });
    metaLines.push({ label: 'Date', value: formatDatePdf(data.order_date) });
  } else {
    metaLines.push({ label: 'Order #', value: data.document_number });
    metaLines.push({ label: 'Order date', value: formatDatePdf(data.order_date) });
  }
  if (data.customer_po_number) {
    metaLines.push({ label: 'Customer PO', value: data.customer_po_number });
  }

  drawDocMeta(doc, 58, metaLines);

  let y = drawWindowRecipient(doc, data.customer_name, data.contact_name, data.customer_address);

  // Thin rule under fold panel
  doc.save();
  doc
    .moveTo(PAGE_MARGIN, y - 8)
    .lineTo(PAGE_WIDTH - PAGE_MARGIN, y - 8)
    .strokeColor(COLOR.line)
    .lineWidth(0.6)
    .stroke();
  doc.restore();

  y = drawSummaryBlock(doc, y, typeKey.includes('invoice') ? 'invoice' : typeKey, data.notes);

  const colWidths = [220, 34, 50, 72, 76];
  y = drawCompactTable(
    doc,
    y,
    ['Description', 'U/M', 'Qty', 'Unit price', 'Extended'],
    data.lines.map((l) => [
      l.description ?? '—',
      l.unit_of_measure ?? 'EA',
      Number(l.quantity),
      money(Number(l.unit_price)),
      money(Number(l.quantity) * Number(l.unit_price)),
    ]),
    colWidths,
    2
  );

  y += 8;

  const totalRows: Array<{ label: string; value: string; bold?: boolean; accent?: boolean }> = [
    { label: 'Subtotal', value: money(Number(data.subtotal)) },
    {
      label: typeKey.includes('invoice') ? 'Tax' : `Tax (${(Number(data.tax_rate) * 100).toFixed(2)}%)`,
      value: money(Number(data.tax_amount)),
    },
    { label: 'Shipping', value: money(Number(data.shipping_amount)) },
    { label: 'Total', value: money(Number(data.total)), bold: true, accent: true },
  ];

  if (typeKey.includes('invoice')) {
    const paid = data.amount_paid ?? 0;
    totalRows.push({ label: 'Amount paid', value: money(Number(paid)) });
    totalRows.push({
      label: 'Balance due',
      value: money(Number(data.total) - Number(paid)),
      bold: true,
      accent: true,
    });
  }

  y = drawTotals(doc, y, totalRows);

  if (data.payments && data.payments.length > 0) {
    y = ensureSpace(doc, y, 28 + data.payments.length * 11);
    doc.fillColor(COLOR.ink).font('Helvetica-Bold').fontSize(8).text('Payments', PAGE_MARGIN, y, {
      lineBreak: false,
    });
    y += 12;
    doc.fillColor(COLOR.ink).font('Helvetica').fontSize(8);
    for (const p of data.payments) {
      doc.text(
        `${formatDatePdf(p.paid_at)}    ${money(Number(p.amount))}    ${p.payment_method ?? '—'}`,
        PAGE_MARGIN,
        y,
        { width: CONTENT_WIDTH, lineBreak: false }
      );
      y += 11;
    }
  }

  // Footer on every page
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    drawFooter(doc, title);
  }

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
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'LETTER', autoFirstPage: true, bufferPages: true });
  const { streamDone } = setupDoc(doc, 'Purchase Order');
  doc.pipe(res);

  await drawBrandHeader(doc, 'PURCHASE ORDER');

  drawDocMeta(doc, 58, [
    { label: 'PO #', value: data.po_number },
    { label: 'Order', value: data.order_document_number },
    { label: 'Date', value: data.created_at ? formatDatePdf(data.created_at) : '—' },
  ]);

  let y = drawWindowRecipient(doc, data.customer_name, data.contact_name, data.customer_address);

  doc.save();
  doc
    .moveTo(PAGE_MARGIN, y - 8)
    .lineTo(PAGE_WIDTH - PAGE_MARGIN, y - 8)
    .strokeColor(COLOR.line)
    .lineWidth(0.6)
    .stroke();
  doc.restore();

  const colWidths = [250, 70, 90, 92];
  y = drawCompactTable(
    doc,
    y,
    ['Description', 'Qty', 'Unit cost', 'Extended'],
    data.lines.map((l) => [
      l.description ?? l.item_name ?? l.item_sku ?? '—',
      Number(l.quantity),
      money(Number(l.unit_cost)),
      money(Number(l.quantity) * Number(l.unit_cost)),
    ]),
    colWidths,
    1
  );

  const total = data.lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unit_cost), 0);
  y += 8;
  drawTotals(doc, y, [{ label: 'Total', value: money(total), bold: true, accent: true }]);

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    drawFooter(doc, 'Purchase Order');
  }

  doc.end();
  await streamDone;
}
