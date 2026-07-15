import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authFetch } from '../api/client';
import { formatDate } from '../utils/formatDate';
import { apiBase } from '../api/config';
import { ErrorBanner } from '../components/ErrorBanner';
import ListCardRow from '../components/ListCardRow';
import ResizableTable from '../components/ResizableTable';
import { ListPageToolbar } from '../components/MobilePageTitle';

const API_BASE = `${apiBase}/api/app/purchase-orders`;

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
      <ErrorBanner message={error} />

      <ListPageToolbar hasFilterTabs>
        {(['open', 'closed', 'all'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`pill-button shrink-0 ${statusFilter === tab ? 'active' : ''}`}
          >
            {tab}
          </button>
        ))}
        <input
          type="text"
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          placeholder="Customer..."
          className="filter-search-input flex-1 min-w-0"
          aria-label="Filter by customer"
        />
      </ListPageToolbar>

      <div className="glass-card overflow-hidden">
      {loading ? (
        <p className="text-text-muted py-8 px-4">Loading...</p>
      ) : filteredPOs.length === 0 ? (
        <p className="p-6 text-text-muted text-center">No purchase orders yet. Create an order with &quot;Create purchase order&quot; checked to generate POs.</p>
      ) : (
        <>
          <div className="md:hidden p-3 space-y-3">
            {filteredPOs.map((po) => (
              <ListCardRow
                key={po.id}
                title={`PO ${po.po_number}`}
                subtitle={po.customer_name ?? undefined}
                meta={
                  <>
                    <span>Order {po.order_document_number ?? po.order_id}</span>
                    <span>{formatCurrency(po.order_total)}</span>
                    <span>{po.status}</span>
                  </>
                }
                onClick={() => navigate(`/purchasing/${po.id}`)}
              />
            ))}
          </div>
          <div className="hidden md:block">
            <ResizableTable
              tableId="purchasing"
              className="border-0 rounded-none"
              columns={[
                { key: 'po', header: 'PO #' },
                { key: 'order', header: 'Order' },
                { key: 'customer', header: 'Customer' },
                { key: 'customerPo', header: 'Customer PO' },
                { key: 'total', header: 'Total' },
                { key: 'created', header: 'Created', className: 'col-date' },
                { key: 'status', header: 'Status', className: 'col-status' },
              ]}
            >
              <tbody className="text-text">
                {filteredPOs.map((po) => (
                  <tr
                    key={po.id}
                    className="cursor-pointer hover:bg-surface-elevated/50 active:bg-surface-elevated/70"
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
            </ResizableTable>
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default PurchasingPage;
