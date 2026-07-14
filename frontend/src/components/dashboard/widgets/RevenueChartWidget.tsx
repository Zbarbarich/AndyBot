import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import DashboardWidget from '../DashboardWidget';
import { useDashboardSummary } from '../useDashboardSummary';

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  const d = new Date(Number(year), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'short' });
}

const RevenueChartWidget = () => {
  const { summary, loading, error } = useDashboardSummary();
  const data = (summary?.revenueByMonth ?? []).map((row) => ({
    ...row,
    label: formatMonthLabel(row.month),
  }));

  return (
    <DashboardWidget title="Revenue (12 months)" loading={loading} error={error} className="min-h-[18rem] h-full">
      {data.length === 0 ? (
        <p className="text-text-muted text-sm">No revenue data yet.</p>
      ) : (
        <div className="h-full min-h-[14rem] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary-light, #6aefe6)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="var(--color-secondary, #a78bfa)" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-text-muted" />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-text-muted"
                tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
              />
              <Tooltip
                formatter={(value) => [
                  `$${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                  'Revenue',
                ]}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as { month?: string } | undefined;
                  return row?.month ?? '';
                }}
                contentStyle={{
                  background: 'var(--color-surface, #1e1e2e)',
                  border: '1px solid var(--color-border, #333)',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey="total" fill="url(#revenueGradient)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardWidget>
  );
};

export default RevenueChartWidget;
