import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TicketSelector } from '../components/TicketSelector';
import { ItemSkuSelector, type ItemSkuOption } from '../components/ItemSkuSelector';
import { ErrorBanner } from '../components/ErrorBanner';
import FormSection from '../components/FormSection';
import StickyFormActions from '../components/StickyFormActions';
import { LineItemEditor } from '../components/LineItemEditor';
import DocumentPageShell from '../components/document/DocumentPageShell';
import DocumentHeader from '../components/document/DocumentHeader';
import DocumentToolbar from '../components/document/DocumentToolbar';
import DocumentFieldGrid, { DocumentFieldSpan } from '../components/document/DocumentFieldGrid';
import DocumentTotalsPanel from '../components/document/DocumentTotalsPanel';
import DocumentStatusBadge from '../components/document/DocumentStatusBadge';
import { useConfirm } from '../components/GlassConfirmDialog';
import { useToast } from '../context/ToastContext';
import { authFetch } from '../api/client';
import { apiBase } from '../api/config';

const QUOTES_API = `${apiBase}/api/app/quotes`;
const CUSTOMERS_API = `${apiBase}/api/app/customers`;

interface Customer {
  id: number;
  name: string;
}

const UNIT_OPTIONS = ['EA', 'DZ', 'ST', 'HR'] as const;

interface LineRow {
  id?: number;
  item_id: number | null;
  item_sku?: string;
  item_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit_of_measure?: string;
  sort_order: number;
}

interface QuoteDetail {
  id: number;
  document_number: string;
  type: string;
  customer_id: number;
  customer_name?: string;
  ticket_id: number | null;
  status: string;
  valid_until: string | null;
  notes: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  lines: Array<{
    id: number;
    item_id: number | null;
    description: string | null;
    quantity: number;
    unit_price: number;
    unit_of_measure?: string | null;
    item_unit_of_measure?: string | null;
    sort_order: number;
    item_sku?: string;
    item_name?: string;
  }>;
}

const emptyLine = (): LineRow => ({ item_id: null, description: '', quantity: 1, unit_price: 0, unit_of_measure: 'EA', sort_order: 0 });

const QuoteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();
  const isNew = id === 'new';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customer_id: '',
    ticket_id: '',
    status: 'open',
    valid_until: '',
    notes: '',
    customer_po_number: '',
    tax_rate: '0.06',
    shipping_amount: '0',
  });
  const [lines, setLines] = useState<LineRow[]>([]);
  /** Per-line quantity as string for input (allows empty during edit); synced on blur. */
  const [quantityDisplay, setQuantityDisplay] = useState<string[]>([]);
  /** Per-line unit price as string; synced on blur. */
  const [unitPriceDisplay, setUnitPriceDisplay] = useState<string[]>([]);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const fetchCustomers = useCallback(async () => {
    const res = await authFetch(CUSTOMERS_API);
    if (!res.ok) return;
    const data = await res.json();
    setCustomers(data);
  }, []);

  const fetchQuote = useCallback(async (quoteId: number) => {
    const res = await authFetch(`${QUOTES_API}/${quoteId}`);
    if (!res.ok) return null;
    return res.json();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      await fetchCustomers();
      if (isNew) {
        setForm({ customer_id: '', ticket_id: '', status: 'open', valid_until: '', notes: '', customer_po_number: '', tax_rate: '0.06', shipping_amount: '0' });
        setLines([emptyLine()]);
        setQuantityDisplay(['1']);
        setUnitPriceDisplay(['']);
        setQuote(null);
        setLoading(false);
        return;
      }
      const quoteId = parseInt(id!, 10);
      if (isNaN(quoteId)) {
        setError('Invalid quote id');
        setLoading(false);
        return;
      }
      const data = await fetchQuote(quoteId);
      if (cancelled) return;
      if (!data) {
        setError('Quote not found');
        setLoading(false);
        return;
      }
      setQuote(data);
      setForm({
        customer_id: String(data.customer_id),
        ticket_id: data.ticket_id != null ? String(data.ticket_id) : '',
        status: data.status || 'open',
        valid_until: data.valid_until ?? '',
        notes: data.notes ?? '',
        customer_po_number: data.customer_po_number ?? '',
        tax_rate: String(Number(data.tax_rate)),
        shipping_amount: String(Number(data.shipping_amount)),
      });
      const newLines: LineRow[] =
        data.lines && data.lines.length > 0
          ? data.lines.map((l: LineRow & { item_sku?: string; item_name?: string; unit_of_measure?: string | null; item_unit_of_measure?: string | null }, i: number) => ({
              id: l.id,
              item_id: l.item_id ?? null,
              item_sku: l.item_sku,
              item_name: l.item_name,
              description: l.description ?? '',
              quantity: Number(l.quantity),
              unit_price: Number(l.unit_price),
              unit_of_measure: l.unit_of_measure ?? l.item_unit_of_measure ?? 'EA',
              sort_order: l.sort_order ?? i,
            }))
          : [emptyLine()];
      setLines(newLines);
      setQuantityDisplay(newLines.map((l) => String(l.quantity)));
      setUnitPriceDisplay(newLines.map((l) => (Number.isFinite(l.unit_price) ? String(l.unit_price) : '')));
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [id, isNew, fetchQuote, fetchCustomers]);

  const recalcTotals = useCallback(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
    const taxRate = parseFloat(form.tax_rate) || 0;
    const shipping = parseFloat(form.shipping_amount) || 0;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount + shipping;
    return { subtotal, tax_amount: taxAmount, total };
  }, [lines, form.tax_rate, form.shipping_amount]);

  const performSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      const body = {
        customer_id: parseInt(form.customer_id, 10),
        ticket_id: form.ticket_id ? parseInt(form.ticket_id, 10) : null,
        status: form.status,
        valid_until: form.valid_until || null,
        notes: form.notes || null,
        customer_po_number: form.customer_po_number || null,
        tax_rate: parseFloat(form.tax_rate) || 0,
        shipping_amount: parseFloat(form.shipping_amount) || 0,
        lines: lines.map((l, i) => ({
          item_id: l.item_id || null,
          description: l.description || null,
          quantity: l.quantity,
          unit_price: l.unit_price,
          unit_of_measure: l.unit_of_measure || 'EA',
          sort_order: i,
        })),
      };
      if (isNew) {
        const res = await authFetch(QUOTES_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create quote');
        success('Quote created');
        navigate(`/quotes/${data.id}`);
        return;
      }
      const res = await authFetch(`${QUOTES_API}/${quote!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update quote');
      success('Quote saved');
      setQuote({ ...quote!, ...data });
      if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
        const newLines: LineRow[] = data.lines.map((l: LineRow & { item_sku?: string; item_name?: string; unit_of_measure?: string | null; item_unit_of_measure?: string | null }, i: number) => ({
          id: l.id,
          item_id: l.item_id ?? null,
          item_sku: l.item_sku,
          item_name: l.item_name,
          description: l.description ?? '',
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          unit_of_measure: l.unit_of_measure ?? l.item_unit_of_measure ?? 'EA',
          sort_order: l.sort_order ?? i,
        }));
        setLines(newLines);
        setQuantityDisplay(newLines.map((l) => String(l.quantity)));
        setUnitPriceDisplay(newLines.map((l) => (Number.isFinite(l.unit_price) ? String(l.unit_price) : '')));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      setError(msg);
      toastError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      setShowCreateConfirm(true);
      return;
    }
    setShowSaveConfirm(true);
  };

  const handleConfirmCreate = () => {
    setShowCreateConfirm(false);
    performSubmit();
  };

  const handleConfirmSave = () => {
    setShowSaveConfirm(false);
    performSubmit();
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = async () => {
    setShowCancelConfirm(false);
    if (isNew) {
      navigate('/quotes');
      return;
    }
    if (!quote) return;
    const res = await authFetch(`${QUOTES_API}/${quote.id}`);
    if (!res.ok) return;
    const data = await res.json();
    setQuote(data);
    setForm({
      customer_id: String(data.customer_id),
      ticket_id: data.ticket_id != null ? String(data.ticket_id) : '',
      status: data.status || 'open',
      valid_until: data.valid_until ?? '',
      notes: data.notes ?? '',
      customer_po_number: data.customer_po_number ?? '',
      tax_rate: String(Number(data.tax_rate)),
      shipping_amount: String(Number(data.shipping_amount)),
    });
    const newLines: LineRow[] =
      data.lines && data.lines.length > 0
        ? data.lines.map((l: LineRow & { item_sku?: string; item_name?: string; unit_of_measure?: string | null; item_unit_of_measure?: string | null }, i: number) => ({
            id: l.id,
            item_id: l.item_id ?? null,
            item_sku: l.item_sku,
            item_name: l.item_name,
            description: l.description ?? '',
            quantity: Number(l.quantity),
            unit_price: Number(l.unit_price),
            unit_of_measure: l.unit_of_measure ?? l.item_unit_of_measure ?? 'EA',
            sort_order: l.sort_order ?? i,
          }))
        : [emptyLine()];
    setLines(newLines);
    setQuantityDisplay(newLines.map((l) => String(l.quantity)));
    setUnitPriceDisplay(newLines.map((l) => (Number.isFinite(l.unit_price) ? String(l.unit_price) : '')));
  };

  const handleConvertToOrder = async () => {
    if (!quote || quote.status === 'converted') return;
    setError('');
    setConverting(true);
    try {
      const res = await authFetch(`${QUOTES_API}/${quote.id}/convert-to-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to convert');
      success('Converted to order');
      navigate(`/orders/${data.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Convert failed';
      setError(msg);
      toastError(msg);
    } finally {
      setConverting(false);
    }
  };

  const handleCancelQuote = async () => {
    if (!quote || quote.status === 'converted' || quote.status === 'closed') return;
    if (!(await confirm({
      message: 'Cancel this quote? It will be marked closed and can no longer be converted to an order.',
      danger: true,
      confirmLabel: 'Cancel quote',
    }))) return;
    setCancelling(true);
    setError('');
    try {
      const res = await authFetch(`${QUOTES_API}/${quote.id}/cancel`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to cancel quote');
      setQuote({ ...quote, ...data });
      setForm((f) => ({ ...f, status: data.status ?? 'closed' }));
      success('Quote cancelled');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to cancel quote';
      setError(msg);
      toastError(msg);
    } finally {
      setCancelling(false);
    }
  };

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
    setQuantityDisplay((prev) => [...prev, '1']);
    setUnitPriceDisplay((prev) => [...prev, '']);
  };
  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
    setQuantityDisplay((prev) => prev.filter((_, i) => i !== index));
    setUnitPriceDisplay((prev) => prev.filter((_, i) => i !== index));
  };
  const updateLine = (index: number, field: keyof LineRow, value: number | string | null) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const applyItemToLine = (index: number, item: ItemSkuOption | null) => {
    setLines((prev) => {
      const next = [...prev];
      if (!item) {
        next[index] = {
          ...next[index],
          item_id: null,
          item_sku: undefined,
          item_name: undefined,
        };
        return next;
      }
      next[index] = {
        ...next[index],
        item_id: item.id,
        item_sku: item.sku,
        item_name: item.name,
        unit_price: Number(item.unit_price),
        description: item.name,
        unit_of_measure: item.unit_of_measure || next[index].unit_of_measure || 'EA',
      };
      return next;
    });
    if (item) {
      setUnitPriceDisplay((prev) => {
        const next = [...prev];
        while (next.length <= index) next.push('');
        next[index] = String(item.unit_price);
        return next;
      });
    }
  };

  const totals = recalcTotals();
  const isConverted = quote?.status === 'converted';
  const isClosed = quote?.status === 'closed';
  const readOnly = isConverted || isClosed;

  const viewPdf = async () => {
    if (!quote) return;
    try {
      const res = await authFetch(`${QUOTES_API}/${quote.id}/pdf`);
      if (!res.ok) throw new Error('Failed to load PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load PDF');
    }
  };

  const downloadPdf = async () => {
    if (!quote) return;
    try {
      const res = await authFetch(`${QUOTES_API}/${quote.id}/pdf`);
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quote-${quote.document_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download PDF');
    }
  };

  const primaryActions = (
    <StickyFormActions>
      {!readOnly && (
        <>
          <button type="submit" form="quote-form" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : isNew ? 'Create quote' : 'Save'}
          </button>
          <button type="button" onClick={handleCancelClick} className="btn-secondary">
            Cancel
          </button>
        </>
      )}
    </StickyFormActions>
  );

  if (loading) {
    return (
      <div className="page-container">
        <p className="text-text-muted py-8">Loading...</p>
      </div>
    );
  }

  return (
    <DocumentPageShell>
      <DocumentHeader
        backTo="/quotes"
        backLabel="Back to Quotes"
        title={isNew ? 'New Quote' : `Quote ${quote?.document_number ?? id}`}
        subtitle={!isNew && quote?.customer_name ? quote.customer_name : undefined}
        status={!isNew && quote ? <DocumentStatusBadge status={quote.status} /> : undefined}
        actions={primaryActions}
      />

      {!isNew && quote && (
        <DocumentToolbar>
          <button type="button" onClick={viewPdf} className="btn-doc-action text-sm">
            View PDF
          </button>
          <button type="button" onClick={downloadPdf} className="btn-doc-action text-sm">
            Download PDF
          </button>
          {!isConverted && quote.status !== 'closed' && (
            <>
              <button
                type="button"
                onClick={handleConvertToOrder}
                disabled={converting}
                className="btn-doc-action text-sm"
              >
                {converting ? 'Converting…' : 'Convert to order'}
              </button>
              <button
                type="button"
                onClick={handleCancelQuote}
                disabled={cancelling}
                className="btn-doc-danger text-sm"
              >
                {cancelling ? 'Cancelling…' : 'Cancel quote'}
              </button>
            </>
          )}
        </DocumentToolbar>
      )}

      <ErrorBanner message={error} />

      {showCreateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-text mb-2">Create quote?</h3>
            <p className="text-text-muted text-sm mb-4">Are you sure you want to create this quote? This will save and open the new document.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreateConfirm(false)} className="btn-text-action">Cancel</button>
              <button type="button" onClick={handleConfirmCreate} className="btn-text-action" disabled={saving}>{saving ? 'Saving…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {showSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-text mb-2">Save changes?</h3>
            <p className="text-text-muted text-sm mb-4">Are you sure you want to save? This will update the quote.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowSaveConfirm(false)} className="btn-text-action">Cancel</button>
              <button type="button" onClick={handleConfirmSave} className="btn-text-action" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-text mb-2">Discard changes?</h3>
            <p className="text-text-muted text-sm mb-4">Are you sure you want to discard your changes? This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCancelConfirm(false)} className="btn-text-action">Keep editing</button>
              <button type="button" onClick={handleConfirmCancel} className="btn-text-action">Discard</button>
            </div>
          </div>
        </div>
      )}

        <form id="quote-form" onSubmit={handleSubmit} className="space-y-4">
          <FormSection title="Customer & details" variant="glass">
            <DocumentFieldGrid>
              <DocumentFieldSpan span={8}>
                <label className="block text-sm font-medium text-text-muted mb-1">Customer *</label>
                <select
                  value={form.customer_id}
                  onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
                  className="input-field w-full"
                  required
                  disabled={readOnly}
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </DocumentFieldSpan>
              <DocumentFieldSpan span={8}>
                <TicketSelector
                  value={form.ticket_id}
                  onChange={(v) => setForm((f) => ({ ...f, ticket_id: v }))}
                  customerId={form.customer_id}
                  disabled={readOnly}
                />
              </DocumentFieldSpan>
              {!isNew && (
                <DocumentFieldSpan span={4}>
                  <label className="block text-sm font-medium text-text-muted mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="input-field w-full"
                    disabled={readOnly}
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    {isConverted && <option value="converted">Converted</option>}
                  </select>
                </DocumentFieldSpan>
              )}
              <DocumentFieldSpan span={4}>
                <label className="block text-sm font-medium text-text-muted mb-1">Valid until</label>
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                  className="input-field w-full"
                  disabled={readOnly}
                />
              </DocumentFieldSpan>
              <DocumentFieldSpan span={4}>
                <label className="block text-sm font-medium text-text-muted mb-1">Customer PO</label>
                <input
                  type="text"
                  value={form.customer_po_number}
                  onChange={(e) => setForm((f) => ({ ...f, customer_po_number: e.target.value }))}
                  className="input-field w-full"
                  placeholder="N/A"
                  disabled={readOnly}
                />
              </DocumentFieldSpan>
              <DocumentFieldSpan span={12}>
                <label className="block text-sm font-medium text-text-muted mb-1">Quote Summary</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input-field min-h-[8rem] w-full"
                  rows={6}
                  disabled={readOnly}
                  placeholder="Shown on the PDF above the line items"
                />
              </DocumentFieldSpan>
            </DocumentFieldGrid>
          </FormSection>

          <FormSection title="Line items" variant="glass">
            <LineItemEditor
              table={
            <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>U/M</th>
                    <th>Unit price</th>
                    <th>Extended</th>
                    {!readOnly && <th></th>}
                  </tr>
                </thead>
                <tbody className="text-text">
                  {lines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="min-w-[120px] align-top">
                        {readOnly ? (
                          <span className="font-mono text-sm">{line.item_sku || '—'}</span>
                        ) : (
                          <ItemSkuSelector
                            itemId={line.item_id}
                            sku={line.item_sku}
                            onSelect={(item) => applyItemToLine(idx, item)}
                            className="w-full max-w-[160px]"
                            inputClassName="w-full"
                          />
                        )}
                      </td>
                      <td className="min-w-[160px] align-top">
                        {readOnly ? (
                          <span>{line.description || (line.item_name ?? '—')}</span>
                        ) : (
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => updateLine(idx, 'description', e.target.value)}
                            className="input-field w-full"
                            placeholder="Description"
                          />
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={quantityDisplay[idx] ?? String(line.quantity)}
                          onChange={(e) => {
                            setQuantityDisplay((prev) => {
                              const next = prev.length === lines.length ? [...prev] : lines.map((l) => String(l.quantity));
                              if (idx >= next.length) return next;
                              next[idx] = e.target.value;
                              return next;
                            });
                          }}
                          onBlur={() => {
                            const raw = quantityDisplay[idx] ?? String(line.quantity);
                            const parsed = parseFloat(raw);
                            const num = Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
                            updateLine(idx, 'quantity', num);
                            setQuantityDisplay((prev) => {
                              const next = [...prev];
                              while (next.length <= idx) next.push(String(line.quantity));
                              next[idx] = String(num);
                              return next;
                            });
                          }}
                          className="input-field w-20"
                          disabled={readOnly}
                        />
                      </td>
                      <td>
                        <select
                          value={line.unit_of_measure ?? 'EA'}
                          onChange={(e) => updateLine(idx, 'unit_of_measure', e.target.value)}
                          className="input-field w-16"
                          disabled={readOnly}
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={unitPriceDisplay[idx] ?? String(line.unit_price)}
                          onChange={(e) => {
                            setUnitPriceDisplay((prev) => {
                              const next = [...prev];
                              while (next.length <= idx) next.push(String(lines[idx]?.unit_price ?? ''));
                              next[idx] = e.target.value;
                              return next;
                            });
                          }}
                          onBlur={() => {
                            const raw = (unitPriceDisplay[idx] ?? String(line.unit_price)).trim();
                            const parsed = parseFloat(raw);
                            const num = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
                            updateLine(idx, 'unit_price', num);
                            setUnitPriceDisplay((prev) => {
                              const next = [...prev];
                              while (next.length <= idx) next.push(String(line.unit_price));
                              next[idx] = String(num);
                              return next;
                            });
                          }}
                          className="input-field w-24"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="whitespace-nowrap">{(line.quantity * line.unit_price).toFixed(2)}</td>
                      {!readOnly && (
                        <td>
                          <button type="button" onClick={() => removeLine(idx)} className="btn-text-action text-sm text-red-400">
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              }
            />
            {!readOnly && (
              <button type="button" onClick={addLine} className="btn-secondary w-full md:w-auto mt-3 min-h-[44px]">
                Add line
              </button>
            )}
          </FormSection>

          <FormSection title="Totals" variant="glass">
            <DocumentTotalsPanel
              rows={[
                { label: 'Subtotal', value: totals.subtotal.toFixed(2) },
                { label: 'Tax', value: totals.tax_amount.toFixed(2) },
                { label: 'Shipping', value: parseFloat(form.shipping_amount || '0').toFixed(2) },
                { label: 'Total', value: totals.total.toFixed(2), emphasis: true },
              ]}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Tax rate (e.g. 0.06)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={form.tax_rate}
                    onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))}
                    className="input-field w-full"
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Shipping amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.shipping_amount}
                    onChange={(e) => setForm((f) => ({ ...f, shipping_amount: e.target.value }))}
                    className="input-field w-full"
                    disabled={readOnly}
                  />
                </div>
              </div>
            </DocumentTotalsPanel>
          </FormSection>
        </form>
    </DocumentPageShell>
  );
};

export default QuoteDetailPage;
