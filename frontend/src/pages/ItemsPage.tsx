import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { authFetch } from '../api/client';
import { apiBase } from '../api/config';
import { ErrorBanner } from '../components/ErrorBanner';
import ListCardRow from '../components/ListCardRow';
import { ListPageToolbar } from '../components/MobilePageTitle';

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
      <ListPageToolbar>
        <button
          type="button"
          onClick={() => navigate('/items/new')}
          className="btn-icon-primary shrink-0"
          aria-label="Add item"
        >
          <Plus className="w-5 h-5" />
        </button>
      </ListPageToolbar>

      <ErrorBanner message={error} />

      <div className="glass-card overflow-hidden">
        {loading ? (
          <p className="text-text-muted py-8 px-4">Loading...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-text-muted text-center">No items yet. Add one to get started.</p>
        ) : (
          <>
            <div className="md:hidden p-3 space-y-3">
              {items.map((item) => (
                <ListCardRow
                  key={item.id}
                  title={item.name}
                  subtitle={item.category ?? undefined}
                  meta={
                    <>
                      <span className="font-mono">{item.sku}</span>
                      <span>${Number(item.unit_price).toFixed(2)}</span>
                      <span>{item.unit_of_measure ?? 'EA'}</span>
                      <span>Stock {Number(item.stock ?? 0).toFixed(0)}</span>
                    </>
                  }
                  onClick={() => navigate(`/items/${item.id}`)}
                />
              ))}
            </div>
            <div className="hidden md:block table-scroll border-0 rounded-none">
              <table>
                <thead>
                  <tr>
                    <th className="col-sku">SKU</th>
                    <th>Name</th>
                    <th className="col-status">Category</th>
                    <th className="col-amount">Unit price</th>
                    <th className="col-status">U/M</th>
                    <th className="col-amount">Stock</th>
                    <th className="col-amount">Our cost</th>
                    <th className="col-status">Taxable</th>
                  </tr>
                </thead>
                <tbody className="text-text">
                  {items.map((item) => (
                    <tr key={item.id} className="cursor-pointer" onClick={() => navigate(`/items/${item.id}`)}>
                      <td className="col-sku" title={item.sku}>{item.sku}</td>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ItemsPage;
