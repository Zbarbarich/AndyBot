import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../api/client';
import { BackArrow } from '../components/BackArrow';

const ORDERS_API = 'http://localhost:3000/api/app/orders';

interface OrderSummary {
  id: number;
  document_number: string;
  type: string;
  customer_name: string;
  status: string;
  total: number;
}

const BillOrderPage = () => {
  const navigate = useNavigate();
  const [openOrders, setOpenOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    authFetch(ORDERS_API)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch orders');
        return res.json();
      })
      .then((data: OrderSummary[]) => {
        setOpenOrders(data.filter((o) => o.type === 'order' && o.status === 'open'));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <div className="mb-4">
        <BackArrow to="/invoices" label="Back to Invoices" />
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
          {error}
        </div>
      )}

      <h2 className="text-lg font-semibold text-dark-text mb-4">Select an order to bill</h2>
      {loading ? (
        <p className="text-dark-text-muted py-8">Loading orders…</p>
      ) : openOrders.length === 0 ? (
        <p className="text-dark-text-muted py-8">No open orders. Create or use an order first.</p>
      ) : (
        <div className="rounded-lg border border-dark-border bg-dark-surface overflow-hidden">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Document #</th>
                  <th>Customer</th>
                  <th className="col-amount">Total</th>
                  <th className="col-status">Status</th>
                </tr>
              </thead>
              <tbody className="text-dark-text">
                {openOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer hover:bg-dark-surface-elevated/50 active:bg-dark-surface-elevated/70"
                    onClick={() => navigate(`/orders/${o.id}/billing`)}
                  >
                    <td className="font-mono font-medium">{o.document_number}</td>
                    <td>{o.customer_name}</td>
                    <td className="col-amount whitespace-nowrap">{Number(o.total).toFixed(2)}</td>
                    <td className="col-status">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillOrderPage;
