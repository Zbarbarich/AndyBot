import { Link } from 'react-router-dom';
import { useDashboardSummary } from '../useDashboardSummary';

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DashboardWelcomeWidget = () => {
  const { summary, loading } = useDashboardSummary();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const mtdRevenue = summary?.revenueByMonth.find((r) => r.month === monthKey)?.total ?? 0;
  const ar = summary?.accountsReceivable ?? 0;
  const attention =
    (summary?.openTickets ?? 0) + (summary?.openInvoices ?? 0);

  return (
    <div className="glass-panel p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-text">Overview</h1>
          <p className="text-sm text-text-muted mt-0.5">{today}</p>
        </div>
        {!loading && attention > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {attention} item{attention === 1 ? '' : 's'} need attention
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/invoices"
          className="rounded-xl border border-border bg-bg/40 p-3 no-underline hover:border-primary/40 transition-colors"
        >
          <p className="text-xs text-text-muted uppercase tracking-wide">Accounts receivable</p>
          <p className="mt-1 text-lg sm:text-xl font-semibold font-mono text-text tabular-nums">
            {loading ? '…' : `$${formatMoney(ar)}`}
          </p>
        </Link>
        <div className="rounded-xl border border-border bg-bg/40 p-3">
          <p className="text-xs text-text-muted uppercase tracking-wide">Revenue this month</p>
          <p className="mt-1 text-lg sm:text-xl font-semibold font-mono text-text tabular-nums">
            {loading ? '…' : `$${formatMoney(mtdRevenue)}`}
          </p>
        </div>
        <Link
          to="/orders"
          className="rounded-xl border border-border bg-bg/40 p-3 no-underline hover:border-primary/40 transition-colors"
        >
          <p className="text-xs text-text-muted uppercase tracking-wide">Open orders</p>
          <p className="mt-1 text-lg sm:text-xl font-semibold tabular-nums text-text">
            {loading ? '…' : summary?.openOrders ?? 0}
          </p>
        </Link>
        <Link
          to="/tickets"
          className="rounded-xl border border-border bg-bg/40 p-3 no-underline hover:border-primary/40 transition-colors"
        >
          <p className="text-xs text-text-muted uppercase tracking-wide">Open tickets</p>
          <p className="mt-1 text-lg sm:text-xl font-semibold tabular-nums text-text">
            {loading ? '…' : summary?.openTickets ?? 0}
          </p>
        </Link>
      </div>
    </div>
  );
};

export default DashboardWelcomeWidget;
