import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../api/client';
import { BackArrow } from '../components/BackArrow';

const API_BASE = 'http://localhost:3000/api/app/tickets';
const CUSTOMERS_API = 'http://localhost:3000/api/app/customers';

const TICKET_STATUSES = ['Open', 'Pending Closure Review', 'Closed'] as const;

interface Customer {
  id: number;
  name: string;
  email: string | null;
}

const TicketFormPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    subject: '',
    customer_id: '' as string | number | null,
    category: '',
    description: '',
    email: '',
    priority: 3,
    status: 'Open' as (typeof TICKET_STATUSES)[number],
  });

  useEffect(() => {
    authFetch(CUSTOMERS_API)
      .then((res) => res.ok ? res.json() : [])
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, []);

  const onCustomerChange = (customerId: string) => {
    const id = customerId === '' ? '' : Number(customerId);
    setForm((f) => ({
      ...f,
      customer_id: id,
      email: id ? (customers.find((c) => c.id === Number(id))?.email ?? f.email) : f.email,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const customerId = form.customer_id === '' || form.customer_id == null ? null : Number(form.customer_id);
      const res = await authFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: form.subject.trim(),
          customer_id: customerId,
          category: form.category || null,
          description: form.description || null,
          email: form.email || null,
          priority: Math.min(5, Math.max(1, form.priority)),
          status: form.status,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      navigate(`/tickets/${data.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
  };

  return (
    <div className="page-container">
      <div className="mb-4">
        <BackArrow to="/tickets" label="Back to Tickets" />
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border space-y-6">
        <h2 className="text-lg font-semibold text-dark-text">New Ticket</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <option key={c.id} value={c.id}>
                  {c.name} {c.email ? `(${c.email})` : ''}
                </option>
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
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as (typeof TICKET_STATUSES)[number] }))}
              className="input-field"
            >
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
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
        <div className="flex flex-wrap gap-2 pt-2">
          <button type="submit" className="btn-primary">
            Save
          </button>
          <button type="button" onClick={() => navigate('/tickets')} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default TicketFormPage;
