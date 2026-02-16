import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:3000/api/app/orders';

interface OrderSummary {
  id: number;
  document_number: string;
  type: string;
  customer_id: number;
  customer_name: string;
  status: string;
  order_date: string | null;
  total: number;
  created_at: string;
}

const OrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);

  const getToken = () => localStorage.getItem('token');

  const handleDownloadPdf = async (id: number, documentNumber: string) => {
    setPdfLoadingId(id);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/${id}/pdf`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${documentNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download PDF');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_BASE, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Unauthorized' : 'Failed to fetch');
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="page-container">
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-dark-text">Begin Order</h1>
            <button
              type="button"
              onClick={() => navigate('/orders/new')}
              className="btn-primary w-full sm:w-auto"
            >
            New document
          </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-dark-text-muted py-8">Loading...</p>
        ) : (
          <div className="grid w-full">
            <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Document #</th>
                  <th className="col-status">Type</th>
                  <th>Customer</th>
                  <th className="col-amount">Total</th>
                  <th className="col-status">Status</th>
                  <th className="col-date">Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="text-dark-text">
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer hover:bg-dark-surface-elevated/50"
                    onClick={() => navigate(`/orders/${o.id}`)}
                  >
                    <td className="font-mono font-medium">{o.document_number}</td>
                    <td className="col-status capitalize">{o.type ?? 'order'}</td>
                    <td>{o.customer_name}</td>
                    <td className="col-amount whitespace-nowrap">{Number(o.total).toFixed(2)}</td>
                    <td className="col-status">{o.status}</td>
                    <td className="col-date whitespace-nowrap">{o.order_date ?? '—'}</td>
                    <td className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <span className="flex flex-wrap gap-1 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${o.id}`)}
                          className="btn-secondary text-sm py-1.5 px-2 sm:px-3 min-h-[36px]"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(o.id, o.document_number)}
                          disabled={pdfLoadingId === o.id}
                          className="btn-secondary text-sm py-1.5 px-2 sm:px-3 min-h-[36px]"
                        >
                          {pdfLoadingId === o.id ? '…' : 'PDF'}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <p className="p-6 text-dark-text-muted text-center">No orders yet. Create one or convert a quote.</p>
            )}
            </div>
          </div>
        )}
    </div>
  );
};

export default OrdersPage;
