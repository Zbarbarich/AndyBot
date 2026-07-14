import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../api/client';
import { BackArrow } from '../components/BackArrow';
import { apiBase } from '../api/config';
import { ErrorBanner } from '../components/ErrorBanner';
import ListCardRow from '../components/ListCardRow';

const ORDERS_API = `${apiBase}/api/app/orders`;

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

      <ErrorBanner message={error} />

      <h2 className="text-lg font-display font-semibold text-text mb-4">Select an order to bill</h2>
      {loading ? (
        <p className="text-text-muted py-8">Loading orders…</p>
      ) : openOrders.length === 0 ? (
        <p className="text-text-muted py-8">No open orders. Create or use an order first.</p>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="md:hidden p-3 space-y-3">
            {openOrders.map((o) => (
              <ListCardRow
                key={o.id}
                title={o.document_number}
                subtitle={o.customer_name}
                meta={
                  <>
                    <span>${Number(o.total).toFixed(2)}</span>
                    <span>{o.status}</span>
                  </>
                }
                onClick={() => navigate(`/orders/${o.id}/billing`)}
              />
            ))}
          </div>
          <div className="hidden md:block table-scroll border-0 rounded-none">
            <table>
              <thead>
                <tr>
                  <th>Document #</th>
                  <th>Customer</th>
                  <th className="col-amount">Total</th>
                  <th className="col-status">Status</th>
                </tr>
              </thead>
              <tbody className="text-text">
                {openOrders.map((o) => (
                  <tr key={o.id} className="cursor-pointer" onClick={() => navigate(`/orders/${o.id}/billing`)}>
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
