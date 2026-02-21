import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../api/client';
import { BackArrow } from '../components/BackArrow';
import { apiBase } from '../api/config';

const API_BASE = `${apiBase}/api/app/items`;

interface Item {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  description: string | null;
  unit_price: number;
  taxable: boolean;
  stock?: number;
  our_cost?: number;
  unit_of_measure?: string | null;
  created_at: string;
  updated_at: string;
}

const ItemDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      .then(setItem)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!item || !window.confirm('Delete this item?')) return;
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      navigate('/items');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p className="text-dark-text-muted py-8">Loading...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="page-container">
        <p className="text-red-400">{error || 'Item not found'}</p>
        <BackArrow to="/items" label="Back to Items" className="mt-4" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-4">
        <BackArrow to="/items" label="Back to Items" />
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="max-w-2xl p-6 rounded-xl bg-dark-surface border border-dark-border">
        <h2 className="text-lg font-semibold text-dark-text mb-4">Item</h2>
        <dl className="space-y-2 text-sm text-dark-text">
          <div><dt className="text-dark-text-muted text-xs">SKU</dt><dd className="font-mono">{item.sku}</dd></div>
          <div><dt className="text-dark-text-muted text-xs">Name</dt><dd className="font-medium">{item.name}</dd></div>
          <div><dt className="text-dark-text-muted text-xs">Category</dt><dd>{item.category ?? '—'}</dd></div>
          <div><dt className="text-dark-text-muted text-xs">Description</dt><dd className="whitespace-pre-wrap">{item.description ?? '—'}</dd></div>
          <div><dt className="text-dark-text-muted text-xs">Unit price</dt><dd className="font-mono">{Number(item.unit_price).toFixed(2)}</dd></div>
          <div><dt className="text-dark-text-muted text-xs">Unit of measure</dt><dd className="font-mono">{item.unit_of_measure ?? 'EA'}</dd></div>
          <div><dt className="text-dark-text-muted text-xs">Stock</dt><dd className="font-mono">{Number(item.stock ?? 0).toFixed(2)}</dd></div>
          <div><dt className="text-dark-text-muted text-xs">Our cost (PO)</dt><dd className="font-mono">{Number(item.our_cost ?? 0).toFixed(2)}</dd></div>
          <div><dt className="text-dark-text-muted text-xs">Taxable</dt><dd>{item.taxable ? 'Yes' : 'No'}</dd></div>
        </dl>
        <div className="mt-4 pt-4 border-t border-dark-border flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate(`/items/${item.id}/edit`)} className="btn-secondary text-sm py-1.5 px-3 min-h-[36px]">
            Edit
          </button>
          <button type="button" onClick={handleDelete} className="btn-secondary text-sm text-red-400 py-1.5 px-3 min-h-[36px]">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailPage;
