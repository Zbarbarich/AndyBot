import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardWidget from '../DashboardWidget';
import { useDashboardSummary } from '../useDashboardSummary';

interface KpiCardWidgetProps {
  title: string;
  valueKey: 'openOrders' | 'openQuotes' | 'openInvoices' | 'openTickets';
  href: string;
  subtitle?: (summary: NonNullable<ReturnType<typeof useDashboardSummary>['summary']>) => string;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 600;
    const start = performance.now();
    const from = 0;
    let frame: number;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{Math.round(display)}</>;
}

const KpiCardWidget = ({ title, valueKey, href, subtitle }: KpiCardWidgetProps) => {
  const { summary, loading, error } = useDashboardSummary();
  const value = summary?.[valueKey] ?? 0;

  return (
    <DashboardWidget title={title} loading={loading} error={error} className="h-full">
      <Link to={href} className="group flex flex-col flex-1 no-underline">
        <p className="text-3xl sm:text-4xl font-bold text-text tabular-nums group-hover:text-primary transition-colors">
          <AnimatedNumber value={value} />
        </p>
        {subtitle && summary && (
          <p className="text-xs text-text-muted mt-2">{subtitle(summary)}</p>
        )}
      </Link>
    </DashboardWidget>
  );
};

export default KpiCardWidget;
