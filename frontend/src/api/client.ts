const TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'auth_user';

const DEDUPE_WINDOW_MS = 2000;
const getCacheKey = (input: RequestInfo | URL, init?: RequestInit): string | null => {
  const method = (init?.method ?? 'GET').toUpperCase();
  if (method !== 'GET') return null;
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return url;
};

/** In-flight GET cache: same URL within window reuses the same promise. */
const getCache = new Map<string, { promise: Promise<Response>; ts: number }>();

function handleUnauthorized(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  window.location.href = '/login';
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export interface AuthFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

/**
 * Authenticated fetch: adds Bearer token and on 401 clears session and redirects to /login.
 * GET requests are deduped within a short window to avoid duplicate calls (e.g. from StrictMode).
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: AuthFetchOptions
): Promise<Response> {
  const key = getCacheKey(input, init);
  // Preferences must never use the short GET dedupe cache — stale prefs after PATCH.
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const skipDedupe = url.includes('/me/preferences');
  const now = Date.now();
  if (key && !skipDedupe) {
    const entry = getCache.get(key);
    if (entry && now - entry.ts < DEDUPE_WINDOW_MS) {
      const res = await entry.promise;
      return res.clone();
    }
  }

  const headers = new Headers(init?.headers);
  const auth = getAuthHeaders();
  Object.entries(auth).forEach(([k, v]) => headers.set(k, v));
  const promise = fetch(input, { ...init, headers }).then((res) => {
    if (res.status === 401) handleUnauthorized();
    return res;
  });

  if (key && !skipDedupe) {
    getCache.set(key, { promise, ts: now });
    promise.finally(() => {
      setTimeout(() => getCache.delete(key), DEDUPE_WINDOW_MS);
    });
  }

  return promise.then((r) => r.clone());
}
