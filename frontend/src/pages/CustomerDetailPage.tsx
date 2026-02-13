import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavigationBar from '../components/NavigationBar';

const CUSTOMERS_API = 'http://localhost:3000/api/app/customers';
const TICKETS_API = 'http://localhost:3000/api/app/tickets';

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

type Tab = 'open' | 'closed';

const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [openTickets, setOpenTickets] = useState<Ticket[]>([]);
  const [closedTickets, setClosedTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('open');

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
        const [custRes, openRes, closedRes] = await Promise.all([
          fetch(`${CUSTOMERS_API}/${customerId}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          }),
          fetch(`${TICKETS_API}/by-customer?customerId=${customerId}&status=open`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          }),
          fetch(`${TICKETS_API}/by-customer?customerId=${customerId}&status=closed`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          }),
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
      <div className="min-h-screen bg-dark-bg flex flex-col">
        <NavigationBar />
        <main className="flex-1 page-container">
          <p className="text-dark-text-muted py-8">Loading...</p>
        </main>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col">
        <NavigationBar />
        <main className="flex-1 page-container">
          <div className="p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">{error || 'Customer not found'}</div>
          <button type="button" onClick={() => navigate('/customers')} className="btn-secondary mt-4 w-full sm:w-auto">Back to Customers</button>
        </main>
      </div>
    );
  }

  const tickets = activeTab === 'open' ? openTickets : closedTickets;

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <NavigationBar />
      <main className="flex-1 page-container">
        <button type="button" onClick={() => navigate('/customers')} className="btn-secondary mb-6 w-full sm:w-auto">
          Back to Customers
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-1">
            <div className="rounded-xl bg-dark-surface border border-dark-border p-4 sm:p-6 lg:sticky lg:top-4">
              <h2 className="text-lg sm:text-xl font-semibold text-dark-text mb-4">Customer</h2>
              <dl className="space-y-3 text-dark-text">
                <div>
                  <dt className="text-dark-text-muted text-sm">Name</dt>
                  <dd className="font-medium">{customer.name}</dd>
                </div>
                {customer.physical_address && (
                  <div>
                    <dt className="text-dark-text-muted text-sm">Address</dt>
                    <dd>{customer.physical_address}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-dark-text-muted text-sm">Email</dt>
                  <dd>{customer.email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-dark-text-muted text-sm">Phone</dt>
                  <dd>{customer.phone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-dark-text-muted text-sm">Email notifications</dt>
                  <dd>{customer.email_notifications ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-dark-text-muted text-sm">Text notifications</dt>
                  <dd>{customer.text_notifications ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-dark-text-muted text-sm">Ticket numbers (ID)</dt>
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
                    <th>ID</th>
                    <th>Created</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
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
                      <td>{t.id}</td>
                      <td className="whitespace-nowrap">{new Date(t.creation_date).toLocaleDateString()}</td>
                      <td className="font-medium">{t.subject}</td>
                      <td>{t.category ?? '—'}</td>
                      <td>{t.priority}</td>
                      <td>{t.status}</td>
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerDetailPage;
