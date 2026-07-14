import { ErrorBanner } from '../components/ErrorBanner';
import DashboardWelcomeWidget from '../components/dashboard/widgets/DashboardWelcomeWidget';
import RevenueChartWidget from '../components/dashboard/widgets/RevenueChartWidget';
import KpiCardWidget from '../components/dashboard/widgets/KpiCardWidget';
import OpenOrdersWidget from '../components/dashboard/widgets/OpenOrdersWidget';
import QuickLinksWidget from '../components/dashboard/widgets/QuickLinksWidget';
import {
  DashboardSummaryContext,
  useDashboardSummaryProvider,
} from '../components/dashboard/useDashboardSummary';
import { ListPageToolbar } from '../components/MobilePageTitle';

const DashboardPage = () => {
  const dashboard = useDashboardSummaryProvider();

  return (
    <DashboardSummaryContext.Provider value={dashboard}>
      <div className="page-container pb-8 space-y-4">
        <ListPageToolbar />
        <DashboardWelcomeWidget />
        <ErrorBanner message={dashboard.error} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCardWidget title="Open orders" valueKey="openOrders" href="/orders" />
          <KpiCardWidget title="Open quotes" valueKey="openQuotes" href="/orders" />
          <KpiCardWidget
            title="Unpaid invoices"
            valueKey="openInvoices"
            href="/invoices"
            subtitle={(s) =>
              s.accountsReceivable > 0
                ? `$${s.accountsReceivable.toLocaleString(undefined, { minimumFractionDigits: 2 })} A/R`
                : 'All caught up'
            }
          />
          <KpiCardWidget title="Open tickets" valueKey="openTickets" href="/tickets" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <div className="lg:col-span-2 min-h-[18rem]">
            <RevenueChartWidget />
          </div>
          <div className="min-h-[18rem]">
            <QuickLinksWidget />
          </div>
        </div>

        <OpenOrdersWidget />
      </div>
    </DashboardSummaryContext.Provider>
  );
};

export default DashboardPage;
