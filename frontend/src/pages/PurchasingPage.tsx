import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authFetch } from '../api/client';
import { formatDate } from '../utils/formatDate';

const API_BASE = 'http://localhost:3000/api/app/purchase-orders';

type StatusFilter = 'open' | 'closed' | 'all';

interface POSummary {
  id: number;
  po_number: string;
  order_id: number;
  order_document_number?: string;
  customer_po_number?: string | null;
  order_total?: number | null;
  customer_name?: string | null;
  created_at: string;
  status: string;
}

const PurchasingPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [customerFilter, setCustomerFilter] = useState('');
  const [pos, setPos] = useState<POSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filteredPOs = useMemo(() => {
    let list = pos;
    if (statusFilter === 'open') list = list.filter((po) => po.status !== 'closed');
    if (statusFilter === 'closed') list = list.filter((po) => po.status === 'closed');
    if (customerFilter.trim()) {
      const q = customerFilter.trim().toLowerCase();
      list = list.filter((po) => (po.customer_name ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [pos, statusFilter, customerFilter]);

  const fetchPOs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(API_BASE);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPos(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, []);

  const formatCurrency = (n: number | null | undefined) =>
    n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n)) : '—';

  return (
    <div className="page-container">
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {(['open', 'closed', 'all'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`pill-button ${statusFilter === tab ? 'active' : ''}`}
          >
            {tab}
          </button>
        ))}
        <input
          type="text"
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          placeholder="Customer..."
          className="filter-search-input"
          aria-label="Filter by customer"
        />
      </div>

      <div className="rounded-lg border border-dark-border bg-dark-surface overflow-hidden">
      {loading ? (
        <p className="text-dark-text-muted py-8">Loading...</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>PO #</th>
                <th>Order</th>
                <th>Customer</th>
                <th>Customer PO</th>
                <th>Total</th>
                <th className="col-date">Created</th>
                <th className="col-status">Status</th>
              </tr>
            </thead>
            <tbody className="text-dark-text">
              {filteredPOs.map((po) => (
                <tr
                  key={po.id}
                  className="cursor-pointer hover:bg-dark-surface-elevated/50 active:bg-dark-surface-elevated/70"
                  onClick={() => navigate(`/purchasing/${po.id}`)}
                >
                  <td className="font-mono font-medium">
                    <Link to={`/purchasing/${po.id}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                      {po.po_number}
                    </Link>
                  </td>
                  <td className="font-mono">
                    <Link to={`/orders/${po.order_id}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                      {po.order_document_number ?? String(po.order_id)}
                    </Link>
                  </td>
                  <td className="truncate max-w-[12rem]" title={po.customer_name ?? undefined}>{po.customer_name ?? '—'}</td>
                  <td className="font-mono truncate max-w-[8rem]" title={po.customer_po_number ?? undefined}>{po.customer_po_number ?? '—'}</td>
                  <td className="whitespace-nowrap">{formatCurrency(po.order_total)}</td>
                  <td className="col-date whitespace-nowrap">{formatDate(po.created_at)}</td>
                  <td className="col-status">{po.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPOs.length === 0 && (
            <p className="p-6 text-dark-text-muted text-center">No purchase orders yet. Create an order with &quot;Create purchase order&quot; checked to generate POs.</p>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default PurchasingPage;
