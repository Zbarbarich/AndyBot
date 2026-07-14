import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { authFetch } from '../api/client';
import { apiBase } from '../api/config';
import { formatDate } from '../utils/formatDate';
import { ErrorBanner } from '../components/ErrorBanner';
import ListCardRow from '../components/ListCardRow';
import ResponsiveEntityList from '../components/ResponsiveEntityList';
import { ListPageToolbar } from '../components/MobilePageTitle';

const API_BASE = `${apiBase}/api/app/tickets`;
const ORDERS_API = `${apiBase}/api/app/orders`;

type StatusFilter = 'open' | 'closed' | 'all';

interface Ticket {
  id: number;
  creation_date: string;
  subject: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_email: string | null;
  category: string | null;
  description: string | null;
  email: string | null;
  priority: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface OrderSummary {
  id: number;
  document_number: string;
  type: string;
  ticket_id: number | null;
}

const TicketsPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [customerFilter, setCustomerFilter] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(API_BASE);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTickets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await authFetch(ORDERS_API);
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch {
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchOrders();
  }, [fetchTickets, fetchOrders]);

  const linkedOrdersByTicket = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const o of orders) {
      if (o.ticket_id == null) continue;
      const list = map.get(o.ticket_id) ?? [];
      list.push(o.document_number);
      map.set(o.ticket_id, list);
    }
    return map;
  }, [orders]);

  const filteredTickets = useMemo(() => {
    let list = tickets;
    if (statusFilter === 'open') list = list.filter((t) => t.status !== 'Closed');
    if (statusFilter === 'closed') list = list.filter((t) => t.status === 'Closed');
    if (customerFilter.trim()) {
      const q = customerFilter.trim().toLowerCase();
      list = list.filter((t) =>
        (t.customer_name ?? '').toLowerCase().includes(q) ||
        (t.email ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [tickets, statusFilter, customerFilter]);

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
          onClick={() => navigate('/tickets/new')}
          className="btn-icon-primary shrink-0"
          aria-label="New ticket"
        >
          <Plus className="w-5 h-5" />
        </button>
      </ListPageToolbar>

      <ResponsiveEntityList
        items={filteredTickets}
        loading={loading}
        emptyMessage="No tickets yet. Create one to get started."
        getKey={(t) => t.id}
        renderCard={(t) => (
          <ListCardRow
            title={`#${t.id} ${t.subject}`}
            subtitle={t.customer_name ?? t.email ?? undefined}
            meta={
              <>
                <span>{t.status ?? 'Open'}</span>
                <span>P{t.priority}</span>
                <span>{formatDate(t.creation_date)}</span>
              </>
            }
            onClick={() => navigate(`/tickets/${t.id}`)}
          />
        )}
        renderTable={() => (
          <table>
            <thead>
              <tr>
                <th className="col-id">ID</th>
                <th className="col-date">Created</th>
                <th>Subject</th>
                <th>Customer</th>
                <th className="col-status">Category</th>
                <th className="col-id">Prio</th>
                <th className="col-status">Status</th>
                <th>Linked orders</th>
              </tr>
            </thead>
            <tbody className="text-text">
              {filteredTickets.map((t) => {
                const linked = linkedOrdersByTicket.get(t.id);
                return (
                  <tr
                    key={t.id}
                    className="cursor-pointer hover:bg-surface-elevated/50 active:bg-surface-elevated/70"
                    onClick={() => navigate(`/tickets/${t.id}`)}
                  >
                    <td className="col-id font-mono">{t.id}</td>
                    <td className="col-date whitespace-nowrap">{formatDate(t.creation_date)}</td>
                    <td className="font-medium max-w-[200px] truncate sm:max-w-none">{t.subject}</td>
                    <td>{t.customer_name ?? (t.email ?? '—')}</td>
                    <td className="col-status">{t.category ?? '—'}</td>
                    <td className="col-id">{t.priority}</td>
                    <td className="col-status">{t.status ?? 'Open'}</td>
                    <td className="whitespace-nowrap text-text-muted text-xs">
                      {linked?.length ? linked.join(', ') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      />
    </div>
  );
};

export default TicketsPage;
