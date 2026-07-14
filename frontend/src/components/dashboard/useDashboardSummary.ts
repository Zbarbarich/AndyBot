import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../api/client';
import { apiBase } from '../../api/config';

const DASHBOARD_API = `${apiBase}/api/app/dashboard/summary`;

export interface RevenueMonth {
  month: string;
  total: number;
}

export interface RecentOrder {
  id: number;
  document_number: string;
  customer_name: string;
  status: string;
  total: number;
  order_date: string | null;
}

export interface DashboardSummary {
  openOrders: number;
  openQuotes: number;
  openInvoices: number;
  accountsReceivable: number;
  openTickets: number;
  revenueByMonth: RevenueMonth[];
  recentOrders: RecentOrder[];
}

interface DashboardSummaryContextValue {
  summary: DashboardSummary | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

const defaultSummary: DashboardSummary = {
  openOrders: 0,
  openQuotes: 0,
  openInvoices: 0,
  accountsReceivable: 0,
  openTickets: 0,
  revenueByMonth: [],
  recentOrders: [],
};

export const DashboardSummaryContext = createContext<DashboardSummaryContextValue>({
  summary: null,
  loading: true,
  error: '',
  refetch: async () => {},
});

export function useDashboardSummaryProvider(): DashboardSummaryContextValue {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(DASHBOARD_API);
      if (!res.ok) throw new Error('Failed to load dashboard');
      const data = (await res.json()) as DashboardSummary;
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      setSummary(defaultSummary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { summary, loading, error, refetch };
}

export function useDashboardSummary() {
  return useContext(DashboardSummaryContext);
}
