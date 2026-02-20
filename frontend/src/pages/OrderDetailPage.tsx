import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackArrow } from '../components/BackArrow';
import { ErrorBanner } from '../components/ErrorBanner';
import { TicketSelector } from '../components/TicketSelector';
import { authFetch } from '../api/client';

const ORDERS_API = 'http://localhost:3000/api/app/orders';
const QUOTES_API = 'http://localhost:3000/api/app/quotes';
const CUSTOMERS_API = 'http://localhost:3000/api/app/customers';
const ITEMS_API = 'http://localhost:3000/api/app/items';

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
  stock?: number;
  our_cost?: number;
}

type BillingStatus = 'pending' | 'billable' | 'invoiced';
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
  billing_status: BillingStatus;
  include_in_po?: boolean;
  po_unit_cost?: number;
}

interface OrderDetail {
  id: number;
  document_number: string;
  type: string;
  customer_id: number;
  customer_name?: string;
  ticket_id: number | null;
  status: string;
  order_date: string | null;
  notes: string | null;
  customer_po_number?: string | null;
  original_quote_id?: number | null;
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
    billing_status: string;
    item_sku?: string;
    item_name?: string;
  }>;
}

const emptyLine = (): LineRow => ({
  item_id: null,
  description: '',
  quantity: 1,
  unit_price: 0,
  unit_of_measure: 'EA',
  sort_order: 0,
  billing_status: 'pending',
  include_in_po: false,
  po_unit_cost: undefined,
});

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    docType: 'order' as 'quote' | 'order' | 'return',
    customer_id: '',
    ticket_id: '',
    status: 'open',
    valid_until: '',
    order_date: '',
    notes: '',
    customer_po_number: '',
    tax_rate: '0.08',
    shipping_amount: '0',
  });
  const [createPurchaseOrder, setCreatePurchaseOrder] = useState(false);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

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

  const fetchOrder = useCallback(async (orderId: number) => {
    const res = await authFetch(`${ORDERS_API}/${orderId}`);
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
        setIsReadOnly(false);
        setForm({
          docType: 'order',
          customer_id: '',
          ticket_id: '',
          status: 'open',
          valid_until: '',
          order_date: new Date().toISOString().slice(0, 10),
          notes: '',
          customer_po_number: '',
          tax_rate: '0.08',
          shipping_amount: '0',
        });
        setCreatePurchaseOrder(false);
        setLines([emptyLine()]);
        setOrder(null);
        setLoading(false);
        return;
      }
      const orderId = parseInt(id!, 10);
      if (isNaN(orderId)) {
        setError('Invalid order id');
        setLoading(false);
        return;
      }
      const data = await fetchOrder(orderId);
      if (cancelled) return;
      if (!data) {
        setError('Order not found');
        setLoading(false);
        return;
      }
      setOrder(data);
      setForm({
        docType: (data.type === 'quote' || data.type === 'return' ? data.type : 'order') as 'quote' | 'order' | 'return',
        customer_id: String(data.customer_id),
        ticket_id: data.ticket_id != null ? String(data.ticket_id) : '',
        status: data.status || 'open',
        valid_until: data.valid_until ?? '',
        order_date: data.order_date ?? new Date().toISOString().slice(0, 10),
        notes: data.notes ?? '',
        customer_po_number: data.customer_po_number ?? '',
        tax_rate: String(Number(data.tax_rate)),
        shipping_amount: String(Number(data.shipping_amount)),
      });
      setLines(
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
              billing_status: (l.billing_status || 'pending') as BillingStatus,
              include_in_po: false,
              po_unit_cost: undefined,
            }))
          : [emptyLine()]
      );
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, isNew, fetchOrder, fetchCustomers, fetchItems]);

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
        order_date: form.order_date || null,
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
          include_in_po: createPurchaseOrder ? l.include_in_po : undefined,
          po_unit_cost: createPurchaseOrder && l.include_in_po ? (l.po_unit_cost ?? 0) : undefined,
        })),
      };
      if (isNew) {
        if (form.docType === 'quote') {
          const quoteBody = { ...body, valid_until: form.valid_until || null };
          const res = await authFetch(QUOTES_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quoteBody),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Failed to create quote');
          navigate(`/orders/${data.id}`);
        } else {
          const res = await authFetch(ORDERS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...body,
              type: form.docType,
              create_purchase_order: createPurchaseOrder,
              lines: lines.map((l, i) => ({
                item_id: l.item_id || null,
                description: l.description || null,
                quantity: l.quantity,
                unit_price: l.unit_price,
                unit_of_measure: l.unit_of_measure || 'EA',
                sort_order: i,
                include_in_po: l.include_in_po,
                po_unit_cost: l.po_unit_cost,
              })),
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Failed to create document');
          navigate(`/orders/${data.id}`);
        }
        return;
      }
      const isQuote = order!.type === 'quote';
      const updateUrl = isQuote ? `${QUOTES_API}/${order!.id}` : `${ORDERS_API}/${order!.id}`;
      const updateBody = isQuote ? { ...body, valid_until: form.valid_until || null } : body;
      const res = await authFetch(updateUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update document');
      setOrder({ ...order!, ...data });
      if (data.lines && data.lines.length > 0) {
        setLines(data.lines.map((l: LineRow & { item_sku?: string; item_name?: string; unit_of_measure?: string | null; item_unit_of_measure?: string | null }, i: number) => ({
          id: l.id,
          item_id: l.item_id ?? null,
          item_sku: l.item_sku,
          item_name: l.item_name,
          description: l.description ?? '',
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          unit_of_measure: l.unit_of_measure ?? l.item_unit_of_measure ?? 'EA',
          sort_order: l.sort_order ?? i,
          billing_status: (l.billing_status || 'pending') as BillingStatus,
          include_in_po: false,
          po_unit_cost: undefined,
        })));
      }
      setIsReadOnly(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNew && order && !showSaveConfirm) {
      setShowSaveConfirm(true);
      return;
    }
    performSubmit();
    setShowSaveConfirm(false);
  };

  const handleConfirmSave = () => {
    setShowSaveConfirm(false);
    performSubmit();
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));
  const updateLine = (index: number, field: keyof LineRow, value: number | string | null) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'item_id' && value != null) {
        const item = items.find((i) => i.id === Number(value));
        if (item) {
          next[index].unit_price = item.unit_price;
          next[index].description = item.name;
          if (next[index].po_unit_cost === undefined && item.our_cost != null) next[index].po_unit_cost = item.our_cost;
        }
      }
      return next;
    });
  };

  const totals = recalcTotals();
  const billableCount = lines.filter((l) => l.billing_status === 'billable').length;
  const hasBillableLines = billableCount > 0;

  if (loading) {
    return (
      <div className="page-container">
          <p className="text-dark-text-muted py-8">Loading...</p>
        </div>
    );
  }

  const readOnly = !isNew && isReadOnly;

  const viewPdf = async () => {
    if (!order) return;
    try {
      const res = await authFetch(`${ORDERS_API}/${order.id}/pdf`);
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
    if (!order) return;
    try {
      const res = await authFetch(`${ORDERS_API}/${order.id}/pdf`);
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${order.document_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download PDF');
    }
  };

  return (
    <div className="page-container">
      <div className="mb-4">
        <BackArrow to="/orders" label="Back to Orders" />
      </div>

      {showSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-dark-text mb-2">Save changes?</h3>
            <p className="text-dark-text-muted text-sm mb-4">Are you sure you want to save? This will update the order.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowSaveConfirm(false)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={handleConfirmSave} className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <ErrorBanner message={error} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & details: full width (busy component) */}
        <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border space-y-4">
          <h2 className="text-lg font-semibold text-dark-text">Customer &amp; details</h2>
            <div className="detail-grid gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Type</label>
                <select
                  value={form.docType}
                  onChange={(e) => setForm((f) => ({ ...f, docType: e.target.value as 'quote' | 'order' | 'return' }))}
                  className="input-field max-w-[140px]"
                  disabled={!isNew || readOnly}
                >
                  <option value="quote">Quote</option>
                  <option value="order">Order</option>
                  <option value="return">Return</option>
                </select>
              </div>
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
              {form.docType === 'quote' && (
                <div>
                  <label className="block text-sm font-medium text-dark-text-muted mb-1">Valid until</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                    className="input-field"
                    disabled={readOnly}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Order date</label>
                <input
                  type="date"
                  value={form.order_date}
                  onChange={(e) => setForm((f) => ({ ...f, order_date: e.target.value }))}
                  className="input-field w-40"
                  disabled={readOnly}
                />
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
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text-muted mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="input-field min-h-[80px]"
                rows={2}
                disabled={readOnly}
              />
            </div>
        </div>

        {/* Line items: full width (larger component on top) */}
        <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border">
            <h2 className="text-lg font-semibold text-dark-text mb-4">Line items</h2>
            {isNew && form.docType === 'order' && (
              <label className="flex items-center gap-2 mb-4 text-dark-text">
                <input
                  type="checkbox"
                  checked={createPurchaseOrder}
                  onChange={(e) => setCreatePurchaseOrder(e.target.checked)}
                />
                Create purchase order
              </label>
            )}
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-1.5 px-2 font-medium text-dark-text-muted">SKU</th>
                    <th className="text-left py-1.5 px-2 font-medium text-dark-text-muted">Description</th>
                    <th className="text-right py-1.5 px-2 font-medium text-dark-text-muted w-16">Qty</th>
                    <th className="text-left py-1.5 px-2 font-medium text-dark-text-muted w-16">U/M</th>
                    <th className="text-right py-1.5 px-2 font-medium text-dark-text-muted w-24">Unit price</th>
                    <th className="text-right py-1.5 px-2 font-medium text-dark-text-muted w-24">Cost</th>
                    {isNew && createPurchaseOrder && <th className="py-1.5 px-2">In PO</th>}
                    {isNew && createPurchaseOrder && <th className="py-1.5 px-2">Our cost</th>}
                    <th className="w-20 py-1.5 px-2"></th>
                  </tr>
                </thead>
                <tbody className="text-dark-text">
                  {lines.map((line, idx) => (
                    <tr key={idx} className="border-t border-dark-border">
                      <td className="py-1.5 px-2 font-mono whitespace-nowrap align-top">
                        <select
                          value={line.item_id ?? ''}
                          onChange={(e) =>
                            updateLine(idx, 'item_id', e.target.value ? parseInt(e.target.value, 10) : null)
                          }
                          className="input-field py-1.5 px-2 text-sm min-h-0 w-full max-w-[140px]"
                          disabled={readOnly}
                        >
                          <option value="">— Ad-hoc —</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.sku}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2 align-top min-w-[120px]">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateLine(idx, 'description', e.target.value)}
                          className="input-field py-1.5 px-2 text-sm min-h-0 w-full"
                          placeholder="Description"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right align-top">
                        <input
                          type="number"
                          min="0.0001"
                          step="any"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="input-field py-1.5 px-2 text-sm min-h-0 w-16 text-right"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="py-1.5 px-2 align-top">
                        <select
                          value={line.unit_of_measure ?? 'EA'}
                          onChange={(e) => updateLine(idx, 'unit_of_measure', e.target.value)}
                          className="input-field py-1.5 px-2 text-sm min-h-0 w-16"
                          disabled={readOnly}
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2 text-right align-top">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="input-field py-1.5 px-2 text-sm min-h-0 w-24 text-right"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap align-top">{(line.quantity * line.unit_price).toFixed(2)}</td>
                      {isNew && createPurchaseOrder && (
                        <td className="py-1.5 px-2 align-top">
                          <input
                            type="checkbox"
                            checked={!!line.include_in_po}
                            onChange={(e) => updateLine(idx, 'include_in_po', e.target.checked)}
                          />
                        </td>
                      )}
                      {isNew && createPurchaseOrder && (
                        <td className="py-1.5 px-2 align-top">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.po_unit_cost ?? ''}
                            onChange={(e) => updateLine(idx, 'po_unit_cost', e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                            className="input-field py-1.5 px-2 text-sm min-h-0 w-20 text-right"
                            placeholder="0"
                          />
                        </td>
                      )}
                      <td className="py-1.5 px-2 align-top">
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-red-400 hover:underline text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!readOnly && (
              <button type="button" onClick={addLine} className="btn-secondary mt-2">
                Add line
              </button>
            )}
          </div>

        {/* Summary + Totals: smaller components toward bottom, horizontal row on lg */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary */}
          <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border h-fit space-y-3">
            <h2 className="text-lg font-semibold text-dark-text">Summary</h2>
            {!isNew && order && (
              <>
                <dl className="space-y-1 text-sm text-dark-text">
                  <div>
                    <dt className="text-dark-text-muted text-xs">Document #</dt>
                    <dd className="font-mono font-medium">{order.document_number}</dd>
                  </div>
                  <div>
                    <dt className="text-dark-text-muted text-xs">Total</dt>
                    <dd className="font-semibold">{Number(order.total).toFixed(2)}</dd>
                  </div>
                </dl>
                <p className="text-xs text-dark-text-muted border-t border-dark-border pt-2 mt-2">
                  Orders close when all items are invoiced. To cancel, set line prices to 0 and create a zero-balance invoice.
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  {readOnly ? (
                    <button type="button" onClick={() => setIsReadOnly(false)} className="link-primary">Edit</button>
                  ) : (
                    <button type="button" onClick={() => setIsReadOnly(true)} className="link-primary">Done editing</button>
                  )}
                  <button type="button" onClick={viewPdf} className="link-primary">View PDF</button>
                  <button type="button" onClick={downloadPdf} className="link-primary">Download PDF</button>
                  {order.original_quote_id != null && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await authFetch(`${ORDERS_API}/${order.id}/quote-pdf`);
                          if (!res.ok) throw new Error('Failed to load quote PDF');
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          window.open(url, '_blank');
                          setTimeout(() => URL.revokeObjectURL(url), 60000);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Failed to load quote PDF');
                        }
                      }}
                      className="link-primary"
                    >
                      Quote PDF
                    </button>
                  )}
                  {order.type === 'quote' && (
                    <button
                      type="button"
                      onClick={async () => {
                        setError('');
                        try {
                          const res = await authFetch(`${QUOTES_API}/${order.id}/convert-to-order`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({}),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) throw new Error(data.error || 'Failed to convert');
                          navigate(`/orders/${data.id}`);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Failed to convert to order');
                        }
                      }}
                      className="link-primary"
                    >
                      Convert to order
                    </button>
                  )}
                  {hasBillableLines && (
                    <button
                      type="button"
                      disabled={creatingInvoice}
                      onClick={async () => {
                        setError('');
                        setCreatingInvoice(true);
                        try {
                          const res = await authFetch(`${ORDERS_API}/${order.id}/invoices`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({}),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) throw new Error(data.error || 'Failed to create invoice');
                          navigate(`/invoices/${data.id}`);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Failed to create invoice');
                        } finally {
                          setCreatingInvoice(false);
                        }
                      }}
                      className="link-primary"
                    >
                      {creatingInvoice ? 'Creating…' : 'Create invoice'}
                    </button>
                  )}
                </div>
              </>
            )}
            {isNew && (
              <p className="text-sm text-dark-text-muted">Totals update as you add lines.</p>
            )}
          </div>

          {/* Totals */}
          <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border">
            <h2 className="text-lg font-semibold text-dark-text mb-3">Totals</h2>
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex justify-between items-center py-0.5">
                <label className="text-sm text-dark-text-muted">Tax rate</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.tax_rate}
                  onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))}
                  className="input-field py-1.5 px-2 text-sm min-h-0 w-20 text-right"
                  disabled={readOnly}
                />
              </div>
              <div className="flex justify-between items-center py-0.5">
                <label className="text-sm text-dark-text-muted">Shipping</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.shipping_amount}
                  onChange={(e) => setForm((f) => ({ ...f, shipping_amount: e.target.value }))}
                  className="input-field py-1.5 px-2 text-sm min-h-0 w-20 text-right"
                  disabled={readOnly}
                />
              </div>
            </div>
            <div className="border-t border-dark-border pt-2 space-y-0.5 text-sm text-dark-text">
              <div className="flex justify-between py-0.5">Subtotal <span className="font-mono">{totals.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between py-0.5">Tax <span className="font-mono">{totals.tax_amount.toFixed(2)}</span></div>
              <div className="flex justify-between py-0.5">Shipping <span className="font-mono">{parseFloat(form.shipping_amount || '0').toFixed(2)}</span></div>
              <div className="flex justify-between py-0.5 font-semibold pt-1">Total <span className="font-mono">{totals.total.toFixed(2)}</span></div>
            </div>
          </div>
        </div>

          <div className="flex flex-wrap gap-2">
            {(!readOnly || isNew) && (
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : isNew ? 'Create order' : 'Save order'}
              </button>
            )}
            <button type="button" onClick={() => navigate('/orders')} className="btn-secondary">
              Cancel
            </button>
          </div>
      </form>
    </div>
  );
};

export default OrderDetailPage;
