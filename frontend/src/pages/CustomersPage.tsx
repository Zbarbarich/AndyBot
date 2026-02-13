import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../components/NavigationBar';

const API_BASE = 'http://localhost:3000/api/app/customers';

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

const CustomersPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    physical_address: '',
    email: '',
    phone: '',
    email_notifications: true,
    text_notifications: false,
  });

  const getToken = () => localStorage.getItem('token');

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_BASE, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Unauthorized' : 'Failed to fetch');
      const data = await res.json();
      setCustomers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const resetForm = () => {
    setForm({
      name: '',
      physical_address: '',
      email: '',
      phone: '',
      email_notifications: true,
      text_notifications: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const url = editingId ? `${API_BASE}/${editingId}` : API_BASE;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          physical_address: form.physical_address || null,
          email: form.email || null,
          phone: form.phone || null,
          email_notifications: form.email_notifications,
          text_notifications: form.text_notifications,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      resetForm();
      await fetchCustomers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this customer?')) return;
    setError('');
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      await fetchCustomers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const startEdit = (c: Customer) => {
    setForm({
      name: c.name,
      physical_address: c.physical_address || '',
      email: c.email || '',
      phone: c.phone || '',
      email_notifications: c.email_notifications,
      text_notifications: c.text_notifications,
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <NavigationBar />
      <main className="flex-1 page-container">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text">Customers</h1>
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary w-full sm:w-auto"
          >
            Add Customer
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
              {editingId ? 'Edit Customer' : 'New Customer'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md w-full">
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Physical address</label>
                <input
                  type="text"
                  value={form.physical_address}
                  onChange={(e) => setForm((f) => ({ ...f, physical_address: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-dark-text min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={form.email_notifications}
                    onChange={(e) => setForm((f) => ({ ...f, email_notifications: e.target.checked }))}
                  />
                  Email notifications
                </label>
                <label className="flex items-center gap-2 text-dark-text min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={form.text_notifications}
                    onChange={(e) => setForm((f) => ({ ...f, text_notifications: e.target.checked }))}
                  />
                  Text notifications
                </label>
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
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Ticket #s</th>
                  <th>Email notif.</th>
                  <th>Text notif.</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="text-dark-text">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer hover:bg-dark-surface-elevated/50 active:bg-dark-surface-elevated/70"
                    onClick={() => navigate(`/customers/${c.id}`)}
                  >
                    <td>{c.id}</td>
                    <td className="font-medium">{c.name}</td>
                    <td>{c.email ?? '—'}</td>
                    <td>{c.phone ?? '—'}</td>
                    <td className="whitespace-nowrap">{(c.ticket_ids && c.ticket_ids.length > 0) ? c.ticket_ids.join(', ') : '—'}</td>
                    <td>{c.email_notifications ? 'Yes' : 'No'}</td>
                    <td>{c.text_notifications ? 'Yes' : 'No'}</td>
                    <td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <span className="flex flex-wrap gap-1 sm:gap-2">
                        <button type="button" onClick={() => startEdit(c)} className="btn-secondary text-sm py-1.5 px-2 sm:px-3 min-h-[36px]">Edit</button>
                        <button type="button" onClick={() => handleDelete(c.id)} className="btn-secondary text-sm text-red-400 py-1.5 px-2 sm:px-3 min-h-[36px]">Delete</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customers.length === 0 && (
              <p className="p-6 text-dark-text-muted text-center">No customers yet. Add one to get started.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomersPage;
