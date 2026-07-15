import { useState, useEffect, useCallback, useRef, useLayoutEffect, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { authFetch } from '../api/client';
import { apiBase } from '../api/config';

const ITEMS_SEARCH_API = `${apiBase}/api/app/items/search`;

export interface ItemSkuOption {
  id: number;
  sku: string;
  name: string;
  unit_price: number;
  our_cost?: number;
  unit_of_measure?: string | null;
}

interface ItemSkuSelectorProps {
  itemId: number | null;
  sku?: string | null;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  onSelect: (item: ItemSkuOption | null) => void;
}

interface DropdownPos {
  top: number;
  left: number;
  width: number;
}

export const ItemSkuSelector = ({
  itemId,
  sku = '',
  disabled,
  className = '',
  inputClassName = '',
  onSelect,
}: ItemSkuSelectorProps) => {
  const [query, setQuery] = useState(sku ?? '');
  const [results, setResults] = useState<ItemSkuOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const skipNextSearchRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (itemId != null && sku) {
      setQuery(sku);
    }
  }, [itemId, sku]);

  const updatePosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    setPos({
      top: rect.bottom + 4,
      left,
      width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('resize', onScrollOrResize);
    // Capture scroll from table containers too
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, updatePosition, query, results.length, searching]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const res = await authFetch(`${ITEMS_SEARCH_API}?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = await res.json();
      const list: ItemSkuOption[] = Array.isArray(data) ? data : [];
      setResults(list);

      const exact = list.find((it) => it.sku.toLowerCase() === trimmed.toLowerCase());
      if (exact) {
        skipNextSearchRef.current = true;
        setQuery(exact.sku);
        setResults([]);
        setOpen(false);
        onSelectRef.current(exact);
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (itemId != null && sku && trimmed.toLowerCase() === sku.toLowerCase()) {
      setOpen(false);
      return;
    }
    setOpen(true);
    searchTimeoutRef.current = setTimeout(() => runSearch(query), 250);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, runSearch, itemId, sku]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectItem = (item: ItemSkuOption) => {
    skipNextSearchRef.current = true;
    setQuery(item.sku);
    setResults([]);
    setOpen(false);
    onSelectRef.current(item);
  };

  const clearItem = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelectRef.current(null);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (itemId != null) {
      onSelectRef.current(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = query.trim().toLowerCase();
      const exact = results.find((it) => it.sku.toLowerCase() === trimmed);
      if (exact) {
        selectItem(exact);
        return;
      }
      if (results.length === 1) {
        selectItem(results[0]);
      }
    }
  };

  const showDropdown = open && query.trim() && pos != null;

  const dropdown = showDropdown
    ? createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[200] max-h-56 overflow-auto rounded-lg border border-border bg-surface shadow-xl"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {searching ? (
            <div className="p-2 text-text-muted text-sm">Searching…</div>
          ) : results.length > 0 ? (
            <ul className="py-1">
              {results.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => selectItem(it)}
                    className="w-full text-left px-3 py-2 text-sm text-text hover:bg-surface-elevated"
                  >
                    <span className="font-mono">{it.sku}</span>
                    <span className="text-text-muted"> — {it.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-2 text-text-muted text-sm">No SKU found.</div>
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={wrapperRef} className={className}>
      <div className="flex gap-1 items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (query.trim() && !(itemId != null && sku && query.trim().toLowerCase() === sku.toLowerCase())) {
              setOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search SKU…"
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          className={`input-field font-mono ${inputClassName}`}
        />
        {(itemId != null || query) && !disabled && (
          <button
            type="button"
            onClick={clearItem}
            className="text-text-muted hover:text-text text-sm px-1 shrink-0"
            title="Clear / ad-hoc"
            aria-label="Clear SKU"
          >
            ×
          </button>
        )}
      </div>
      {dropdown}
    </div>
  );
};
