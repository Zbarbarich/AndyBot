import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../api/client';
import { BackArrow } from '../components/BackArrow';
import { apiBase } from '../api/config';

const API_BASE = `${apiBase}/api/app/customers`;

const CustomerFormPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    contact_name: '',
    physical_address: '',
    email: '',
    phone: '',
    email_notifications: true,
    text_notifications: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await authFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          contact_name: form.contact_name.trim() || null,
          physical_address: form.physical_address || null,
          email: form.email || null,
          phone: form.phone || null,
          email_notifications: form.email_notifications,
          text_notifications: form.text_notifications,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      navigate(`/customers/${data.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
  };

  return (
    <div className="page-container">
      <div className="mb-4">
        <BackArrow to="/customers" label="Back to Customers" />
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
          {error}
        </div>
      )}

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl bg-dark-surface border border-dark-border">
          <h2 className="text-lg font-semibold text-dark-text mb-4">New Customer</h2>
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
            <label className="block text-sm font-medium text-dark-text-muted mb-1">Contact name (POC)</label>
            <input
              type="text"
              value={form.contact_name}
              onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
              className="input-field"
              placeholder="Point of contact"
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
            <label className="flex items-center gap-2 text-dark-text">
              <input
                type="checkbox"
                checked={form.email_notifications}
                onChange={(e) => setForm((f) => ({ ...f, email_notifications: e.target.checked }))}
              />
              Email notifications
            </label>
            <label className="flex items-center gap-2 text-dark-text">
              <input
                type="checkbox"
                checked={form.text_notifications}
                onChange={(e) => setForm((f) => ({ ...f, text_notifications: e.target.checked }))}
              />
              Text notifications
            </label>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="btn-primary">
              Save
            </button>
            <button type="button" onClick={() => navigate('/customers')} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerFormPage;
