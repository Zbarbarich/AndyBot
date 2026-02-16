import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const CUSTOMERS_API = 'http://localhost:3000/api/app/customers';
const TICKETS_API = 'http://localhost:3000/api/app/tickets';
const ORDERS_API = 'http://localhost:3000/api/app/orders';
const INVOICES_API = 'http://localhost:3000/api/app/invoices';

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

  const getToken = () => localStorage.getItem('token');

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
          fetch(`${CUSTOMERS_API}/${customerId}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch(`${TICKETS_API}/by-customer?customerId=${customerId}&status=open`, { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch(`${TICKETS_API}/by-customer?customerId=${customerId}&status=closed`, { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch(`${CUSTOMERS_API}/${customerId}/orders?status=open`, { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch(`${CUSTOMERS_API}/${customerId}/orders?status=closed`, { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch(`${CUSTOMERS_API}/${customerId}/invoices?status=open`, { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch(`${CUSTOMERS_API}/${customerId}/invoices?status=closed`, { headers: { Authorization: `Bearer ${getToken()}` } }),
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
          <button type="button" onClick={() => navigate('/customers')} className="btn-secondary mt-4 w-full sm:w-auto">Back to Customers</button>
        </div>
    );
  }

  const tickets = activeTab === 'open' ? openTickets : closedTickets;

  return (
    <div className="page-container">
        <button type="button" onClick={() => navigate('/customers')} className="btn-secondary mb-6 w-full sm:w-auto">
          Back to Customers
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-1">
            <div className="rounded-xl bg-dark-surface border border-dark-border p-4 sm:p-6 lg:sticky lg:top-4">
              <h2 className="text-lg sm:text-xl font-semibold text-dark-text mb-4">Customer</h2>
              <dl className="detail-grid text-dark-text text-sm">
                <div className="short-field">
                  <dt className="text-dark-text-muted text-xs">ID</dt>
                  <dd className="font-mono">{customer.id}</dd>
                </div>
                <div className="col-span-full">
                  <dt className="text-dark-text-muted text-xs">Name</dt>
                  <dd className="font-medium">{customer.name}</dd>
                </div>
                {customer.physical_address && (
                  <div className="col-span-full">
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
                  <dt className="text-dark-text-muted text-xs">Email notif.</dt>
                  <dd>{customer.email_notifications ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-dark-text-muted text-xs">Text notif.</dt>
                  <dd>{customer.text_notifications ? 'Yes' : 'No'}</dd>
                </div>
                <div className="col-span-full">
                  <dt className="text-dark-text-muted text-xs">Ticket #s</dt>
                  <dd>
                    {customer.ticket_ids && customer.ticket_ids.length > 0
                      ? customer.ticket_ids.join(', ')
                      : 'None'}
                  </dd>
                </div>
              </dl>
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
                    <th>Actions</th>
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
                      <td className="col-date whitespace-nowrap">{new Date(t.creation_date).toLocaleDateString()}</td>
                      <td className="font-medium">{t.subject}</td>
                      <td className="col-status">{t.category ?? '—'}</td>
                      <td className="col-id">{t.priority}</td>
                      <td className="col-status">{t.status}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/tickets/${t.id}`)}
                          className="btn-secondary text-sm py-1.5 px-2 sm:px-3 min-h-[36px]"
                        >
                          View
                        </button>
                      </td>
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="text-dark-text">
                  {(ordersTab === 'open' ? openOrders : closedOrders).map((o) => (
                    <tr key={o.id} className="hover:bg-dark-surface-elevated/50">
                      <td className="font-mono font-medium">{o.document_number}</td>
                      <td className="col-status capitalize">{o.type}</td>
                      <td className="col-amount">{Number(o.total).toFixed(2)}</td>
                      <td className="col-status">{o.status}</td>
                      <td className="col-date whitespace-nowrap">{o.order_date ?? o.valid_until ?? '—'}</td>
                      <td>
                        <button type="button" onClick={() => navigate(`/orders/${o.id}`)} className="btn-secondary text-sm py-1.5 px-2 min-h-[36px]">View</button>
                      </td>
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="text-dark-text">
                  {(invoicesTab === 'open' ? openInvoices : closedInvoices).map((inv) => (
                    <tr key={inv.id} className="hover:bg-dark-surface-elevated/50">
                      <td className="font-mono font-medium">{inv.invoice_number}</td>
                      <td className="col-amount">{Number(inv.total).toFixed(2)}</td>
                      <td className="col-amount">{Number(inv.amount_paid ?? 0).toFixed(2)}</td>
                      <td className="col-amount">{Number(inv.balance_due ?? inv.total - (inv.amount_paid ?? 0)).toFixed(2)}</td>
                      <td>
                        <button type="button" onClick={() => navigate(`/invoices/${inv.id}`)} className="btn-secondary text-sm py-1.5 px-2 min-h-[36px]">View</button>
                      </td>
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
    </div>
  );
};

export default CustomerDetailPage;
