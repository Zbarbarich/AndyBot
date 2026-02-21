import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../api/client';
import { formatDate } from '../utils/formatDate';
import { BackArrow } from '../components/BackArrow';
import { apiBase } from '../api/config';

const CUSTOMERS_API = `${apiBase}/api/app/customers`;
const TICKETS_API = `${apiBase}/api/app/tickets`;

interface Customer {
  id: number;
  name: string;
  contact_name?: string | null;
  physical_address: string | null;
  email: string | null;
  phone: string | null;
  email_notifications: boolean;
  text_notifications: boolean;
  created_at: string;
  updated_at: string;
  ticket_ids?: number[];
}

interface Ticket {
  id: number;
  creation_date: string;
  subject: string;
  category: string | null;
  priority: number;
  status: string;
}

interface CustomerOrder {
  id: number;
  document_number: string;
  type: string;
  customer_name: string;
  status: string;
  total: number;
  order_date?: string | null;
  valid_until?: string | null;
}

interface CustomerInvoice {
  id: number;
  invoice_number: string;
  total: number;
  amount_paid?: number;
  balance_due?: number;
  status: string;
}

type Tab = 'open' | 'closed';

const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [openTickets, setOpenTickets] = useState<Ticket[]>([]);
  const [closedTickets, setClosedTickets] = useState<Ticket[]>([]);
  const [openOrders, setOpenOrders] = useState<CustomerOrder[]>([]);
  const [closedOrders, setClosedOrders] = useState<CustomerOrder[]>([]);
  const [openInvoices, setOpenInvoices] = useState<CustomerInvoice[]>([]);
  const [closedInvoices, setClosedInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('open');
  const [ordersTab, setOrdersTab] = useState<Tab>('open');
  const [invoicesTab, setInvoicesTab] = useState<Tab>('open');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', contact_name: '', physical_address: '', email: '', phone: '', email_notifications: true, text_notifications: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      setError('Invalid customer id');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [custRes, openRes, closedRes, openOrdersRes, closedOrdersRes, openInvoicesRes, closedInvoicesRes] = await Promise.all([
          authFetch(`${CUSTOMERS_API}/${customerId}`),
          authFetch(`${TICKETS_API}/by-customer?customerId=${customerId}&status=open`),
          authFetch(`${TICKETS_API}/by-customer?customerId=${customerId}&status=closed`),
          authFetch(`${CUSTOMERS_API}/${customerId}/orders?status=open`),
          authFetch(`${CUSTOMERS_API}/${customerId}/orders?status=closed`),
          authFetch(`${CUSTOMERS_API}/${customerId}/invoices?status=open`),
          authFetch(`${CUSTOMERS_API}/${customerId}/invoices?status=closed`),
        ]);

        if (cancelled) return;
        if (!custRes.ok) {
          if (custRes.status === 404) setError('Customer not found');
          else setError('Failed to load customer');
          setLoading(false);
          return;
        }

        const cust = await custRes.json();
        setCustomer(cust);

        if (openRes.ok) {
          const open = await openRes.json();
          setOpenTickets(open);
        }
        if (closedRes.ok) {
          const closed = await closedRes.json();
          setClosedTickets(closed);
        }
        if (openOrdersRes.ok) setOpenOrders(await openOrdersRes.json());
        if (closedOrdersRes.ok) setClosedOrders(await closedOrdersRes.json());
        if (openInvoicesRes.ok) setOpenInvoices(await openInvoicesRes.json());
        if (closedInvoicesRes.ok) setClosedInvoices(await closedInvoicesRes.json());
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id]);

  const openEditModal = () => {
    if (!customer) return;
    setEditForm({
      name: customer.name,
      contact_name: customer.contact_name || '',
      physical_address: customer.physical_address || '',
      email: customer.email || '',
      phone: customer.phone || '',
      email_notifications: customer.email_notifications,
      text_notifications: customer.text_notifications,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setSaving(true);
    setError('');
    try {
      const res = await authFetch(`${CUSTOMERS_API}/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          contact_name: editForm.contact_name.trim() || null,
          physical_address: editForm.physical_address || null,
          email: editForm.email || null,
          phone: editForm.phone || null,
          email_notifications: editForm.email_notifications,
          text_notifications: editForm.text_notifications,
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setCustomer(updated);
      setShowEditModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customer || !window.confirm('Delete this customer?')) return;
    setError('');
    try {
      const res = await authFetch(`${CUSTOMERS_API}/${customer.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      navigate('/customers');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
          <p className="text-dark-text-muted py-8">Loading...</p>
        </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="page-container">
        <div className="p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">{error || 'Customer not found'}</div>
        <BackArrow to="/customers" label="Back to Customers" className="mt-4" />
      </div>
    );
  }

  const tickets = activeTab === 'open' ? openTickets : closedTickets;

  return (
    <div className="page-container">
      <div className="mb-4">
        <BackArrow to="/customers" label="Back to Customers" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-1">
          <div className="rounded-xl bg-dark-surface border border-dark-border p-4 sm:p-6 lg:sticky lg:top-4">
            <h2 className="text-lg font-semibold text-dark-text mb-3">Customer</h2>
            <dl className="space-y-2 text-sm text-dark-text">
              <div>
                <dt className="text-dark-text-muted text-xs">ID</dt>
                <dd className="font-mono">{customer.id}</dd>
              </div>
              <div>
                <dt className="text-dark-text-muted text-xs">Name</dt>
                <dd className="font-medium">{customer.name}</dd>
              </div>
              {customer.contact_name && (
                <div>
                  <dt className="text-dark-text-muted text-xs">Contact (POC)</dt>
                  <dd>{customer.contact_name}</dd>
                </div>
              )}
              {customer.physical_address && (
                <div>
                  <dt className="text-dark-text-muted text-xs">Address</dt>
                  <dd>{customer.physical_address}</dd>
                </div>
              )}
              <div>
                <dt className="text-dark-text-muted text-xs">Email</dt>
                <dd>{customer.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-dark-text-muted text-xs">Phone</dt>
                <dd>{customer.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-dark-text-muted text-xs">Text notifications</dt>
                <dd>{customer.text_notifications ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-dark-text-muted text-xs">Email notifications</dt>
                <dd>{customer.email_notifications ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-dark-text-muted text-xs">Ticket #s</dt>
                <dd>{customer.ticket_ids?.length ? customer.ticket_ids.join(', ') : 'None'}</dd>
              </div>
            </dl>
            <div className="mt-4 pt-4 border-t border-dark-border flex flex-wrap gap-2">
              <button type="button" onClick={() => navigate(`/customers/${customer.id}/payment-history`)} className="btn-secondary text-sm py-1.5 px-3 min-h-[36px]">Payment history</button>
              <button type="button" onClick={openEditModal} className="btn-secondary text-sm py-1.5 px-3 min-h-[36px]">Edit</button>
              <button type="button" onClick={handleDelete} className="btn-secondary text-sm text-red-400 py-1.5 px-3 min-h-[36px]">Delete</button>
            </div>
          </div>
        </div>

          <div className="lg:col-span-2">
            <div className="flex gap-1 sm:gap-2 mb-4 border-b border-dark-border overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('open')}
                className={`px-3 sm:px-4 py-2.5 font-medium rounded-t transition-colors min-h-[44px] whitespace-nowrap ${
                  activeTab === 'open'
                    ? 'bg-dark-surface text-primary border border-dark-border border-b-0 -mb-px'
                    : 'text-dark-text-muted hover:text-dark-text'
                }`}
              >
                Open ({openTickets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('closed')}
                className={`px-3 sm:px-4 py-2.5 font-medium rounded-t transition-colors min-h-[44px] whitespace-nowrap ${
                  activeTab === 'closed'
                    ? 'bg-dark-surface text-primary border border-dark-border border-b-0 -mb-px'
                    : 'text-dark-text-muted hover:text-dark-text'
                }`}
              >
                Closed ({closedTickets.length})
              </button>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th className="col-id">ID</th>
                    <th className="col-date">Created</th>
                    <th>Subject</th>
                    <th className="col-status">Category</th>
                    <th className="col-id">Prio</th>
                    <th className="col-status">Status</th>
                  </tr>
                </thead>
                <tbody className="text-dark-text">
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      className="cursor-pointer hover:bg-dark-surface-elevated/50 active:bg-dark-surface-elevated/70"
                      onClick={() => navigate(`/tickets/${t.id}`)}
                    >
                      <td className="col-id font-mono">{t.id}</td>
                      <td className="col-date whitespace-nowrap">{formatDate(t.creation_date)}</td>
                      <td className="font-medium">{t.subject}</td>
                      <td className="col-status">{t.category ?? '—'}</td>
                      <td className="col-id">{t.priority}</td>
                      <td className="col-status">{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tickets.length === 0 && (
                <p className="p-6 text-dark-text-muted text-center">
                  {activeTab === 'open' ? 'No open or pending tickets.' : 'No closed tickets.'}
                </p>
              )}
            </div>

            <h2 className="text-lg font-semibold text-dark-text mt-8 mb-3">Open Orders</h2>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setOrdersTab('open')}
                className={`px-3 py-2 font-medium rounded transition-colors ${ordersTab === 'open' ? 'bg-dark-surface-elevated text-primary' : 'text-dark-text-muted hover:text-dark-text'}`}
              >
                Open ({openOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setOrdersTab('closed')}
                className={`px-3 py-2 font-medium rounded transition-colors ${ordersTab === 'closed' ? 'bg-dark-surface-elevated text-primary' : 'text-dark-text-muted hover:text-dark-text'}`}
              >
                Closed ({closedOrders.length})
              </button>
            </div>
            <div className="table-scroll mb-8">
              <table>
                <thead>
                  <tr>
                    <th>Document #</th>
                    <th className="col-status">Type</th>
                    <th className="col-amount">Total</th>
                    <th className="col-status">Status</th>
                    <th className="col-date">Date</th>
                  </tr>
                </thead>
                <tbody className="text-dark-text">
                  {(ordersTab === 'open' ? openOrders : closedOrders).map((o) => (
                    <tr
                      key={o.id}
                      className="cursor-pointer hover:bg-dark-surface-elevated/50 active:bg-dark-surface-elevated/70"
                      onClick={() => navigate(`/orders/${o.id}`)}
                    >
                      <td className="font-mono font-medium">{o.document_number}</td>
                      <td className="col-status capitalize">{o.type}</td>
                      <td className="col-amount">{Number(o.total).toFixed(2)}</td>
                      <td className="col-status">{o.status}</td>
                      <td className="col-date whitespace-nowrap">{formatDate(o.order_date ?? o.valid_until ?? null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(ordersTab === 'open' ? openOrders : closedOrders).length === 0 && (
                <p className="p-6 text-dark-text-muted text-center">No orders.</p>
              )}
            </div>

            <h2 className="text-lg font-semibold text-dark-text mb-3">Open Invoices</h2>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setInvoicesTab('open')}
                className={`px-3 py-2 font-medium rounded transition-colors ${invoicesTab === 'open' ? 'bg-dark-surface-elevated text-primary' : 'text-dark-text-muted hover:text-dark-text'}`}
              >
                Open ({openInvoices.length})
              </button>
              <button
                type="button"
                onClick={() => setInvoicesTab('closed')}
                className={`px-3 py-2 font-medium rounded transition-colors ${invoicesTab === 'closed' ? 'bg-dark-surface-elevated text-primary' : 'text-dark-text-muted hover:text-dark-text'}`}
              >
                Closed ({closedInvoices.length})
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th className="col-amount">Total</th>
                    <th className="col-amount">Amount paid</th>
                    <th className="col-amount">Balance due</th>
                  </tr>
                </thead>
                <tbody className="text-dark-text">
                  {(invoicesTab === 'open' ? openInvoices : closedInvoices).map((inv) => (
                    <tr
                      key={inv.id}
                      className="cursor-pointer hover:bg-dark-surface-elevated/50 active:bg-dark-surface-elevated/70"
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                      <td className="font-mono font-medium">{inv.invoice_number}</td>
                      <td className="col-amount">{Number(inv.total).toFixed(2)}</td>
                      <td className="col-amount">{Number(inv.amount_paid ?? 0).toFixed(2)}</td>
                      <td className="col-amount">{Number(inv.balance_due ?? inv.total - (inv.amount_paid ?? 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(invoicesTab === 'open' ? openInvoices : closedInvoices).length === 0 && (
                <p className="p-6 text-dark-text-muted text-center">No invoices.</p>
              )}
            </div>
          </div>
        </div>

      {showEditModal && (
        <div className="modal-overlay safe-area-pb" role="dialog" aria-modal="true" aria-labelledby="edit-customer-title">
          <div className="modal-content">
            <h2 id="edit-customer-title" className="text-lg font-semibold text-dark-text mb-4">Edit Customer</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Contact name (POC)</label>
                <input
                  type="text"
                  value={editForm.contact_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, contact_name: e.target.value }))}
                  className="input-field"
                  placeholder="Point of contact"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Physical address</label>
                <input
                  type="text"
                  value={editForm.physical_address}
                  onChange={(e) => setEditForm((f) => ({ ...f, physical_address: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-dark-text">
                  <input
                    type="checkbox"
                    checked={editForm.email_notifications}
                    onChange={(e) => setEditForm((f) => ({ ...f, email_notifications: e.target.checked }))}
                  />
                  Email notifications
                </label>
                <label className="flex items-center gap-2 text-dark-text">
                  <input
                    type="checkbox"
                    checked={editForm.text_notifications}
                    onChange={(e) => setEditForm((f) => ({ ...f, text_notifications: e.target.checked }))}
                  />
                  Text notifications
                </label>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailPage;
