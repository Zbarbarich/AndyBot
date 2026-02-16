import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:3000/api/app/tickets';
const CUSTOMERS_API = 'http://localhost:3000/api/app/customers';

const TICKET_STATUSES = ['Open', 'Pending Closure Review', 'Closed'] as const;

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

interface Customer {
  id: number;
  name: string;
  email: string | null;
}

const TicketsPage = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    subject: '',
    customer_id: '' as string | number | null,
    category: '',
    description: '',
    email: '',
    priority: 3,
    status: 'Open' as typeof TICKET_STATUSES[number],
  });

  const getToken = () => localStorage.getItem('token');

  const fetchTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_BASE, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Unauthorized' : 'Failed to fetch');
      const data = await res.json();
      setTickets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(CUSTOMERS_API, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchCustomers();
  }, []);

  const resetForm = () => {
    setForm({
      subject: '',
      customer_id: '',
      category: '',
      description: '',
      email: '',
      priority: 3,
      status: 'Open',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const customerId = form.customer_id === '' || form.customer_id == null ? null : Number(form.customer_id);
      const payload = {
        subject: form.subject.trim(),
        customer_id: customerId,
        category: form.category || null,
        description: form.description || null,
        email: form.email || null,
        priority: Math.min(5, Math.max(1, form.priority)),
        status: form.status,
      };
      const url = editingId ? `${API_BASE}/${editingId}` : API_BASE;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Request failed');
      resetForm();
      await fetchTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this ticket?')) return;
    setError('');
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      await fetchTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const startEdit = (t: Ticket) => {
    setForm({
      subject: t.subject,
      customer_id: t.customer_id ?? '',
      category: t.category ?? '',
      description: t.description ?? '',
      email: t.email ?? '',
      priority: t.priority,
      status: (TICKET_STATUSES.includes(t.status as typeof TICKET_STATUSES[number]) ? t.status : 'Open') as typeof TICKET_STATUSES[number],
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  const onCustomerChange = (customerId: string) => {
    const id = customerId === '' ? '' : Number(customerId);
    setForm((f) => ({
      ...f,
      customer_id: id,
      email: id ? (customers.find((c) => c.id === Number(id))?.email ?? f.email) : f.email,
    }));
  };

  return (
    <div className="page-container">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text">Tickets</h1>
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary w-full sm:w-auto"
          >
            New Ticket
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border">
            <h2 className="text-lg sm:text-xl font-semibold text-dark-text mb-4">
              {editingId ? 'Edit Ticket' : 'New Ticket'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg w-full">
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Subject *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Customer (N/A if none)</label>
                <select
                  value={form.customer_id === null ? '' : String(form.customer_id)}
                  onChange={(e) => onCustomerChange(e.target.value)}
                  className="input-field"
                >
                  <option value="">— N/A —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Email (contact for this ticket)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="input-field min-h-[100px]"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Priority (1–5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) || 3 }))}
                  className="input-field w-24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof TICKET_STATUSES[number] }))}
                  className="input-field"
                >
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn-primary">Save</button>
                <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-dark-text-muted py-8">Loading...</p>
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
                    <td className="font-medium max-w-[200px] truncate sm:max-w-none sm:truncate-none">{t.subject}</td>
                    <td>{t.customer_name ?? (t.email ?? '—')}</td>
                    <td>{t.category ?? '—'}</td>
                    <td className="col-id">{t.priority}</td>
                    <td className="col-status">{t.status ?? 'Open'}</td>
                    <td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <span className="flex flex-wrap gap-1 sm:gap-2">
                        <button type="button" onClick={() => startEdit(t)} className="btn-secondary text-sm py-1.5 px-2 sm:px-3 min-h-[36px]">Edit</button>
                        <button type="button" onClick={() => handleDelete(t.id)} className="btn-secondary text-sm text-red-400 py-1.5 px-2 sm:px-3 min-h-[36px]">Delete</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tickets.length === 0 && (
              <p className="p-6 text-dark-text-muted text-center">No tickets yet. Create one to get started.</p>
            )}
          </div>
        )}
    </div>
  );
};

export default TicketsPage;
