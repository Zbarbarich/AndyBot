import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Users, Ticket, FileText, Receipt, Package, ShoppingCart } from 'lucide-react';
import { authFetch } from '../api/client';
import { apiBase } from '../api/config';

const API_BASE = `${apiBase}/api/app`;

interface SearchResults {
  customers: { id: number; name: string }[];
  tickets: { id: number; subject: string; status?: string }[];
  orders: { id: number; document_number: string; type: string; customer_name?: string }[];
  invoices: { id: number; invoice_number: string; customer_name?: string }[];
  items: { id: number; sku: string; name: string }[];
  purchase_orders: { id: number; po_number: string; order_document_number?: string; customer_name?: string }[];
}

const DEBOUNCE_MS = 300;

interface GlobalSearchProps {
  getToken: () => string | null;
  className?: string;
  placeholder?: string;
  onResultClick?: () => void;
}

export default function GlobalSearch({ getToken, className = '', placeholder = 'Search…', onResultClick }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setResults({ customers: [], tickets: [], orders: [], invoices: [], items: [], purchase_orders: [] });
        return;
      }
      const data = await res.json();
      setResults({
        customers: data.customers ?? [],
        tickets: data.tickets ?? [],
        orders: data.orders ?? [],
        invoices: data.invoices ?? [],
        items: data.items ?? [],
        purchase_orders: data.purchase_orders ?? [],
      });
    } catch {
      setResults({ customers: [], tickets: [], orders: [], invoices: [], items: [], purchase_orders: [] });
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setOpen(false);
      return;
    }
    const t = setTimeout(() => {
      setOpen(true);
      runSearch(query);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const hasResults = results && (
    results.customers.length > 0 ||
    results.tickets.length > 0 ||
    results.orders.length > 0 ||
    results.invoices.length > 0 ||
    results.items.length > 0 ||
    results.purchase_orders.length > 0
  );

  const handleLinkClick = (path: string) => {
    setOpen(false);
    setQuery('');
    onResultClick?.();
    navigate(path);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder={placeholder}
          className="input-field w-full py-2 pl-9 pr-3 text-sm rounded-full"
          aria-label="Global search"
          aria-expanded={open}
          aria-autocomplete="list"
        />
      </div>
      {open && query.trim() && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-dark-border bg-dark-surface shadow-xl max-h-[70vh] overflow-y-auto"
          role="listbox"
        >
          {loading ? (
            <div className="p-4 text-dark-text-muted text-sm">Searching…</div>
          ) : !hasResults ? (
            <div className="p-4 text-dark-text-muted text-sm">No results.</div>
          ) : (
            <div className="py-2">
              {results!.customers.length > 0 && (
                <div className="px-3 py-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-dark-text-muted uppercase tracking-wide mb-1">
                    <Users className="w-3.5 h-3.5" />
                    Customers
                  </div>
                  {results!.customers.map((c) => (
                    <Link
                      key={c.id}
                      to={`/customers/${c.id}`}
                      onClick={() => handleLinkClick(`/customers/${c.id}`)}
                      className="block px-3 py-2 rounded hover:bg-dark-surface-elevated text-dark-text text-sm"
                      role="option"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
              {results!.tickets.length > 0 && (
                <div className="px-3 py-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-dark-text-muted uppercase tracking-wide mb-1">
                    <Ticket className="w-3.5 h-3.5" />
                    Tickets
                  </div>
                  {results!.tickets.map((t) => (
                    <Link
                      key={t.id}
                      to={`/tickets/${t.id}`}
                      onClick={() => handleLinkClick(`/tickets/${t.id}`)}
                      className="block px-3 py-2 rounded hover:bg-dark-surface-elevated text-dark-text text-sm"
                      role="option"
                    >
                      #{t.id} {t.subject}
                    </Link>
                  ))}
                </div>
              )}
              {results!.orders.length > 0 && (
                <div className="px-3 py-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-dark-text-muted uppercase tracking-wide mb-1">
                    <FileText className="w-3.5 h-3.5" />
                    Orders / Quotes
                  </div>
                  {results!.orders.map((o) => (
                    <Link
                      key={o.id}
                      to={`/orders/${o.id}`}
                      onClick={() => handleLinkClick(`/orders/${o.id}`)}
                      className="block px-3 py-2 rounded hover:bg-dark-surface-elevated text-dark-text text-sm"
                      role="option"
                    >
                      {o.document_number} {o.type === 'quote' ? '(Quote)' : ''} {o.customer_name ? `– ${o.customer_name}` : ''}
                    </Link>
                  ))}
                </div>
              )}
              {results!.invoices.length > 0 && (
                <div className="px-3 py-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-dark-text-muted uppercase tracking-wide mb-1">
                    <Receipt className="w-3.5 h-3.5" />
                    Invoices
                  </div>
                  {results!.invoices.map((inv) => (
                    <Link
                      key={inv.id}
                      to={`/invoices/${inv.id}`}
                      onClick={() => handleLinkClick(`/invoices/${inv.id}`)}
                      className="block px-3 py-2 rounded hover:bg-dark-surface-elevated text-dark-text text-sm"
                      role="option"
                    >
                      {inv.invoice_number} {inv.customer_name ? `– ${inv.customer_name}` : ''}
                    </Link>
                  ))}
                </div>
              )}
              {results!.purchase_orders.length > 0 && (
                <div className="px-3 py-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-dark-text-muted uppercase tracking-wide mb-1">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Purchase orders
                  </div>
                  {results!.purchase_orders.map((po) => (
                    <Link
                      key={po.id}
                      to={`/purchase-orders/${po.id}`}
                      onClick={() => handleLinkClick(`/purchase-orders/${po.id}`)}
                      className="block px-3 py-2 rounded hover:bg-dark-surface-elevated text-dark-text text-sm"
                      role="option"
                    >
                      PO {po.po_number} {po.order_document_number ? `– Order ${po.order_document_number}` : ''} {po.customer_name ? `– ${po.customer_name}` : ''}
                    </Link>
                  ))}
                </div>
              )}
              {results!.items.length > 0 && (
                <div className="px-3 py-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-dark-text-muted uppercase tracking-wide mb-1">
                    <Package className="w-3.5 h-3.5" />
                    Items
                  </div>
                  {results!.items.map((i) => (
                    <Link
                      key={i.id}
                      to={`/items/${i.id}`}
                      onClick={() => handleLinkClick(`/items/${i.id}`)}
                      className="block px-3 py-2 rounded hover:bg-dark-surface-elevated text-dark-text text-sm"
                      role="option"
                    >
                      {i.sku} – {i.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
