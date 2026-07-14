import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { authFetch } from '../api/client';
import { apiBase } from '../api/config';
import { ErrorBanner } from '../components/ErrorBanner';
import ListCardRow from '../components/ListCardRow';
import { ListPageToolbar } from '../components/MobilePageTitle';

const API_BASE = `${apiBase}/api/app/customers`;

interface Customer {
  id: number;
  name: string;
  physical_address: string | null;
  email: string | null;
  phone: string | null;
  email_notifications: boolean;
  text_notifications: boolean;
  created_at: string;
  updated_at: string;
  ticket_ids?: number[];
}

interface CustomerAggregates {
  openOrders: number;
  openInvoices: number;
  openBalance: number;
  openPOs: number;
}

const CustomersPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [aggregates, setAggregates] = useState<Record<number, CustomerAggregates>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(API_BASE);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCustomers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (customers.length === 0) {
      setAggregates({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const next: Record<number, CustomerAggregates> = {};
      await Promise.all(
        customers.map(async (c) => {
          try {
            const [ordersRes, invoicesRes] = await Promise.all([
              authFetch(`${API_BASE}/${c.id}/orders?status=open`),
              authFetch(`${API_BASE}/${c.id}/invoices?status=open`),
            ]);
            if (cancelled) return;
            const openOrders = ordersRes.ok ? (await ordersRes.json()).length : 0;
            const invoices = invoicesRes.ok ? await invoicesRes.json() : [];
            const openInvoices = invoices.length;
            const openBalance = invoices.reduce(
              (sum: number, inv: { total?: number; amount_paid?: number; balance_due?: number }) =>
                sum + Number(inv.balance_due ?? (Number(inv.total ?? 0) - Number(inv.amount_paid ?? 0))),
              0
            );
            next[c.id] = { openOrders, openInvoices, openBalance, openPOs: 0 };
          } catch {
            next[c.id] = { openOrders: 0, openInvoices: 0, openBalance: 0, openPOs: 0 };
          }
        })
      );
      if (!cancelled) setAggregates(next);
    };
    load();
    return () => { cancelled = true; };
  }, [customers]);

  return (
    <div className="page-container">
      <ListPageToolbar>
        <button
          type="button"
          onClick={() => navigate('/customers/new')}
          className="btn-icon-primary shrink-0"
          aria-label="Add customer"
        >
          <Plus className="w-5 h-5" />
        </button>
      </ListPageToolbar>

      <ErrorBanner message={error} />

      <div className="glass-card overflow-hidden">
        {loading ? (
          <p className="text-text-muted py-8 px-4">Loading...</p>
        ) : customers.length === 0 ? (
          <p className="p-6 text-text-muted text-center">No customers yet. Add one to get started.</p>
        ) : (
          <>
            <div className="md:hidden p-3 space-y-3">
              {customers.map((c) => {
                const agg = aggregates[c.id];
                return (
                  <ListCardRow
                    key={c.id}
                    title={c.name}
                    subtitle={c.email ?? c.phone ?? undefined}
                    meta={
                      agg ? (
                        <>
                          <span>Balance ${Number(agg.openBalance).toFixed(2)}</span>
                          <span>{agg.openOrders} orders</span>
                          <span>{agg.openInvoices} invoices</span>
                        </>
                      ) : undefined
                    }
                    onClick={() => navigate(`/customers/${c.id}`)}
                  />
                );
              })}
            </div>
            <div className="hidden md:block table-scroll border-0 rounded-none">
              <table>
                <thead>
                  <tr>
                    <th className="col-id">ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th className="col-status">Open balances</th>
                    <th className="col-status">Open orders</th>
                    <th className="col-status">Open invoices</th>
                    <th className="col-status">Open POs</th>
                    <th className="col-status">Email notif.</th>
                    <th className="col-status">Text notif.</th>
                  </tr>
                </thead>
                <tbody className="text-text">
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/customers/${c.id}`)}
                    >
                      <td className="col-id font-mono">{c.id}</td>
                      <td className="font-medium">{c.name}</td>
                      <td>{c.email ?? '—'}</td>
                      <td>{c.phone ?? '—'}</td>
                      <td className="col-amount whitespace-nowrap">
                        {aggregates[c.id] ? Number(aggregates[c.id].openBalance).toFixed(2) : '—'}
                      </td>
                      <td className="col-id">{aggregates[c.id]?.openOrders ?? '—'}</td>
                      <td className="col-id">{aggregates[c.id]?.openInvoices ?? '—'}</td>
                      <td className="col-id">{aggregates[c.id]?.openPOs ?? '—'}</td>
                      <td>{c.email_notifications ? 'Yes' : 'No'}</td>
                      <td>{c.text_notifications ? 'Yes' : 'No'}</td>
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

export default CustomersPage;
