import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { authFetch } from '../api/client';

const API_BASE = 'http://localhost:3000/api/app/tickets';
const ORDERS_API = 'http://localhost:3000/api/app/orders';

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

  const getLinkedOrders = (ticketId: number) =>
    orders.filter((o) => o.ticket_id === ticketId).map((o) => o.document_number);

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
        <button
          type="button"
          onClick={() => navigate('/tickets/new')}
          className="btn-icon-primary ml-auto"
          aria-label="New ticket"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="rounded-lg border border-dark-border bg-dark-surface overflow-hidden">
        {loading ? (
          <p className="text-dark-text-muted py-8 px-4">Loading...</p>
        ) : (
          <div className="table-scroll">
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
              <tbody className="text-dark-text">
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer hover:bg-dark-surface-elevated/50 active:bg-dark-surface-elevated/70"
                    onClick={() => navigate(`/tickets/${t.id}`)}
                  >
                    <td className="col-id font-mono">{t.id}</td>
                    <td className="col-date whitespace-nowrap">{new Date(t.creation_date).toLocaleDateString()}</td>
                    <td className="font-medium max-w-[200px] truncate sm:max-w-none">{t.subject}</td>
                    <td>{t.customer_name ?? (t.email ?? '—')}</td>
                    <td className="col-status">{t.category ?? '—'}</td>
                    <td className="col-id">{t.priority}</td>
                    <td className="col-status">{t.status ?? 'Open'}</td>
                    <td className="whitespace-nowrap text-dark-text-muted text-xs">
                      {getLinkedOrders(t.id).length ? getLinkedOrders(t.id).join(', ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTickets.length === 0 && (
              <p className="p-6 text-dark-text-muted text-center">No tickets yet. Create one to get started.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;
