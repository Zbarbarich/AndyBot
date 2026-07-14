import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../api/client';

export interface UseDetailFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

/**
 * Fetch a single entity by URL (e.g. built from id). Cancels on unmount. Returns null when url is null.
 */
export function useDetailFetch<T>(url: string | null, options?: { transform?: (raw: unknown) => T }): UseDetailFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!url) {
      setData(null);
      setLoading(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(url);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Not found');
        throw new Error('Failed to fetch');
      }
      const raw = await res.json();
      setData(options?.transform ? options.transform(raw) : (raw as T));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url, options?.transform]);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      setError('');
      return () => {};
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    authFetch(url)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 404) throw new Error('Not found');
          throw new Error('Failed to fetch');
        }
        return res.json();
      })
      .then((raw) => {
        if (cancelled) return;
        const out = options?.transform ? options.transform(raw) : (raw as T);
        setData(out);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [url, options?.transform]);

  return { data, loading, error, refetch: fetchData };
}
