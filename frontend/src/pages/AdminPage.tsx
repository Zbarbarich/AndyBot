import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { authFetch } from '../api/client';
import { apiBase } from '../api/config';
import { ErrorBanner } from '../components/ErrorBanner';
import ListCardRow from '../components/ListCardRow';
import { ListPageToolbar } from '../components/MobilePageTitle';

const AUTH_BASE = `${apiBase}/api/auth`;

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
      <ListPageToolbar>
        <button type="button" onClick={() => navigate('/admin/users/new')} className="btn-icon-primary" aria-label="Create user">
          <Plus className="w-5 h-5" />
        </button>
      </ListPageToolbar>

      <ErrorBanner message={error} />

      <div className="glass-card overflow-hidden">
        {loading ? (
          <p className="text-text-muted py-8 px-4">Loading...</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-text-muted text-center">No users.</p>
        ) : (
          <>
            <div className="md:hidden p-3 space-y-3">
              {users.map((u) => (
                <ListCardRow
                  key={u.userID}
                  title={u.userName}
                  subtitle={u.email}
                  meta={<span className="capitalize">{u.role}</span>}
                  onClick={() => openEdit(u)}
                />
              ))}
            </div>
            <div className="hidden md:block table-scroll border-0 rounded-none">
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
                <tbody className="text-text">
                  {users.map((u) => (
                    <tr key={u.userID}>
                      <td className="col-id font-mono">{u.userID}</td>
                      <td className="font-medium">{u.userName}</td>
                      <td>{u.email}</td>
                      <td className="col-status">{u.role}</td>
                      <td className="whitespace-nowrap">
                        <button type="button" onClick={() => openEdit(u)} className="btn-secondary text-xs py-2 px-3 min-h-[44px]">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {editingUser && (
        <div className="modal-overlay safe-area-pb" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
          <div className="modal-content">
            <h2 id="edit-user-title" className="text-lg font-display font-semibold text-text mb-4">Edit User – {editingUser.userName}</h2>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Email *</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">New password (leave blank to keep)</label>
                <input type="password" value={editForm.password} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} className="input-field" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Role</label>
                <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))} className="input-field max-w-[120px]">
                  <option value="admin">Admin</option>
                  <option value="tech">Tech</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="submit" className="btn-primary">Save</button>
                <button type="button" onClick={() => handleDeleteUser(editingUser.userID)} className="btn-secondary text-red-600 dark:text-red-400">Delete user</button>
                <button type="button" onClick={() => { setEditingUser(null); setError(''); }} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
