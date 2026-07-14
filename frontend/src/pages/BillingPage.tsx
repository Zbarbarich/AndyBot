import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackArrow } from '../components/BackArrow';
import { ErrorBanner } from '../components/ErrorBanner';
import { LineItemEditor } from '../components/LineItemEditor';
import { authFetch } from '../api/client';
import { apiBase } from '../api/config';

const ORDERS_API = `${apiBase}/api/app/orders`;

interface Line {
  id: number;
  quote_order_id: number;
  item_id: number | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  sort_order: number;
  billing_status: string;
  quantity_billed?: number;
  item_sku?: string;
  item_name?: string;
}

interface OrderDetail {
  id: number;
  document_number: string;
  type: string;
  customer_id: number;
  customer_name?: string;
  status: string;
  total: number;
  shipping_amount?: number;
  lines: Line[];
}

const BillingPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [patchingLineId, setPatchingLineId] = useState<number | null>(null);
  const [additionalShipping, setAdditionalShipping] = useState('');
  /** Per-line quantity to invoice (for billable lines). Key = line id, value = qty to bill. */
  const [billableQty, setBillableQty] = useState<Record<number, number>>({});

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      setError('Invalid order id');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${ORDERS_API}/${orderId}`);
      if (!res.ok) {
        if (res.status === 404) setError('Order not found');
        else setError('Failed to load order');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setOrder(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Default billable qty to remaining for each billable line when order lines load/change
  useEffect(() => {
    if (!order?.lines) return;
    setBillableQty((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const line of order.lines) {
        if (line.billing_status !== 'billable') continue;
        const qty = Number(line.quantity);
        const billed = Number(line.quantity_billed ?? 0);
        const remaining = Math.max(0, qty - billed);
        if (remaining > 0 && next[line.id] === undefined) {
          next[line.id] = remaining;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [order?.lines]);

  const updateLineBillingStatus = async (lineId: number, billing_status: 'pending' | 'billable') => {
    if (!order) return;
    setPatchingLineId(lineId);
    setError('');
    try {
      const res = await authFetch(`${ORDERS_API}/${order.id}/lines/${lineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing_status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update');
      }
      const updated = await res.json();
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              lines: prev.lines.map((l) => (l.id === lineId ? { ...l, billing_status: updated.billing_status } : l)),
            }
          : null
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update line');
    } finally {
      setPatchingLineId(null);
    }
  };

  const handleCreateInvoice = async () => {
    if (!order) return;
    setCreatingInvoice(true);
    setError('');
    try {
      const addShip = parseFloat(additionalShipping);
      const billableLines = order.lines.filter((l) => l.billing_status === 'billable');
      const remaining = (line: Line) => {
        const qty = Number(line.quantity);
        const billed = Number(line.quantity_billed ?? 0);
        return Math.max(0, qty - billed);
      };
      const lines = billableLines
        .filter((l) => remaining(l) > 0)
        .map((l) => ({
          line_id: l.id,
          quantity: Math.min(Math.max(1, Math.floor(billableQty[l.id] ?? remaining(l))), remaining(l)),
        }));
      const res = await authFetch(`${ORDERS_API}/${order.id}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          additional_shipping: Number.isFinite(addShip) ? addShip : 0,
          lines: lines.length > 0 ? lines : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create invoice');
      navigate(`/invoices/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create invoice');
    } finally {
      setCreatingInvoice(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p className="text-text-muted py-8">Loading...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="page-container">
        <BackArrow to="/invoices" label="Back to Invoices" className="mb-4" />
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!order || order.type !== 'order') {
    return (
      <div className="page-container">
        <BackArrow to="/invoices" label="Back to Invoices" className="mb-4" />
        <p className="text-red-400">Order not found or not an order.</p>
      </div>
    );
  }

  const billableCount = order.lines.filter((l) => l.billing_status === 'billable').length;
  const hasBillableLines = billableCount > 0;
  const allInvoiced = order.lines.length > 0 && order.lines.every((l) => l.billing_status === 'invoiced');

  return (
    <div className="page-container">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <BackArrow to="/invoices" label="Back to Invoices" />
        <span className="text-text font-medium">Billing – Order {order.document_number}</span>
      </div>
      <ErrorBanner message={error} />
      <div className="mb-4 p-4 rounded-xl bg-surface border border-border text-text text-sm">
        Mark lines as <strong>Unbilled</strong> (pending) or <strong>Billed</strong> (billable). Invoiced lines cannot be changed. Then create an invoice from the billable lines.
      </div>
      <LineItemEditor
        table={
      <table>
          <thead>
            <tr>
              <th>Item / Description</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Extended</th>
              <th>Billing status</th>
              <th>Billable qty</th>
            </tr>
          </thead>
          <tbody className="text-text">
            {order.lines.map((line) => {
              const qty = Number(line.quantity);
              const billed = Number(line.quantity_billed ?? 0);
              const remaining = Math.max(0, qty - billed);
              const toBill = billableQty[line.id] ?? remaining;
              return (
                <tr key={line.id}>
                  <td className="min-w-[160px]">
                    {line.item_sku && line.item_name ? `${line.item_sku} – ${line.item_name}` : (line.description || '—')}
                  </td>
                  <td>{qty}</td>
                  <td>{Number(line.unit_price).toFixed(2)}</td>
                  <td className="whitespace-nowrap">{(qty * Number(line.unit_price)).toFixed(2)}</td>
                  <td>
                    {line.billing_status === 'invoiced' ? (
                      <span className="text-text-muted">Invoiced</span>
                    ) : (
                      <select
                        value={line.billing_status}
                        onChange={(e) => updateLineBillingStatus(line.id, e.target.value as 'pending' | 'billable')}
                        disabled={patchingLineId === line.id}
                        className="input-field w-full max-w-[120px]"
                      >
                        <option value="pending">Unbilled</option>
                        <option value="billable">Billed</option>
                      </select>
                    )}
                  </td>
                  <td>
                    {line.billing_status === 'invoiced' ? (
                      <span className="text-text-muted">—</span>
                    ) : line.billing_status === 'billable' && remaining > 0 ? (
                      <input
                        type="number"
                        min={1}
                        max={remaining}
                        step={1}
                        value={toBill}
                        onChange={(e) => {
                          const v = e.target.value === '' ? remaining : Math.min(remaining, Math.max(1, parseFloat(e.target.value) || 0));
                          setBillableQty((prev) => ({ ...prev, [line.id]: v }));
                        }}
                        className="input-field w-20 min-h-0 py-1.5 px-2 text-right"
                      />
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        }
      />
      {hasBillableLines && (
        <div className="mt-4 p-4 rounded-xl bg-surface border border-border max-w-xs">
          <label className="block text-sm font-medium text-text-muted mb-1">Additional shipping (when creating invoice)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={additionalShipping}
            onChange={(e) => setAdditionalShipping(e.target.value)}
            placeholder="0"
            className="input-field w-full"
          />
          {Number(order.shipping_amount ?? 0) > 0 && (
            <p className="text-xs text-text-muted mt-1">Order shipping: {Number(order.shipping_amount).toFixed(2)} will be included on first invoice.</p>
          )}
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCreateInvoice}
          disabled={creatingInvoice || !hasBillableLines}
          className="btn-primary"
        >
          {creatingInvoice ? 'Creating…' : 'Create invoice'}
        </button>
        <button type="button" onClick={() => navigate('/invoices')} className="btn-secondary">
          Back to Invoices
        </button>
      </div>
      {allInvoiced && (
        <p className="mt-4 text-text-muted text-sm">All lines are invoiced. This order is closed.</p>
      )}
    </div>
  );
};

export default BillingPage;
