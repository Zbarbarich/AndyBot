import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { authFetch } from '../api/client';
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

const ItemsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(API_BASE);
      if (!res.ok) {
        if (res.status === 403) throw new Error('Admin access required');
        throw new Error('Failed to fetch');
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

  return (
    <div className="page-container">
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => navigate('/items/new')}
          className="btn-icon-primary"
          aria-label="Add item"
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
                  <th className="col-id">SKU</th>
                  <th>Name</th>
                  <th className="col-status">Category</th>
                  <th className="col-amount">Unit price</th>
                  <th className="col-status">U/M</th>
                  <th className="col-amount">Stock</th>
                  <th className="col-amount">Our cost</th>
                  <th className="col-status">Taxable</th>
                </tr>
              </thead>
              <tbody className="text-dark-text">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer hover:bg-dark-surface-elevated/50 active:bg-dark-surface-elevated/70"
                    onClick={() => navigate(`/items/${item.id}`)}
                  >
                    <td className="col-id font-mono">{item.sku}</td>
                    <td className="font-medium">{item.name}</td>
                    <td className="col-status">{item.category ?? '—'}</td>
                    <td className="col-amount whitespace-nowrap">{Number(item.unit_price).toFixed(2)}</td>
                    <td className="col-status font-mono">{item.unit_of_measure ?? 'EA'}</td>
                    <td className="col-amount whitespace-nowrap">{Number(item.stock ?? 0).toFixed(2)}</td>
                    <td className="col-amount whitespace-nowrap">{Number(item.our_cost ?? 0).toFixed(2)}</td>
                    <td className="col-status">{item.taxable ? 'Yes' : 'No'}</td>
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
    </div>
  );
};

export default ItemsPage;
