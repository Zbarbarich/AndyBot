import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../api/client';
import { BackArrow } from '../components/BackArrow';
import { apiBase } from '../api/config';

const API_BASE = `${apiBase}/api/app/items`;
const UNIT_OPTIONS = ['EA', 'DZ', 'ST', 'HR'] as const;

const ItemFormPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    sku: '',
    name: '',
    category: '',
    description: '',
    unit_price: '',
    unit_of_measure: 'EA' as string,
    taxable: true,
    stock: '',
    our_cost: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const stockNum = parseFloat(form.stock);
    const costNum = parseFloat(form.our_cost);
    try {
      const res = await authFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: form.sku.trim(),
          name: form.name.trim(),
          category: form.category || null,
          description: form.description || null,
          unit_price: parseFloat(form.unit_price) || 0,
          unit_of_measure: form.unit_of_measure || 'EA',
          taxable: form.taxable,
          stock: Number.isFinite(stockNum) ? stockNum : 0,
          our_cost: Number.isFinite(costNum) ? costNum : 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      navigate(`/items/${data.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
  };

  return (
    <div className="page-container">
      <div className="mb-4">
        <BackArrow to="/items" label="Back to Items" />
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
          {error}
        </div>
      )}

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl bg-dark-surface border border-dark-border">
          <h2 className="text-lg font-semibold text-dark-text mb-4">New Item</h2>
          <div className="detail-grid gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text-muted mb-1">SKU * (max 16 chars, letters, numbers, - and _)</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                className="input-field max-w-[140px]"
                maxLength={16}
                required
              />
            </div>
            <div className="sm:col-span-2">
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
            <div>
              <label className="block text-sm font-medium text-dark-text-muted mb-1">Unit of measure</label>
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
              <label className="flex items-center gap-2 text-dark-text min-h-[44px]">
                <input
                  type="checkbox"
                  checked={form.taxable}
                  onChange={(e) => setForm((f) => ({ ...f, taxable: e.target.checked }))}
                />
                Taxable
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text-muted mb-1">Stock</label>
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
              <label className="block text-sm font-medium text-dark-text-muted mb-1">Our cost (PO)</label>
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
            <button type="button" onClick={() => navigate('/items')} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemFormPage;
