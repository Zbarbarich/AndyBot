import { useState, useEffect } from 'react';

const AUTH_BASE = 'http://localhost:3000/api/auth';

interface User {
  userID: number;
  userName: string;
  email: string;
  role: string;
}

const AdminPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    userName: '',
    email: '',
    password: '',
    role: 'tech',
  });

  const getToken = () => localStorage.getItem('token');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${AUTH_BASE}/users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error('Admin access required');
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${AUTH_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setCreateForm({ userName: '', email: '', password: '', role: 'tech' });
      setShowCreate(false);
      await fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const handleDeleteUser = async (userID: number) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setError('');
    try {
      const res = await fetch(`${AUTH_BASE}/users/${userID}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      await fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="page-container">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text">Admin – Users</h1>
          <button
            type="button"
            onClick={() => { setShowCreate(true); setError(''); }}
            className="btn-primary w-full sm:w-auto"
          >
            Create User
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
            {error}
          </div>
        )}

        {showCreate && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border max-w-md w-full">
            <h2 className="text-lg sm:text-xl font-semibold text-dark-text mb-4">Create User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4 max-w-md">
              <div className="detail-grid gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-dark-text-muted mb-1">User name *</label>
                <input
                  type="text"
                  value={createForm.userName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, userName: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Email *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Password *</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                  className="input-field max-w-[120px]"
                >
                  <option value="admin">Admin</option>
                  <option value="tech">Tech</option>
                </select>
              </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn-primary">Create</button>
                <button type="button" onClick={() => { setShowCreate(false); setError(''); }} className="btn-secondary">Cancel</button>
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
                  <th>User name</th>
                  <th>Email</th>
                  <th className="col-status">Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="text-dark-text">
                {users.map((u) => (
                  <tr key={u.userID}>
                    <td className="col-id font-mono">{u.userID}</td>
                    <td className="font-medium">{u.userName}</td>
                    <td>{u.email}</td>
                    <td className="col-status">{u.role}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.userID)}
                        className="btn-secondary text-sm text-red-400 py-1.5 px-2 sm:px-3 min-h-[36px]"
                      >
                        Delete
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
  );
};

export default AdminPage;
