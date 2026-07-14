import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../api/client';
import { BackArrow } from '../components/BackArrow';
import { apiBase } from '../api/config';

const AUTH_BASE = `${apiBase}/api/auth`;

const AdminCreateUserPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    userName: '',
    email: '',
    password: '',
    role: 'tech',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await authFetch(`${AUTH_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      navigate('/admin', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  return (
    <div className="page-container">
      <div className="mb-4">
        <BackArrow to="/admin" label="Back to Admin" />
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
          {error}
        </div>
      )}

      <div className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4 detail-card">
          <h2 className="text-lg font-semibold text-text mb-4">Create User</h2>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">User name *</label>
            <input
              type="text"
              value={form.userName}
              onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Password *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="input-field max-w-[120px]"
            >
              <option value="admin">Admin</option>
              <option value="tech">Tech</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="btn-primary">Create</button>
            <button type="button" onClick={() => navigate('/admin')} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminCreateUserPage;
