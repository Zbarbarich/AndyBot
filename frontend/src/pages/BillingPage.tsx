import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackArrow } from '../components/BackArrow';
import { authFetch } from '../api/client';

const ORDERS_API = 'http://localhost:3000/api/app/orders';

type BillingStatus = 'pending' | 'billable' | 'invoiced';

interface Line {
  id: number;
  quote_order_id: number;
  item_id: number | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  sort_order: number;
  billing_status: string;
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
      const res = await authFetch(`${ORDERS_API}/${order.id}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additional_shipping: Number.isFinite(addShip) ? addShip : 0 }),
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
        <p className="text-dark-text-muted py-8">Loading...</p>
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
        <span className="text-dark-text font-medium">Billing – Order {order.document_number}</span>
      </div>
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
          {error}
        </div>
      )}
      <div className="mb-4 p-4 rounded-xl bg-dark-surface border border-dark-border text-dark-text text-sm">
        Mark lines as <strong>Unbilled</strong> (pending) or <strong>Billed</strong> (billable). Invoiced lines cannot be changed. Then create an invoice from the billable lines.
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Item / Description</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Extended</th>
              <th>Billing status</th>
            </tr>
          </thead>
          <tbody className="text-dark-text">
            {order.lines.map((line) => (
              <tr key={line.id}>
                <td className="min-w-[160px]">
                  {line.item_sku && line.item_name ? `${line.item_sku} – ${line.item_name}` : (line.description || '—')}
                </td>
                <td>{Number(line.quantity)}</td>
                <td>{Number(line.unit_price).toFixed(2)}</td>
                <td className="whitespace-nowrap">{(Number(line.quantity) * Number(line.unit_price)).toFixed(2)}</td>
                <td>
                  {line.billing_status === 'invoiced' ? (
                    <span className="text-dark-text-muted">Invoiced</span>
                  ) : (
                    <select
                      value={line.billing_status}
                      onChange={(e) => updateLineBillingStatus(line.id, e.target.value as BillingStatus)}
                      disabled={patchingLineId === line.id}
                      className="input-field w-full max-w-[120px]"
                    >
                      <option value="pending">Unbilled</option>
                      <option value="billable">Billed</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasBillableLines && (
        <div className="mt-4 p-4 rounded-xl bg-dark-surface border border-dark-border max-w-xs">
          <label className="block text-sm font-medium text-dark-text-muted mb-1">Additional shipping (when creating invoice)</label>
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
            <p className="text-xs text-dark-text-muted mt-1">Order shipping: {Number(order.shipping_amount).toFixed(2)} will be included on first invoice.</p>
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
        <p className="mt-4 text-dark-text-muted text-sm">All lines are invoiced. This order is closed.</p>
      )}
    </div>
  );
};

export default BillingPage;
