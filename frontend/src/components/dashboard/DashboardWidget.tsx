import { ReactNode } from 'react';

interface DashboardWidgetProps {
  title: string;
  loading?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}

const DashboardWidget = ({ title, loading, error, className = '', children }: DashboardWidgetProps) => (
  <section className={`glass-panel p-4 sm:p-5 flex flex-col h-full min-h-[8rem] ${className}`}>
    <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">{title}</h2>
    {loading ? (
      <p className="text-text-muted text-sm py-4">Loading…</p>
    ) : error ? (
      <p className="text-red-400 text-sm py-2">{error}</p>
    ) : (
      children
    )}
  </section>
);

export default DashboardWidget;
