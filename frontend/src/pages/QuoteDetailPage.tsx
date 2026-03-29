import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TicketSelector } from '../components/TicketSelector';
import { authFetch } from '../api/client';
import { apiBase } from '../api/config';

const QUOTES_API = `${apiBase}/api/app/quotes`;
const CUSTOMERS_API = `${apiBase}/api/app/customers`;
const ITEMS_API = `${apiBase}/api/app/items`;

interface Customer {
  id: number;
  name: string;
}

interface Item {
  id: number;
  sku: string;
  name: string;
  unit_price: number;
  taxable: boolean;
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
  const isNew = id === 'new';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customer_id: '',
    ticket_id: '',
    status: 'open',
    valid_until: '',
    notes: '',
    customer_po_number: '',
    tax_rate: '0.08',
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

  const fetchItems = useCallback(async () => {
    const res = await authFetch(ITEMS_API);
    if (!res.ok) return;
    const data = await res.json();
    setItems(data);
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
      await fetchItems();
      if (isNew) {
        setForm({ customer_id: '', ticket_id: '', status: 'open', valid_until: '', notes: '', customer_po_number: '', tax_rate: '0.08', shipping_amount: '0' });
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
  }, [id, isNew, fetchQuote, fetchCustomers, fetchItems]);

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
      setError(e instanceof Error ? e.message : 'Request failed');
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
      navigate(`/orders/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Convert failed');
    } finally {
      setConverting(false);
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
      if (field === 'item_id' && value != null) {
        const item = items.find((i) => i.id === Number(value));
        if (item) {
          next[index].unit_price = item.unit_price;
          next[index].description = item.name;
        }
      }
      return next;
    });
    if (field === 'item_id' && value != null) {
      const item = items.find((i) => i.id === Number(value));
      if (item) {
        setUnitPriceDisplay((prev) => {
          const next = [...prev];
          while (next.length <= index) next.push('');
          next[index] = String(item.unit_price);
          return next;
        });
      }
    }
  };

  const totals = recalcTotals();
  const isConverted = quote?.status === 'converted';
  const readOnly = isConverted;

  if (loading) {
    return (
      <div className="page-container">
        <p className="text-dark-text-muted py-8">Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text">
            {isNew ? 'New Quote' : `Quote ${quote?.document_number ?? id}`}
          </h1>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/quotes')} className="btn-text-action">
              Back to list
            </button>
            {!readOnly && (
              <>
                <button type="submit" form="quote-form" disabled={saving} className="btn-text-action">
                  {saving ? 'Saving…' : isNew ? 'Create quote' : 'Save quote'}
                </button>
                <button type="button" onClick={handleCancelClick} className="btn-text-action">
                  Cancel
                </button>
              </>
            )}
            {!isNew && quote && (
              <>
                <button
                  type="button"
                  onClick={async () => {
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
                  }}
                  className="btn-text-action"
                >
                  View PDF
                </button>
                <button
                  type="button"
                  onClick={async () => {
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
                  }}
                  className="btn-text-action"
                >
                  Download PDF
                </button>
              </>
            )}
            {!isNew && quote && !isConverted && (
              <button
                type="button"
                onClick={handleConvertToOrder}
                disabled={converting}
                className="btn-text-action"
              >
                {converting ? 'Converting…' : 'Convert to order'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
            {error}
          </div>
        )}

      {showCreateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-dark-text mb-2">Create quote?</h3>
            <p className="text-dark-text-muted text-sm mb-4">Are you sure you want to create this quote? This will save and open the new document.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreateConfirm(false)} className="btn-text-action">Cancel</button>
              <button type="button" onClick={handleConfirmCreate} className="btn-text-action" disabled={saving}>{saving ? 'Saving…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {showSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-dark-text mb-2">Save changes?</h3>
            <p className="text-dark-text-muted text-sm mb-4">Are you sure you want to save? This will update the quote.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowSaveConfirm(false)} className="btn-text-action">Cancel</button>
              <button type="button" onClick={handleConfirmSave} className="btn-text-action" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-dark-text mb-2">Discard changes?</h3>
            <p className="text-dark-text-muted text-sm mb-4">Are you sure you want to discard your changes? This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCancelConfirm(false)} className="btn-text-action">Keep editing</button>
              <button type="button" onClick={handleConfirmCancel} className="btn-text-action">Discard</button>
            </div>
          </div>
        </div>
      )}

        <form id="quote-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border space-y-4">
            <h2 className="text-lg font-semibold text-dark-text">Customer &amp; details</h2>
            <div className="detail-grid gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Customer *</label>
                <select
                  value={form.customer_id}
                  onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
                  className="input-field"
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
              </div>
              <div className="sm:col-span-2">
                <TicketSelector
                  value={form.ticket_id}
                  onChange={(v) => setForm((f) => ({ ...f, ticket_id: v }))}
                  customerId={form.customer_id}
                  disabled={readOnly}
                />
              </div>
              {!isNew && (
                <div>
                  <label className="block text-sm font-medium text-dark-text-muted mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="input-field max-w-[140px]"
                    disabled={readOnly}
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    {isConverted && <option value="converted">Converted</option>}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Valid until</label>
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                  className="input-field w-40"
                  disabled={readOnly}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text-muted mb-1">Customer PO</label>
              <input
                type="text"
                value={form.customer_po_number}
                onChange={(e) => setForm((f) => ({ ...f, customer_po_number: e.target.value }))}
                className="input-field"
                placeholder="N/A"
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text-muted mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="input-field min-h-[8rem]"
                rows={6}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border">
            <h2 className="text-lg font-semibold text-dark-text mb-4">Line items</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Item / Description</th>
                    <th>Qty</th>
                    <th>U/M</th>
                    <th>Unit price</th>
                    <th>Extended</th>
                    {!readOnly && <th></th>}
                  </tr>
                </thead>
                <tbody className="text-dark-text">
                  {lines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="min-w-[160px]">
                        {readOnly ? (
                          <span>{line.description || (line.item_name ?? '—')}</span>
                        ) : (
                          <>
                            <select
                              value={line.item_id ?? ''}
                              onChange={(e) => updateLine(idx, 'item_id', e.target.value ? parseInt(e.target.value, 10) : null)}
                              className="input-field w-full max-w-[200px]"
                            >
                              <option value="">— Ad-hoc —</option>
                              {items.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.sku} – {it.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => updateLine(idx, 'description', e.target.value)}
                              className="input-field mt-1 w-full"
                              placeholder="Description override"
                            />
                          </>
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
            </div>
            {!readOnly && (
              <button type="button" onClick={addLine} className="btn-text-action mt-2">
                Add line
              </button>
            )}
          </div>

          <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border">
            <h2 className="text-lg font-semibold text-dark-text mb-4">Totals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Tax rate (e.g. 0.08)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.tax_rate}
                  onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))}
                  className="input-field"
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Shipping amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.shipping_amount}
                  onChange={(e) => setForm((f) => ({ ...f, shipping_amount: e.target.value }))}
                  className="input-field"
                  disabled={readOnly}
                />
              </div>
            </div>
            <div className="mt-4 space-y-1 text-dark-text">
              <p>Subtotal: {totals.subtotal.toFixed(2)}</p>
              <p>Tax: {totals.tax_amount.toFixed(2)}</p>
              <p>Shipping: {parseFloat(form.shipping_amount || '0').toFixed(2)}</p>
              <p className="font-semibold text-lg">Total: {totals.total.toFixed(2)}</p>
            </div>
          </div>
        </form>
    </div>
  );
};

export default QuoteDetailPage;
