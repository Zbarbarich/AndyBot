import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authFetch } from '../api/client';
import { BackArrow } from '../components/BackArrow';
import { apiBase } from '../api/config';

const API_BASE = `${apiBase}/api/app/items`;
const UNIT_OPTIONS = ['EA', 'DZ', 'ST', 'HR'] as const;

const ItemEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    unit_price: '',
    unit_of_measure: 'EA' as string,
    taxable: true,
    stock: '',
    our_cost: '',
  });

  useEffect(() => {
    if (!id) return;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      setError('Invalid item id');
      setLoading(false);
      return;
    }
    authFetch(`${API_BASE}/${itemId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Item not found');
        return res.json();
      })
      .then((item: { name: string; category: string | null; description: string | null; unit_price: number; unit_of_measure?: string | null; taxable: boolean; stock?: number; our_cost?: number }) => {
        setForm({
          name: item.name,
          category: item.category ?? '',
          description: item.description ?? '',
          unit_price: String(item.unit_price),
          unit_of_measure: item.unit_of_measure ?? 'EA',
          taxable: item.taxable,
          stock: item.stock != null ? String(item.stock) : '',
          our_cost: item.our_cost != null ? String(item.our_cost) : '',
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    const stockNum = parseFloat(form.stock);
    const costNum = parseFloat(form.our_cost);
    try {
      const res = await authFetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category || null,
          description: form.description || null,
          unit_price: parseFloat(form.unit_price) || 0,
          unit_of_measure: form.unit_of_measure || 'EA',
          taxable: form.taxable,
          stock: Number.isFinite(stockNum) ? stockNum : undefined,
          our_cost: Number.isFinite(costNum) ? costNum : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Update failed');
      navigate(`/items/${id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p className="text-text-muted py-8">Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-4">
        <BackArrow to={id ? `/items/${id}` : '/items'} label="Back to Item" />
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
          {error}
        </div>
      )}

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4 detail-card">
          <h2 className="text-lg font-semibold text-text mb-4">Edit Item</h2>
          <div className="detail-grid gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text-muted mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="input-field max-w-[180px]"
              />
            </div>
            <div className="col-span-full">
              <label className="block text-sm font-medium text-text-muted mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="input-field min-h-[80px]"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Unit price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.unit_price}
                onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                className="input-field w-28"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Unit of measure</label>
              <select
                value={form.unit_of_measure}
                onChange={(e) => setForm((f) => ({ ...f, unit_of_measure: e.target.value }))}
                className="input-field w-28"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-text min-h-[44px]">
                <input
                  type="checkbox"
                  checked={form.taxable}
                  onChange={(e) => setForm((f) => ({ ...f, taxable: e.target.checked }))}
                />
                Taxable
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Stock</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                className="input-field w-28"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Our cost (PO)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.our_cost}
                onChange={(e) => setForm((f) => ({ ...f, our_cost: e.target.value }))}
                className="input-field w-28"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="btn-primary">Save</button>
            <button type="button" onClick={() => navigate(id ? `/items/${id}` : '/items')} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemEditPage;
