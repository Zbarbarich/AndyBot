import { ComponentType } from 'react';
import RevenueChartWidget from './widgets/RevenueChartWidget';
import KpiCardWidget from './widgets/KpiCardWidget';
import OpenOrdersWidget from './widgets/OpenOrdersWidget';
import QuickLinksWidget from './widgets/QuickLinksWidget';

export interface WidgetDef {
  id: string;
  component: ComponentType;
  gridClass: string;
  enabled: boolean;
}

export const widgetRegistry: WidgetDef[] = [
  {
    id: 'revenue-chart',
    component: RevenueChartWidget,
    gridClass: 'sm:col-span-2 xl:col-span-2',
    enabled: true,
  },
  {
    id: 'kpi-open-orders',
    component: () => (
      <KpiCardWidget title="Open orders" valueKey="openOrders" href="/orders" />
    ),
    gridClass: '',
    enabled: true,
  },
  {
    id: 'kpi-open-quotes',
    component: () => (
      <KpiCardWidget title="Open quotes" valueKey="openQuotes" href="/orders" />
    ),
    gridClass: '',
    enabled: true,
  },
  {
    id: 'kpi-open-invoices',
    component: () => (
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
    ),
    gridClass: '',
    enabled: true,
  },
  {
    id: 'kpi-open-tickets',
    component: () => (
      <KpiCardWidget title="Open tickets" valueKey="openTickets" href="/tickets" />
    ),
    gridClass: '',
    enabled: true,
  },
  {
    id: 'kpi-deposits',
    component: () => (
      <KpiCardWidget
        title="Deposits"
        valueKey="depositsHeld"
        href="/orders"
        formatValue={(v) =>
          `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      />
    ),
    gridClass: '',
    enabled: true,
  },
  {
    id: 'recent-orders',
    component: OpenOrdersWidget,
    gridClass: 'sm:col-span-2 xl:col-span-2',
    enabled: true,
  },
  {
    id: 'quick-links',
    component: QuickLinksWidget,
    gridClass: '',
    enabled: true,
  },
];
