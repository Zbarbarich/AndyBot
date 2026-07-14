import { Link } from 'react-router-dom';
import DashboardWidget from '../DashboardWidget';
import { useDashboardSummary } from '../useDashboardSummary';
import { formatDate } from '../../../utils/formatDate';

const OpenOrdersWidget = () => {
  const { summary, loading, error } = useDashboardSummary();
  const orders = summary?.recentOrders ?? [];

  return (
    <DashboardWidget title="Recent orders" loading={loading} error={error}>
      {orders.length === 0 ? (
        <p className="text-text-muted text-sm">No orders yet.</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                to={`/orders/${o.id}`}
                className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg border border-border hover:border-primary/30 transition-colors no-underline"
              >
                <span className="font-mono text-sm text-text">{o.document_number}</span>
                <span className="text-sm text-text-muted truncate flex-1 min-w-0">{o.customer_name}</span>
                <span className="text-xs text-text-muted capitalize">{o.status}</span>
                <span className="font-mono text-sm">{Number(o.total).toFixed(2)}</span>
                {o.order_date && (
                  <span className="text-xs text-text-muted w-full">{formatDate(o.order_date)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardWidget>
  );
};

export default OpenOrdersWidget;
