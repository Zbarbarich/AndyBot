import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000/api/app/items';

interface Item {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  description: string | null;
  unit_price: number;
  taxable: boolean;
  created_at: string;
  updated_at: string;
}

const ItemsPage = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    sku: '',
    name: '',
    category: '',
    description: '',
    unit_price: '',
    taxable: true,
  });

  const getToken = () => localStorage.getItem('token');

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_BASE, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error('Admin access required');
        throw new Error(res.status === 401 ? 'Unauthorized' : 'Failed to fetch');
      }
      const data = await res.json();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetForm = () => {
    setForm({
      sku: '',
      name: '',
      category: '',
      description: '',
      unit_price: '',
      taxable: true,
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
      const body: Record<string, unknown> = editingId
        ? { name: form.name.trim(), category: form.category || null, description: form.description || null, unit_price: parseFloat(form.unit_price) || 0, taxable: form.taxable }
        : { sku: form.sku.trim(), name: form.name.trim(), category: form.category || null, description: form.description || null, unit_price: parseFloat(form.unit_price) || 0, taxable: form.taxable };
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      resetForm();
      await fetchItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this item?')) return;
    setError('');
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      await fetchItems();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const startEdit = (item: Item) => {
    setForm({
      sku: item.sku,
      name: item.name,
      category: item.category || '',
      description: item.description || '',
      unit_price: String(item.unit_price),
      taxable: item.taxable,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  return (
    <div className="page-container">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text">Items</h1>
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary w-full sm:w-auto"
          >
            Add Item
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
              {editingId ? 'Edit Item' : 'New Item'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl w-full">
              <div className="detail-grid gap-4">
                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-dark-text-muted mb-1">SKU *</label>
                    <input
                      type="text"
                      value={form.sku}
                      onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                      className="input-field max-w-[140px]"
                      required
                    />
                  </div>
                )}
                <div className={editingId ? '' : 'sm:col-span-2'}>
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
                  <label className="block text-sm font-medium text-dark-text-muted mb-1">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="input-field max-w-[180px]"
                    placeholder="e.g. Cabling, Equipment"
                  />
                </div>
                <div className="col-span-full">
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="input-field min-h-[80px]"
                  rows={3}
                />
              </div>
                <div>
                  <label className="block text-sm font-medium text-dark-text-muted mb-1">Unit price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.unit_price}
                    onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                    className="input-field w-28"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-dark-text min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={form.taxable}
                      onChange={(e) => setForm((f) => ({ ...f, taxable: e.target.checked }))}
                    />
                    Taxable
                  </label>
                </div>
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
                  <th className="col-id">SKU</th>
                  <th>Name</th>
                  <th className="col-status">Category</th>
                  <th className="col-amount">Unit price</th>
                  <th className="col-status">Taxable</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="text-dark-text">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-dark-surface-elevated/50">
                    <td className="col-id font-mono">{item.sku}</td>
                    <td className="font-medium">{item.name}</td>
                    <td className="col-status">{item.category ?? '—'}</td>
                    <td className="col-amount whitespace-nowrap">{Number(item.unit_price).toFixed(2)}</td>
                    <td className="col-status">{item.taxable ? 'Yes' : 'No'}</td>
                    <td className="whitespace-nowrap">
                      <span className="flex flex-wrap gap-1 sm:gap-2">
                        <button type="button" onClick={() => startEdit(item)} className="btn-secondary text-sm py-1.5 px-2 sm:px-3 min-h-[36px]">Edit</button>
                        <button type="button" onClick={() => handleDelete(item.id)} className="btn-secondary text-sm text-red-400 py-1.5 px-2 sm:px-3 min-h-[36px]">Delete</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <p className="p-6 text-dark-text-muted text-center">No items yet. Add one to get started.</p>
            )}
          </div>
        )}
    </div>
  );
};

export default ItemsPage;
