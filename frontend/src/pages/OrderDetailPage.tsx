import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';

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
}

type BillingStatus = 'pending' | 'billable' | 'invoiced';

interface LineRow {
  id?: number;
  item_id: number | null;
  item_sku?: string;
  item_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
  billing_status: BillingStatus;
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
  sort_order: 0,
  billing_status: 'pending',
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
    status: 'draft',
    valid_until: '',
    order_date: '',
    notes: '',
    tax_rate: '0.08',
    shipping_amount: '0',
  });
  const [lines, setLines] = useState<LineRow[]>([]);

  const getToken = () => localStorage.getItem('token');

  const fetchCustomers = useCallback(async () => {
    const res = await fetch(CUSTOMERS_API, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return;
    const data = await res.json();
    setCustomers(data);
  }, []);

  const fetchItems = useCallback(async () => {
    const res = await fetch(ITEMS_API, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return;
    const data = await res.json();
    setItems(data);
  }, []);

  const fetchOrder = useCallback(async (orderId: number) => {
    const res = await fetch(`${ORDERS_API}/${orderId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
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
        setForm({
          docType: 'order',
          customer_id: '',
          ticket_id: '',
          status: 'draft',
          valid_until: '',
          order_date: new Date().toISOString().slice(0, 10),
          notes: '',
          tax_rate: '0.08',
          shipping_amount: '0',
        });
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
        status: data.status || 'draft',
        valid_until: data.valid_until ?? '',
        order_date: data.order_date ?? new Date().toISOString().slice(0, 10),
        notes: data.notes ?? '',
        tax_rate: String(Number(data.tax_rate)),
        shipping_amount: String(Number(data.shipping_amount)),
      });
      setLines(
        data.lines && data.lines.length > 0
          ? data.lines.map((l: LineRow & { item_sku?: string; item_name?: string }, i: number) => ({
              id: l.id,
              item_id: l.item_id ?? null,
              item_sku: l.item_sku,
              item_name: l.item_name,
              description: l.description ?? '',
              quantity: Number(l.quantity),
              unit_price: Number(l.unit_price),
              sort_order: l.sort_order ?? i,
              billing_status: (l.billing_status || 'pending') as BillingStatus,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        customer_id: parseInt(form.customer_id, 10),
        ticket_id: form.ticket_id ? parseInt(form.ticket_id, 10) : null,
        status: form.status,
        order_date: form.order_date || null,
        notes: form.notes || null,
        tax_rate: parseFloat(form.tax_rate) || 0,
        shipping_amount: parseFloat(form.shipping_amount) || 0,
        lines: lines.map((l, i) => ({
          item_id: l.item_id || null,
          description: l.description || null,
          quantity: l.quantity,
          unit_price: l.unit_price,
          sort_order: i,
          billing_status: l.billing_status,
        })),
      };
      if (isNew) {
        if (form.docType === 'quote') {
          const quoteBody = { ...body, valid_until: form.valid_until || null };
          const res = await fetch(QUOTES_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify(quoteBody),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Failed to create quote');
          navigate(`/orders/${data.id}`);
        } else {
          const res = await fetch(ORDERS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ ...body, type: form.docType }),
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
      const res = await fetch(updateUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(updateBody),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update document');
      setOrder({ ...order!, ...data });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSaving(false);
    }
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

  const docTypeTitle = isNew ? 'Order' : (order?.type === 'quote' ? 'Quote' : order?.type === 'return' ? 'Return' : 'Order');
  const pageTitle = isNew ? `New ${docTypeTitle}` : `${docTypeTitle} ${order?.document_number ?? id}`;

  return (
    <div className="page-container">
        <PageHeader title={pageTitle} backTo="/orders" backLabel="Orders" />
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 mb-6">
          {/* Summary sidebar */}
          <div className="p-4 rounded-xl bg-dark-surface border border-dark-border space-y-4 h-fit">
              <h2 className="text-lg font-semibold text-dark-text">Summary</h2>
              {!isNew && order && (
                <dl className="compact-grid text-sm text-dark-text">
                  <div className="short-field">
                    <dt className="text-dark-text-muted text-xs">Document #</dt>
                    <dd className="font-mono">{order.document_number}</dd>
                  </div>
                  <div className="short-field-amount">
                    <dt className="text-dark-text-muted text-xs">Total</dt>
                    <dd className="font-semibold">{Number(order.total).toFixed(2)}</dd>
                  </div>
                </dl>
              )}
              {isNew && (
                <p className="text-sm text-dark-text-muted">Totals update as you add lines.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => navigate('/orders')} className="btn-secondary w-full sm:w-auto">
                  Back to list
                </button>
            {!isNew && order && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(`${ORDERS_API}/${order.id}/pdf`, { headers: { Authorization: `Bearer ${getToken()}` } });
                      if (!res.ok) throw new Error('Failed to load PDF');
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                      setTimeout(() => URL.revokeObjectURL(url), 60000);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Failed to load PDF');
                    }
                  }}
                  className="btn-secondary"
                >
                  View PDF
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(`${ORDERS_API}/${order.id}/pdf`, { headers: { Authorization: `Bearer ${getToken()}` } });
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
                  }}
                  className="btn-primary"
                >
                  Download PDF
                </button>
              </>
            )}
            {!isNew && order?.type === 'quote' && (
              <button
                type="button"
                onClick={async () => {
                  setError('');
                  try {
                    const res = await fetch(`${QUOTES_API}/${order.id}/convert-to-order`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                      body: JSON.stringify({}),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || 'Failed to convert');
                    navigate(`/orders/${data.id}`);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to convert to order');
                  }
                }}
                className="btn-primary w-full sm:w-auto"
              >
                Convert to order
              </button>
            )}
            {!isNew && order && hasBillableLines && (
              <button
                type="button"
                disabled={creatingInvoice}
                onClick={async () => {
                  setError('');
                  setCreatingInvoice(true);
                  try {
                    const res = await fetch(`${ORDERS_API}/${order.id}/invoices`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
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
                className="btn-primary"
              >
                {creatingInvoice ? 'Creating…' : 'Create invoice'}
              </button>
            )}
              </div>
            </div>
        </div>

        <div>
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border space-y-4">
            <h2 className="text-lg font-semibold text-dark-text">Customer &amp; details</h2>
            <div className="detail-grid gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Type</label>
                <select
                  value={form.docType}
                  onChange={(e) => setForm((f) => ({ ...f, docType: e.target.value as 'quote' | 'order' | 'return' }))}
                  className="input-field max-w-[140px]"
                  disabled={!isNew}
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
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Ticket ID</label>
                <input
                  type="number"
                  value={form.ticket_id}
                  onChange={(e) => setForm((f) => ({ ...f, ticket_id: e.target.value }))}
                  className="input-field w-32"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="input-field max-w-[140px]"
                >
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="fulfilled">Fulfilled</option>
                </select>
              </div>
              {form.docType === 'quote' && (
                <div>
                  <label className="block text-sm font-medium text-dark-text-muted mb-1">Valid until</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                    className="input-field"
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
              />
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border">
            <h2 className="text-lg font-semibold text-dark-text mb-4">Line items (billing status: Pending / Billable / Invoiced)</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Item / Description</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Extended</th>
                    <th>Billing status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="text-dark-text">
                  {lines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="min-w-[160px]">
                        <select
                          value={line.item_id ?? ''}
                          onChange={(e) =>
                            updateLine(idx, 'item_id', e.target.value ? parseInt(e.target.value, 10) : null)
                          }
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
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0.0001"
                          step="any"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="input-field w-20"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="input-field w-24"
                        />
                      </td>
                      <td className="whitespace-nowrap">{(line.quantity * line.unit_price).toFixed(2)}</td>
                      <td>
                        <select
                          value={line.billing_status}
                          onChange={(e) =>
                            updateLine(idx, 'billing_status', e.target.value as BillingStatus)
                          }
                          className="input-field w-full max-w-[120px]"
                        >
                          <option value="pending">Pending</option>
                          <option value="billable">Billable</option>
                          <option value="invoiced">Invoiced</option>
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="btn-secondary text-sm text-red-400"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addLine} className="btn-secondary mt-2">
              Add line
            </button>
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

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : isNew ? 'Create order' : 'Save order'}
            </button>
            <button type="button" onClick={() => navigate('/orders')} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
        </div>
    </div>
  );
};

export default OrderDetailPage;
