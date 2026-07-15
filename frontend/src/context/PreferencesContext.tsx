import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { authFetch } from '../api/client';
import { useAuth } from './AuthContext';

const AUTH_PREFS = '/api/auth/me/preferences';
const LOCAL_KEY = 'andy_ui_preferences';

export type WidthMap = Record<string, number>;

export interface UiPreferences {
  tableColumns?: Record<string, WidthMap>;
  sidebarCollapsed?: boolean;
  [key: string]: unknown;
}

interface PreferencesContextType {
  prefs: UiPreferences;
  ready: boolean;
  getTableWidths: (tableId: string) => WidthMap | undefined;
  setTableWidths: (tableId: string, widths: WidthMap) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

function readLocal(): UiPreferences {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UiPreferences;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocal(prefs: UiPreferences): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
}

function deepMergePrefs(base: UiPreferences, patch: UiPreferences): UiPreferences {
  const next: UiPreferences = { ...base, ...patch };
  if (patch.tableColumns || base.tableColumns) {
    next.tableColumns = {
      ...(base.tableColumns || {}),
      ...(patch.tableColumns || {}),
    };
  }
  return next;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [prefs, setPrefs] = useState<UiPreferences>(() => readLocal());
  const [ready, setReady] = useState(false);
  const prefsRef = useRef(prefs);
  const saveTimer = useRef<number | null>(null);
  const pendingServer = useRef<UiPreferences | null>(null);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const flushServer = useCallback(async (payload: UiPreferences) => {
    if (!token) return;
    try {
      const res = await authFetch(AUTH_PREFS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const server = (await res.json()) as UiPreferences;
        setPrefs((prev) => {
          const merged = deepMergePrefs(prev, server);
          writeLocal(merged);
          prefsRef.current = merged;
          return merged;
        });
      }
    } catch {
      /* keep local */
    }
  }, [token]);

  const scheduleServerSave = useCallback(
    (patch: UiPreferences) => {
      pendingServer.current = deepMergePrefs(pendingServer.current || {}, patch);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        const toSend = pendingServer.current;
        pendingServer.current = null;
        if (toSend) void flushServer(toSend);
      }, 400);
    },
    [flushServer]
  );

  // Load: local first, then server merge when authenticated
  useEffect(() => {
    let cancelled = false;
    const local = readLocal();
    setPrefs(local);
    prefsRef.current = local;

    if (!token) {
      setReady(true);
      return;
    }

    (async () => {
      try {
        const res = await authFetch(AUTH_PREFS);
        if (!res.ok || cancelled) {
          if (!cancelled) setReady(true);
          return;
        }
        const server = (await res.json()) as UiPreferences;
        if (cancelled) return;
        // Server wins for keys it has; keep local-only keys until synced
        const merged = deepMergePrefs(local, server);
        setPrefs(merged);
        prefsRef.current = merged;
        writeLocal(merged);
      } catch {
        /* local only */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Flush pending save on unload / tab hide
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const toSend = pendingServer.current;
      pendingServer.current = null;
      if (toSend && token) {
          const body = JSON.stringify(toSend);
          try {
            void fetch(AUTH_PREFS, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body,
              keepalive: true,
            });
          } catch {
            /* ignore */
          }
      }
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, [token]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LOCAL_KEY || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue) as UiPreferences;
        setPrefs(next);
        prefsRef.current = next;
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const getTableWidths = useCallback((tableId: string) => {
    return prefsRef.current.tableColumns?.[tableId];
  }, []);

  const setTableWidths = useCallback(
    (tableId: string, widths: WidthMap) => {
      const patch: UiPreferences = { tableColumns: { [tableId]: widths } };
      setPrefs((prev) => {
        const next = deepMergePrefs(prev, patch);
        writeLocal(next);
        prefsRef.current = next;
        return next;
      });
      scheduleServerSave(patch);
    },
    [scheduleServerSave]
  );

  const setSidebarCollapsed = useCallback(
    (collapsed: boolean) => {
      const patch: UiPreferences = { sidebarCollapsed: collapsed };
      setPrefs((prev) => {
        const next = { ...prev, sidebarCollapsed: collapsed };
        writeLocal(next);
        prefsRef.current = next;
        return next;
      });
      scheduleServerSave(patch);
    },
    [scheduleServerSave]
  );

  const value: PreferencesContextType = {
    prefs,
    ready,
    getTableWidths,
    setTableWidths,
    sidebarCollapsed: Boolean(prefs.sidebarCollapsed),
    setSidebarCollapsed,
  };

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextType {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
