import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useListFetch } from '../hooks/useListFetch';
import { formatDate } from '../utils/formatDate';
import { apiBase } from '../api/config';
import { ErrorBanner } from '../components/ErrorBanner';
import ListCardRow from '../components/ListCardRow';
import { ListPageToolbar } from '../components/MobilePageTitle';

const API_BASE = `${apiBase}/api/app/orders`;

type StatusFilter = 'open' | 'closed' | 'all';

interface OrderSummary {
  id: number;
  document_number: string;
  type: string;
  customer_id: number;
  customer_name: string;
  status: string;
  order_date: string | null;
  total: number;
  created_at: string;
  original_quote_id?: number | null;
}

const OrdersPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [customerFilter, setCustomerFilter] = useState('');
  const { data: allOrders, loading, error } = useListFetch<OrderSummary>(API_BASE);
  const orders = useMemo(() => {
    let list = allOrders.filter((o) => o.type === 'order' || (o.type === 'quote' && o.status !== 'converted'));
    if (statusFilter === 'open') list = list.filter((o) => o.status !== 'closed');
    if (statusFilter === 'closed') list = list.filter((o) => o.status === 'closed');
    if (customerFilter.trim()) {
      const q = customerFilter.trim().toLowerCase();
      list = list.filter((o) => (o.customer_name ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [allOrders, statusFilter, customerFilter]);

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
          className="filter-search-input flex-1 min-w-[8rem]"
          aria-label="Filter by customer"
        />
        <button
          type="button"
          onClick={() => navigate('/orders/new')}
          className="btn-icon-primary shrink-0"
          aria-label="New order"
        >
          <Plus className="w-5 h-5" />
        </button>
      </ListPageToolbar>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <p className="text-text-muted py-8 px-4">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="p-6 text-text-muted text-center">No orders yet. Create one or convert a quote.</p>
        ) : (
          <>
            <div className="md:hidden p-3 space-y-3">
              {orders.map((o) => (
                <ListCardRow
                  key={o.id}
                  title={o.document_number}
                  subtitle={o.customer_name}
                  meta={
                    <>
                      <span className="capitalize">{o.type}</span>
                      <span>{o.status}</span>
                      <span>${Number(o.total).toFixed(2)}</span>
                      <span>{formatDate(o.order_date)}</span>
                    </>
                  }
                  onClick={() => navigate(`/orders/${o.id}`)}
                />
              ))}
            </div>
            <div className="hidden md:block table-scroll border-0 rounded-none">
              <table>
                <thead>
                  <tr>
                    <th>Document #</th>
                    <th className="col-status">Type</th>
                    <th>Customer</th>
                    <th className="col-amount">Total</th>
                    <th className="col-status">Status</th>
                    <th className="col-date">Date</th>
                  </tr>
                </thead>
                <tbody className="text-text">
                  {orders.map((o) => (
                    <tr key={o.id} className="cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                      <td className="font-mono font-medium">{o.document_number}</td>
                      <td className="col-status capitalize">{o.type}</td>
                      <td>{o.customer_name}</td>
                      <td className="col-amount whitespace-nowrap">{Number(o.total).toFixed(2)}</td>
                      <td className="col-status">{o.status}</td>
                      <td className="col-date whitespace-nowrap">{formatDate(o.order_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
