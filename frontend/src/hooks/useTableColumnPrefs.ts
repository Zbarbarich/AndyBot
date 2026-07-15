import { useCallback, useEffect, useRef, useState } from 'react';
import { usePreferences, WidthMap } from '../context/PreferencesContext';

/**
 * Load/save per-table column widths for the logged-in user.
 * Prefs live in PreferencesContext (memory + localStorage + server).
 */
export function useTableColumnPrefs(tableId: string, columnKeys: string[], defaultWidth = 120) {
  const { ready, getTableWidths, setTableWidths } = usePreferences();
  const keysSig = columnKeys.join('|');
  const keysRef = useRef(columnKeys);
  keysRef.current = columnKeys;

  const mergeSaved = useCallback((): WidthMap => {
    const keys = keysRef.current;
    const defaults = Object.fromEntries(keys.map((k) => [k, defaultWidth]));
    const saved = getTableWidths(tableId);
    if (!saved) return defaults;
    const next = { ...defaults };
    for (const k of keys) {
      if (typeof saved[k] === 'number' && saved[k] > 40) next[k] = saved[k];
    }
    return next;
  }, [defaultWidth, getTableWidths, tableId]);

  const [widths, setWidths] = useState<WidthMap>(mergeSaved);

  // Apply when auth prefs finish loading or table identity changes (not on every local write)
  useEffect(() => {
    setWidths(mergeSaved());
  }, [tableId, keysSig, ready, mergeSaved]);

  const setColumnWidth = useCallback(
    (key: string, width: number) => {
      const clamped = Math.max(48, Math.min(480, Math.round(width)));
      setWidths((prev) => {
        const next = { ...prev, [key]: clamped };
        setTableWidths(tableId, next);
        return next;
      });
    },
    [setTableWidths, tableId]
  );

  return { widths, setColumnWidth, loaded: ready };
}
