import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../api/client';

export interface UseListFetchResult<T> {
  data: T[];
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

/**
 * Fetch a list from an API URL. Cancels on unmount and returns loading/error/refetch.
 */
export function useListFetch<T>(url: string | null, options?: { transform?: (data: unknown) => T[] }): UseListFetchResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!url) {
      setLoading(false);
      setData([]);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const raw = await res.json();
      const list = Array.isArray(raw) ? raw : [];
      setData(options?.transform ? options.transform(list) : (list as T[]));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!url) {
        setLoading(false);
        setData([]);
        setError('');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const res = await authFetch(url);
        if (cancelled) return;
        if (!res.ok) throw new Error('Failed to fetch');
        const raw = await res.json();
        const list = Array.isArray(raw) ? raw : [];
        const transformed = options?.transform ? options.transform(list) : (list as T[]);
        if (!cancelled) setData(transformed);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error, refetch: fetchData };
}
