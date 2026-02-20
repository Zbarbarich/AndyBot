import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { authFetch } from '../api/client';

const AUTH_BASE = 'http://localhost:3000/api/auth';

interface User {
  userID: number;
  userName: string;
  email: string;
  role: string;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ email: '', password: '', role: 'tech' });

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${AUTH_BASE}/users`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) throw new Error('Admin access required');
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(data.error || 'Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEdit = (u: User) => {
    setEditingUser(u);
    setEditForm({ email: u.email, password: '', role: u.role });
    setError('');
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    try {
      const body: { email?: string; password?: string; role?: string } = {
        email: editForm.email.trim(),
        role: editForm.role,
      };
      if (editForm.password.trim()) body.password = editForm.password.trim();
      const res = await authFetch(`${AUTH_BASE}/users/${editingUser.userID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setEditingUser(null);
      await fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const handleDeleteUser = async (userID: number) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setError('');
    try {
      const res = await authFetch(`${AUTH_BASE}/users/${userID}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      setEditingUser(null);
      await fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="page-container">
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => navigate('/admin/users/new')}
          className="btn-icon-primary"
          aria-label="Create user"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-dark-border bg-dark-surface overflow-hidden">
        {loading ? (
          <p className="text-dark-text-muted py-8 px-4">Loading...</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="col-id">ID</th>
                  <th>User name</th>
                  <th>Email</th>
                  <th className="col-status">Role</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="text-dark-text">
                {users.map((u) => (
                  <tr key={u.userID}>
                    <td className="col-id font-mono">{u.userID}</td>
                    <td className="font-medium">{u.userName}</td>
                    <td>{u.email}</td>
                    <td className="col-status">{u.role}</td>
                    <td className="whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="btn-secondary text-xs py-1 px-1.5 sm:px-2 min-h-[27px]"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="p-6 text-dark-text-muted text-center">No users.</p>
            )}
          </div>
        )}
      </div>

      {editingUser && (
        <div className="modal-overlay safe-area-pb" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
          <div className="modal-content">
            <h2 id="edit-user-title" className="text-lg font-semibold text-dark-text mb-4">Edit User – {editingUser.userName}</h2>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Email *</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">New password (leave blank to keep)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className="input-field max-w-[120px]"
                >
                  <option value="admin">Admin</option>
                  <option value="tech">Tech</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="submit" className="btn-primary">Save</button>
                <button
                  type="button"
                  onClick={() => handleDeleteUser(editingUser.userID)}
                  className="btn-secondary text-red-400"
                >
                  Delete user
                </button>
                <button type="button" onClick={() => { setEditingUser(null); setError(''); }} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
